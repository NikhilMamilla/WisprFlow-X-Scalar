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
  type JourneyResponse,
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
  state: 'Telangana',
  worked_90_days_construction: false,
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
      state: 'Telangana',
      worked_90_days_construction: 'nahi',
    })
    expect(final.nextQuestion).toBeNull()
    expect(final.status).toBe('READY_WITH_RESULTS')
    const pension = final.results.likelyEligible.find((r) => r.schemeId === 'pmsym')
    expect(pension?.state).toBe('LIKELY_ELIGIBLE')
    expect(final.answers).toHaveLength(7)
    expect(new Set(final.answers.map((a) => a.field)).size).toBe(7)
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
describe('answer correction', () => {
  const must = (response: JourneyResponse) => {
    if (!response.ok) throw new Error(`expected a journey, got ${response.error.code}`)
    return response.journey
  }

  // Answers everything except income and Aadhaar.
  const nearComplete = {
    age: 30,
    occupation: 'street_vendor',
    urban_or_rural: 'urban',
    has_bank_account: true,
    in_epf_esic_nps: false,
    pays_income_tax: false,
    state: 'Telangana',
    worked_90_days_construction: true,
  }

  // Answers the current question with a value its input type accepts.
  const answerCurrent = (store: JourneyStore, sessionId: string, value?: unknown): JourneyView => {
    const view = must(store.get(sessionId))
    const question = view.nextQuestion!
    const fallback = question.input === 'number' ? 30 : question.field === 'occupation' ? 'street vendor' : question.field === 'state' ? 'Telangana' : true
    return must(store.answer(sessionId, question.id, value === undefined ? fallback : value))
  }

  it('replaces the value, keeps both history entries and flips eligibility', () => {
    const store = new JourneyStore(options)
    const started = must(store.start(nearComplete))
    const sessionId = started.sessionId
    const income = started.nextQuestion!
    expect(income.field).toBe('monthly_income')

    const tooHigh = must(store.answer(sessionId, income.id, 30000))
    expect(tooHigh.results.notEligible.map((r) => r.schemeId)).toContain('pmsym')

    const corrected = must(store.correct(sessionId, 'monthly_income', 9000))
    expect(corrected.profile.monthly_income).toBe(9000)
    expect(corrected.results.notEligible).toEqual([])

    // The original answer is preserved, and the correction names what it replaced.
    expect(corrected.answers).toHaveLength(2)
    expect(corrected.answers[0]).toMatchObject({ field: 'monthly_income', value: 30000, action: 'ANSWER' })
    expect(corrected.answers[1]).toMatchObject({
      field: 'monthly_income',
      value: 9000,
      previousValue: 30000,
      action: 'CORRECTION',
      questionId: income.id,
    })
    expect(corrected.answers[1].sequence).toBeGreaterThan(corrected.answers[0].sequence)
    expect(corrected.answers[0].value).toBe(30000)

    // The corrected answer is what the engine now uses.
    const afterAadhaar = answerCurrent(store, sessionId, true)
    expect(afterAadhaar.results.likelyEligible.map((r) => r.schemeId)).toContain('pmsym')
  })

  it('regenerates explanations and brings back a question the first answer had removed', () => {
    const store = new JourneyStore(options)
    const started = must(store.start(nearComplete))
    const sessionId = started.sessionId
    must(store.answer(sessionId, started.nextQuestion!.id, 30000))
    // With a failing income the Aadhaar question stops mattering.
    expect(must(store.get(sessionId)).nextQuestion).toBeNull()

    const corrected = must(store.correct(sessionId, 'monthly_income', 9000))
    expect(corrected.nextQuestion?.field).toBe('has_aadhaar')
    const pension = corrected.results.moreInformationNeeded.find((r) => r.schemeId === 'pmsym')!
    expect(pension.unknown).toContain('pmsym:requires:has_aadhaar')
    expect(pension.failed).toEqual([])
  })

  it('rejects an invalid correction without changing the session', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    answerCurrent(store, sessionId)
    const before = store.get(sessionId)
    const rejected = store.correct(sessionId, 'has_bank_account', 'maybe')
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.error.code).toBe('INVALID_ANSWER')
    expect(store.get(sessionId)).toEqual(before)
  })

  it('refuses to correct a field that was never answered', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({ age: 30 }))
    const rejected = store.correct(started.sessionId, 'monthly_income', 9000)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.error.code).toBe('QUESTION_NOT_ANSWERED')
    expect(must(store.get(started.sessionId)).answers).toHaveLength(0)
  })

  it('refuses corrections while paused or complete', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    answerCurrent(store, sessionId)
    must(store.correct(sessionId, 'has_bank_account', false))
    must(store.pause(sessionId))
    const paused = store.correct(sessionId, 'has_bank_account', true)
    expect(paused.ok).toBe(false)
    if (!paused.ok) expect(paused.error.code).toBe('SESSION_PAUSED')
    must(store.resume(sessionId))
    must(store.complete(sessionId))
    const completed = store.correct(sessionId, 'has_bank_account', true)
    expect(completed.ok).toBe(false)
    if (!completed.ok) expect(completed.error.code).toBe('SESSION_COMPLETED')
  })
})

