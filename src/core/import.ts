// Atomic catalogue import. A batch is either applied whole or not at all: one
// critical error leaves the existing catalogue untouched and nothing is merged.
import { validateCatalogue, type ValidationIssue, type ValidationOptions } from './catalogue'
import type { Scheme } from './scheme'

export interface ImportCounts {
  examined: number
  valid: number
  invalid: number
  duplicates: number // same official name
  duplicateIds: number
  aliasCollisions: number
  missingFields: number
  invalidRules: number
  invalidGeography: number
  invalidSources: number
  localizationGaps: number
  verificationWarnings: number
  dependencyIssues: number
}

export interface ImportReport {
  ok: boolean
  counts: ImportCounts
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  addedIds: string[]
  // The catalogue to use next: the existing one unchanged when anything failed.
  catalogue: Scheme[]
}

const EMPTY_COUNTS = (): ImportCounts => ({
  examined: 0,
  valid: 0,
  invalid: 0,
  duplicates: 0,
  duplicateIds: 0,
  aliasCollisions: 0,
  missingFields: 0,
  invalidRules: 0,
  invalidGeography: 0,
  invalidSources: 0,
  localizationGaps: 0,
  verificationWarnings: 0,
  dependencyIssues: 0,
})

const RULE_CODES = new Set([
  'missing_rules',
  'unknown_rule',
  'invalid_rule_list',
  'unknown_field',
  'conflicting_rules',
  'invalid_rule_value',
  'unknown_occupation',
  'invalid_only_if',
])

const GEOGRAPHY_CODES = new Set([
  'invalid_geography',
  'invalid_scope',
  'invalid_states',
  'scope_mismatch',
  'missing_states',
  'unknown_state',
  'invalid_districts',
  'missing_districts',
  'duplicate_district',
  'district_not_in_table',
])

const SOURCE_CODES = new Set([
  'invalid_url',
  'invalid_sources',
  'invalid_source',
  'invalid_source_type',
  'unofficial_source',
  'no_official_source',
])

const VERIFICATION_CODES = new Set([
  'invalid_verification',
  'invalid_verification_status',
  'invalid_confidence',
  'missing_verification',
  'missing_checked_on',
  'expired_verification',
  'expired_source',
  'future_date',
])

const LOCALIZATION_CODES = new Set(['missing_telugu', 'wrong_script', 'empty_translation', 'invalid_localization'])

const DEPENDENCY_CODES = new Set([
  'invalid_prerequisites',
  'duplicate_prerequisite',
  'missing_prerequisite',
  'circular_dependency',
  'discontinued_prerequisite',
])

const DUPLICATE_CODES = new Set(['duplicate_scheme', 'duplicate_alias'])
const MISSING_CODES = new Set([
  'invalid_catalogue',
  'invalid_scheme',
  'missing_id',
  'invalid_id',
  'missing_field',
  'invalid_aliases',
  'invalid_alias',
  'invalid_category',
  'invalid_beneficiaries',
  'invalid_beneficiary',
  'invalid_tags',
  'missing_documents',
  'invalid_document',
  'invalid_alternatives',
  'invalid_application',
  'invalid_benefits',
  'invalid_provides',
])

type Bucket = Exclude<keyof ImportCounts, 'examined' | 'valid' | 'invalid'>

function bucketOf(code: string): Bucket | null {
  if (code === 'duplicate_id') return 'duplicateIds'
  if (DUPLICATE_CODES.has(code)) return 'duplicates'
  if (code === 'alias_collision') return 'aliasCollisions'
  if (RULE_CODES.has(code)) return 'invalidRules'
  if (GEOGRAPHY_CODES.has(code)) return 'invalidGeography'
  if (SOURCE_CODES.has(code)) return 'invalidSources'
  if (VERIFICATION_CODES.has(code)) return 'verificationWarnings'
  if (LOCALIZATION_CODES.has(code)) return 'localizationGaps'
  if (DEPENDENCY_CODES.has(code)) return 'dependencyIssues'
  if (MISSING_CODES.has(code)) return 'missingFields'
  return null
}

