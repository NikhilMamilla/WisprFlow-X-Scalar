// Citizen journey orchestration. This module owns *sequencing*, not eligibility:
// every evaluation comes from explainForCitizen(), which is built on
// matcher.matchScheme() and the rule evaluations. Nothing here decides whether a
// citizen qualifies, and nothing here invents a question the explanation layer
// did not ask for.
//
// State is in memory only and every stored session is frozen. Callers receive a
// fresh view object; mutating it cannot change a session.
import { parseYesNo } from './answers'
import {
  explainForCitizen,
  questionForField,
  type CitizenExplanation,
  type CitizenExclusion,
  type CitizenQuestion,
  type CitizenReport,
  type CitizenState,
} from './citizen'
import { findRegion, normalizeDistrict } from './geo'
import { matchSchemes, type MatchResult } from './matcher'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { BOOLEAN_FIELDS, OCCUPATIONS, emptyProfile, type Occupation, type Profile, type ProfileField } from './types'

export type JourneyStatus = 'COLLECTING_INFORMATION' | 'READY_WITH_RESULTS' | 'NEEDS_VERIFICATION' | 'PAUSED' | 'COMPLETED'

export type JourneyReason =
  | 'questions_remaining'
  | 'results_ready'
  | 'verification_uncertainty'
  | 'missing_information_without_question'
  | 'no_applicable_schemes'
  | 'paused_by_citizen'
  | 'completed_by_citizen'

export type AnswerAction = 'ANSWER' | 'CORRECTION'

// An append-only log entry. A correction never edits an earlier entry: it adds a
// new one with the previous value beside it, so history stays truthful.
export interface AnswerRecord {
  questionId: string
  field: ProfileField
  value: string | number | boolean
  action: AnswerAction
  previousValue?: string | number | boolean
  sequence: number
  answeredAt: string
}

// A skip says "not now", never "no". It is a separate log so no rule can read it
// as an answer.
export interface SkipRecord {
  questionId: string
  field: ProfileField
  sequence: number
  skippedAt: string
}

export interface JourneySession {
  readonly id: string
  readonly profile: Profile
  // Engine output, kept for traceability: one MatchResult per evaluated scheme.
  // The explanations beside it come from the citizen layer over the same profile.
  readonly matchResults: readonly MatchResult[]
  readonly explanations: readonly CitizenExplanation[]
  readonly excluded: readonly CitizenExclusion[]
  readonly questions: readonly CitizenQuestion[]
  readonly nextQuestion: CitizenQuestion | null
  readonly status: JourneyStatus
  readonly reason: JourneyReason
  readonly answers: readonly AnswerRecord[]
  readonly skips: readonly SkipRecord[]
  // Set only by an explicit revisit request; cleared on the next answer or skip.
  readonly revisitQuestion: ProfileField | null
  readonly paused: boolean
  readonly completed: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

// Grouped for the results screen. Every entry is the full explanation, so no
// condition, reason, source or blocker is lost by grouping.
export interface JourneyResults {
  likelyEligible: CitizenExplanation[]
  notEligible: CitizenExplanation[]
  moreInformationNeeded: CitizenExplanation[]
  needsVerification: CitizenExplanation[]
}

export interface JourneyView {
  sessionId: string
  status: JourneyStatus
  reason: JourneyReason
  profile: Profile
  results: JourneyResults
  counts: Record<CitizenState, number>
  excluded: CitizenExclusion[]
  questions: CitizenQuestion[]
  nextQuestion: CitizenQuestion | null
  answers: AnswerRecord[]
  skips: SkipRecord[]
  revisitQuestion: ProfileField | null
  createdAt: string
  updatedAt: string
}

export type JourneyErrorCode =
  | 'UNKNOWN_SESSION'
  | 'INVALID_PROFILE'
  | 'UNKNOWN_QUESTION'
  | 'QUESTION_ALREADY_ANSWERED'
  | 'QUESTION_NOT_CURRENT'
  | 'INVALID_ANSWER'
  | 'NOTHING_TO_SKIP'
  | 'QUESTION_NOT_ANSWERED'
  | 'SESSION_PAUSED'
  | 'SESSION_COMPLETED'
  | 'INVALID_STATE'

export interface JourneyError {
  code: JourneyErrorCode
  message: string
  details?: Record<string, string | number>
}

export type JourneyResponse = { ok: true; journey: JourneyView } | { ok: false; error: JourneyError }

// Internal outcome: carries the session so the store keeps one frozen object
// instead of rebuilding it from a view.
export type JourneyOutcome = { ok: true; session: JourneySession } | { ok: false; error: JourneyError }

export interface JourneyOptions {
  schemes?: Scheme[]
  now?: () => string
  createId?: () => string
}

const DEFAULT_NOW = (): string => new Date().toISOString()
const DEFAULT_ID = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `journey-${Date.now().toString(36)}`

const fail = (error: JourneyError): JourneyOutcome => ({ ok: false, error })

// A frozen copy so no caller can edit a session through a returned reference.
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value
  for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key])
  return Object.freeze(value)
}