describe('skipping questions', () => {
  const must = (response: JourneyResponse) => {
    if (!response.ok) throw new Error(`expected a journey, got ${response.error.code}`)
    return response.journey
  }

  it('moves to another question without answering and without changing the profile', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const first = started.nextQuestion!
    const before = started.results

    const skipped = must(store.skip(sessionId, first.id))
    expect(skipped.skips).toHaveLength(1)
    expect(skipped.skips[0]).toMatchObject({ questionId: first.id, field: first.field })
    expect(skipped.answers).toEqual([])
    expect(skipped.profile).toEqual(emptyProfile())
    expect(skipped.nextQuestion?.field).not.toBe(first.field)
    // Same explanations: a skip is not a no and cannot make a scheme ineligible.
    expect(skipped.results).toEqual(before)
    expect(skipped.counts.NOT_ELIGIBLE).toBe(0)
  })

  it('never repeats a skipped question while another open question remains', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const first = started.nextQuestion!
    const skipped = must(store.skip(sessionId, first.id))
    const next = skipped.nextQuestion!
    expect(next.field).not.toBe(first.field)

    const value = next.input === 'number' ? 30 : next.field === 'occupation' ? 'street vendor' : true
    const answered = must(store.answer(sessionId, next.id, value))
    expect(answered.nextQuestion?.field).not.toBe(first.field)
    expect(answered.answers).toHaveLength(1)
  })

  it('offers each skipped question exactly once more, then stops asking', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const fields = started.questions.map((q) => q.field)
    const skipCount = new Map<string, number>()

    for (let guard = 0; guard < fields.length * 2; guard += 1) {
      const view = must(store.get(sessionId))
      const question = view.nextQuestion
      if (!question) break
      skipCount.set(question.field, (skipCount.get(question.field) ?? 0) + 1)
      must(store.skip(sessionId, question.id))
    }

    const final = must(store.get(sessionId))
    expect(final.nextQuestion).toBeNull()
    // Every open question was offered twice and no field a third time.
    for (const field of fields) expect(skipCount.get(field)).toBe(2)
    expect(final.skips).toHaveLength(fields.length * 2)
    expect(final.status).toBe('NEEDS_VERIFICATION')
    expect(final.reason).toBe('missing_information_without_question')
    expect(final.answers).toEqual([])
    expect(final.counts.NOT_ELIGIBLE).toBe(0)
  })

  it('can be revisited explicitly, and the skip record survives the visit', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const first = started.nextQuestion!
    must(store.skip(sessionId, first.id))

    const revisited = must(store.revisit(sessionId, first.field))
    expect(revisited.nextQuestion?.id).toBe(first.id)
    expect(revisited.revisitQuestion).toBe(first.field)
    expect(revisited.skips).toHaveLength(1)

    const answered = must(store.answer(sessionId, first.id, true))
    expect(answered.revisitQuestion).toBeNull()
    expect(answered.answers[0].field).toBe(first.field)
    // The skip stays in history after it was answered.
    expect(answered.skips).toHaveLength(1)
  })

  it('rejects an explicit revisit of a question that was not skipped or is already answered', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const notSkipped = store.revisit(sessionId, 'age')
    expect(notSkipped.ok).toBe(false)
    if (!notSkipped.ok) expect(notSkipped.error.code).toBe('INVALID_STATE')

    const first = started.nextQuestion!
    must(store.skip(sessionId, first.id))
    must(store.revisit(sessionId, first.field))
    must(store.answer(sessionId, first.id, true))
    const answered = store.revisit(sessionId, first.field)
    expect(answered.ok).toBe(false)
    if (!answered.ok) expect(answered.error.code).toBe('INVALID_STATE')
  })

  it('rejects an unknown or stale question, and a skip while paused, without mutating', () => {
    const store = new JourneyStore(options)
    const started = must(store.start({}))
    const sessionId = started.sessionId
    const before = store.get(sessionId)

    const unknown = store.skip(sessionId, 'question_nonsense')
    expect(unknown.ok).toBe(false)
    if (!unknown.ok) expect(unknown.error.code).toBe('UNKNOWN_QUESTION')

    const other = started.questions.find((q) => q.id !== started.nextQuestion?.id)!
    const stale = store.skip(sessionId, other.id)
    expect(stale.ok).toBe(false)
    if (!stale.ok) expect(stale.error.code).toBe('QUESTION_NOT_CURRENT')
    expect(store.get(sessionId)).toEqual(before)

    must(store.pause(sessionId))
    const paused = store.skip(sessionId)
    expect(paused.ok).toBe(false)
    if (!paused.ok) expect(paused.error.code).toBe('SESSION_PAUSED')
  })

  it('reports NOTHING_TO_SKIP when every question is already answered', () => {
    const store = new JourneyStore(options)
    const started = must(store.start(fullVendor))
    expect(started.nextQuestion).toBeNull()
    const response = store.skip(started.sessionId)
    expect(response.ok).toBe(false)
    if (!response.ok) expect(response.error.code).toBe('NOTHING_TO_SKIP')
  })
})

