import { describe, expect, it } from 'vitest'
import { pickNextFollowUp, MAX_FOLLOWUPS } from './followups'
import { matchSchemes } from './matcher'
import { emptyProfile, type Profile, type ProfileField } from './types'

function next(profile: Profile, asked: ProfileField[] = []) {
  return pickNextFollowUp(profile, matchSchemes(profile), asked)
}

describe('pickNextFollowUp', () => {
  it('with nothing known, asks has_bank_account first: it settles pmjdy outright, tied with age on need-count', () => {
    expect(next(emptyProfile())).toEqual({ field: 'has_bank_account', answer: 'yes_no', readBack: false })
  })

  it('never re-asks a field, and moves on to the next most useful one', () => {
    expect(next(emptyProfile(), ['age'])?.field).toBe('has_bank_account')
  })

  it('never asks something already known', () => {
    expect(next({ ...emptyProfile(), age: 32 })?.field).not.toBe('age')
  })

  it('stops after four questions', () => {
    expect(next(emptyProfile(), ['age', 'has_bank_account', 'in_epf_esic_nps', 'has_aadhaar'])).toBeNull()
  })

  it('a simulated conversation asks at most four distinct questions', () => {
    const profile = emptyProfile()
    const asked: ProfileField[] = []
    for (let q = next(profile, asked); q; q = next(profile, asked)) asked.push(q.field)
    expect(asked.length).toBe(MAX_FOLLOWUPS)
    expect(new Set(asked).size).toBe(asked.length)
  })

  it('monthly_income is read back; yes/no fields are not', () => {
    const p: Profile = { ...emptyProfile(), age: 30, has_bank_account: true, in_epf_esic_nps: false, pays_income_tax: false, has_aadhaar: true }
    expect(next(p)).toEqual({ field: 'monthly_income', answer: 'number', readBack: true })
    expect(next(emptyProfile(), ['age'])?.readBack).toBe(false)
  })

  it('asks nothing when every scheme is settled', () => {
    const settled: Profile = {
      ...emptyProfile(),
      age: 32, occupation: 'street_vendor', urban_or_rural: 'urban', monthly_income: 10000,
      has_bank_account: true, has_aadhaar: true, in_epf_esic_nps: false, pays_income_tax: false,
    }
    expect(next(settled)).toBeNull()
  })
})