const BOOLEAN_PROFILE_FIELDS = [...BOOLEAN_FIELDS] as const
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

// ---------------------------------------------------------------------------
// Profile validation (input only: the engine never fills a missing field)
// ---------------------------------------------------------------------------

export type ProfileValidation = { ok: true; profile: Profile } | { ok: false; error: JourneyError }

const invalidProfile = (message: string, details?: Record<string, string | number>): ProfileValidation => ({
  ok: false,
  error: { code: 'INVALID_PROFILE', message, ...(details ? { details } : {}) },
})

function isNumberIn(value: unknown, min: number, max: number, integer: boolean): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value))
}

// Accepts a partial Profile: anything omitted or null stays unknown. A malformed
// value is rejected instead of dropped, so a typo cannot silently change which
// questions the citizen is asked.
export function validateInitialProfile(input: unknown): ProfileValidation {
  if (!isRecord(input)) return invalidProfile('profile must be an object')
  const profile = emptyProfile()
  const field = (name: ProfileField) => input[name]

  const age = field('age')
  if (age !== undefined && age !== null) {
    if (!isNumberIn(age, 0, 120, true)) return invalidProfile('age must be a whole number between 0 and 120', { field: 'age' })
    profile.age = age
  }

  const income = field('monthly_income')
  if (income !== undefined && income !== null) {
    if (!isNumberIn(income, 0, Number.MAX_SAFE_INTEGER, false)) {
      return invalidProfile('monthly_income must be a number of 0 or more', { field: 'monthly_income' })
    }
    profile.monthly_income = income
  }

  const dependants = field('dependants')
  if (dependants !== undefined && dependants !== null) {
    if (!isNumberIn(dependants, 0, 50, true)) {
      return invalidProfile('dependants must be a whole number between 0 and 50', { field: 'dependants' })
    }
    profile.dependants = dependants
  }

  const occupation = field('occupation')
  if (occupation !== undefined && occupation !== null) {
    if (typeof occupation !== 'string' || !(OCCUPATIONS as readonly string[]).includes(occupation)) {
      return invalidProfile('occupation is not a known work type', { field: 'occupation' })
    }
    profile.occupation = occupation as Occupation
  }

  const urban = field('urban_or_rural')
  if (urban !== undefined && urban !== null) {
    if (urban !== 'urban' && urban !== 'rural') {
      return invalidProfile('urban_or_rural must be "urban" or "rural"', { field: 'urban_or_rural' })
    }
    profile.urban_or_rural = urban
  }

  for (const name of BOOLEAN_PROFILE_FIELDS) {
    const value = input[name]
    if (value !== undefined && value !== null) {
      if (typeof value !== 'boolean') return invalidProfile(`${name} must be true or false`, { field: name })
      profile[name] = value
    }
  }

  const state = field('state')
  if (state !== undefined && state !== null) {
    if (typeof state !== 'string') return invalidProfile('state must be a place name', { field: 'state' })
    const region = findRegion(state)
    // An unrecognised state would wrongly exclude every state scheme, so it is
    // rejected here rather than stored.
    if (!region) return invalidProfile(`"${state}" is not a recognised state or union territory`, { field: 'state' })
    profile.state = region.name
  }

  const district = field('district')
  if (district !== undefined && district !== null) {
    if (typeof district !== 'string') return invalidProfile('district must be a place name', { field: 'district' })
    const parsed = normalizeDistrict(district)
    if (!parsed) return invalidProfile(`"${district}" is not a usable district name`, { field: 'district' })
    profile.district = parsed.value
  }

  if (input.evidence !== undefined && !isRecord(input.evidence)) {
    return invalidProfile('evidence must be an object of spoken phrases')
  }
  profile.evidence = {}
  return { ok: true, profile }
}

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

