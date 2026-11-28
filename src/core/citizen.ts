// Citizen-facing explanation layer. This module does not decide eligibility:
// every result comes from matcher.matchScheme(), and every condition row is a
// RuleEvaluation the engine already produced. What is added here is vocabulary
// (LIKELY_ELIGIBLE / NOT_ELIGIBLE / MORE_INFORMATION_NEEDED / NEEDS_VERIFICATION),
// per-condition reasons, questions derived only from unanswered conditions, and
// provenance the citizen can check.
//
// Nothing here is generated: no amount, date, document or link is invented, and
// a missing value stays missing instead of being filled to look complete.
import { REGIONS } from './geo'
import { matchScheme, type MatchResult } from './matcher'
import type { ExpectedValue, EvaluationResult, RuleEvaluation, RuleId, RuleValue } from './rules'
import { isOfficialUrl, type Scheme, type SchemeSource, type VerificationStatus } from './scheme'
import { SCHEMES } from './schemes'
import { OCCUPATIONS, type BooleanField, type Occupation, type Profile, type ProfileField } from './types'

// Shown wherever the register has no verified answer. Never replaced by a guess.
export const NOT_VERIFIED = 'Information not verified yet.'

export type CitizenState = 'LIKELY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'MORE_INFORMATION_NEEDED' | 'NEEDS_VERIFICATION'

export const CITIZEN_STATES: readonly CitizenState[] = [
  'LIKELY_ELIGIBLE',
  'NOT_ELIGIBLE',
  'MORE_INFORMATION_NEEDED',
  'NEEDS_VERIFICATION',
]

export type ConditionResult = 'PASSED' | 'FAILED' | 'UNKNOWN'

export interface CitizenSource {
  title: string | null // never invented; null when the record has no title
  url: string
  department: string | null
  official: boolean
  verificationStatus: VerificationStatus
  checkedOn: string | null
  note: string | null
}

export interface CitizenCondition {
  id: string // `${schemeId}:${ruleId}` — stable across runs
  ruleId: RuleId | 'geography_state' | 'geography_district' | `only_if:${BooleanField}`
  statement: string // what the scheme asks for, in plain words
  result: ConditionResult
  reason: string
  yourValue: RuleValue | null
  yourValueText: string | null
  requirement: string
  requirementValue: ExpectedValue
  prerequisite: boolean
  explanationKey: string // i18n key; the English text above is a fallback, not the only copy
  sourceUrl: string | null // scheme-level provenance; rules carry no per-condition source
}

export interface CitizenEvidence {
  sufficient: boolean
  status: VerificationStatus
  checkedOn: string | null
  reasons: string[] // why the evidence is short, in citizen words
  notes: string[] // what the register itself records as uncertain
}

export interface CitizenApplicationInfo {
  procedure: string[]
  link: string | null
  helpline: string | null
  deadline: string | null
  documents: string[]
  amount: string | null
  unavailable: string[] // names of fields with no verified value
}

export interface CitizenExplanation {
  schemeId: string
  name: string
  state: CitizenState
  summary: string
  conditions: CitizenCondition[]
  satisfied: string[] // condition ids
  failed: string[] // condition ids that are confirmed mandatory failures
  unknown: string[] // condition ids still unanswered
  // Scheme ids that would unblock a failed prerequisite (e.g. a bank account).
  blockedBy: BooleanField[]
  unlockedBy: string | null
  evidence: CitizenEvidence
  sources: CitizenSource[]
  application: CitizenApplicationInfo
}

export type ExclusionReason = 'outside_your_state' | 'does_not_apply_to_you' | 'discontinued'

export interface CitizenExclusion {
  schemeId: string
  name: string
  reason: ExclusionReason
  detail: string
}

export type CitizenQuestionGroup = 'about_you' | 'your_home' | 'your_work' | 'your_situation'

export type CitizenQuestionInput = 'number' | 'yes_no' | 'choice' | 'text'

export interface CitizenQuestionValidation {
  min?: number
  max?: number
  integer?: boolean
  options?: string[]
}