describe('session isolation', () => {
  it('does not leak mutable profile, history, results or questions', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId

    const view = started.journey
    expect(Object.isFrozen(view.profile)).toBe(true)
    try {
      ;(view.profile as { age: number | null }).age = 99
    } catch {
      /* frozen objects throw in strict mode */
    }
    view.answers.push({ questionId: 'x', field: 'age', value: 1, action: 'ANSWER', sequence: 99, answeredAt: 'x' })
    view.questions.push({ ...view.questions[0], id: 'question_injected' })
    view.results.moreInformationNeeded.length = 0
    view.skips.push({ questionId: 'x', field: 'age', sequence: 99, skippedAt: 'x' })

    const fresh = store.get(sessionId)
    if (!fresh.ok) throw new Error('missing')
    expect(fresh.journey.profile.age).toBeNull()
    expect(fresh.journey.answers).toEqual([])
    expect(fresh.journey.skips).toEqual([])
    expect(fresh.journey.questions.map((q) => q.id)).not.toContain('question_injected')
    expect(fresh.journey.results.moreInformationNeeded.length).toBeGreaterThan(0)
  })

  it('keeps two sessions independent', () => {
    let counter = 0
    const store = new JourneyStore({ ...options, createId: () => `k${(counter += 1)}` })
    const a = store.start({})
    const b = store.start({})
    if (!a.ok || !b.ok) throw new Error('start failed')
    const question = a.journey.nextQuestion!
    if (!store.answer(a.journey.sessionId, question.id, true).ok) throw new Error('answer failed')
    const bAfter = store.get(b.journey.sessionId)
    expect(bAfter.ok && bAfter.journey.answers).toEqual([])
    expect(bAfter.ok && bAfter.journey.profile.has_bank_account).toBeNull()
  })

  it('leaves the session byte-identical after every rejected operation', () => {
    const store = new JourneyStore(options)
    const started = store.start({ age: 30 })
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const before = store.get(sessionId)

    store.answer(sessionId, started.journey.nextQuestion!.id, 'not an answer')
    store.correct(sessionId, 'monthly_income', 10)
    store.skip(sessionId, 'question_nonsense')
    store.revisit(sessionId, 'age')
    expect(store.get(sessionId)).toEqual(before)
  })
})

describe('lifecycle hardening', () => {
  it('re-derives the same status after pause and resume', () => {
    const store = new JourneyStore(options)
    const started = store.start({ age: 30 })
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const before = store.get(sessionId)
    if (!store.pause(sessionId).ok) throw new Error('pause failed')
    const resumed = store.resume(sessionId)
    expect(resumed.ok).toBe(true)
    if (!resumed.ok) return
    expect(resumed.journey.status).toBe('COLLECTING_INFORMATION')
    expect(resumed.journey.nextQuestion?.id).toBe(started.journey.nextQuestion?.id)
    // Only the timestamp moves; answers, profile and questions are identical.
    const original = before.ok ? before.journey : null
    expect(resumed.journey.answers).toEqual(original?.answers)
    expect(resumed.journey.profile).toEqual(original?.profile)
  })

  it('completes with questions still open, then reopens on request', () => {
    const store = new JourneyStore(options)
    const started = store.start({})
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    const completed = store.complete(sessionId)
    expect(completed.ok && completed.journey.status).toBe('COMPLETED')
    expect(completed.ok && completed.journey.nextQuestion).not.toBeNull()

    const blocked = [store.answer(sessionId, started.journey.nextQuestion!.id, true), store.skip(sessionId), store.correct(sessionId, 'age', 30)]
    for (const response of blocked) {
      expect(response.ok).toBe(false)
      if (!response.ok) expect(response.error.code).toBe('SESSION_COMPLETED')
    }

    const reopened = store.resume(sessionId)
    expect(reopened.ok && reopened.journey.status).toBe('COLLECTING_INFORMATION')
  })

  it('ends with verification uncertainty when every question is skipped twice', () => {
    const store = new JourneyStore(options)
    const started = store.start({ age: 30 })
    if (!started.ok) throw new Error('start failed')
    const sessionId = started.journey.sessionId
    // Skip each question twice: the policy then has nothing left to offer.
    let guard = 0
    while (guard < 30) {
      const current = store.get(sessionId)
      if (!current.ok) throw new Error('missing')
      const question = current.journey.nextQuestion
      if (!question) break
      if (!store.skip(sessionId, question.id).ok) throw new Error('skip failed')
      guard += 1
    }
    const final = store.get(sessionId)
    expect(final.ok).toBe(true)
    if (!final.ok) return
    expect(final.journey.nextQuestion).toBeNull()
    expect(final.journey.status).toBe('NEEDS_VERIFICATION')
    expect(final.journey.reason).toBe('missing_information_without_question')
    expect(final.journey.counts.NOT_ELIGIBLE).toBe(0)
    expect(final.journey.answers).toEqual([])
  })
})