function rawSchemesOf(input: unknown): unknown[] | null {
  if (Array.isArray(input)) return input
  if (typeof input === 'object' && input !== null && Array.isArray((input as { schemes?: unknown }).schemes)) {
    return (input as { schemes: unknown[] }).schemes
  }
  return null
}

function idOf(raw: unknown): string | null {
  if (typeof raw !== 'object' || raw === null) return null
  const id = (raw as { id?: unknown }).id
  return typeof id === 'string' && id.trim() !== '' ? id : null
}

// `existing` must already be a validated catalogue. Validation runs over the
// combined list, so an import can never introduce a duplicate id, alias clash or
// dangling prerequisite that the single-file validator would reject.
export function importSchemes(
  existing: Scheme[],
  incoming: unknown,
  options: ValidationOptions = {},
): ImportReport {
  const counts = EMPTY_COUNTS()
  const incomingRaw = rawSchemesOf(incoming)

  if (!incomingRaw) {
    const report = validateCatalogue(incoming, options)
    return {
      ok: false,
      counts,
      errors: report.errors.length > 0 ? report.errors : [
        { path: 'import', code: 'invalid_catalogue', message: 'expected an array of schemes or { "schemes": [...] }', severity: 'error' },
      ],
      warnings: report.warnings,
      addedIds: [],
      catalogue: existing,
    }
  }

  counts.examined = incomingRaw.length
  const incomingIds = new Set(incomingRaw.map(idOf).filter((id): id is string => id !== null))

  const combined = [...existing, ...incomingRaw]
  const report = validateCatalogue(combined, options)

  // Errors fill the "invalid*" buckets. Warnings only fill the buckets that are
  // informational by nature (quality signals), so an unofficial source or a
  // missing Telugu string never reads as an import-blocking defect.
  const WARNING_BUCKETS: Bucket[] = ['duplicates', 'localizationGaps', 'verificationWarnings', 'invalidGeography', 'dependencyIssues']
  const tally = (issues: ValidationIssue[], severity: 'error' | 'warning') => {
    for (const issue of issues) {
      const bucket = bucketOf(issue.code)
      if (!bucket) continue
      if (severity === 'warning' && !WARNING_BUCKETS.includes(bucket)) continue
      counts[bucket] += 1
    }
  }
  tally(report.errors, 'error')
  tally(report.warnings, 'warning')

  // Attribute errors to incoming schemes by their id in the issue path
  // ("schemes.<id>.field"). An error that cannot be attributed to one scheme is
  // treated as blocking the whole batch.
  const invalidIds = new Set<string>()
  let unattributedError = false
  for (const issue of report.errors) {
    const match = /^schemes\.([^.]+)/.exec(issue.path)
    if (match && incomingIds.has(match[1])) invalidIds.add(match[1])
    else if (!match) unattributedError = true
  }

  counts.invalid = unattributedError ? counts.examined : invalidIds.size
  counts.valid = counts.examined - counts.invalid

  if (!report.ok) {
    return { ok: false, counts, errors: report.errors, warnings: report.warnings, addedIds: [], catalogue: existing }
  }

  return {
    ok: true,
    counts,
    errors: [],
    warnings: report.warnings,
    addedIds: [...incomingIds],
    // A fresh array from the validator: callers can adopt it without touching the old one.
    catalogue: report.schemes,
  }
}

// Human-readable one-screen summary, shared by the CLI and tests.
export function formatImportReport(report: ImportReport): string {
  const c = report.counts
  const lines = [
    `examined: ${c.examined}  valid: ${c.valid}  invalid: ${c.invalid}`,
    `duplicates: ${c.duplicates}  duplicate ids: ${c.duplicateIds}  alias collisions: ${c.aliasCollisions}`,
    `missing fields: ${c.missingFields}  invalid rules: ${c.invalidRules}  invalid geography: ${c.invalidGeography}`,
    `invalid sources: ${c.invalidSources}  localization gaps: ${c.localizationGaps}  verification issues: ${c.verificationWarnings}`,
    `dependency issues: ${c.dependencyIssues}`,
    `result: ${report.ok ? `IMPORTED ${report.addedIds.length} scheme(s)` : 'REJECTED (catalogue unchanged)'}`,
  ]
  return lines.join('\n')
}