export interface CitizenQuestion {
  id: string // `question_<field>` — the same field is one question, always
  field: ProfileField
  text: string
  help: string | null
  input: CitizenQuestionInput
  group: CitizenQuestionGroup
  required: boolean
  schemes: string[]
  conditions: string[] // citizen condition ids this question settles
  validation?: CitizenQuestionValidation
}

export interface CitizenReport {
  results: CitizenExplanation[]
  excluded: CitizenExclusion[]
  questions: CitizenQuestion[]
  counts: Record<CitizenState, number>
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const FIELD_LABEL: Record<ProfileField, string> = {
  age: 'your age',
  occupation: 'your work',
  urban_or_rural: 'where you live',
  monthly_income: 'your monthly income',
  has_bank_account: 'a bank account',
  has_aadhaar: 'an Aadhaar card',
  in_epf_esic_nps: 'PF, ESIC or NPS membership',
  pays_income_tax: 'paying income tax',
  worked_90_days_construction: '90 days of construction work',
  dependants: 'the number of people who depend on you',
  state: 'your state',
  district: 'your district',
}

const OCCUPATION_LABEL: Record<Occupation, string> = {
  street_vendor: 'street vendor',
  construction_worker: 'construction worker',
  delivery_rider: 'delivery rider',
  domestic_worker: 'domestic worker',
  other: 'other work',
}

const BOOLEAN_LABEL: Record<BooleanField, string> = {
  has_bank_account: 'a bank account in your own name',
  has_aadhaar: 'an Aadhaar card',
  in_epf_esic_nps: 'PF, ESIC or NPS membership',
  pays_income_tax: 'income tax payment',
  worked_90_days_construction: '90 days of construction work in the last year',
}

// Statement wording for boolean rules: "Have a bank account", "Not pay income tax".
const BOOLEAN_STATEMENT: Record<BooleanField, { have: string; notHave: string }> = {
  has_bank_account: { have: 'Have a bank account in your own name', notHave: 'Not have a bank account in your own name' },
  has_aadhaar: { have: 'Have an Aadhaar card', notHave: 'Not have an Aadhaar card' },
  in_epf_esic_nps: { have: 'Be covered by PF, ESIC or NPS', notHave: 'Not be covered by PF, ESIC or NPS' },
  pays_income_tax: { have: 'Pay income tax', notHave: 'Not pay income tax' },
  worked_90_days_construction: {
    have: 'Have worked 90 days in building or construction in the last 12 months',
    notHave: 'Not have worked 90 days in building or construction in the last 12 months',
  },
}

const rupees = (value: number): string => `₹${value.toLocaleString('en-IN')}`

function formatRequirement(ruleId: string, expected: ExpectedValue): string {
  if (ruleId === 'age_min') return `at least ${expected} years old`
  if (ruleId === 'age_max') return `${expected} years old or younger`
  if (ruleId === 'income_max_monthly') return `a monthly family income of ${rupees(expected as number)} or less`
  if (ruleId === 'occupation_in') {
    return `work as ${(expected as string[]).map((o) => OCCUPATION_LABEL[o as Occupation] ?? o).join(', ')}`
  }
  if (ruleId === 'urban_only') return 'live in a town or city'
  if (ruleId === 'geography_state') return `live in ${(expected as string[]).join(' or ')}`
  if (ruleId === 'geography_district') return `live in one of these districts: ${(expected as string[]).join(', ')}`
  if (ruleId.startsWith('only_if:')) {
    const label = FIELD_LABEL[ruleId.split(':')[1] as ProfileField] ?? ruleId
    return expected === true ? `have ${label}` : `not have ${label}`
  }
  // not:<field> asks the field to be false, requires:<field> asks it to be true.
  return ruleId.startsWith('not:') ? `not have ${BOOLEAN_LABEL[ruleId.slice(4) as BooleanField] ?? ruleId}` : `have ${BOOLEAN_LABEL[ruleId.slice(9) as BooleanField] ?? ruleId}`
}

function statementFor(ruleId: string, expected: ExpectedValue): string {
  if (ruleId === 'age_min') return `Be at least ${expected} years old`
  if (ruleId === 'age_max') return `Be ${expected} years old or younger`
  if (ruleId === 'income_max_monthly') return `Have a monthly family income of ${rupees(expected as number)} or less`
  if (ruleId === 'occupation_in') {
    const list = (expected as string[]).map((o) => OCCUPATION_LABEL[o as Occupation] ?? o)
    return `Work as ${list.slice(0, -1).join(', ')}${list.length > 1 ? ' or ' : ''}${list[list.length - 1]}`
  }
  if (ruleId === 'urban_only') return 'Live in a town or city'
  if (ruleId === 'geography_state') return `Live in ${(expected as string[]).join(' or ')}`
  if (ruleId === 'geography_district') return `Live in one of these districts: ${(expected as string[]).join(', ')}`
  if (ruleId.startsWith('only_if:')) {
    const field = ruleId.split(':')[1] as BooleanField
    const words = BOOLEAN_STATEMENT[field]
    return expected === true ? (words?.have ?? ruleId) : (words?.notHave ?? ruleId)
  }
  const field = ruleId.slice(ruleId.indexOf(':') + 1) as BooleanField
  const words = BOOLEAN_STATEMENT[field]
  if (!words) return ruleId
  return ruleId.startsWith('not:') ? words.notHave : words.have
}

// Raw enum values never reach a citizen: they are mapped to the words the question used.
export function formatAnswer(value: RuleValue, field?: ProfileField): string {
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'number') return String(value)
  if (field === 'occupation') return OCCUPATION_LABEL[value as Occupation] ?? String(value)
  if (field === 'urban_or_rural') return value === 'urban' ? 'a town or city' : 'a village'
  return String(value)
}

