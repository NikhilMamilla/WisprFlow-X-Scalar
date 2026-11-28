import { describe, expect, it } from 'vitest'
import { evaluateGeography } from './geography'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { emptyProfile, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const profile = (fields: Partial<Profile>): Profile => ({ ...emptyProfile(), ...fields })

function scheme(geography: Scheme['geography']): Scheme {
  return {
    ...clone(SCHEMES[0]),
    id: 'geo_test',
    aliases: [],
    prerequisites: [],
    provides: [],
    geography,
    rules: { age_min: 18, not: [], requires: [] },
  }
}

describe('national schemes', () => {
  it('apply with no location data at all', () => {
    for (const s of SCHEMES.filter((scheme) => scheme.geography.scope === 'central')) {
      const result = evaluateGeography(emptyProfile(), s)
      expect(result.result).toBe('applicable')
      expect(result.missingField).toBeNull()
    }
  })

  it('apply no matter which state the user is in', () => {
    expect(evaluateGeography(profile({ state: 'Bihar' }), scheme({ scope: 'central' })).result).toBe('applicable')
  })
})

describe('state schemes', () => {
  const telangana = scheme({ scope: 'state', states: ['Telangana'] })

  it('apply in their own state', () => {
    expect(evaluateGeography(profile({ state: 'Telangana' }), telangana).result).toBe('applicable')
  })

  it('do not apply in another state', () => {
    expect(evaluateGeography(profile({ state: 'Bihar' }), telangana).result).toBe('not_applicable')
  })

  it('are unknown, not rejected, when the state is missing', () => {
    const result = evaluateGeography(emptyProfile(), telangana)
    expect(result.result).toBe('unknown_state')
    expect(result.missingField).toBe('state')
  })

  it('match a differently spelled or coded state', () => {
    for (const state of ['telangana', 'TELANGANA', 'TS', 'Telangana ']) {
      expect(evaluateGeography(profile({ state }), telangana).result).toBe('applicable')
    }
  })

  it('do not apply when the user is in a district-like name that is not that state', () => {
    expect(evaluateGeography(profile({ state: 'Bihar Sharif' }), telangana).result).toBe('not_applicable')
  })
})

describe('multi-state and union territory schemes', () => {
  const southIndia = scheme({ scope: 'multi_state', states: ['Telangana', 'Andhra Pradesh', 'Karnataka'] })

  it('apply in any of their states', () => {
    expect(evaluateGeography(profile({ state: 'Andhra Pradesh' }), southIndia).result).toBe('applicable')
    expect(evaluateGeography(profile({ state: 'Karnataka' }), southIndia).result).toBe('applicable')
  })

  it('do not apply outside them', () => {
    expect(evaluateGeography(profile({ state: 'Kerala' }), southIndia).result).toBe('not_applicable')
  })

  it('support a union territory by name or code', () => {
    const delhi = scheme({ scope: 'union_territory', states: ['Delhi'] })
    expect(evaluateGeography(profile({ state: 'Delhi' }), delhi).result).toBe('applicable')
    expect(evaluateGeography(profile({ state: 'DL' }), delhi).result).toBe('applicable')
    expect(evaluateGeography(profile({ state: 'Telangana' }), delhi).result).toBe('not_applicable')
  })
})

describe('district schemes', () => {
  const hyderabad = scheme({ scope: 'district', states: ['Telangana'], districts: ['Hyderabad'] })

  it('apply in the right district', () => {
    expect(evaluateGeography(profile({ state: 'Telangana', district: 'Hyderabad' }), hyderabad).result).toBe('applicable')
    expect(evaluateGeography(profile({ state: 'Telangana', district: ' hyderabad district ' }), hyderabad).result).toBe(
      'applicable',
    )
  })

  it('do not apply in the wrong district', () => {
    expect(evaluateGeography(profile({ state: 'Telangana', district: 'Warangal' }), hyderabad).result).toBe(
      'not_applicable',
    )
  })

  it('are unknown, not rejected, when the district is missing', () => {
    const result = evaluateGeography(profile({ state: 'Telangana' }), hyderabad)
    expect(result.result).toBe('unknown_district')
    expect(result.missingField).toBe('district')
  })

  it('ask for the state before the district when the state is unknown', () => {
    expect(evaluateGeography(emptyProfile(), hyderabad).result).toBe('unknown_state')
  })

  it('settle a state mismatch without asking for a district', () => {
    expect(evaluateGeography(profile({ state: 'Bihar' }), hyderabad).result).toBe('not_applicable')
  })

  it('stay uncertain when the district is in another script and cannot be compared', () => {
    const result = evaluateGeography(profile({ state: 'Telangana', district: 'హైదరాబాద్' }), hyderabad)
    expect(result.result).toBe('unknown_district')
  })

  it('record what the scheme declared, for explanations', () => {
    const result = evaluateGeography(profile({ state: 'Telangana' }), hyderabad)
    expect(result.declaredDistricts).toEqual(['Hyderabad'])
    expect(result.declaredStates).toEqual(['Telangana'])
    expect(result.scope).toBe('district')
  })
})

describe('invalid geographic metadata', () => {
  it('is uncertain rather than silently national or rejected', () => {
    const broken = scheme({ scope: 'state', states: [] })
    const result = evaluateGeography(profile({ state: 'Bihar' }), broken)
    expect(result.result).toBe('invalid_metadata')
    expect(result.missingField).toBe('state')
  })
})
