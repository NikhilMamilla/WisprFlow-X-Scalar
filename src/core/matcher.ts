// Plain-code eligibility over the scheme catalogue. Ids and structured
// evaluations only; the UI renders the words.
import { evaluateGeography, type GeographyEvaluation } from './geography'
import {
  checksFor,
  evaluate,
  type CompiledChecks,
  type FailedRule,
  type MissingField,
  type RuleEvaluation,
  type RuleId,
} from './rules'
import { providerMap, type Scheme, type VerificationStatus } from './scheme'
import { SCHEMES } from './schemes'
import type { BooleanField, Profile } from './types'

export type MatchStatus =
  | 'qualifies'
  | 'does_not_qualify'
  | 'needs_info'
  | 'needs_prerequisite'
  | 'not_needed'
  | 'not_applicable' // outside the user's state, or discontinued

export interface MatchResult {
  id: string
  status: MatchStatus
  passed: RuleId[]
  failed: FailedRule[]
  missing: MissingField[]
  rules_verified: boolean
  verification: VerificationStatus
  // Why this scheme does or does not apply to the user's location.
  geography: GeographyEvaluation
  // One row per condition: expected, actual, pass/fail/unknown, verified.
  evaluations: RuleEvaluation[]
  // Only set when status is 'needs_prerequisite': the requires: rules that failed.
  prerequisites?: BooleanField[]
  unlocked_by?: string
}

const DEFAULT_PROVIDERS = providerMap(SCHEMES)

export function matchScheme(
  profile: Profile,
  scheme: Scheme,
  providers: ReadonlyMap<BooleanField, string[]> = DEFAULT_PROVIDERS,
  // Precompiled by the registry (or cached per scheme object) rather than
  // recompiled for every profile.
  checks: CompiledChecks = checksFor(scheme),
): MatchResult {
  const base: Omit<MatchResult, 'status'> = {
    id: scheme.id,
    passed: [],
    failed: [],
    missing: [],
    rules_verified: scheme.rules_verified,
    verification: scheme.verification.status,
    geography: evaluateGeography(profile, scheme),
    evaluations: [],
  }

  if (scheme.verification.status === 'DISCONTINUED') return { ...base, status: 'not_applicable' }

  // only_if is checked first: an unmet precondition makes the scheme
  // inapplicable, not failed.
  for (const [field, expected] of Object.entries(scheme.rules.only_if ?? {}) as [BooleanField, boolean][]) {
    const value = profile[field]
    if (value === null) return { ...base, status: 'needs_info', missing: [field] }
    if (value !== expected) return { ...base, status: 'not_needed' }
  }

  // Geography is evaluated after only_if so "not needed" keeps its meaning, and
  // before the rules so an out-of-state scheme never asks for a rule answer.
  const geography = base.geography
  if (geography.result === 'not_applicable') return { ...base, status: 'not_applicable' }
  if (geography.result === 'unknown_state' || geography.result === 'invalid_metadata') {
    return { ...base, status: 'needs_info', missing: ['state'] }
  }
  if (geography.result === 'unknown_district') return { ...base, status: 'needs_info', missing: ['district'] }

  const result = evaluate(scheme, profile, checks)
  const evaluated = { ...base, evaluations: result.evaluations, passed: result.passed, failed: result.failed }

  if (result.realFailures.length > 0) {
    return { ...evaluated, status: 'does_not_qualify', missing: result.missing }
  }
  if (result.prerequisiteFailures.length > 0) {
    const prerequisites = result.prerequisiteFailures.map((f) => f.detail.field as BooleanField)
    const unlocked_by = providers.get(prerequisites[0])?.[0]
    return {
      ...evaluated,
      status: 'needs_prerequisite',
      missing: result.missing,
      prerequisites,
      ...(unlocked_by ? { unlocked_by } : {}),
    }
  }
  // One known failure settles it, even with other fields still unknown.
  return { ...evaluated, status: result.missing.length > 0 ? 'needs_info' : 'qualifies', missing: result.missing }
}

// For a smaller catalogue the provider map is rebuilt from the list passed in;
// `matchAll` reuses a prebuilt registry map instead (see registry.ts).
export function matchSchemes(
  profile: Profile,
  schemes: Scheme[] = SCHEMES,
  providers: ReadonlyMap<BooleanField, string[]> = schemes === SCHEMES ? DEFAULT_PROVIDERS : providerMap(schemes),
  checksById?: ReadonlyMap<string, CompiledChecks>,
): MatchResult[] {
  return schemes.map((s) => matchScheme(profile, s, providers, checksById?.get(s.id)))
}

export function filterByStatus(results: MatchResult[], statuses: MatchStatus[]): MatchResult[] {
  return results.filter((r) => statuses.includes(r.status))
}