function deriveStatus(
  report: CitizenReport,
  nextQuestion: CitizenQuestion | null,
  paused: boolean,
  completed: boolean,
): { status: JourneyStatus; reason: JourneyReason } {
  if (completed) return { status: 'COMPLETED', reason: 'completed_by_citizen' }
  if (paused) return { status: 'PAUSED', reason: 'paused_by_citizen' }
  if (nextQuestion) return { status: 'COLLECTING_INFORMATION', reason: 'questions_remaining' }
  if (report.results.length === 0) return { status: 'COMPLETED', reason: 'no_applicable_schemes' }
  const states = report.results.map((result) => result.state)
  // Without questions left, "more information" can never be resolved by this
  // journey: say so instead of presenting the result as final.
  if (states.includes('MORE_INFORMATION_NEEDED')) {
    return { status: 'NEEDS_VERIFICATION', reason: 'missing_information_without_question' }
  }
  const decisive = states.some((state) => state === 'LIKELY_ELIGIBLE' || state === 'NOT_ELIGIBLE')
  if (!decisive) return { status: 'NEEDS_VERIFICATION', reason: 'verification_uncertainty' }
  return { status: 'READY_WITH_RESULTS', reason: 'results_ready' }
}

// ---------------------------------------------------------------------------
// Question selection
// ---------------------------------------------------------------------------

// Tie-break chain, in order:
//   1. an explicit revisit request, when that question is still open
//   2. unskipped questions over questions skipped once
//   3. more schemes resolved (citizenQuestions already orders by this)
//   4. a field some scheme in play can provide (a bank account also points at PMJDY)
//   5. a fixed field order
//   6. question id, so two runs can never disagree
const QUESTION_PRIORITY: ProfileField[] = [
  'age',
  'monthly_income',
  'occupation',
  'urban_or_rural',
  'state',
  'district',
  'has_bank_account',
  'has_aadhaar',
  'in_epf_esic_nps',
  'pays_income_tax',
  'dependants',
]

// Skip policy, in one place:
//   - a skipped question is never offered again while another open question has
//     not been skipped;
//   - once every other open question is answered or skipped, the earliest skipped
//     question is offered once more (a single revisit);
//   - a second skip is final, so the loop always ends.
// The rule reads only the skip log, so the same log always gives the same answer.
export interface SelectionPolicy {
  skips?: readonly SkipRecord[]
  revisit?: ProfileField | null
}

function skipCounts(skips: readonly SkipRecord[]): Map<ProfileField, { count: number; first: number }> {
  const counts = new Map<ProfileField, { count: number; first: number }>()
  for (const skip of skips) {
    const entry = counts.get(skip.field)
    if (entry) entry.count += 1
    else counts.set(skip.field, { count: 1, first: skip.sequence })
  }
  return counts
}

