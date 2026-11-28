import { describe, expect, it } from 'vitest'
import { filterByStatus, matchScheme, matchSchemes } from './matcher'
import { providerMap, type Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { emptyProfile, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const byId = (id: string) => SCHEMES.find((s) => s.id === id)!
const profile = (fields: Partial<Profile>): Profile => ({ ...emptyProfile(), ...fields })

const eligibleVendor = profile({
  age: 32,
  occupation: 'street_vendor',
  urban_or_rural: 'urban',
  monthly_income: 10000,
  has_bank_account: true,
  has_aadhaar: true,
  in_epf_esic_nps: false,
  pays_income_tax: false,
})

describe('structured rule evaluations', () => {
  it('returns one explanation per condition, with expected and actual values', () => {
    const result = matchScheme({ ...eligibleVendor, age: 42 }, byId('pmsym'))
    expect(result.status).toBe('does_not_qualify')
    const ageMax = result.evaluations.find((e) => e.ruleId === 'age_max')!
    expect(ageMax).toMatchObject({ expected: 40, actual: 42, result: 'fail', verified: true, explanationKey: 'rule_age_max' })
    expect(result.evaluations.filter((e) => e.result === 'pass').length).toBeGreaterThan(0)
    for (const e of result.evaluations) expect(e.explanationKey).toBeTruthy()
  })

  it('marks a condition whose answer is unknown as unknown, never as a pass or fail', () => {
    const result = matchScheme(emptyProfile(), byId('pmsby'))
    expect(result.evaluations.every((e) => e.result === 'unknown')).toBe(true)
    expect(result.evaluations.map((e) => e.field)).toContain('age')
    expect(result.status).toBe('needs_info')
  })

  it('records that the rule set itself is not verified', () => {
    const result = matchScheme(eligibleVendor, byId('eshram'))
    expect(result.rules_verified).toBe(false)
    expect(result.evaluations.every((e) => e.verified === false)).toBe(true)
    expect(result.verification).toBe('PARTIALLY_VERIFIED')
  })

  it('marks prerequisite failures as prerequisites, not disqualifications', () => {
    const result = matchScheme({ ...eligibleVendor, has_bank_account: false }, byId('pmsby'), providerMap(SCHEMES))
    const bank = result.evaluations.find((e) => e.ruleId === 'requires:has_bank_account')!
    expect(bank).toMatchObject({ result: 'fail', prerequisite: true })
    expect(result.status).toBe('needs_prerequisite')
    expect(result.unlocked_by).toBe('pmjdy')
  })
})

describe('geography', () => {
  const telangana: Scheme = {
    ...clone(byId('pmjdy')),
    id: 'telangana_test',
    name_en: 'Telangana test scheme',
    aliases: [],
    prerequisites: [],
    provides: [],
    rules: { age_min: 18, not: [], requires: [] },
    geography: { scope: 'state', states: ['Telangana'] },
  }

  it('does not apply outside the scheme state once the state is known', () => {
    expect(matchScheme(profile({ state: 'Bihar' }), telangana).status).toBe('not_applicable')
  })

  it('applies inside the scheme state', () => {
    expect(matchScheme(profile({ state: 'Telangana' }), telangana).status).not.toBe('not_applicable')
  })

  it('asks for the state when it is unknown instead of guessing', () => {
    const result = matchScheme(emptyProfile(), telangana)
    expect(result.status).toBe('needs_info')
    expect(result.missing).toEqual(['state'])
  })

  it('never hides a central scheme behind a state check', () => {
    for (const s of SCHEMES.filter((scheme) => scheme.geography.scope === 'central'))
      expect(matchScheme(profile({ state: 'Bihar' }), s).status).not.toBe('not_applicable')
  })

  it('treats a discontinued scheme as unavailable', () => {
    const discontinued: Scheme = { ...clone(byId('pmsym')), verification: { status: 'DISCONTINUED' }, rules_verified: false }
    expect(matchScheme(eligibleVendor, discontinued).status).toBe('not_applicable')
  })
})

describe('regression guard for the six schemes', () => {
  it('keeps the existing statuses for a fully known vendor', () => {
    const results = matchSchemes(eligibleVendor)
    expect(results.map((r) => [r.id, r.status])).toEqual([
      ['eshram', 'qualifies'],
      ['pmsym', 'qualifies'],
      ['pmsby', 'qualifies'],
      ['pmjjby', 'qualifies'],
      ['svanidhi', 'qualifies'],
      ['pmjdy', 'not_needed'],
      ['telangana-bocwwb', 'needs_info'],
    ])
  })

  it('keeps needs_prerequisite and unlocked_by for the demo story', () => {
    const results = matchSchemes({ ...eligibleVendor, has_bank_account: false })
    for (const id of ['pmsym', 'pmsby', 'pmjjby']) {
      const r = results.find((x) => x.id === id)!
      expect(r.status).toBe('needs_prerequisite')
      expect(r.unlocked_by).toBe('pmjdy')
    }
  })

  it('filters results by status for the UI groupings', () => {
    const results = matchSchemes(eligibleVendor)
    expect(filterByStatus(results, ['qualifies']).map((r) => r.id)).not.toContain('pmjdy')
    expect(filterByStatus(results, ['not_applicable'])).toEqual([])
  })
})