function reasonFor(result: EvaluationResult, field: ProfileField, actual: RuleValue | null, requirement: string): string {
  // One neutral sentence: every rule row can use it without producing broken grammar.
  if (result === 'unknown') return 'You have not answered this yet.'
  if (result === 'pass') return `You said ${formatAnswer(actual as RuleValue, field)}.`
  return `You said ${formatAnswer(actual as RuleValue, field)}; this needs ${requirement}.`
}

export function citizenStateForCondition(result: EvaluationResult): ConditionResult {
  return result === 'pass' ? 'PASSED' : result === 'fail' ? 'FAILED' : 'UNKNOWN'
}

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

const INSUFFICIENT_REASON: Partial<Record<VerificationStatus, string>> = {
  PARTIALLY_VERIFIED: 'Only part of this scheme’s rule set has been checked against official documents.',
  UNVERIFIED: 'These rules have not been checked against an official document.',
  UNKNOWN: 'It is not recorded whether these rules were checked against an official document.',
  OUTDATED: 'The official check of these rules has lapsed, so the rules may have changed.',
}

export function assessEvidence(scheme: Scheme): CitizenEvidence {
  const verification = scheme.verification
  const reasons: string[] = []
  if (!scheme.rules_verified) {
    reasons.push(INSUFFICIENT_REASON[verification.status] ?? 'The rules are not confirmed against an official source.')
  }
  if (verification.status === 'VERIFIED' && !verification.checkedOn) {
    reasons.push('No verification date is recorded for these rules.')
  }
  const notes: string[] = []
  if (verification.notes) notes.push(verification.notes)
  if (scheme.verify_note) notes.push(scheme.verify_note)
  return {
    sufficient: reasons.length === 0,
    status: verification.status,
    checkedOn: verification.checkedOn ?? null,
    reasons: [...new Set(reasons)],
    notes,
  }
}

function sourcesFor(scheme: Scheme): CitizenSource[] {
  const declared: SchemeSource[] =
    scheme.verification.sources && scheme.verification.sources.length > 0
      ? scheme.verification.sources
      : [{ title: undefined, url: scheme.source_url }]
  return declared.map((source) => ({
    title: source.title ?? null,
    url: source.url,
    department: source.issuedBy ?? scheme.geography.authority ?? null,
    official: source.official ?? isOfficialUrl(source.url),
    verificationStatus: scheme.verification.status,
    checkedOn: scheme.verification.checkedOn ?? source.lastChecked ?? null,
    note: source.notes ?? null,
  }))
}

