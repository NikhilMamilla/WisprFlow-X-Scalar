// Research records: what we know about a scheme BEFORE (and after) it becomes
// catalogue data.
//
// This is deliberately a separate model from `Scheme`. A scheme record exists to
// be matched against a profile; a research record exists to record provenance,
// open questions and how far verification has got. Converting one into the other
// is an explicit import (scripts/import-catalogue.ts), never an implicit step.
//
// Two rules the code follows everywhere here:
//   1. A discovered scheme is not a verified scheme. Advancing the research
//      status never advances the verification status.
//   2. Missing information stays UNKNOWN. Nothing here guesses a rule, a source
//      or a date.
import { findRegion } from './geo'
import {
  CONFIDENCE_LEVELS,
  VERIFICATION_STATUSES,
  type Confidence,
  type VerificationStatus,
} from './scheme'

// ---------------------------------------------------------------------------
// Statuses and lifecycle
// ---------------------------------------------------------------------------

// DISCOVERED -> CATALOGUED -> SOURCE_IDENTIFIED -> OFFICIALLY_VERIFIED ->
// ELIGIBILITY_VERIFIED -> READY_FOR_IMPORT -> IMPORTED, with NEEDS_RESEARCH,
// CONFLICTING, OUTDATED and CLOSED reachable from the researching states.
export const RESEARCH_STATUSES = [
  'DISCOVERED',
  'CATALOGUED',
  'SOURCE_IDENTIFIED',
  'OFFICIALLY_VERIFIED',
  'ELIGIBILITY_VERIFIED',
  'READY_FOR_IMPORT',
  'IMPORTED',
  'NEEDS_RESEARCH',
  'CONFLICTING',
  'OUTDATED',
  'CLOSED',
] as const
export type ResearchStatus = (typeof RESEARCH_STATUSES)[number]

