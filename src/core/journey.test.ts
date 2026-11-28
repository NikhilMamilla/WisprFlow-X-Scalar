import { describe, expect, it } from 'vitest'
import { explainForCitizen, questionForField } from './citizen'
import {
  JourneyStore,
  answerQuestion,
  beginJourney,
  complete,
  pause,
  resume,
  selectNextQuestion,
  startJourney,
  validateInitialProfile,
  viewOf,
  type JourneySession,
  type JourneyView,
} from './journey'
import { SCHEMES } from './schemes'
import type { Scheme } from './scheme'
import { PROFILE_FIELDS, emptyProfile, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const byId = (id: string) => SCHEMES.find((s) => s.id === id)!
const options = { now: () => '2026-11-28T10:00:00.000Z', createId: () => 'journey-1' }

const fullVendor = {
  age: 32,
  occupation: 'street_vendor',
  urban_or_rural: 'urban',
  monthly_income: 10000,
  has_bank_account: true,
  has_aadhaar: true,
  in_epf_esic_nps: false,
  pays_income_tax: false,
}

const sessionOf = (input: unknown, schemes?: Scheme[]): JourneySession => {
  const outcome = beginJourney(input, { ...options, ...(schemes ? { schemes } : {}) })
  if (!outcome.ok) throw new Error(`expected a session, got ${outcome.error.code}`)
  return outcome.session
}

const view = (session: JourneySession): JourneyView => viewOf(session)

// Answers every remaining question; used to reach terminal states.
function drive(store: JourneyStore, sessionId: string, answers: Record<string, unknown>, limit = 12): JourneyView {
  let current = store.get(sessionId)
  if (!current.ok) throw new Error('missing session')
  let view = current.journey
  let steps = 0
  while (view.nextQuestion && steps < limit) {
    const field = view.nextQuestion.field
    if (!(field in answers)) throw new Error(`no scripted answer for ${field}`)
    const answered = store.answer(sessionId, view.nextQuestion.id, answers[field])
    if (!answered.ok) throw new Error(`answer rejected: ${answered.error.code} ${JSON.stringify(answered.error.details ?? {})}`)
    view = answered.journey
    steps += 1
  }
  return view
}

describe('journey start', () => {
  it('starts from a valid partial profile and asks the first question', () => {
    const response = startJourney({ age: 32 }, options)
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.status).toBe('COLLECTING_INFORMATION')
    expect(response.journey.reason).toBe('questions_remaining')
    expect(response.journey.profile.age).toBe(32)
    expect(response.journey.profile.monthly_income).toBeNull()
    expect(response.journey.answers).toEqual([])
    expect(response.journey.nextQuestion).not.toBeNull()
    expect(response.journey.sessionId).toBe('journey-1')
  })

  it('starts from an empty profile without inventing a single answer', () => {
    const response = startJourney({}, options)
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.profile).toEqual(emptyProfile())
    expect(response.journey.questions.length).toBeGreaterThan(0)
    expect(response.journey.counts.LIKELY_ELIGIBLE).toBe(0)
    expect(response.journey.results.moreInformationNeeded.length).toBeGreaterThan(0)
  })

  it('rejects a malformed profile instead of dropping the bad field', () => {
    const bad = [
      null,
      'thirty',
      { age: 200 },
      { age: 32.5 },
      { monthly_income: -1 },
      { occupation: 'astronaut' },
      { urban_or_rural: 'suburb' },
      { has_aadhaar: 'yes' },
      { state: 'Atlantis' },
      { district: 42 },
      { evidence: 'words' },
    ]
    for (const input of bad) {
      const response = startJourney(input, options)
      expect(response.ok).toBe(false)
      if (!response.ok) expect(response.error.code).toBe('INVALID_PROFILE')
    }
  })

  it('canonicalises a recognised state and district on the way in', () => {
    const validated = validateInitialProfile({ state: 'telangana', district: 'warangal' })
    expect(validated.ok).toBe(true)
    if (!validated.ok) return
    expect(validated.profile.state).toBe('Telangana')
    expect(validated.profile.district?.toLowerCase()).toContain('warangal')
  })
})