// ---------------------------------------------------------------------------
// Application facts
// ---------------------------------------------------------------------------

const APPLICATION_FIELDS = ['procedure', 'application link', 'helpline', 'deadline', 'documents', 'assistance amount'] as const

function applicationFor(scheme: Scheme): CitizenApplicationInfo {
  const application = scheme.application ?? {}
  const benefits = scheme.benefits ?? []
  const first = benefits[0]
  const amount = first?.amount !== undefined ? `${rupees(first.amount)}${first.frequency ? ` ${first.frequency}` : ''}` : null
  const info: CitizenApplicationInfo = {
    procedure: (application.steps ?? []).map((step) => step.en).filter((step) => step.trim() !== ''),
    link: application.url ?? null,
    helpline: application.helpline ?? null,
    deadline: application.deadline ?? null,
    documents: scheme.documents.filter((doc) => doc.required !== false).map((doc) => doc.en),
    amount,
    unavailable: [],
  }
  if (info.procedure.length === 0) info.unavailable.push(APPLICATION_FIELDS[0])
  if (!info.link) info.unavailable.push(APPLICATION_FIELDS[1])
  if (!info.helpline) info.unavailable.push(APPLICATION_FIELDS[2])
  if (!info.deadline) info.unavailable.push(APPLICATION_FIELDS[3])
  if (info.documents.length === 0) info.unavailable.push(APPLICATION_FIELDS[4])
  if (!info.amount) info.unavailable.push(APPLICATION_FIELDS[5])
  return info
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

const conditionId = (schemeId: string, ruleId: string): string => `${schemeId}:${ruleId}`

function ruleCondition(scheme: Scheme, row: RuleEvaluation): CitizenCondition {
  const requirement = formatRequirement(row.ruleId, row.expected)
  const actual = row.actual as RuleValue | null
  return {
    id: conditionId(scheme.id, row.ruleId),
    ruleId: row.ruleId,
    statement: statementFor(row.ruleId, row.expected),
    result: citizenStateForCondition(row.result),
    reason: reasonFor(row.result, row.field as ProfileField, actual, requirement),
    yourValue: actual,
    yourValueText: actual === null ? null : formatAnswer(actual, row.field as ProfileField),
    requirement,
    requirementValue: row.expected,
    prerequisite: row.prerequisite,
    explanationKey: row.explanationKey,
    sourceUrl: scheme.source_url,
  }
}

// Geography and only_if are settled by the matcher before rules run, so they
// need their own rows: a citizen still has to understand why the app is asking
// for a state, and those questions must come from a condition.
function matcherConditions(profile: Profile, match: MatchResult, scheme: Scheme): CitizenCondition[] {
  const rows: CitizenCondition[] = []
  const geo = scheme.geography
  if (geo.scope !== 'central') {
    const states = geo.states ?? []
    const missing = match.missing.includes('state' as ProfileField) || match.geography.result === 'unknown_state' || match.geography.result === 'invalid_metadata'
    const failed = match.geography.result === 'not_applicable'
    const state = profile.state
    rows.push({
      id: conditionId(scheme.id, 'geography_state'),
      ruleId: 'geography_state',
      statement: statementFor('geography_state', states),
      result: failed ? 'FAILED' : missing ? 'UNKNOWN' : 'PASSED',
      reason: failed
        ? `You said ${state}; this scheme covers ${states.join(', ')}.`
        : missing
          ? 'You have not told us your state yet.'
          : `You said ${state}.`,
      yourValue: state,
      yourValueText: state,
      requirement: formatRequirement('geography_state', states),
      requirementValue: states,
      prerequisite: false,
      explanationKey: 'rule_geography_state',
      sourceUrl: scheme.source_url,
    })
  }
  const districts = geo.districts ?? []
  if (districts.length > 0) {
    // A district cannot be settled before the state: an unknown state leaves the
    // district condition unknown too, never passed.
    const missing =
      match.missing.includes('district' as ProfileField) ||
      match.geography.result === 'unknown_district' ||
      match.geography.result === 'unknown_state' ||
      match.geography.result === 'invalid_metadata'
    rows.push({
      id: conditionId(scheme.id, 'geography_district'),
      ruleId: 'geography_district',
      statement: statementFor('geography_district', districts),
      result: match.geography.result === 'not_applicable' ? 'FAILED' : missing ? 'UNKNOWN' : 'PASSED',
      reason: missing
        ? 'You have not told us your district yet.'
        : match.geography.result === 'not_applicable'
          ? `You said ${profile.district}; this scheme is limited to ${districts.join(', ')}.`
          : `You said ${profile.district}.`,
      yourValue: profile.district,
      yourValueText: profile.district,
      requirement: formatRequirement('geography_district', districts),
      requirementValue: districts,
      prerequisite: false,
      explanationKey: 'rule_geography_district',
      sourceUrl: scheme.source_url,
    })
  }
  for (const [field, expected] of Object.entries(scheme.rules.only_if ?? {}) as [BooleanField, boolean][]) {
    const value = profile[field]
    const unknown = match.missing.includes(field as ProfileField)
    const failed = match.status === 'not_needed'
    rows.push({
      id: conditionId(scheme.id, `only_if:${field}`),
      ruleId: `only_if:${field}`,
      statement: statementFor(`only_if:${field}`, expected),
      result: failed ? 'FAILED' : unknown ? 'UNKNOWN' : 'PASSED',
      reason: unknown
        ? `You have not told us ${FIELD_LABEL[field]} yet.`
        : failed
          ? 'This scheme is meant for a different situation.'
          : 'Your answer matches who this scheme is for.',
      yourValue: value,
      yourValueText: value === null ? null : formatAnswer(value as RuleValue, field),
      requirement: formatRequirement(`only_if:${field}`, expected),
      requirementValue: expected,
      prerequisite: false,
      explanationKey: `rule_only_if_${field}`,
      sourceUrl: scheme.source_url,
    })
  }
  return rows
}

// ---------------------------------------------------------------------------
// One scheme
// ---------------------------------------------------------------------------

function exclusionFor(match: MatchResult, scheme: Scheme): CitizenExclusion | null {
  if (match.status === 'not_applicable') {
    if (scheme.verification.status === 'DISCONTINUED') {
      return { schemeId: scheme.id, name: scheme.name_en, reason: 'discontinued', detail: 'This scheme is recorded as discontinued.' }
    }
    const states = scheme.geography.states ?? []
    return {
      schemeId: scheme.id,
      name: scheme.name_en,
      reason: 'outside_your_state',
      detail: states.length > 0 ? `This scheme covers ${states.join(', ')} only.` : 'This scheme does not cover your area.',
    }
  }
  if (match.status === 'not_needed') {
    return {
      schemeId: scheme.id,
      name: scheme.name_en,
      reason: 'does_not_apply_to_you',
      detail: 'This scheme is for people in a different situation from the one you described.',
    }
  }
  return null
}

function stateForScheme(match: MatchResult, evidence: CitizenEvidence): CitizenState {
  const failed = match.evaluations.filter((row) => row.result === 'fail')
  const unknown = match.evaluations.filter((row) => row.result === 'unknown')
  // A confirmed failure on verified rules settles it, even with gaps elsewhere.
  if (failed.length > 0 && evidence.sufficient) return 'NOT_ELIGIBLE'
  if (match.status === 'needs_info' || unknown.length > 0) return 'MORE_INFORMATION_NEEDED'
  if (failed.length > 0) return 'NEEDS_VERIFICATION'
  // All conditions pass, but the rules themselves may not be confirmed.
  return evidence.sufficient ? 'LIKELY_ELIGIBLE' : 'NEEDS_VERIFICATION'
}

function summaryFor(state: CitizenState, conditions: CitizenCondition[]): string {
  const failed = conditions.filter((c) => c.result === 'FAILED')
  const unknown = conditions.filter((c) => c.result === 'UNKNOWN')
  switch (state) {
    case 'LIKELY_ELIGIBLE':
      return `You appear to meet every condition this scheme lists.`
    case 'NOT_ELIGIBLE':
      if (failed.some((c) => c.prerequisite)) return `You need ${failed.filter((c) => c.prerequisite).map((c) => c.statement.toLowerCase()).join(' and ')} before this scheme can apply.`
      return `You do not meet ${failed.length === 1 ? 'one condition' : `${failed.length} conditions`}: ${failed.map((c) => c.statement.toLowerCase()).join('; ')}.`
    case 'MORE_INFORMATION_NEEDED':
      return unknown.length === 1
        ? `One answer is still missing before we can say whether you qualify.`
        : `${unknown.length} answers are still missing before we can say whether you qualify.`
    case 'NEEDS_VERIFICATION':
      return `Your answers fit, but this scheme’s rules are not confirmed: check with the office before relying on this.`
  }
}

export interface ExplainOptions {
  // Injected so a test can supply a scheme without touching the catalogue.
  match?: MatchResult
}

export function explainScheme(profile: Profile, scheme: Scheme, options: ExplainOptions = {}): CitizenExplanation {
  const match = options.match ?? matchScheme(profile, scheme)
  const evidence = assessEvidence(scheme)
  const conditions = [...matcherConditions(profile, match, scheme), ...match.evaluations.map((row) => ruleCondition(scheme, row))]
  const state = stateForScheme(match, evidence)
  const failed = conditions.filter((c) => c.result === 'FAILED').map((c) => c.id)
  const unknown = conditions.filter((c) => c.result === 'UNKNOWN').map((c) => c.id)
  const blockedBy = match.prerequisites ?? []
  return {
    schemeId: scheme.id,
    name: scheme.name_en,
    state,
    summary: summaryFor(state, conditions),
    conditions,
    satisfied: conditions.filter((c) => c.result === 'PASSED').map((c) => c.id),
    failed,
    unknown,
    blockedBy,
    unlockedBy: match.unlocked_by ?? null,
    evidence,
    sources: sourcesFor(scheme),
    application: applicationFor(scheme),
  }
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const QUESTION_TEXT: Record<ProfileField, { text: string; help: string | null; input: CitizenQuestionInput; group: CitizenQuestionGroup; validation?: CitizenQuestionValidation }> = {
  age: { text: 'How old are you?', help: 'In years.', input: 'number', group: 'about_you', validation: { min: 0, max: 120, integer: true } },
  monthly_income: {
    text: 'How much does your household earn in a month?',
    help: 'Add up everyone’s monthly earnings, before any deduction.',
    input: 'number',
    group: 'about_you',
    validation: { min: 0, max: 100000000 },
  },
  dependants: { text: 'How many people depend on your income?', help: null, input: 'number', group: 'about_you', validation: { min: 0, max: 50, integer: true } },
  state: { text: 'Which state do you live in?', help: null, input: 'choice', group: 'your_home', validation: { options: REGIONS.map((r) => r.name) } },
  district: { text: 'Which district do you live in?', help: null, input: 'text', group: 'your_home' },
  urban_or_rural: { text: 'Do you live in a town or city?', help: null, input: 'yes_no', group: 'your_home' },
  occupation: {
    text: 'What work do you do?',
    help: null,
    input: 'choice',
    group: 'your_work',
    validation: { options: OCCUPATIONS.map((o) => OCCUPATION_LABEL[o]) },
  },
  has_bank_account: { text: 'Do you have a bank account in your own name?', help: null, input: 'yes_no', group: 'your_situation' },
  has_aadhaar: { text: 'Do you have an Aadhaar card?', help: null, input: 'yes_no', group: 'your_situation' },
  in_epf_esic_nps: {
    text: 'Does a company deduct PF, ESIC or NPS from your pay?',
    help: null,
    input: 'yes_no',
    group: 'your_situation',
  },
  pays_income_tax: { text: 'Do you pay income tax?', help: null, input: 'yes_no', group: 'your_situation' },
  worked_90_days_construction: {
    text: 'In the last 12 months, did you do building or construction work for 90 days or more?',
    help: 'Count the days you worked on a site, in a year.',
    input: 'yes_no',
    group: 'your_situation',
  },
}

const QUESTION_ORDER: ProfileField[] = [
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

export function questionForField(field: ProfileField): CitizenQuestion {
  const spec = QUESTION_TEXT[field]
  return {
    id: `question_${field}`,
    field,
    text: spec.text,
    help: spec.help,
    input: spec.input,
    group: spec.group,
    required: true,
    schemes: [],
    conditions: [],
    ...(spec.validation ? { validation: spec.validation } : {}),
  }
}

// Only unanswered conditions of schemes that could still go either way produce
// questions. One field is one question, however many schemes need it.
export function citizenQuestions(explanations: readonly CitizenExplanation[]): CitizenQuestion[] {
  const byField = new Map<ProfileField, { schemes: string[]; conditions: string[] }>()
  for (const explanation of explanations) {
    if (explanation.state !== 'MORE_INFORMATION_NEEDED') continue
    for (const condition of explanation.conditions) {
      if (condition.result !== 'UNKNOWN') continue
      const field = fieldForCondition(condition)
      if (!field) continue
      const entry = byField.get(field) ?? { schemes: [], conditions: [] }
      if (!entry.schemes.includes(explanation.schemeId)) entry.schemes.push(explanation.schemeId)
      if (!entry.conditions.includes(condition.id)) entry.conditions.push(condition.id)
      byField.set(field, entry)
    }
  }
  return [...byField.entries()]
    .map(([field, entry]) => ({
      ...questionForField(field),
      schemes: entry.schemes.sort(),
      conditions: entry.conditions.sort(),
    }))
    .sort((a, b) => {
      // The question that settles the most schemes comes first; ties keep a fixed
      // human order so two runs never disagree.
      if (b.schemes.length !== a.schemes.length) return b.schemes.length - a.schemes.length
      return QUESTION_ORDER.indexOf(a.field) - QUESTION_ORDER.indexOf(b.field)
    })
}

function fieldForCondition(condition: CitizenCondition): ProfileField | null {
  if (condition.ruleId === 'geography_state') return 'state'
  if (condition.ruleId === 'geography_district') return 'district'
  if (condition.ruleId.startsWith('only_if:')) return condition.ruleId.slice(8) as ProfileField
  if (condition.ruleId === 'age_min' || condition.ruleId === 'age_max') return 'age'
  if (condition.ruleId === 'income_max_monthly') return 'monthly_income'
  if (condition.ruleId === 'occupation_in') return 'occupation'
  if (condition.ruleId === 'urban_only') return 'urban_or_rural'
  if (condition.ruleId.startsWith('not:') || condition.ruleId.startsWith('requires:')) {
    return condition.ruleId.slice(condition.ruleId.indexOf(':') + 1) as ProfileField
  }
  return null
}

// ---------------------------------------------------------------------------
// Whole catalogue
// ---------------------------------------------------------------------------

export function explainForCitizen(profile: Profile, schemes: Scheme[] = SCHEMES): CitizenReport {
  const results: CitizenExplanation[] = []
  const excluded: CitizenExclusion[] = []
  for (const scheme of schemes) {
    const match = matchScheme(profile, scheme)
    const exclusion = exclusionFor(match, scheme)
    if (exclusion) {
      excluded.push(exclusion)
      continue
    }
    results.push(explainScheme(profile, scheme, { match }))
  }
  const counts: Record<CitizenState, number> = {
    LIKELY_ELIGIBLE: 0,
    NOT_ELIGIBLE: 0,
    MORE_INFORMATION_NEEDED: 0,
    NEEDS_VERIFICATION: 0,
  }
  for (const result of results) counts[result.state] += 1
  return { results, excluded, questions: citizenQuestions(results), counts }
}

export function stateLabel(state: CitizenState): string {
  switch (state) {
    case 'LIKELY_ELIGIBLE':
      return 'Likely eligible'
    case 'NOT_ELIGIBLE':
      return 'Not eligible'
    case 'MORE_INFORMATION_NEEDED':
      return 'More information needed'
    case 'NEEDS_VERIFICATION':
      return 'Needs verification'
  }
}

