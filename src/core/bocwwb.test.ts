import { describe, expect, it } from 'vitest'
import { SCHEMES } from './schemes'
import { matchSchemes } from './matcher'
import { pickNextFollowUp } from './followups'
import { emptyProfile, type Profile } from './types'

const base: Profile = {
  ...emptyProfile(),
  age: 32,
  occupation: 'construction_worker',
  urban_or_rural: 'urban',
  monthly_income: 12000,
  has_bank_account: true,
  has_aadhaar: true,
  in_epf_esic_nps: false,
  pays_income_tax: false,
  worked_90_days_construction: true,
  dependants: 3,
  state: 'Telangana',
}

const six = SCHEMES.filter((s) => s.id !== 'telangana-bocwwb')
const bocwwb = SCHEMES.find((s) => s.id === 'telangana-bocwwb')!
const outcome = (profile: Profile) => matchSchemes(profile, six).map((r) => `${r.id}:${r.status}`).join(' ')

// The six existing schemes must not move when a seventh is added. These literals
// were captured from the catalogue before the import.
const SNAPSHOT = [
  'eshram:qualifies pmsym:qualifies pmsby:qualifies pmjjby:qualifies svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:does_not_qualify pmsby:does_not_qualify pmjjby:does_not_qualify svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:does_not_qualify pmsby:qualifies pmjjby:qualifies svanidhi:qualifies pmjdy:not_needed',
  'eshram:qualifies pmsym:needs_prerequisite pmsby:needs_prerequisite pmjjby:needs_prerequisite svanidhi:does_not_qualify pmjdy:qualifies',
  'eshram:qualifies pmsym:does_not_qualify pmsby:qualifies pmjjby:does_not_qualify svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:qualifies pmsby:qualifies pmjjby:qualifies svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:qualifies pmsby:qualifies pmjjby:qualifies svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:qualifies pmsby:qualifies pmjjby:qualifies svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:does_not_qualify pmsym:does_not_qualify pmsby:qualifies pmjjby:does_not_qualify svanidhi:does_not_qualify pmjdy:not_needed',
  'eshram:qualifies pmsym:qualifies pmsby:qualifies pmjjby:qualifies svanidhi:does_not_qualify pmjdy:not_needed',
]

const PROFILES: Profile[] = [
  base,
  { ...base, age: 17 },
  { ...base, age: 45, occupation: 'street_vendor', monthly_income: 8000 },
  { ...base, occupation: 'domestic_worker', has_bank_account: false },
  { ...base, age: 60, occupation: 'delivery_rider', monthly_income: 20000 },
  { ...base, state: null },
  { ...base, state: 'Karnataka' },
  { ...base, worked_90_days_construction: false },
  { ...base, age: 70, occupation: 'other', monthly_income: 40000, pays_income_tax: true, in_epf_esic_nps: true },
  { ...base, age: 25, urban_or_rural: 'rural', monthly_income: 9000, state: null },
]

describe('the six existing schemes are unchanged', () => {
  it.each(PROFILES.map((profile, index) => [index, profile] as const))('profile %i', (index, profile) => {
    expect(outcome(profile)).toBe(SNAPSHOT[index])
  })
})

describe('Telangana BOCW Welfare Board registration', () => {
  it('is a state scheme with only the conditions the record supports', () => {
    expect(bocwwb.geography).toMatchObject({ scope: 'state', states: ['Telangana'] })
    expect(bocwwb.rules).toMatchObject({ age_min: 18, age_max: 59, requires: ['worked_90_days_construction'] })
    expect(bocwwb.verification.status).toBe('VERIFIED')
    expect(bocwwb.verification.checkedOn).toBe('2026-11-28')
  })

  it('states registration only, with no amount and no claim procedure', () => {
    expect(bocwwb.benefit_en).not.toMatch(/₹|\bRs\.?\s?\d/)
    expect(bocwwb.benefit_en.toLowerCase()).toContain('registration')
    expect(bocwwb.verify_note).toContain('no benefit amount')
    expect(bocwwb.verification.notes).toContain('available soon')
  })

  it('qualifies a 32-year-old Telangana construction worker with 90 days', () => {
    const result = matchSchemes(base, SCHEMES).find((r) => r.id === 'telangana-bocwwb')!
    expect(result.status).toBe('qualifies')
  })

  it('needs the state, and never rejects on a missing state', () => {
    const result = matchSchemes({ ...base, state: null }, SCHEMES).find((r) => r.id === 'telangana-bocwwb')!
    expect(result.status).toBe('needs_info')
    expect(result.missing).toContain('state')
  })

  it('needs the 90-day answer when it is unknown', () => {
    const result = matchSchemes({ ...base, worked_90_days_construction: null }, SCHEMES).find(
      (r) => r.id === 'telangana-bocwwb',
    )!
    expect(result.status).toBe('needs_info')
    expect(result.missing).toContain('worked_90_days_construction')
  })

  it('points to the 90-day requirement as a prerequisite when it is missing', () => {
    const result = matchSchemes({ ...base, worked_90_days_construction: false }, SCHEMES).find(
      (r) => r.id === 'telangana-bocwwb',
    )!
    expect(result.status).toBe('needs_prerequisite')
  })

  it('does not qualify outside the age band', () => {
    for (const age of [17, 60]) {
      const result = matchSchemes({ ...base, age }, SCHEMES).find((r) => r.id === 'telangana-bocwwb')!
      expect(result.status).toBe('does_not_qualify')
    }
  })

  it('is not applicable outside Telangana', () => {
    const result = matchSchemes({ ...base, state: 'Karnataka' }, SCHEMES).find((r) => r.id === 'telangana-bocwwb')!
    expect(result.status).toBe('not_applicable')
  })
})

describe('the state question', () => {
  it('is offered only when a state scheme is blocked on it', () => {
    const blocked = matchSchemes({ ...base, state: null }, SCHEMES)
    expect(pickNextFollowUp({ ...base, state: null }, blocked, [])?.field).toBe('state')

    const centralOnly = matchSchemes({ ...base, state: null }, six)
    expect(pickNextFollowUp({ ...base, state: null }, centralOnly, [])?.field).not.toBe('state')
  })

  it('is never asked twice and can be skipped', () => {
    const blocked = matchSchemes({ ...base, state: null }, SCHEMES)
    expect(pickNextFollowUp({ ...base, state: null }, blocked, ['state'] as never)?.field).not.toBe('state')
    // Skipping leaves the field null, so the scheme stays a "maybe", not a "no".
    const still = matchSchemes({ ...base, state: null }, SCHEMES).find((r) => r.id === 'telangana-bocwwb')!
    expect(still.status).toBe('needs_info')
  })
})