describe('question selection', () => {
  it('asks the field that resolves the most schemes first', () => {
    const session = sessionOf({}, [byId('pmsym'), byId('pmsby'), byId('pmjjby'), byId('eshram')])
    expect(session.nextQuestion?.field).toBe('age')
    const bank = { ...emptyProfile(), age: 32 }
    const next = selectNextQuestion(session.questions, bank, [byId('pmsym'), byId('pmsby'), byId('pmjjby')])
    expect(next?.field).toBe('has_bank_account')
    expect(next?.schemes.length).toBe(3)
  })

  it('never returns a duplicate question id', () => {
    const report = explainForCitizen(emptyProfile())
    const ids = report.questions.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
    const fields = report.questions.map((q) => q.field)
    expect(new Set(fields).size).toBe(fields.length)
  })

  it('prefers a field some scheme can provide when coverage ties', () => {
    const questions = [questionForField('has_aadhaar'), questionForField('has_bank_account')]
    const tied = questions.map((q) => ({ ...q, schemes: ['s1'] }))
    const chosen = selectNextQuestion(tied, emptyProfile(), [byId('pmjdy')])
    expect(chosen?.field).toBe('has_bank_account')
  })

  it('breaks ties deterministically, independent of input order', () => {
    const a = { ...questionForField('age'), schemes: ['s1'] }
    const b = { ...questionForField('occupation'), schemes: ['s1'] }
    const first = selectNextQuestion([a, b], emptyProfile(), [])
    const second = selectNextQuestion([b, a], emptyProfile(), [])
    expect(first?.id).toBe(second?.id)
    expect(first?.field).toBe('age')
  })

  it('never offers a question whose field is already answered', () => {
    const session = sessionOf({ ...fullVendor })
    expect(session.questions).toEqual([])
    expect(session.nextQuestion).toBeNull()
    for (const question of session.questions) expect(session.profile[question.field]).toBeNull()
  })

  it('does not ask about an unanswered field no condition needs', () => {
    const session = sessionOf({ age: 32 })
    const fields = session.questions.map((q) => q.field)
    // No scheme in the catalogue restricts a district, so it is never asked.
    expect(fields).not.toContain('district')
    expect(fields).not.toContain('dependants')
  })
})