export function selectNextQuestion(
  questions: readonly CitizenQuestion[],
  profile: Profile,
  schemes: readonly Scheme[] = SCHEMES,
  policy: SelectionPolicy = {},
): CitizenQuestion | null {
  const open = questions.filter((question) => profile[question.field] === null)
  if (open.length === 0) return null

  if (policy.revisit) {
    const wanted = open.find((question) => question.field === policy.revisit)
    if (wanted) return wanted
  }

  const counts = skipCounts(policy.skips ?? [])
  const fresh = open.filter((question) => (counts.get(question.field)?.count ?? 0) === 0)
  if (fresh.length === 0) {
    // Only questions skipped exactly once may come back, earliest first. Twice
    // skipped questions are done with.
    const revisitable = open
      .filter((question) => counts.get(question.field)?.count === 1)
      .sort((a, b) => (counts.get(a.field)?.first ?? 0) - (counts.get(b.field)?.first ?? 0))
    return revisitable[0] ?? null
  }

  const provided = new Set<string>()
  for (const scheme of schemes) for (const field of scheme.provides ?? []) provided.add(field)
  const ranked = fresh
    .map((question) => ({ question, rank: QUESTION_PRIORITY.indexOf(question.field) }))
    .sort((a, b) => {
      if (b.question.schemes.length !== a.question.schemes.length) return b.question.schemes.length - a.question.schemes.length
      const aUnblocks = provided.has(a.question.field) ? 1 : 0
      const bUnblocks = provided.has(b.question.field) ? 1 : 0
      if (aUnblocks !== bUnblocks) return bUnblocks - aUnblocks
      if (a.rank !== b.rank) return a.rank - b.rank
      return a.question.id.localeCompare(b.question.id)
    })
  return ranked[0].question
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

interface SessionState {
  id: string
  profile: Profile
  answers: AnswerRecord[]
  skips: SkipRecord[]
  revisitQuestion: ProfileField | null
  createdAt: string
  updatedAt: string
  paused: boolean
  completed: boolean
}

function buildSession(state: SessionState, schemes: Scheme[]): JourneySession {
  const report = explainForCitizen(state.profile, schemes)
  const nextQuestion = selectNextQuestion(report.questions, state.profile, schemes, {
    skips: state.skips,
    revisit: state.revisitQuestion,
  })
  const { status, reason } = deriveStatus(report, nextQuestion, state.paused, state.completed)
  return deepFreeze({
    id: state.id,
    profile: state.profile,
    // Engine trace for the same profile; the explanations above are derived from
    // the same matcher and never override it.
    matchResults: matchSchemes(state.profile, schemes),
    explanations: report.results,
    excluded: report.excluded,
    questions: report.questions,
    nextQuestion,
    status,
    reason,
    answers: state.answers,
    skips: state.skips,
    revisitQuestion: state.revisitQuestion,
    paused: state.paused,
    completed: state.completed,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
  })
}

// Rebuilds a session from its current logs, so every operation runs through the
// same re-evaluation path and can never leave a half-updated session.
function rebuild(
  session: JourneySession,
  changes: Partial<SessionState>,
  schemes: Scheme[],
  timestamp: string,
): JourneySession {
  return buildSession(
    {
      id: session.id,
      profile: session.profile,
      answers: [...session.answers],
      skips: [...session.skips],
      revisitQuestion: session.revisitQuestion,
      createdAt: session.createdAt,
      updatedAt: timestamp,
      paused: false,
      completed: false,
      ...changes,
    },
    schemes,
  )
}

// ---------------------------------------------------------------------------
// Creation and the answer loop
// ---------------------------------------------------------------------------

export function beginJourney(input: unknown, options: JourneyOptions = {}): JourneyOutcome {
  const validated = validateInitialProfile(input)
  if (!validated.ok) return fail(validated.error)
  const now = options.now ?? DEFAULT_NOW
  const timestamp = now()
  const session = buildSession(
    {
      id: (options.createId ?? DEFAULT_ID)(),
      profile: validated.profile,
      answers: [],
      skips: [],
      revisitQuestion: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      paused: false,
      completed: false,
    },
    options.schemes ?? SCHEMES,
  )
  return { ok: true, session }
}

// Answer normalisation happens before the profile is touched, so a rejected
// answer leaves the session and its answer history exactly as they were.
function normalizeAnswer(
  question: CitizenQuestion,
  raw: unknown,
): { ok: true; value: string | number | boolean } | { ok: false; error: JourneyError } {
  const reject = (reason: string) => ({
    ok: false as const,
    error: {
      code: 'INVALID_ANSWER' as const,
      message: `That answer does not fit the question "${question.text}".`,
      details: { field: question.field, reason },
    },
  })
  const { field, validation } = question

  if (field === 'age' || field === 'monthly_income' || field === 'dependants') {
    const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw
    if (typeof value !== 'number' || !Number.isFinite(value)) return reject('a number is required')
    if (validation?.min !== undefined && value < validation.min) return reject(`must be at least ${validation.min}`)
    if (validation?.max !== undefined && value > validation.max) return reject(`must be at most ${validation.max}`)
    if (validation?.integer && !Number.isInteger(value)) return reject('must be a whole number')
    return { ok: true, value }
  }

  if (field === 'occupation') {
    if (typeof raw !== 'string') return reject('a work type is required')
    const options = validation?.options ?? []
    const index = options.findIndex((option) => option.toLowerCase() === raw.trim().toLowerCase())
    if (index >= 0) return { ok: true, value: OCCUPATIONS[index] }
    const direct = raw.trim().toLowerCase()
    if ((OCCUPATIONS as readonly string[]).includes(direct)) return { ok: true, value: direct }
    return reject('not a listed work type')
  }

  if (field === 'state') {
    if (typeof raw !== 'string') return reject('a state name is required')
    const region = findRegion(raw)
    if (!region) return reject('not a recognised state or union territory')
    return { ok: true, value: region.name }
  }

  if (field === 'district') {
    if (typeof raw !== 'string') return reject('a district name is required')
    const district = normalizeDistrict(raw)
    if (!district) return reject('not a usable district name')
    return { ok: true, value: district.value }
  }

  // urban_or_rural and the boolean fields answer yes/no, in words or as booleans.
  if (field === 'urban_or_rural') {
    if (typeof raw === 'boolean') return { ok: true, value: raw ? 'urban' : 'rural' }
    if (typeof raw === 'string') {
      const answer = parseYesNo(raw)
      if (answer) return { ok: true, value: answer === 'yes' ? 'urban' : 'rural' }
    }
    return reject('answer yes or no')
  }

  if (typeof raw === 'boolean') return { ok: true, value: raw }
  if (typeof raw === 'string') {
    const answer = parseYesNo(raw)
    if (answer) return { ok: true, value: answer === 'yes' }
  }
  return reject('answer yes or no')
}

// Every mutating operation shares these two checks, so a new operation cannot
// forget one of them.
function guardMutable(session: JourneySession, action: string): JourneyError | null {
  if (session.completed) {
    return {
      code: 'SESSION_COMPLETED',
      message: `This journey is complete. Resume it before ${action}.`,
      details: { sessionId: session.id },
    }
  }
  if (session.paused) {
    return {
      code: 'SESSION_PAUSED',
      message: `This journey is paused. Resume it before ${action}.`,
      details: { sessionId: session.id },
    }
  }
  return null
}

export function submitAnswer(session: JourneySession, questionId: string, raw: unknown, options: JourneyOptions = {}): JourneyOutcome {
  const blocked = guardMutable(session, 'adding another answer')
  if (blocked) return fail(blocked)

  const answered = session.answers.find((entry) => entry.questionId === questionId)
  if (answered) {
    return fail({
      code: 'QUESTION_ALREADY_ANSWERED',
      message: 'That question has already been answered in this journey.',
      details: { questionId, field: answered.field },
    })
  }

  const question = session.questions.find((entry) => entry.id === questionId)
  if (!question) {
    return fail({ code: 'UNKNOWN_QUESTION', message: 'That question is not part of this journey.', details: { questionId } })
  }

  // One question at a time: an older, no-longer-current question must not be
  // answered out of order.
  if (session.nextQuestion?.id !== questionId) {
    return fail({
      code: 'QUESTION_NOT_CURRENT',
      message: 'That question is no longer the current one.',
      details: { questionId, current: session.nextQuestion?.id ?? '' },
    })
  }

  const normalized = normalizeAnswer(question, raw)
  if (!normalized.ok) return fail(normalized.error)

  const timestamp = (options.now ?? DEFAULT_NOW)()
  const profile = { ...session.profile, [question.field]: normalized.value } as Profile
  const record: AnswerRecord = {
    questionId: question.id,
    field: question.field,
    value: normalized.value,
    action: 'ANSWER',
    sequence: session.answers.length + session.skips.length + 1,
    answeredAt: timestamp,
  }
  const next = rebuild(
    session,
    {
      profile,
      answers: [...session.answers, record],
      // Answering a revisited question clears the revisit request.
      revisitQuestion: null,
    },
    options.schemes ?? SCHEMES,
    timestamp,
  )
  return { ok: true, session: next }
}

// Correction replaces the latest value for a field. Earlier history is kept: the
// new record names the value it replaced, so the log can be read backwards.
export function correctAnswer(session: JourneySession, field: ProfileField, raw: unknown, options: JourneyOptions = {}): JourneyOutcome {
  const blocked = guardMutable(session, 'correcting an answer')
  if (blocked) return fail(blocked)

  const earlier = session.answers.filter((entry) => entry.field === field)
  if (earlier.length === 0) {
    return fail({
      code: 'QUESTION_NOT_ANSWERED',
      message: 'That field has no answer to correct yet.',
      details: { field },
    })
  }

  // The canonical question for the field supplies the same validation the answer
  // path used, even when the question is no longer being asked.
  const question = questionForField(field)
  const normalized = normalizeAnswer(question, raw)
  if (!normalized.ok) return fail(normalized.error)

  const timestamp = (options.now ?? DEFAULT_NOW)()
  const previous = earlier[earlier.length - 1]
  const record: AnswerRecord = {
    questionId: previous.questionId,
    field,
    value: normalized.value,
    action: 'CORRECTION',
    previousValue: previous.value,
    sequence: session.answers.length + session.skips.length + 1,
    answeredAt: timestamp,
  }
  const next = rebuild(
    session,
    {
      profile: { ...session.profile, [field]: normalized.value } as Profile,
      answers: [...session.answers, record],
      revisitQuestion: session.revisitQuestion === field ? null : session.revisitQuestion,
    },
    options.schemes ?? SCHEMES,
    timestamp,
  )
  return { ok: true, session: next }
}

// Skipping records "not now" and nothing else: the profile is untouched, so no
// rule can read a skip as a no.
export function skipQuestion(session: JourneySession, questionId?: string, options: JourneyOptions = {}): JourneyOutcome {
  const blocked = guardMutable(session, 'skipping a question')
  if (blocked) return fail(blocked)
  const current = session.nextQuestion
  if (!current) {
    return fail({ code: 'NOTHING_TO_SKIP', message: 'There is no open question to skip.', details: { sessionId: session.id } })
  }
  if (questionId !== undefined) {
    if (!session.questions.some((question) => question.id === questionId)) {
      return fail({ code: 'UNKNOWN_QUESTION', message: 'That question is not part of this journey.', details: { questionId } })
    }
    if (current.id !== questionId) {
      return fail({
        code: 'QUESTION_NOT_CURRENT',
        message: 'That question is no longer the current one.',
        details: { questionId, current: current.id },
      })
    }
  }

  const timestamp = (options.now ?? DEFAULT_NOW)()
  const record: SkipRecord = {
    questionId: current.id,
    field: current.field,
    sequence: session.answers.length + session.skips.length + 1,
    skippedAt: timestamp,
  }
  const next = rebuild(
    session,
    { skips: [...session.skips, record], revisitQuestion: null },
    options.schemes ?? SCHEMES,
    timestamp,
  )
  return { ok: true, session: next }
}

// Put a skipped question back in front of the citizen without erasing the record
// that it was skipped. The policy allows one revisit per question.
export function revisitSkipped(session: JourneySession, field: ProfileField, options: JourneyOptions = {}): JourneyOutcome {
  const blocked = guardMutable(session, 'revisiting a question')
  if (blocked) return fail(blocked)
  if (session.profile[field] !== null) {
    return fail({ code: 'INVALID_STATE', message: 'That question has already been answered.', details: { field } })
  }
  if (!session.skips.some((skip) => skip.field === field)) {
    return fail({ code: 'INVALID_STATE', message: 'That question was not skipped in this journey.', details: { field } })
  }
  if (!session.questions.some((question) => question.field === field)) {
    return fail({ code: 'INVALID_STATE', message: 'That question is no longer part of this journey.', details: { field } })
  }

  const timestamp = (options.now ?? DEFAULT_NOW)()
  return { ok: true, session: rebuild(session, { revisitQuestion: field }, options.schemes ?? SCHEMES, timestamp) }
}

// Pause/resume/complete are explicit transitions: derived state alone never
// moves a journey into PAUSED or COMPLETED.
export function pauseJourney(session: JourneySession, options: JourneyOptions = {}): JourneyOutcome {
  if (session.paused) return { ok: true, session }
  if (session.completed) {
    return fail({ code: 'SESSION_COMPLETED', message: 'This journey is already complete.', details: { sessionId: session.id } })
  }
  const timestamp = (options.now ?? DEFAULT_NOW)()
  return { ok: true, session: rebuild(session, { paused: true }, options.schemes ?? SCHEMES, timestamp) }
}

export function resumeJourney(session: JourneySession, options: JourneyOptions = {}): JourneyOutcome {
  // A completed journey may be reopened explicitly; the status is re-derived from
  // the profile, never restored from the old snapshot.
  if (!session.paused && !session.completed) {
    return fail({
      code: 'INVALID_STATE',
      message: 'This journey is neither paused nor complete.',
      details: { sessionId: session.id, status: session.status },
    })
  }
  const timestamp = (options.now ?? DEFAULT_NOW)()
  return { ok: true, session: rebuild(session, { paused: false, completed: false }, options.schemes ?? SCHEMES, timestamp) }
}

// Completed is terminal; resumeJourney() is the only way back, and it re-derives
// the status from the profile rather than restoring a stale one.
export function completeJourney(session: JourneySession, options: JourneyOptions = {}): JourneyOutcome {
  if (session.completed) return { ok: true, session }
  const timestamp = (options.now ?? DEFAULT_NOW)()
  return { ok: true, session: rebuild(session, { completed: true, paused: false }, options.schemes ?? SCHEMES, timestamp) }
}

// ---------------------------------------------------------------------------
// Views and the in-memory store
// ---------------------------------------------------------------------------

const GROUP_FOR_STATE = {
  LIKELY_ELIGIBLE: 'likelyEligible',
  NOT_ELIGIBLE: 'notEligible',
  MORE_INFORMATION_NEEDED: 'moreInformationNeeded',
  NEEDS_VERIFICATION: 'needsVerification',
} as const

export function viewOf(session: JourneySession): JourneyView {
  const results: JourneyResults = { likelyEligible: [], notEligible: [], moreInformationNeeded: [], needsVerification: [] }
  for (const explanation of session.explanations) results[GROUP_FOR_STATE[explanation.state]].push(explanation)
  return {
    sessionId: session.id,
    status: session.status,
    reason: session.reason,
    profile: session.profile,
    results,
    counts: {
      LIKELY_ELIGIBLE: results.likelyEligible.length,
      NOT_ELIGIBLE: results.notEligible.length,
      MORE_INFORMATION_NEEDED: results.moreInformationNeeded.length,
      NEEDS_VERIFICATION: results.needsVerification.length,
    },
    excluded: [...session.excluded],
    questions: [...session.questions],
    nextQuestion: session.nextQuestion,
    answers: [...session.answers],
    skips: [...session.skips],
    revisitQuestion: session.revisitQuestion,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  }
}

const response = (outcome: JourneyOutcome): JourneyResponse =>
  outcome.ok ? { ok: true, journey: viewOf(outcome.session) } : outcome

export function startJourney(input: unknown, options: JourneyOptions = {}): JourneyResponse {
  return response(beginJourney(input, options))
}

// Stateless helpers for a caller that already holds a session.
export function answerQuestion(session: JourneySession, questionId: string, raw: unknown, options: JourneyOptions = {}): JourneyResponse {
  return response(submitAnswer(session, questionId, raw, options))
}

export function correct(session: JourneySession, field: ProfileField, raw: unknown, options: JourneyOptions = {}): JourneyResponse {
  return response(correctAnswer(session, field, raw, options))
}

export function skip(session: JourneySession, questionId?: string, options: JourneyOptions = {}): JourneyResponse {
  return response(skipQuestion(session, questionId, options))
}

export function revisit(session: JourneySession, field: ProfileField, options: JourneyOptions = {}): JourneyResponse {
  return response(revisitSkipped(session, field, options))
}

export function pause(session: JourneySession, options: JourneyOptions = {}): JourneyResponse {
  return response(pauseJourney(session, options))
}

export function resume(session: JourneySession, options: JourneyOptions = {}): JourneyResponse {
  return response(resumeJourney(session, options))
}

export function complete(session: JourneySession, options: JourneyOptions = {}): JourneyResponse {
  return response(completeJourney(session, options))
}

// In-memory sessions. Restarting the process loses every journey: that is the
// documented contract, not an accident.
const unknownSession = (sessionId: string): JourneyResponse => ({
  ok: false,
  error: { code: 'UNKNOWN_SESSION', message: 'No journey exists with that id.', details: { sessionId } },
})

export class JourneyStore {
  private readonly sessions = new Map<string, JourneySession>()
  private readonly options: JourneyOptions

  constructor(options: JourneyOptions = {}) {
    this.options = options
  }

  start(input: unknown): JourneyResponse {
    return this.keep(beginJourney(input, this.options))
  }

  get(sessionId: string): JourneyResponse {
    const session = this.sessions.get(sessionId)
    return session ? response({ ok: true, session }) : unknownSession(sessionId)
  }

  has(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }

  answer(sessionId: string, questionId: string, raw: unknown): JourneyResponse {
    return this.apply(sessionId, (session) => submitAnswer(session, questionId, raw, this.options))
  }

  correct(sessionId: string, field: ProfileField, raw: unknown): JourneyResponse {
    return this.apply(sessionId, (session) => correctAnswer(session, field, raw, this.options))
  }

  skip(sessionId: string, questionId?: string): JourneyResponse {
    return this.apply(sessionId, (session) => skipQuestion(session, questionId, this.options))
  }

  revisit(sessionId: string, field: ProfileField): JourneyResponse {
    return this.apply(sessionId, (session) => revisitSkipped(session, field, this.options))
  }

  pause(sessionId: string): JourneyResponse {
    return this.apply(sessionId, (session) => pauseJourney(session, this.options))
  }

  resume(sessionId: string): JourneyResponse {
    return this.apply(sessionId, (session) => resumeJourney(session, this.options))
  }

  complete(sessionId: string): JourneyResponse {
    return this.apply(sessionId, (session) => completeJourney(session, this.options))
  }

  // Only the store holds sessions; there is no way to look one up another way.
  size(): number {
    return this.sessions.size
  }

  // Look the session up, run the operation, store the result only if it succeeded.
  private apply(sessionId: string, step: (session: JourneySession) => JourneyOutcome): JourneyResponse {
    const session = this.sessions.get(sessionId)
    return session ? this.keep(step(session)) : unknownSession(sessionId)
  }

  private keep(outcome: JourneyOutcome): JourneyResponse {
    if (!outcome.ok) return outcome
    this.sessions.set(outcome.session.id, outcome.session)
    return { ok: true, journey: viewOf(outcome.session) }
  }
}
