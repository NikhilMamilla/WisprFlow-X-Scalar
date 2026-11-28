import { describe, expect, it } from 'vitest'
import { matchSchemes, type MatchResult } from './matcher'
import { SCHEMES, validateSchemes } from './schemes'
import { emptyProfile, type Profile } from './types'

function profile(fields: Partial<Profile>): Profile {
  return { ...emptyProfile(), ...fields }
}

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

const byId = (results: MatchResult[], id: string) => results.find((r) => r.id === id)!

describe('matchSchemes', () => {
  it('loads all six schemes from data/schemes.json', () => {
    expect(SCHEMES.map((s) => s.id)).toEqual(['eshram', 'pmsym', 'pmsby', 'pmjjby', 'svanidhi', 'pmjdy', 'telangana-bocwwb'])
  })

  it('a fully known, eligible vendor (own bank account) qualifies for all but PM Jan Dhan, which is not_needed', () => {
    const results = matchSchemes(eligibleVendor).filter((r) => r.id !== 'telangana-bocwwb')
    for (const r of results) expect(r.status).toBe(r.id === 'pmjdy' ? 'not_needed' : 'qualifies')
    // The state scheme is a new, separate record; it is not part of this claim.
    expect(matchSchemes(eligibleVendor).find((r) => r.id === 'telangana-bocwwb')!.status).toBe('needs_info')
    expect(byId(results, 'eshram').rules_verified).toBe(false)
    expect(byId(results, 'pmsym').rules_verified).toBe(true)
  })

  it('age 42 does not qualify for PM-SYM, and the failure shows 42 vs 40', () => {
    const pmsym = byId(matchSchemes({ ...eligibleVendor, age: 42 }), 'pmsym')
    expect(pmsym.status).toBe('does_not_qualify')
    expect(pmsym.failed).toEqual([{ ruleId: 'age_max', detail: { field: 'age', actual: 42, expected: 40 } }])
    expect(pmsym.passed).toContain('age_min')
  })

  it('someone in EPF does not qualify for PM-SYM or e-Shram, even with everything else unknown', () => {
    const results = matchSchemes(profile({ in_epf_esic_nps: true }))
    for (const id of ['pmsym', 'eshram']) {
      const r = byId(results, id)
      expect(r.status).toBe('does_not_qualify')
      expect(r.failed.map((f) => f.ruleId)).toContain('not:in_epf_esic_nps')
    }
  })

  it('null fields are missing (needs_info), never pass or fail', () => {
    const results = matchSchemes(emptyProfile())
    for (const r of results) {
      expect(r.status).toBe('needs_info')
      expect(r.passed).toEqual([])
      expect(r.failed).toEqual([])
    }
    expect(byId(results, 'pmsym').missing).toEqual([
      'age', 'monthly_income', 'pays_income_tax', 'in_epf_esic_nps', 'has_aadhaar', 'has_bank_account',
    ])
    expect(byId(results, 'svanidhi').missing).toEqual(['occupation', 'urban_or_rural'])
  })

  it('income over the limit and a rural vendor fail with the values shown', () => {
    const results = matchSchemes({ ...eligibleVendor, monthly_income: 18000, urban_or_rural: 'rural' })
    expect(byId(results, 'pmsym').failed).toEqual([
      { ruleId: 'income_max_monthly', detail: { field: 'monthly_income', actual: 18000, expected: 15000 } },
    ])
    expect(byId(results, 'svanidhi').failed).toEqual([
      { ruleId: 'urban_only', detail: { field: 'urban_or_rural', actual: 'rural', expected: 'urban' } },
    ])
  })

  it('no bank account is a prerequisite gap on the insurance schemes, not a disqualification', () => {
    const pmsby = byId(matchSchemes({ ...eligibleVendor, has_bank_account: false }), 'pmsby')
    expect(pmsby.status).toBe('needs_prerequisite')
    expect(pmsby.prerequisites).toEqual(['has_bank_account'])
    expect(pmsby.unlocked_by).toBe('pmjdy')
    expect(pmsby.failed).toEqual([
      { ruleId: 'requires:has_bank_account', detail: { field: 'has_bank_account', actual: false, expected: true } },
    ])
  })

  it('a real disqualification (age) takes priority over a prerequisite gap on the same scheme', () => {
    const pmsym = byId(matchSchemes({ ...eligibleVendor, age: 42, has_bank_account: false }), 'pmsym')
    expect(pmsym.status).toBe('does_not_qualify')
    expect(pmsym.failed.map((f) => f.ruleId)).toContain('age_max')
  })

  describe('PM Jan Dhan (pmjdy) and the demo story', () => {
    // The thela story from M2: account exists but is the brother's, so has_bank_account is false for the user.
    const demoStory = profile({
      age: 32,
      occupation: 'street_vendor',
      urban_or_rural: 'urban',
      monthly_income: 10000,
      has_bank_account: false,
      has_aadhaar: true,
      in_epf_esic_nps: false,
      pays_income_tax: false,
    })

    it('pmjdy qualifies, and the schemes it unlocks show needs_prerequisite pointing at it', () => {
      const results = matchSchemes(demoStory)
      expect(byId(results, 'pmjdy').status).toBe('qualifies')
      for (const id of ['pmsym', 'pmsby', 'pmjjby']) {
        const r = byId(results, id)
        expect(r.status).toBe('needs_prerequisite')
        expect(r.prerequisites).toEqual(['has_bank_account'])
        expect(r.unlocked_by).toBe('pmjdy')
      }
      // schemes with no bank-account requirement are unaffected
      expect(byId(results, 'eshram').status).toBe('qualifies')
      expect(byId(results, 'svanidhi').status).toBe('qualifies')
    })

    it('not_needed when the user already has their own bank account', () => {
      expect(byId(matchSchemes(eligibleVendor), 'pmjdy').status).toBe('not_needed')
    })

    it('needs_info when has_bank_account is not yet known', () => {
      const pmjdy = byId(matchSchemes(emptyProfile()), 'pmjdy')
      expect(pmjdy.status).toBe('needs_info')
      expect(pmjdy.missing).toEqual(['has_bank_account'])
    })

    it('does_not_qualify under 18 even without a bank account', () => {
      const pmjdy = byId(matchSchemes({ ...demoStory, age: 16 }), 'pmjdy')
      expect(pmjdy.status).toBe('does_not_qualify')
      expect(pmjdy.failed).toEqual([{ ruleId: 'age_min', detail: { field: 'age', actual: 16, expected: 18 } }])
    })
  })
})

describe('validateSchemes', () => {
  it('rejects a typo in a rule field name', () => {
    const bad = { ...SCHEMES[0], rules: { ...SCHEMES[0].rules, requires: ['has_bank_acount'] } }
    expect(() => validateSchemes([bad as never])).toThrow(/has_bank_acount/)
  })
})