describe('answer processing', () => {
  it('updates the profile and records the answer', () => {
    const session = sessionOf({})
    const question = session.nextQuestion!
    const response = answerQuestion(session, question.id, true, options)
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.profile[question.field]).toBe(true)
    expect(response.journey.answers).toHaveLength(1)
    expect(response.journey.answers[0]).toMatchObject({ questionId: question.id, field: 'has_bank_account', value: true })
    expect(response.journey.answers[0].answeredAt).toBe('2026-11-28T10:00:00.000Z')
  })

  it('normalises words into profile values', () => {
    const occupation = sessionOf({ age: 30, has_bank_account: true, has_aadhaar: true, in_epf_esic_nps: false, pays_income_tax: false, monthly_income: 9000 })
    const question = occupation.nextQuestion!
    expect(question.field).toBe('occupation')
    const answered = answerQuestion(occupation, question.id, 'street vendor', options)
    expect(answered.ok && answered.journey.profile.occupation).toBe('street_vendor')

    const location = sessionOf({ age: 30, occupation: 'other', urban_or_rural: 'urban', monthly_income: 9000, has_bank_account: true, has_aadhaar: true, in_epf_esic_nps: false, pays_income_tax: false }, [
      { ...clone(byId('pmsym')), id: 'state_test', geography: { scope: 'state', states: ['Telangana'] } },
    ])
    const stateQuestion = location.nextQuestion!
    expect(stateQuestion.field).toBe('state')
    const stateAnswered = answerQuestion(location, stateQuestion.id, 'telangana', options)
    expect(stateAnswered.ok && stateAnswered.journey.profile.state).toBe('Telangana')
  })

  it('rejects an invalid answer and leaves the session untouched', () => {
    const session = sessionOf({})
    const before = view(session)
    const question = session.nextQuestion!
    // A word that is not a yes/no answer cannot be stored as a boolean.
    const rejected = answerQuestion(session, question.id, 'sometimes', options)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.error.code).toBe('INVALID_ANSWER')
    expect(view(session)).toEqual(before)
    expect(session.answers).toEqual([])
    expect(session.profile).toEqual(emptyProfile())
  })

  it('rejects an out-of-range or fractional number without touching the profile', () => {
    // A two-scheme catalogue makes the age question the first one.
    const session = sessionOf({}, [byId('pmsym'), byId('pmsby')])
    const age = session.nextQuestion!
    expect(age.id).toBe('question_age')
    for (const value of [150, -1, 30.5, 'old', '']) {
      const rejected = answerQuestion(session, age.id, value, options)
      expect(rejected.ok).toBe(false)
      if (!rejected.ok) expect(rejected.error.code).toBe('INVALID_ANSWER')
    }
    expect(session.profile.age).toBeNull()
    expect(session.answers).toEqual([])
  })

  it('rejects an unknown question id', () => {
    const session = sessionOf({})
    const response = answerQuestion(session, 'question_nonsense', true, options)
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('UNKNOWN_QUESTION')
  })

  it('rejects a question that is no longer current', () => {
    const session = sessionOf({})
    const other = session.questions.find((q) => q.id !== session.nextQuestion?.id)!
    const response = answerQuestion(session, other.id, 30, options)
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('QUESTION_NOT_CURRENT')
  })

  it('refuses to answer the same question twice', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const questionId = started.journey.nextQuestion!.id
    expect(store.answer(sessionId, questionId, true).ok).toBe(true)
    const again = store.answer(sessionId, questionId, true)
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.error.code).toBe('QUESTION_ALREADY_ANSWERED')
  })

  it('rejects an answer while paused and while completed', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const questionId = started.journey.nextQuestion!.id

    expect(store.pause(sessionId).ok).toBe(true)
    const paused = store.answer(sessionId, questionId, true)
    expect(paused.ok).toBe(false)
    if (!paused.ok) expect(paused.error.code).toBe('SESSION_PAUSED')

    expect(store.resume(sessionId).ok).toBe(true)
    expect(store.complete(sessionId).ok).toBe(true)
    const completed = store.answer(sessionId, questionId, true)
    expect(completed.ok).toBe(false)
    if (!completed.ok) expect(completed.error.code).toBe('SESSION_COMPLETED')
  })

  it('validates choice and range answers through the question rules', () => {
    const session = sessionOf({})
    const occupation = session.questions.find((q) => q.field === 'occupation')!
    const bad = answerQuestion({ ...session, nextQuestion: occupation } as JourneySession, occupation.id, 'astronaut', options)
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.error.code).toBe('INVALID_ANSWER')

    const age = session.questions.find((q) => q.field === 'age')!
    for (const value of [150, -1, 30.5, 'old']) {
      const rejected = answerQuestion({ ...session, nextQuestion: age } as JourneySession, age.id, value, options)
      expect(rejected.ok).toBe(false)
    }
  })
})

describe('re-evaluation after answers', () => {
  it('resolves unknown conditions and reduces missing information', () => {
    // With only the pension scheme, monthly income is the first open question.
    const session = sessionOf({ age: 22 }, [byId('pmsym')])
    const before = session.explanations[0]
    const unknownBefore = before.unknown.length
    expect(unknownBefore).toBeGreaterThan(0)

    const question = session.nextQuestion!
    expect(question.field).toBe('monthly_income')
    const answered = answerQuestion(session, question.id, 8000, options)
    expect(answered.ok).toBe(true)
    if (!answered.ok) return

    const after = answered.journey.results.moreInformationNeeded[0]
    expect(after.unknown.length).toBeLessThan(unknownBefore)
    expect(after.unknown).not.toContain('pmsym:income_max_monthly')
    expect(answered.journey.answers.map((a) => a.field)).toEqual(['monthly_income'])
  })

  it('marks the exact failing condition once an answer rules a scheme out', () => {
    const store = new JourneyStore(options)
    const started = store.start(fullVendor)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    // A complete profile needs no questions, so the failure is visible at once.
    const pension = started.journey.results.likelyEligible.find((r) => r.schemeId === 'pmsym')!
    expect(pension).toBeDefined()

    const older = new JourneyStore(options)
    const oldStart = older.start({ ...fullVendor, age: 45, monthly_income: 20000 })
    expect(oldStart.ok).toBe(true)
    if (!oldStart.ok) return
    const rejected = oldStart.journey.results.notEligible.find((r) => r.schemeId === 'pmsym')!
    expect(rejected.state).toBe('NOT_ELIGIBLE')
    expect(rejected.failed).toEqual(['pmsym:age_max', 'pmsym:income_max_monthly'])
    expect(rejected.conditions.find((c) => c.id === 'pmsym:age_max')?.result).toBe('FAILED')
  })

  it('keeps verification uncertainty after every answer is given', () => {
    const onlyEshram = [{ ...clone(byId('eshram')) }]
    const store = new JourneyStore({ ...options, schemes: onlyEshram })
    const started = store.start(fullVendor)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const result = started.journey.results.needsVerification[0]
    expect(result.state).toBe('NEEDS_VERIFICATION')
    expect(result.evidence.sufficient).toBe(false)
    expect(started.journey.status).toBe('NEEDS_VERIFICATION')
  })

  it('keeps the citizen explanation layer as the only explanation source', () => {
    const session = sessionOf({ age: 40, occupation: 'street_vendor' })
    const reference = explainForCitizen(session.profile)
    expect(session.explanations).toEqual(reference.results)
    // Every evaluated scheme is traceable to one engine match result.
    expect(session.matchResults).toHaveLength(session.explanations.length + session.excluded.length)
  })
})

