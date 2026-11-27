// Compiles a scheme's JSON rules into checks once, and evaluates them against a
// profile into structured explanations. Missing data is never a pass or a fail.
import type { Scheme } from './scheme'
import type { BooleanField, Profile, ProfileField } from './types'

export type RuleId =
  | 'age_min'
  | 'age_max'
  | 'income_max_monthly'
  | 'occupation_in'
  | 'urban_only'
  | `not:${BooleanField}`
  | `requires:${BooleanField}`

export type RuleValue = number | string | boolean
export type ExpectedValue = RuleValue | string[]

// A field a rule can inspect. `state` is on the profile but is not one of the
// extractable profile fields, so it is named separately.
export type RuleField = ProfileField | 'state'
export type MissingField = RuleField

export type CriterionKind =
  | 'age_min'
  | 'age_max'
  | 'income_max_monthly'
  | 'occupation_in'
  | 'urban_only'
  | 'field_false'
  | 'field_true'

export interface Criterion {
  readonly ruleId: RuleId
  readonly kind: CriterionKind
  readonly field: RuleField
  readonly expected: ExpectedValue
  // A prerequisite gap is not a disqualification: it says what to do first.
  readonly prerequisite: boolean
  readonly ok: (value: RuleValue) => boolean
}

// A compiled rule set is read-only: callers may evaluate it, never edit it.
export type CompiledChecks = readonly Criterion[]

export interface FailedRule {
  ruleId: RuleId
  detail: {
    field: ProfileField
    actual: RuleValue
    expected: ExpectedValue
  }
}

export type EvaluationResult = 'pass' | 'fail' | 'unknown'

// One row per condition, for explaining a match without re-reading the JSON.
export interface RuleEvaluation {
  ruleId: RuleId
  kind: CriterionKind
  field: RuleField
  expected: ExpectedValue
  actual: RuleValue | null
  result: EvaluationResult
  prerequisite: boolean
  // Whether the catalogue's rule set for this scheme is fully verified.
  verified: boolean
  explanationKey: string // i18n key, e.g. rule_age_min
}

// Fixed order so results and explanations stay stable across runs.
// This is the pure compiler: it compiles every time it is called. Hot paths use
// checksFor(), which compiles once per scheme object.
export function compileChecks(scheme: Scheme): CompiledChecks {
  const r = scheme.rules
  const checks: Criterion[] = []
  if (r.age_min != null) {
    const min = r.age_min
    checks.push({ ruleId: 'age_min', kind: 'age_min', field: 'age', expected: min, prerequisite: false, ok: (v) => (v as number) >= min })
  }
  if (r.age_max != null) {
    const max = r.age_max
    checks.push({ ruleId: 'age_max', kind: 'age_max', field: 'age', expected: max, prerequisite: false, ok: (v) => (v as number) <= max })
  }
  if (r.income_max_monthly != null) {
    const max = r.income_max_monthly
    checks.push({
      ruleId: 'income_max_monthly',
      kind: 'income_max_monthly',
      field: 'monthly_income',
      expected: max,
      prerequisite: false,
      ok: (v) => (v as number) <= max,
    })
  }
  if (r.occupation_in && r.occupation_in.length > 0) {
    const allowed = r.occupation_in
    checks.push({
      ruleId: 'occupation_in',
      kind: 'occupation_in',
      field: 'occupation',
      expected: allowed,
      prerequisite: false,
      ok: (v) => allowed.includes(v as never),
    })
  }
  if (r.urban_only) {
    checks.push({
      ruleId: 'urban_only',
      kind: 'urban_only',
      field: 'urban_or_rural',
      expected: 'urban',
      prerequisite: false,
      ok: (v) => v === 'urban',
    })
  }
  for (const f of r.not) {
    checks.push({ ruleId: `not:${f}`, kind: 'field_false', field: f, expected: false, prerequisite: false, ok: (v) => v === false })
  }
  for (const f of r.requires) {
    checks.push({ ruleId: `requires:${f}`, kind: 'field_true', field: f, expected: true, prerequisite: true, ok: (v) => v === true })
  }
  // Frozen so a caller cannot corrupt the compiled representation.
  return Object.freeze(checks.map((c) => Object.freeze(c)))
}

// Compiled rules are cached per scheme object. A registry rebuild creates new
// scheme objects, so a stale compilation can never survive a catalogue swap.
const compiledByScheme = new WeakMap<Scheme, CompiledChecks>()

export function checksFor(scheme: Scheme): CompiledChecks {
  const cached = compiledByScheme.get(scheme)
  if (cached) return cached
  const fresh = compileChecks(scheme)
  compiledByScheme.set(scheme, fresh)
  return fresh
}

export function explanationKeyFor(ruleId: RuleId): string {
  return `rule_${ruleId.replace(/:/g, '_')}`
}

export interface Evaluation {
  evaluations: RuleEvaluation[]
  passed: RuleId[]
  failed: FailedRule[]
  missing: RuleField[]
  realFailures: FailedRule[]
  prerequisiteFailures: FailedRule[]
}

export function evaluate(
  scheme: Scheme,
  profile: Profile,
  checks: CompiledChecks = checksFor(scheme),
): Evaluation {
  const evaluations: RuleEvaluation[] = []
  const passed: RuleId[] = []
  const failed: FailedRule[] = []
  const missing: RuleField[] = []

  for (const c of checks) {
    const value = profile[c.field]
    if (value === null) {
      // Unknown is never a pass and never a fail.
      if (!missing.includes(c.field)) missing.push(c.field)
      evaluations.push({
        ruleId: c.ruleId,
        kind: c.kind,
        field: c.field,
        expected: c.expected,
        actual: null,
        result: 'unknown',
        prerequisite: c.prerequisite,
        verified: scheme.rules_verified,
        explanationKey: explanationKeyFor(c.ruleId),
      })
      continue
    }
    const ok = c.ok(value as RuleValue)
    if (ok) passed.push(c.ruleId)
    else
      failed.push({
        ruleId: c.ruleId,
        detail: { field: c.field as ProfileField, actual: value as RuleValue, expected: c.expected },
      })
    evaluations.push({
      ruleId: c.ruleId,
      kind: c.kind,
      field: c.field,
      expected: c.expected,
      actual: value as RuleValue,
      result: ok ? 'pass' : 'fail',
      prerequisite: c.prerequisite,
      verified: scheme.rules_verified,
      explanationKey: explanationKeyFor(c.ruleId),
    })
  }

  return {
    evaluations,
    passed,
    failed,
    missing,
    realFailures: failed.filter((f) => !f.ruleId.startsWith('requires:')),
    prerequisiteFailures: failed.filter((f) => f.ruleId.startsWith('requires:')),
  }
}