export const RESEARCH_TRANSITIONS: Readonly<Record<ResearchStatus, readonly ResearchStatus[]>> = Object.freeze({
  DISCOVERED: ['CATALOGUED', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  CATALOGUED: ['SOURCE_IDENTIFIED', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  SOURCE_IDENTIFIED: ['OFFICIALLY_VERIFIED', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  OFFICIALLY_VERIFIED: ['ELIGIBILITY_VERIFIED', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  ELIGIBILITY_VERIFIED: ['READY_FOR_IMPORT', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  READY_FOR_IMPORT: ['IMPORTED', 'NEEDS_RESEARCH', 'CONFLICTING', 'OUTDATED', 'CLOSED'],
  IMPORTED: ['OUTDATED', 'CONFLICTING', 'CLOSED'],
  NEEDS_RESEARCH: ['CATALOGUED', 'SOURCE_IDENTIFIED', 'CONFLICTING', 'CLOSED'],
  CONFLICTING: ['NEEDS_RESEARCH', 'SOURCE_IDENTIFIED', 'OUTDATED', 'CLOSED'],
  OUTDATED: ['NEEDS_RESEARCH', 'SOURCE_IDENTIFIED', 'CONFLICTING', 'CLOSED'],
  CLOSED: [],
})

export function canTransition(from: ResearchStatus, to: ResearchStatus): boolean {
  return RESEARCH_TRANSITIONS[from].includes(to)
}

export interface StatusChange {
  on: string // YYYY-MM-DD
  by?: string
  note?: string
}

export interface StatusHistoryEntry extends StatusChange {
  status: ResearchStatus
}

export interface TransitionResult {
  ok: boolean
  record: ResearchRecord
  errors: string[]
}

// A record is only eligibility-verified when it reached that status AND carries
// evidence for it. OFFICIALLY_VERIFIED says the scheme's existence and documents
// are confirmed; it says nothing about who qualifies.
export function eligibilityVerified(record: ResearchRecord): boolean {
  const reached = ['ELIGIBILITY_VERIFIED', 'READY_FOR_IMPORT', 'IMPORTED'].includes(record.status)
  return reached && record.verificationEvidence.length > 0
}

// Pure transition. It never touches verificationStatus: a researcher sets that
// separately, with evidence. It refuses a transition that would overstate what
// has actually been done.
export function applyTransition(record: ResearchRecord, to: ResearchStatus, change: StatusChange): TransitionResult {
  const errors: string[] = []
  if (!canTransition(record.status, to)) {
    errors.push(`cannot move from ${record.status} to ${to}`)
  }
  if (to === 'ELIGIBILITY_VERIFIED' && record.verificationEvidence.length === 0) {
    errors.push('eligibility verification needs at least one piece of evidence')
  }
  if (to === 'READY_FOR_IMPORT' && !eligibilityVerified(record)) {
    errors.push('a record can only be import-ready after eligibility was verified with evidence')
  }
  if (to === 'IMPORTED' && !record.schemeId) {
    errors.push('an imported record must name the catalogue scheme id it became')
  }
  if (!validDate(change.on)) errors.push('a transition needs a YYYY-MM-DD date')
  if (errors.length > 0) return { ok: false, record, errors }

  const readiness: ImportReadiness =
    to === 'IMPORTED' ? 'IMPORTED' : to === 'READY_FOR_IMPORT' ? 'READY' : record.importReadiness
  return {
    ok: true,
    errors: [],
    record: {
      ...record,
      status: to,
      importReadiness: readiness,
      lastResearchedOn: change.on,
      lastVerifiedOn:
        to === 'OFFICIALLY_VERIFIED' || to === 'ELIGIBILITY_VERIFIED' ? change.on : record.lastVerifiedOn,
      statusHistory: [...record.statusHistory, { status: to, ...change }],
    },
  }
}

// ---------------------------------------------------------------------------
// Record and source shapes
// ---------------------------------------------------------------------------

export const GOVERNMENT_LEVELS = ['CENTRAL', 'STATE', 'UT'] as const
export type GovernmentLevel = (typeof GOVERNMENT_LEVELS)[number]

export const IMPORT_READINESS = ['NOT_READY', 'NEEDS_INFO', 'READY', 'IMPORTED'] as const
export type ImportReadiness = (typeof IMPORT_READINESS)[number]

export const RELATIONSHIP_TYPES = [
  'SAME_SCHEME',
  'DUPLICATE_RECORD',
  'STATE_IMPLEMENTATION_OF',
  'STATE_TOPUP_OF',
  'RELATED',
  'SUBSCHEME_OF',
  'REPLACES',
  'REPLACED_BY',
] as const
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number]

// Primary sources first. An aggregator is a discovery aid; it is never accepted
// as authoritative eligibility evidence (validated below).
export const SOURCE_TIERS = ['PRIMARY_LEGAL', 'PRIMARY_OFFICIAL', 'SECONDARY_OFFICIAL', 'AGGREGATOR', 'UNKNOWN'] as const
export type SourceTier = (typeof SOURCE_TIERS)[number]

export const SOURCE_KINDS = [
  'notification',
  'guidelines',
  'gazette',
  'ministry_site',
  'department_site',
  'government_order',
  'pib_release',
  'faq',
  'aggregator',
  'other',
] as const
export type SourceKind = (typeof SOURCE_KINDS)[number]

export const SOURCE_CHANGE_STATES = ['UNCHECKED', 'UNCHANGED', 'CHANGED', 'GONE'] as const
export type SourceChangeState = (typeof SOURCE_CHANGE_STATES)[number]

export const COVERAGE_STATUSES = [
  'COVERED',
  'PARTIAL',
  'NOT_RESEARCHED',
  'NONE_FOUND',
  'NEEDS_MORE_RESEARCH',
] as const
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number]

// Who a scheme is for, as a research dimension. This is NOT the scheme model's
// `beneficiaryGroups` (individual / household / business), which describes the
// kind of beneficiary. Both exist because a scheme can be for "individuals" and
// for "widows" at the same time.
export const RESEARCH_GROUPS = [
  { key: 'women', label: 'Women' },
  { key: 'children', label: 'Children' },
  { key: 'farmers', label: 'Farmers' },
  { key: 'students', label: 'Students' },
  { key: 'senior_citizens', label: 'Senior citizens' },
  { key: 'sc_st_obc', label: 'SC / ST / OBC' },
  { key: 'minorities', label: 'Minorities' },
  { key: 'persons_with_disabilities', label: 'Persons with disabilities' },
  { key: 'unorganised_workers', label: 'Unorganised workers' },
  { key: 'gig_workers', label: 'Gig / platform workers' },
  { key: 'construction_workers', label: 'Construction workers' },
  { key: 'street_vendors', label: 'Street vendors' },
  { key: 'artisans', label: 'Artisans' },
  { key: 'fisherfolk', label: 'Fisherfolk' },
  { key: 'migrants', label: 'Migrants' },
  { key: 'widows', label: 'Widows' },
  { key: 'orphans', label: 'Orphans' },
  { key: 'veterans', label: 'Veterans and defence families' },
  { key: 'entrepreneurs', label: 'Entrepreneurs' },
  { key: 'weavers', label: 'Weavers and handloom workers' },
  { key: 'transgender', label: 'Transgender persons' },
] as const
export type ResearchGroup = (typeof RESEARCH_GROUPS)[number]['key']

export const COVERAGE_AGE_BANDS = [
  { key: 'children_0_14', label: 'Children (0-14)' },
  { key: 'youth_15_24', label: 'Youth (15-24)' },
  { key: 'adults_25_59', label: 'Adults (25-59)' },
  { key: 'seniors_60_plus', label: 'Seniors (60+)' },
] as const
export type CoverageAgeBand = (typeof COVERAGE_AGE_BANDS)[number]['key']

// What the scheme gives, as the source states it. Amounts are only recorded
// when a source prints them; none is inferred.
export const BENEFIT_KINDS = ['cash', 'in_kind', 'service', 'loan', 'subsidy', 'insurance'] as const
export type BenefitKind = (typeof BENEFIT_KINDS)[number]

export interface ResearchBenefit {
  kind: BenefitKind
  summary?: string
  amountInr?: number
  // Free text for anything an amount cannot express ("up to", "per acre",
  // "60 days at 50% wages"), copied from the source rather than computed.
  amountNote?: string
  frequency?: string
}

export interface ResearchEvidence {
  sourceId: string
  // Verbatim text from the source. Optional only so that an existing catalogue
  // entry can be registered without reproducing a document; a record that claims
  // verification must still point at a source.
  quote?: string
  note?: string
}

export interface ResearchCondition {
  text: string // as the source states it, in prose
  sourceId?: string
  quote?: string
}

export interface SchemeRelationship {
  type: RelationshipType
  recordId?: string // another research record
  schemeId?: string // a catalogue scheme
  note?: string
}

export interface ResearchSource {
  id: string
  url: string
  title: string
  issuedBy: string
  level: GovernmentLevel
  geography?: string[]
  tier: SourceTier
  kind: SourceKind
  retrievedOn: string
  verifiedOn?: string
  reliability?: Confidence
  licenseNotes?: string
  contentHash?: string
  schemeIds?: string[]
  change?: {
    status: SourceChangeState
    lastCheckedOn?: string
    note?: string
  }
}

export interface ResearchRecord {
  id: string
  schemeId?: string // catalogue id once imported
  name: string
  officialName?: string
  aliases: string[]
  level: GovernmentLevel
  state?: string
  department?: string
  category?: string
  subcategory?: string
  beneficiaryGroups: ResearchGroup[]
  ageBands: CoverageAgeBand[]
  schemeStatus?: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'UNKNOWN'
  discoveryUrl?: string
  eligibilityEvidence: ResearchEvidence[]
  verificationEvidence: ResearchEvidence[]
  benefitSummary?: string
  benefit?: ResearchBenefit
  // District-restricted schemes only. Empty means statewide (or not studied).
  districts: string[]
  applicationNotes?: string
  eligibilityConditions: ResearchCondition[]
  exclusions: string[]
  prerequisites: string[]
  documents: string[]
  applicationUrl?: string
  status: ResearchStatus
  verificationStatus: VerificationStatus
  discoveredOn: string
  lastResearchedOn: string
  lastVerifiedOn?: string
  researcher?: string
  reviewer?: string
  confidence?: Confidence
  unresolvedQuestions: string[]
  notes?: string
  relationships: SchemeRelationship[]
  importReadiness: ImportReadiness
  statusHistory: StatusHistoryEntry[]
}

// ---------------------------------------------------------------------------
// Freshness / re-verification queue
// ---------------------------------------------------------------------------
// Nothing here fetches anything: the queue is derived from the dates already in
// the register, so it is deterministic and safe to run in CI. Fetching a page and
// hashing it is a separate, manual step; a failed fetch is never treated as proof
// that a scheme closed.
const DAY_MS = 24 * 60 * 60 * 1000
const validDay = (value: string | undefined): number | null => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const time = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(time) ? null : time
}

export interface StaleSource {
  id: string
  url: string
  lastCheckedOn?: string
  ageDays: number | null // null when the source was never checked
  state: SourceChangeState
}

// A source is stale when its last check is older than `days` or was never
// recorded. `GONE` sources are always listed first: a dead link is a task, not a
// fact about the scheme.
export function staleSources(
  sources: readonly ResearchSource[],
  options: { today?: string; days?: number } = {},
): StaleSource[] {
  const now = validDay(options.today ?? new Date().toISOString().slice(0, 10))
  const days = options.days ?? 90
  if (now === null) return []
  return sources
    .map((source) => {
      const last = source.change?.lastCheckedOn ?? source.verifiedOn ?? source.retrievedOn
      const checked = validDay(last)
      return {
        id: source.id,
        url: source.url,
        ...(last ? { lastCheckedOn: last } : {}),
        ageDays: checked === null ? null : Math.floor((now - checked) / DAY_MS),
        state: source.change?.status ?? 'UNCHECKED',
      }
    })
    .filter((entry) => entry.state === 'GONE' || entry.ageDays === null || entry.ageDays > days)
    .sort((a, b) => {
      if (a.state === 'GONE' && b.state !== 'GONE') return -1
      if (b.state === 'GONE' && a.state !== 'GONE') return 1
      return (b.ageDays ?? Number.MAX_SAFE_INTEGER) - (a.ageDays ?? Number.MAX_SAFE_INTEGER)
    })
}

// A researcher's explicit note about an area with no records. NONE_FOUND is a
// statement about the search performed, never proof that no scheme exists.
export interface CoverageClaim {
  area: string
  status: CoverageStatus
  note?: string
  sourceIds?: string[]
}

export interface ResearchDocument {
  records: ResearchRecord[]
  sources: ResearchSource[]
  coverageClaims: CoverageClaim[]
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ResearchIssueSeverity = 'error' | 'warning'

export interface ResearchIssue {
  path: string
  code: string
  message: string
  severity: ResearchIssueSeverity
}

export interface ResearchValidationOptions {
  today?: string
  // Catalogue ids, so an imported record can be checked against the data file.
  schemeIds?: readonly string[]
}

export interface ResearchValidationReport {
  ok: boolean
  errors: ResearchIssue[]
  warnings: ResearchIssue[]
  records: ResearchRecord[] // empty unless ok
  sources: ResearchSource[]
  coverageClaims: CoverageClaim[]
}

const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const inList = (list: readonly string[], value: unknown): boolean =>
  typeof value === 'string' && list.includes(value)
const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function validUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function missingSources(record: ResearchRecord): boolean {
  return record.eligibilityEvidence.length === 0 && record.verificationEvidence.length === 0
}

export function validateResearch(input: unknown, options: ResearchValidationOptions = {}): ResearchValidationReport {
  const errors: ResearchIssue[] = []
  const warnings: ResearchIssue[] = []
  const error = (path: string, code: string, message: string) =>
    errors.push({ path, code, message, severity: 'error' })
  const warn = (path: string, code: string, message: string) =>
    warnings.push({ path, code, message, severity: 'warning' })
  const today = options.today ?? new Date().toISOString().slice(0, 10)
  const empty = { ok: false, errors, warnings, records: [], sources: [], coverageClaims: [] }

  if (!isRecord(input)) {
    error('document', 'invalid_research', 'expected an object with "records" and "sources" arrays')
    return empty
  }
  if (!Array.isArray(input.records)) {
    error('records', 'missing_records', 'records must be an array')
    return empty
  }
  if (!Array.isArray(input.sources)) {
    error('sources', 'missing_source_register', 'sources must be an array (use [] when none are registered)')
    return empty
  }
  const rawClaims = input.coverageClaims === undefined ? [] : input.coverageClaims
  if (!Array.isArray(rawClaims)) {
    error('coverageClaims', 'invalid_coverage_claims', 'coverageClaims must be an array')
    return empty
  }

  // --- source register ---
  // A source can be associated with a catalogue scheme or with a research
  // record that has not been imported yet, so both namespaces are accepted.
  const declaredRecordIds = new Set(
    (input.records as unknown[]).filter(isRecord).map((record) => (isText(record.id) ? record.id : '')).filter(Boolean),
  )
  const sourceById = new Map<string, ResearchSource>()
  // One URL registered twice is one source pretending to be two: either a
  // duplicate entry or two ids that will drift apart.
  const sourceUrlOwner = new Map<string, string>()
  input.sources.forEach((raw, index) => {
    const at = `sources[${index}]`
    if (!isRecord(raw)) {
      error(at, 'invalid_source', 'source must be an object')
      return
    }
    const id = isText(raw.id) ? raw.id : ''
    const path = id ? `sources.${id}` : at
    const key = (field: string) => `${path}.${field}`
    if (!isText(raw.id)) error(key('id'), 'missing_source_id', 'source has no id')
    else if (!ID_PATTERN.test(raw.id)) error(key('id'), 'invalid_source_id', `id "${raw.id}" must be lowercase letters, digits, - or _`)
    else if (sourceById.has(raw.id)) error(key('id'), 'duplicate_source_id', `duplicate source id "${raw.id}"`)
    if (!validUrl(raw.url)) error(key('url'), 'invalid_url', `"${String(raw.url)}" is not a valid http(s) URL`)
    else {
      const url = raw.url as string
      const owner = sourceUrlOwner.get(url)
      if (owner) error(key('url'), 'duplicate_source_url', `the same URL is already registered as "${owner}"`)
      else sourceUrlOwner.set(url, id || at)
    }
    if (!isText(raw.title)) error(key('title'), 'missing_field', 'title is required')
    if (!isText(raw.issuedBy)) error(key('issuedBy'), 'missing_field', 'issuedBy (issuing authority) is required')
    if (!inList(GOVERNMENT_LEVELS, raw.level)) error(key('level'), 'invalid_level', `unknown government level "${String(raw.level)}"`)
    if (!inList(SOURCE_TIERS, raw.tier)) error(key('tier'), 'invalid_source_tier', `unknown source tier "${String(raw.tier)}"`)
    if (!inList(SOURCE_KINDS, raw.kind)) error(key('kind'), 'invalid_source_kind', `unknown source kind "${String(raw.kind)}"`)
    if (!validDate(raw.retrievedOn)) error(key('retrievedOn'), 'invalid_date', 'retrievedOn must be YYYY-MM-DD')
    if (raw.verifiedOn !== undefined && (!validDate(raw.verifiedOn) || raw.verifiedOn > today)) {
      error(key('verifiedOn'), 'invalid_date', 'verifiedOn must be a YYYY-MM-DD date that is not in the future')
    }
    if (raw.reliability !== undefined && !inList(CONFIDENCE_LEVELS, raw.reliability)) {
      error(key('reliability'), 'invalid_reliability', 'reliability must be high, medium or low')
    }
    if (raw.contentHash !== undefined && !isText(raw.contentHash)) {
      error(key('contentHash'), 'invalid_content_hash', 'contentHash must be a non-empty string')
    }
    if (raw.geography !== undefined && (!Array.isArray(raw.geography) || raw.geography.some((g) => !isText(g)))) {
      error(key('geography'), 'invalid_geography', 'geography must be an array of place names')
    }
    if (raw.change !== undefined) {
      if (!isRecord(raw.change) || !inList(SOURCE_CHANGE_STATES, raw.change.status)) {
        error(key('change'), 'invalid_change_state', 'change.status must be UNCHECKED, UNCHANGED, CHANGED or GONE')
      } else if (raw.change.lastCheckedOn !== undefined && !validDate(raw.change.lastCheckedOn)) {
        error(key('change.lastCheckedOn'), 'invalid_date', 'lastCheckedOn must be YYYY-MM-DD')
      }
    } else {
      warn(path, 'missing_change_detection', 'no change-detection state recorded for this source')
    }
    if (raw.schemeIds !== undefined && (!Array.isArray(raw.schemeIds) || raw.schemeIds.some((s) => !isText(s)))) {
      error(key('schemeIds'), 'invalid_scheme_ids', 'schemeIds must be an array of scheme ids')
    } else if (Array.isArray(raw.schemeIds) && options.schemeIds) {
      raw.schemeIds.forEach((schemeId, i) => {
        if (!isText(schemeId)) return
        const known = declaredRecordIds.has(schemeId) || options.schemeIds?.includes(schemeId)
        if (!known) {
          error(`${key('schemeIds')}[${i}]`, 'unknown_scheme_reference', `"${schemeId}" is neither a research record nor a catalogue scheme`)
        }
      })
    }
    if (id && !sourceById.has(id)) sourceById.set(id, raw as unknown as ResearchSource)
  })
  const sourceIds = new Set(sourceById.keys())

  // --- records ---
  const recordIds = new Set<string>()
  const rawRecords = input.records
  const nameOwners = new Map<string, string>()
  const relationshipChecks: { path: string; relationship: Record<string, unknown> }[] = []

  const checkEvidence = (value: unknown, path: string): number => {
    if (value === undefined) return 0
    if (!Array.isArray(value)) {
      error(path, 'invalid_evidence', 'evidence must be an array of { sourceId } objects')
      return 0
    }
    let valid = 0
    value.forEach((entry, index) => {
      const at = `${path}[${index}]`
      if (!isRecord(entry)) {
        error(at, 'invalid_evidence', 'evidence must be an object with a sourceId')
        return
      }
      if (!isText(entry.sourceId)) {
        error(`${at}.sourceId`, 'missing_source_id', 'evidence needs a sourceId')
        return
      }
      const source = sourceById.get(entry.sourceId)
      if (!source) {
        error(`${at}.sourceId`, 'unknown_source', `source "${entry.sourceId}" is not in the source register`)
        return
      }
      valid += 1
      if (source.tier === 'AGGREGATOR') {
        error(`${at}.sourceId`, 'aggregator_evidence', 'an aggregator portal is a discovery source, not eligibility evidence')
      }
      if (entry.quote !== undefined && !isText(entry.quote)) {
        error(`${at}.quote`, 'invalid_quote', 'quote must be a non-empty string when present')
      }
    })
    return valid
  }

  rawRecords.forEach((raw, index) => {
    const at = `records[${index}]`
    if (!isRecord(raw)) {
      error(at, 'invalid_scheme', 'research record must be an object')
      return
    }
    const id = isText(raw.id) ? raw.id : ''
    const path = id ? `records.${id}` : at
    const key = (field: string) => `${path}.${field}`

    if (!isText(raw.id)) error(key('id'), 'missing_id', 'research record has no id')
    else if (!ID_PATTERN.test(raw.id)) error(key('id'), 'invalid_id', `id "${raw.id}" must be lowercase letters, digits, - or _`)
    else if (recordIds.has(raw.id)) error(key('id'), 'duplicate_id', `duplicate research id "${raw.id}"`)
    else recordIds.add(raw.id)

    if (!isText(raw.name)) error(key('name'), 'missing_field', 'name is required')
    const normalizedName = isText(raw.officialName) ? raw.officialName : isText(raw.name) ? raw.name : ''
    if (normalizedName) {
      const n = normalizedName.trim().toLowerCase()
      const owner = nameOwners.get(n)
      // Similar names are a hint to record a relationship, never a merge.
      if (owner) warn(key('name'), 'possible_duplicate', `same official name as "${owner}"; record a relationship instead of merging`)
      else nameOwners.set(n, id || at)
    }

    const level = raw.level
    if (!inList(GOVERNMENT_LEVELS, level)) {
      error(key('level'), 'invalid_level', `unknown government level "${String(level)}"`)
    }
    const region = isText(raw.state) ? findRegion(raw.state) : null
    if (level === 'CENTRAL') {
      if (isText(raw.state)) error(key('state'), 'level_mismatch', 'a central record cannot name a state')
    } else if (level === 'STATE' || level === 'UT') {
      if (!isText(raw.state)) error(key('state'), 'missing_state', `a ${String(level)} record must name its state or UT`)
      else if (!region) error(key('state'), 'invalid_state', `"${raw.state}" is not a recognised state or UT name`)
      else if (level === 'STATE' && region.type !== 'state') error(key('state'), 'level_mismatch', `${region.name} is a union territory, not a state`)
      else if (level === 'UT' && region.type !== 'union_territory') error(key('state'), 'level_mismatch', `${region.name} is a state, not a union territory`)
    }

    if (raw.category !== undefined && !isText(raw.category)) {
      error(key('category'), 'invalid_category', 'category must be a non-empty string')
    } else if (raw.category === undefined) {
      warn(path, 'missing_category', 'no category; coverage by category will not count this record')
    }
    if (raw.beneficiaryGroups !== undefined) {
      if (!Array.isArray(raw.beneficiaryGroups)) error(key('beneficiaryGroups'), 'invalid_groups', 'beneficiaryGroups must be an array')
      else {
        raw.beneficiaryGroups.forEach((group, i) => {
          if (!RESEARCH_GROUPS.some((g) => g.key === group)) {
            error(`${key('beneficiaryGroups')}[${i}]`, 'invalid_group', `unknown beneficiary group "${String(group)}"`)
          }
        })
      }
    }
    if (raw.ageBands !== undefined) {
      if (!Array.isArray(raw.ageBands)) error(key('ageBands'), 'invalid_age_bands', 'ageBands must be an array')
      else {
        raw.ageBands.forEach((band, i) => {
          if (!COVERAGE_AGE_BANDS.some((b) => b.key === band)) {
            error(`${key('ageBands')}[${i}]`, 'invalid_age_band', `unknown age band "${String(band)}"`)
          }
        })
      }
    }

    if (raw.discoveryUrl !== undefined && !validUrl(raw.discoveryUrl)) {
      error(key('discoveryUrl'), 'invalid_url', 'discoveryUrl must be an http(s) URL')
    }
    if (raw.applicationUrl !== undefined && !validUrl(raw.applicationUrl)) {
      error(key('applicationUrl'), 'invalid_url', 'applicationUrl must be an http(s) URL')
    }
    const evidenceCount = checkEvidence(raw.eligibilityEvidence, key('eligibilityEvidence'))
    const verificationCount = checkEvidence(raw.verificationEvidence, key('verificationEvidence'))

    const status = inList(RESEARCH_STATUSES, raw.status) ? (raw.status as ResearchStatus) : undefined
    if (!status) error(key('status'), 'invalid_research_status', `unknown research status "${String(raw.status)}"`)
    const verificationStatus = inList(VERIFICATION_STATUSES, raw.verificationStatus)
      ? (raw.verificationStatus as VerificationStatus)
      : undefined
    if (!verificationStatus) {
      error(key('verificationStatus'), 'invalid_verification_status', `unknown verification status "${String(raw.verificationStatus)}"`)
    }

    const readiness = inList(IMPORT_READINESS, raw.importReadiness) ? (raw.importReadiness as ImportReadiness) : 'NOT_READY'
    if (!inList(IMPORT_READINESS, raw.importReadiness)) {
      error(key('importReadiness'), 'invalid_readiness', `unknown import readiness "${String(raw.importReadiness)}"`)
    }

    if (!validDate(raw.discoveredOn)) error(key('discoveredOn'), 'invalid_date', 'discoveredOn must be YYYY-MM-DD')
    if (!validDate(raw.lastResearchedOn)) error(key('lastResearchedOn'), 'invalid_date', 'lastResearchedOn must be YYYY-MM-DD')
    if (raw.lastVerifiedOn !== undefined) {
      if (!validDate(raw.lastVerifiedOn)) error(key('lastVerifiedOn'), 'invalid_date', 'lastVerifiedOn must be YYYY-MM-DD')
      else if (validDate(raw.discoveredOn) && raw.lastVerifiedOn < raw.discoveredOn) {
        error(key('lastVerifiedOn'), 'invalid_date_order', 'lastVerifiedOn is before discoveredOn')
      }
    }
    if (raw.confidence !== undefined && !inList(CONFIDENCE_LEVELS, raw.confidence)) {
      error(key('confidence'), 'invalid_confidence', 'confidence must be high, medium or low')
    }

    if (raw.benefit !== undefined) {
      if (!isRecord(raw.benefit)) {
        error(key('benefit'), 'invalid_benefit', 'benefit must be an object with a kind')
      } else {
        if (!inList(BENEFIT_KINDS, raw.benefit.kind)) {
          error(key('benefit.kind'), 'invalid_benefit_kind', `unknown benefit kind "${String(raw.benefit.kind)}"`)
        }
        if (
          raw.benefit.amountInr !== undefined &&
          (typeof raw.benefit.amountInr !== 'number' || !Number.isFinite(raw.benefit.amountInr) || raw.benefit.amountInr <= 0)
        ) {
          error(key('benefit.amountInr'), 'invalid_benefit_amount', 'amountInr must be a positive number when present')
        }
        for (const field of ['summary', 'amountNote', 'frequency'] as const) {
          if (raw.benefit[field] !== undefined && !isText(raw.benefit[field])) {
            error(key(`benefit.${field}`), 'invalid_benefit', `${field} must be a non-empty string when present`)
          }
        }
      }
    }
    if (raw.applicationNotes !== undefined && !isText(raw.applicationNotes)) {
      error(key('applicationNotes'), 'invalid_application_notes', 'applicationNotes must be a non-empty string')
    }
    if (raw.districts !== undefined) {
      if (!Array.isArray(raw.districts) || raw.districts.some((district) => !isText(district))) {
        error(key('districts'), 'invalid_districts', 'districts must be an array of district names')
      } else if (level === 'CENTRAL' && raw.districts.length > 0) {
        error(key('districts'), 'level_mismatch', 'a central record cannot list districts')
      } else if (raw.districts.length > 0) {
        warn(key('districts'), 'districts_unverified', 'no verified district table is bundled; these district names cannot be cross-checked')
      }
    }

    if (raw.eligibilityConditions !== undefined) {
      if (!Array.isArray(raw.eligibilityConditions)) {
        error(key('eligibilityConditions'), 'invalid_conditions', 'eligibilityConditions must be an array')
      } else {
        raw.eligibilityConditions.forEach((condition, i) => {
          const cpath = `${key('eligibilityConditions')}[${i}]`
          if (!isRecord(condition) || !isText(condition.text)) {
            error(cpath, 'invalid_condition', 'a condition needs non-empty text')
            return
          }
          if (condition.sourceId === undefined) {
            warn(cpath, 'unsourced_condition', 'eligibility condition has no source attribution')
          } else if (!isText(condition.sourceId)) {
            error(`${cpath}.sourceId`, 'invalid_source_id', 'sourceId must be a source id')
          } else {
            const source = sourceById.get(condition.sourceId)
            if (!source) error(`${cpath}.sourceId`, 'unknown_source', `source "${condition.sourceId}" is not in the source register`)
            else if (source.tier === 'AGGREGATOR') {
              error(`${cpath}.sourceId`, 'aggregator_evidence', 'an aggregator portal cannot support an eligibility condition')
            }
          }
        })
      }
    }

    if (raw.relationships !== undefined) {
      if (!Array.isArray(raw.relationships)) {
        error(key('relationships'), 'invalid_relationships', 'relationships must be an array')
      } else {
        raw.relationships.forEach((relationship, i) => {
          const rpath = `${key('relationships')}[${i}]`
          if (!isRecord(relationship)) {
            error(rpath, 'invalid_relationship', 'relationship must be an object with a type')
            return
          }
          if (!inList(RELATIONSHIP_TYPES, relationship.type)) {
            error(`${rpath}.type`, 'invalid_relationship_type', `unknown relationship type "${String(relationship.type)}"`)
          }
          if (!isText(relationship.recordId) && !isText(relationship.schemeId)) {
            error(rpath, 'missing_relationship_target', 'a relationship needs a recordId or a schemeId')
          }
          relationshipChecks.push({ path: rpath, relationship })
        })
      }
    }

    // --- provenance and honesty gates ---
    const hasSource = evidenceCount > 0 || verificationCount > 0 || isText(raw.discoveryUrl)
    if (!hasSource) {
      error(path, 'missing_source_urls', 'a record needs a discovery URL or at least one registered source')
    }
    if (status === 'CONFLICTING' && (verificationStatus === 'VERIFIED' || verificationStatus === 'PARTIALLY_VERIFIED')) {
      error(key('status'), 'conflicting_verified', 'a conflicting record must not be marked verified')
    }
    const claimsVerification =
      verificationStatus === 'VERIFIED' || verificationStatus === 'PARTIALLY_VERIFIED'
    if (claimsVerification && verificationCount === 0) {
      error(key('verificationEvidence'), 'verified_without_evidence', 'a verified record needs at least one piece of evidence')
    }
    if (claimsVerification && raw.lastVerifiedOn === undefined) {
      error(key('lastVerifiedOn'), 'missing_last_verified', 'a verified record needs the date it was last verified')
    }
    if (
      verificationStatus === 'VERIFIED' &&
      (status === 'DISCOVERED' || status === 'CATALOGUED' || status === 'SOURCE_IDENTIFIED' || status === 'NEEDS_RESEARCH')
    ) {
      error(key('verificationStatus'), 'premature_verification', `a record at ${String(status)} cannot be VERIFIED`)
    }
    if (readiness === 'IMPORTED') {
      if (!isText(raw.schemeId)) {
        error(key('schemeId'), 'imported_without_provenance', 'an imported record must name its catalogue scheme id')
      } else if (options.schemeIds && !options.schemeIds.includes(raw.schemeId)) {
        error(key('schemeId'), 'unknown_scheme', `scheme "${raw.schemeId}" is not in the catalogue`)
      }
      if (raw.lastVerifiedOn === undefined) {
        error(key('lastVerifiedOn'), 'imported_without_provenance', 'an imported record needs the date it was last verified')
      }
      if (verificationCount === 0) {
        error(key('verificationEvidence'), 'imported_without_provenance', 'an imported record needs its verification evidence')
      }
    }
    if (status === 'READY_FOR_IMPORT' || readiness === 'READY') {
      if (textList(raw.unresolvedQuestions).length > 0) {
        error(key('unresolvedQuestions'), 'ready_with_open_questions', 'a record with unresolved questions is not import-ready')
      }
      if (!Array.isArray(raw.eligibilityConditions)) {
        error(key('eligibilityConditions'), 'ready_without_conditions', 'import readiness needs the eligibility conditions recorded')
      } else if (raw.eligibilityConditions.length === 0) {
        warn(key('eligibilityConditions'), 'no_conditions_recorded', 'no eligibility conditions recorded')
      }
    }
    // --- a research status may not outrun its evidence ---
    const conditions = Array.isArray(raw.eligibilityConditions) ? raw.eligibilityConditions : []
    const unsourcedCondition = conditions.some((condition) => isRecord(condition) && condition.sourceId === undefined)
    if (status === 'ELIGIBILITY_VERIFIED' || status === 'READY_FOR_IMPORT') {
      if (conditions.length === 0) {
        error(
          key('eligibilityConditions'),
          'eligibility_verified_without_conditions',
          'eligibility cannot be verified when no eligibility condition is recorded',
        )
      }
      if (unsourcedCondition) {
        error(
          key('eligibilityConditions'),
          'eligibility_verified_with_unsourced_condition',
          'every condition must name the source that states it before eligibility can be verified',
        )
      }
      if (evidenceCount === 0) {
        error(key('eligibilityEvidence'), 'eligibility_verified_without_evidence', 'eligibility verification needs eligibility evidence')
      }
    }
    if (status === 'OFFICIALLY_VERIFIED' && evidenceCount + verificationCount === 0) {
      error(key('verificationEvidence'), 'official_verification_without_evidence', 'official verification needs at least one source')
    }
    if (verificationStatus === 'VERIFIED' && conditions.length > 0 && unsourcedCondition) {
      error(
        key('eligibilityConditions'),
        'verified_with_unsourced_condition',
        'a fully verified record cannot have an eligibility condition without a source',
      )
    }
    if ((status === 'OUTDATED' || raw.schemeStatus === 'CLOSED') && verificationStatus === 'VERIFIED') {
      warn(path, 'outdated_marked_verified', 'a closed or outdated scheme should not be marked fully verified')
    }

    if (validDate(raw.discoveredOn) && raw.discoveredOn > today) {
      warn(key('discoveredOn'), 'future_date', 'discoveredOn is in the future')
    }
  })

  // --- relationship targets (needs every record id first) ---
  for (const { path, relationship } of relationshipChecks) {
    if (isText(relationship.recordId) && !recordIds.has(relationship.recordId)) {
      error(`${path}.recordId`, 'unknown_relationship_target', `no research record "${relationship.recordId}"`)
    }
    if (isText(relationship.schemeId) && options.schemeIds && !options.schemeIds.includes(relationship.schemeId)) {
      error(`${path}.schemeId`, 'unknown_relationship_target', `no catalogue scheme "${relationship.schemeId}"`)
    }
    if (relationship.recordId !== undefined && relationship.schemeId !== undefined) {
      error(path, 'ambiguous_relationship', 'a relationship names one recordId or one schemeId, not both')
    }
  }

  // --- coverage claims ---
  const coverageClaims: CoverageClaim[] = []
  rawClaims.forEach((raw, index) => {
    const at = `coverageClaims[${index}]`
    if (!isRecord(raw)) {
      error(at, 'invalid_coverage_claim', 'coverage claim must be an object')
      return
    }
    if (!isText(raw.area)) error(`${at}.area`, 'missing_field', 'area is required')
    if (!inList(COVERAGE_STATUSES, raw.status)) {
      error(`${at}.status`, 'invalid_coverage_status', `unknown coverage status "${String(raw.status)}"`)
      return
    }
    if (raw.status === 'NONE_FOUND' && !isText(raw.note)) {
      error(`${at}.note`, 'missing_field', 'a NONE_FOUND claim needs a note saying what was searched')
    }
    const claimSourceIds = textList(raw.sourceIds)
    for (const sourceId of claimSourceIds) {
      if (!sourceIds.has(sourceId)) error(`${at}.sourceIds`, 'unknown_source', `source "${sourceId}" is not in the source register`)
    }
    coverageClaims.push({
      area: String(raw.area),
      status: raw.status as CoverageStatus,
      ...(isText(raw.note) ? { note: raw.note } : {}),
      ...(claimSourceIds.length > 0 ? { sourceIds: claimSourceIds } : {}),
    })
  })

  if (errors.length > 0) {
    return { ok: false, errors, warnings, records: [], sources: [], coverageClaims: [] }
  }

  // Every field was checked above, so the cast only fills in defaults for the
  // optional arrays.
  const records = rawRecords.map((raw) => normalizeRecord(raw as Record<string, unknown>))
  const sources = input.sources as unknown as ResearchSource[]
  return { ok: true, errors, warnings, records, sources, coverageClaims }
}

function normalizeRecord(raw: Record<string, unknown>): ResearchRecord {
  const record = raw as unknown as ResearchRecord
  return {
    ...record,
    aliases: textList(raw.aliases),
    beneficiaryGroups: textList(raw.beneficiaryGroups) as ResearchGroup[],
    ageBands: textList(raw.ageBands) as CoverageAgeBand[],
    eligibilityEvidence: Array.isArray(raw.eligibilityEvidence) ? (raw.eligibilityEvidence as ResearchEvidence[]) : [],
    verificationEvidence: Array.isArray(raw.verificationEvidence) ? (raw.verificationEvidence as ResearchEvidence[]) : [],
    eligibilityConditions: Array.isArray(raw.eligibilityConditions)
      ? (raw.eligibilityConditions as ResearchCondition[])
      : [],
    districts: textList(raw.districts),
    exclusions: textList(raw.exclusions),
    prerequisites: textList(raw.prerequisites),
    documents: textList(raw.documents),
    unresolvedQuestions: textList(raw.unresolvedQuestions),
    relationships: Array.isArray(raw.relationships) ? (raw.relationships as SchemeRelationship[]) : [],
    statusHistory: Array.isArray(raw.statusHistory) ? (raw.statusHistory as StatusHistoryEntry[]) : [],
    importReadiness: inList(IMPORT_READINESS, raw.importReadiness) ? (raw.importReadiness as ImportReadiness) : 'NOT_READY',
    verificationStatus: inList(VERIFICATION_STATUSES, raw.verificationStatus)
      ? (raw.verificationStatus as VerificationStatus)
      : 'UNKNOWN',
  }
}

// ---------------------------------------------------------------------------
// Filtering (the CLI's list command, also usable from tests)
// ---------------------------------------------------------------------------

export interface ResearchFilter {
  status?: ResearchStatus | ResearchStatus[]
  level?: GovernmentLevel
  state?: string
  category?: string
  group?: ResearchGroup
  schemeId?: string
  onlyUnverified?: boolean
  onlyMissingSources?: boolean
  onlyConflicts?: boolean
  onlyReady?: boolean
}

export function filterResearchRecords(records: readonly ResearchRecord[], filter: ResearchFilter = {}): ResearchRecord[] {
  const statuses =
    filter.status === undefined ? undefined : ([] as ResearchStatus[]).concat(filter.status)
  return records.filter((record) => {
    if (statuses && !statuses.includes(record.status)) return false
    if (filter.level && record.level !== filter.level) return false
    if (filter.state && !(record.state && findRegion(record.state)?.name === findRegion(filter.state)?.name)) return false
    if (filter.category && record.category !== filter.category) return false
    if (filter.group && !record.beneficiaryGroups.includes(filter.group)) return false
    if (filter.schemeId && record.schemeId !== filter.schemeId) return false
    if (filter.onlyUnverified && (record.verificationStatus === 'VERIFIED' || record.verificationStatus === 'DISCONTINUED')) return false
    if (filter.onlyMissingSources && !missingSources(record)) return false
    if (filter.onlyConflicts && record.status !== 'CONFLICTING') return false
    if (filter.onlyReady && record.importReadiness !== 'READY') return false
    return true
  })
}