describe('journey completion', () => {
  it('reports READY_WITH_RESULTS when nothing is left to ask', () => {
    const response = startJourney(fullVendor, options)
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.nextQuestion).toBeNull()
    expect(response.journey.status).toBe('READY_WITH_RESULTS')
    expect(response.journey.reason).toBe('results_ready')
    expect(response.journey.results.likelyEligible.length).toBe(3)
    expect(response.journey.results.needsVerification.length).toBe(2)
  })

  it('ends in NEEDS_VERIFICATION when only uncertain results remain', () => {
    const onlyEshram: Scheme[] = [clone(byId('eshram'))]
    const response = startJourney(fullVendor, { ...options, schemes: onlyEshram })
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.status).toBe('NEEDS_VERIFICATION')
    expect(response.journey.reason).toBe('verification_uncertainty')
    expect(response.journey.results.likelyEligible).toEqual([])
  })

  it('completes with no applicable schemes instead of pretending there is a result', () => {
    const telanganaOnly: Scheme[] = [{ ...clone(byId('pmsym')), id: 'ts_only', geography: { scope: 'state', states: ['Telangana'] } }]
    const response = startJourney({ ...fullVendor, state: 'Bihar' }, { ...options, schemes: telanganaOnly })
    expect(response.ok).toBe(true)
    if (!response.ok) return
    expect(response.journey.status).toBe('COMPLETED')
    expect(response.journey.reason).toBe('no_applicable_schemes')
    expect(response.journey.results.likelyEligible).toEqual([])
    expect(response.journey.excluded).toHaveLength(1)
  })

  it('pauses, refuses answers, and resumes without repeating questions', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const questionId = started.journey.nextQuestion!.id

    const paused = store.pause(sessionId)
    expect(paused.ok && paused.journey.status).toBe('PAUSED')
    expect(paused.ok && paused.journey.reason).toBe('paused_by_citizen')
    const blocked = store.answer(sessionId, questionId, true)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error.code).toBe('SESSION_PAUSED')

    const resumed = store.resume(sessionId)
    expect(resumed.ok && resumed.journey.status).toBe('COLLECTING_INFORMATION')
    expect(resumed.ok && resumed.journey.nextQuestion?.id).toBe(questionId)
    const answered = store.answer(sessionId, questionId, true)
    expect(answered.ok && answered.journey.answers).toHaveLength(1)
  })

  it('completes explicitly and refuses answers until resumed', () => {
    const store = new JourneyStore(options)
    const started = store.start({ age: 32 })
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const completed = store.complete(sessionId)
    expect(completed.ok && completed.journey.status).toBe('COMPLETED')
    expect(completed.ok && completed.journey.reason).toBe('completed_by_citizen')

    const blocked = store.answer(sessionId, completed.ok ? completed.journey.questions[0].id : '', true)
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.error.code).toBe('SESSION_COMPLETED')

    const reopened = store.resume(sessionId)
    expect(reopened.ok).toBe(true)
    expect(reopened.ok && reopened.journey.status).toBe('COLLECTING_INFORMATION')
  })

  it('walks a citizen from questions to likely eligibility', () => {
    const store = new JourneyStore(options)
    const started = store.start({ age: 24, occupation: 'street_vendor', urban_or_rural: 'urban' })
    if (!started.ok) throw new Error('start failed')
    expect(started.journey.status).toBe('COLLECTING_INFORMATION')
    const final = drive(store, started.journey.sessionId, {
      has_bank_account: 'haan',
      monthly_income: 9000,
      has_aadhaar: 'haan',
      pays_income_tax: 'nahi',
      in_epf_esic_nps: 'nahi',
    })
    expect(final.nextQuestion).toBeNull()
    expect(final.status).toBe('READY_WITH_RESULTS')
    const pension = final.results.likelyEligible.find((r) => r.schemeId === 'pmsym')
    expect(pension?.state).toBe('LIKELY_ELIGIBLE')
    expect(final.answers).toHaveLength(5)
    expect(new Set(final.answers.map((a) => a.field)).size).toBe(5)
  })
})

