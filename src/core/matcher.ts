// Plain-code eligibility over data/schemes.json. Ids only; the UI renders the words.
import { SCHEMES, type Scheme } from './schemes'
import type { BooleanField, Profile, ProfileField } from './types'

export type RuleId =
  | 'age_min'
  | 'age_max'
  | 'income_max_monthly'
  | 'occupation_in'
  | 'urban_only'
  | `not:${BooleanField}`
  | `requires:${BooleanField}`

export interface FailedRule {
  ruleId: RuleId
  detail: {
    field: ProfileField
    actual: number | string | boolean
    expected: number | string | boolean | string[] // the limit or required value
  }
}

export type MatchStatus = 'qualifies' | 'does_not_qualify' | 'needs_info' | 'needs_prerequisite' | 'not_needed'

export interface MatchResult {
  id: string
  status: MatchStatus
  passed: RuleId[]
  failed: FailedRule[]
  missing: ProfileField[]
  rules_verified: boolean
  // Only set when status is 'needs_prerequisite': the requires: rules that failed, and,
  // where one exists, the scheme that provides it (e.g. has_bank_account -> pmjdy).
  prerequisites?: BooleanField[]
  unlocked_by?: string
}

// A scheme that itself supplies a prerequisite field, so another scheme can point to it.
const PREREQUISITE_UNLOCKERS: Partial<Record<BooleanField, string>> = {
  has_bank_account: 'pmjdy',
}

interface Check {
  ruleId: RuleId
  field: ProfileField
  expected: FailedRule['detail']['expected']
  ok: (value: NonNullable<Profile[ProfileField]>) => boolean
}

export function checksFor(scheme: Scheme): Check[] {
  const r = scheme.rules
  const checks: Check[] = []
  if (r.age_min != null) {
    const min = r.age_min
    checks.push({ ruleId: 'age_min', field: 'age', expected: min, ok: (v) => (v as number) >= min })
  }
  if (r.age_max != null) {
    const max = r.age_max
    checks.push({ ruleId: 'age_max', field: 'age', expected: max, ok: (v) => (v as number) <= max })
  }
  if (r.income_max_monthly != null) {
    const max = r.income_max_monthly
    checks.push({ ruleId: 'income_max_monthly', field: 'monthly_income', expected: max, ok: (v) => (v as number) <= max })
  }
  if (r.occupation_in && r.occupation_in.length > 0) {
    const allowed = r.occupation_in
    checks.push({ ruleId: 'occupation_in', field: 'occupation', expected: allowed, ok: (v) => allowed.includes(v as never) })
  }
  if (r.urban_only) {
    checks.push({ ruleId: 'urban_only', field: 'urban_or_rural', expected: 'urban', ok: (v) => v === 'urban' })
  }
  for (const f of r.not) checks.push({ ruleId: `not:${f}`, field: f, expected: false, ok: (v) => v === false })
  for (const f of r.requires) checks.push({ ruleId: `requires:${f}`, field: f, expected: true, ok: (v) => v === true })
  return checks
}

export function matchScheme(profile: Profile, scheme: Scheme): MatchResult {
  const base: Omit<MatchResult, 'status'> = {
    id: scheme.id,
    passed: [],
    failed: [],
    missing: [],
    rules_verified: scheme.rules_verified,
  }

  // only_if is checked first: an unmet precondition makes the scheme inapplicable, not failed.
  for (const [field, expected] of Object.entries(scheme.rules.only_if ?? {}) as [BooleanField, boolean][]) {
    const value = profile[field]
    if (value === null) return { ...base, status: 'needs_info', missing: [field] }
    if (value !== expected) return { ...base, status: 'not_needed' }
  }

  const passed: RuleId[] = []
  const failed: FailedRule[] = []
  const missing: ProfileField[] = []
  for (const c of checksFor(scheme)) {
    const value = profile[c.field]
    if (value === null) {
      if (!missing.includes(c.field)) missing.push(c.field) // unknown is never a pass or a fail
    } else if (c.ok(value)) {
      passed.push(c.ruleId)
    } else {
      failed.push({ ruleId: c.ruleId, detail: { field: c.field, actual: value, expected: c.expected } })
    }
  }

  const realFailures = failed.filter((f) => !f.ruleId.startsWith('requires:'))
  const prerequisiteFailures = failed.filter((f) => f.ruleId.startsWith('requires:'))

  if (realFailures.length > 0) {
    return { ...base, status: 'does_not_qualify', passed, failed, missing }
  }
  if (prerequisiteFailures.length > 0) {
    const prerequisites = prerequisiteFailures.map((f) => f.detail.field as BooleanField)
    const unlocked_by = PREREQUISITE_UNLOCKERS[prerequisites[0]]
    return {
      ...base,
      status: 'needs_prerequisite',
      passed,
      failed,
      missing,
      prerequisites,
      ...(unlocked_by ? { unlocked_by } : {}),
    }
  }
  // One known failure settles it, even with other fields still unknown.
  const status = missing.length > 0 ? 'needs_info' : 'qualifies'
  return { ...base, status, passed, failed, missing }
}

export function matchSchemes(profile: Profile, schemes: Scheme[] = SCHEMES): MatchResult[] {
  return schemes.map((s) => matchScheme(profile, s))
}
