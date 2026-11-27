// Geographic applicability for one scheme and one profile. This is part of the
// eligibility engine, not a second one: the matcher calls it and maps the result
// onto the same MatchStatus values every other condition uses.
import { normalizeDistrict, sameDistrict, sameRegion } from './geo'
import type { Scheme } from './scheme'
import type { Profile } from './types'

export type GeographyResult =
  | 'applicable'
  | 'not_applicable'
  | 'unknown_state'
  | 'unknown_district'
  | 'invalid_metadata'

export interface GeographyEvaluation {
  result: GeographyResult
  missingField: 'state' | 'district' | null
  scope: Scheme['geography']['scope']
  declaredStates: string[]
  declaredDistricts: string[]
}

function evaluation(
  scheme: Scheme,
  result: GeographyResult,
  missingField: 'state' | 'district' | null = null,
): GeographyEvaluation {
  return {
    result,
    missingField,
    scope: scheme.geography.scope,
    declaredStates: scheme.geography.states ?? [],
    declaredDistricts: scheme.geography.districts ?? [],
  }
}

// Order matters: a state mismatch is settled before asking about a district, so the
// app never asks for a district for a scheme the user's state already excludes.
export function evaluateGeography(profile: Profile, scheme: Scheme): GeographyEvaluation {
  const geography = scheme.geography
  if (!geography || geography.scope === 'central') return evaluation(scheme, 'applicable')

  const states = geography.states ?? []
  if (states.length === 0) return evaluation(scheme, 'invalid_metadata', 'state')

  // A missing state is a question, never a rejection.
  if (profile.state === null) return evaluation(scheme, 'unknown_state', 'state')

  if (!states.some((declared) => sameRegion(declared, profile.state!))) {
    return evaluation(scheme, 'not_applicable')
  }

  const districts = geography.districts ?? []
  if (districts.length === 0) return evaluation(scheme, 'applicable')

  if (profile.district === null) return evaluation(scheme, 'unknown_district', 'district')

  const parsed = normalizeDistrict(profile.district)
  if (!parsed) return evaluation(scheme, 'unknown_district', 'district')

  let unverifiable = false
  for (const declared of districts) {
    const same = sameDistrict(declared, parsed.value)
    if (same === true) return evaluation(scheme, 'applicable')
    if (same === null) unverifiable = true // different scripts: cannot compare
  }
  // A district we cannot compare with the declared list is uncertain, not a "no".
  if (unverifiable) return evaluation(scheme, 'unknown_district', 'district')
  return evaluation(scheme, 'not_applicable')
}

// A scheme is "location-sensitive" when geography could change its result for
// this profile. The results screen uses this to offer a location correction.
export function locationSensitive(scheme: Scheme): boolean {
  return scheme.geography.scope !== 'central'
}