describe('session store', () => {
  it('reports an unknown session id', () => {
    const store = new JourneyStore(options)
    const response = store.get('nope')
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('UNKNOWN_SESSION')
    expect(store.answer('nope', 'question_age', 30).ok).toBe(false)
    expect(store.pause('nope').ok).toBe(false)
    expect(store.complete('nope').ok).toBe(false)
    expect(store.has('nope')).toBe(false)
  })

  it('keeps sessions isolated and finds them by id', () => {
    let counter = 0
    const store = new JourneyStore({ ...options, createId: () => `j${(counter += 1)}` })
    const a = store.start({ age: 30 })
    const b = store.start({ age: 50 })
    expect(store.size()).toBe(2)
    expect(a.ok && b.ok && a.journey.sessionId).not.toBe(b.ok ? b.journey.sessionId : '')
    expect(store.get('j1').ok).toBe(true)
    expect(store.get('j2').ok).toBe(true)
  })

  it('returns frozen state that cannot be mutated through a response', () => {
    const store = new JourneyStore(options)
    const started = store.start(fullVendor)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    expect(Object.isFrozen(started.journey.profile)).toBe(true)
    const first = store.get(started.journey.sessionId)
    if (!first.ok) throw new Error('missing')
    expect(() => {
      first.journey.results.likelyEligible.push(first.journey.results.needsVerification[0])
    }).not.toThrow()
    first.journey.results.likelyEligible.length = 0
    const second = store.get(started.journey.sessionId)
    expect(second.ok && second.journey.results.likelyEligible.length).toBe(3)
  })

  it('offers the same transitions as stateless functions', () => {
    const session = sessionOf({ age: 30 })
    const paused = pause(session, options)
    expect(paused.ok && paused.journey.status).toBe('PAUSED')
    if (!paused.ok) return
    const resumed = resume({ ...session, paused: true } as JourneySession, options)
    expect(resumed.ok && resumed.journey.status).toBe('COLLECTING_INFORMATION')
    const finished = complete(session, options)
    expect(finished.ok && finished.journey.status).toBe('COMPLETED')
    expect(finished.ok && finished.journey.reason).toBe('completed_by_citizen')
  })

  it('refuses to resume a journey that is not paused or complete', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const response = store.resume(started.journey.sessionId)
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('INVALID_STATE')
  })
})

describe('integrity', () => {
  it('asks about profile fields only', () => {
    const report = explainForCitizen(emptyProfile())
    for (const question of report.questions) expect(PROFILE_FIELDS).toContain(question.field)
    const asked = report.questions.map((q) => q.field)
    // Nothing about identity, caste, religion or documents is collected.
    for (const field of ['email', 'phone', 'caste', 'religion', 'gender', 'aadhaar_number']) {
      expect(asked).not.toContain(field)
    }
  })

  it('matches the citizen layer counts for the same profile', () => {
    const profile = { ...emptyProfile(), ...fullVendor } as Profile
    const report = explainForCitizen(profile)
    const session = sessionOf(profile)
    expect(session.status).toBe('READY_WITH_RESULTS')
    expect(session.explanations.map((r) => r.schemeId)).toEqual(report.results.map((r) => r.schemeId))
    expect(session.nextQuestion).toBeNull()
  })

  it('produces a deterministic session for the same input', () => {
    const first = beginJourney({ age: 33 }, options)
    const second = beginJourney({ age: 33 }, options)
    expect(first.ok && second.ok && first.session).toEqual(second.ok ? second.session : null)
  })
})
