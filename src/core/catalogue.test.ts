import { describe, expect, it } from 'vitest'
import { validateCatalogue } from './catalogue'
import { SCHEMES } from './schemes'
import type { Scheme } from './scheme'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const base = (overrides: Partial<Scheme> = {}): Scheme => ({ ...clone(SCHEMES[0]), ...overrides })
const codes = (report: ReturnType<typeof validateCatalogue>) => report.errors.map((e) => e.code)

describe('the bundled catalogue', () => {
  const report = validateCatalogue({ schemes: clone(SCHEMES) })

  it('validates with no errors and keeps catalogue order', () => {
    expect(report.ok).toBe(true)
    expect(report.errors).toEqual([])
    expect(report.schemes.map((s) => s.id)).toEqual(['eshram', 'pmsym', 'pmsby', 'pmjjby', 'svanidhi', 'pmjdy', 'telangana-bocwwb'])
  })

  it('derives rules_verified from verification.status, so unverified rules stay unverified', () => {
    expect(report.schemes.find((s) => s.id === 'eshram')!.rules_verified).toBe(false)
    expect(report.schemes.find((s) => s.id === 'svanidhi')!.rules_verified).toBe(false)
    expect(report.schemes.find((s) => s.id === 'pmsym')!.rules_verified).toBe(true)
    expect(report.schemes.find((s) => s.id === 'eshram')!.verification.status).toBe('PARTIALLY_VERIFIED')
  })

  it('gives every scheme a geography, a category and a source', () => {
    for (const s of report.schemes.filter((scheme) => scheme.id !== 'telangana-bocwwb')) {
      expect(s.geography.scope).toBe('central')
      expect(s.category).toBeTruthy()
      expect(s.verification.sources?.length).toBeGreaterThan(0)
      expect(s.verification.checkedOn).toBe('2026-11-27')
    }
    const state = report.schemes.find((s) => s.id === 'telangana-bocwwb')!
    expect(state.geography.scope).toBe('state')
    expect(state.verification.checkedOn).toBe('2026-11-28')
  })

  it('records that PM Jan Dhan provides a bank account', () => {
    expect(report.schemes.find((s) => s.id === 'pmjdy')!.provides).toEqual(['has_bank_account'])
  })
})

describe('validateCatalogue: identity', () => {
  it('rejects a duplicate scheme id', () => {
    const report = validateCatalogue([base(), base({ name_en: 'Other name' })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('duplicate_id')
  })

  it('rejects a missing or malformed id', () => {
    expect(codes(validateCatalogue([base({ id: '' })]))).toContain('missing_id')
    expect(codes(validateCatalogue([base({ id: 'E-Shram!' })]))).toContain('invalid_id')
  })

  it('rejects a missing scheme name', () => {
    const report = validateCatalogue([base({ name_hi: '' })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('missing_field')
    expect(report.errors.some((e) => e.path.endsWith('name_hi'))).toBe(true)
  })

  it('rejects an alias that belongs to another scheme', () => {
    const a = base({ id: 'a', name_en: 'A', aliases: ['shared'] })
    const b = base({ id: 'b', name_en: 'B', aliases: ['shared'] })
    expect(codes(validateCatalogue([a, b]))).toContain('alias_collision')
  })

  it('handles garbage without throwing', () => {
    for (const input of [null, {}, 42, { schemes: 'no' }]) {
      const report = validateCatalogue(input)
      expect(report.ok).toBe(false)
      expect(report.schemes).toEqual([])
    }
  })
})

describe('validateCatalogue: sources and verification', () => {
  it('rejects an invalid source URL', () => {
    const report = validateCatalogue([base({ source_url: 'not a url' })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('invalid_url')
  })

  it('warns when no source looks official, but does not fail', () => {
    const report = validateCatalogue([
      base({
        source_url: 'https://example.com/scheme',
        verification: { status: 'UNVERIFIED', sources: [{ url: 'https://example.com/scheme' }] },
      }),
    ])
    expect(report.ok).toBe(true)
    expect(report.warnings.map((w) => w.code)).toContain('no_official_source')
    expect(report.warnings.map((w) => w.code)).toContain('unofficial_source')
  })

  it('rejects an invalid verification status and a bad date', () => {
    const badStatus = base({ verification: { status: 'PROBABLY' as never } })
    expect(codes(validateCatalogue([badStatus]))).toContain('invalid_verification_status')
    const badDate = base({ verification: { status: 'VERIFIED', checkedOn: '27-11-2026' } })
    expect(codes(validateCatalogue([badDate]))).toContain('invalid_date')
  })

  it('rejects a non-government source type it cannot classify', () => {
    const report = validateCatalogue([
      base({ verification: { status: 'VERIFIED', sources: [{ url: 'https://labour.gov.in/x', type: 'blog' as never }] } }),
    ])
    expect(codes(report)).toContain('invalid_source_type')
  })

  it('treats a discontinued scheme as a warning, not a silent removal', () => {
    const report = validateCatalogue([base({ verification: { status: 'DISCONTINUED' } })])
    expect(report.ok).toBe(true)
    expect(report.schemes[0].verification.status).toBe('DISCONTINUED')
    expect(report.schemes[0].rules_verified).toBe(false)
  })

  it('derives verification from a legacy rules_verified flag', () => {
    const legacy = clone(SCHEMES[0]) as unknown as Record<string, unknown>
    delete legacy.verification
    legacy.rules_verified = false
    const report = validateCatalogue([legacy])
    expect(report.ok).toBe(true)
    expect(report.schemes[0].verification.status).toBe('UNVERIFIED')
    expect(report.schemes[0].rules_verified).toBe(false)
  })
})

describe('validateCatalogue: eligibility rules', () => {
  it('rejects an unsupported rule operator', () => {
    const bad = base()
    ;(bad.rules as unknown as Record<string, unknown>).income_max_yearly = 100000
    const report = validateCatalogue([bad])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('unknown_rule')
    expect(report.errors.find((e) => e.code === 'unknown_rule')!.message).toContain('income_max_yearly')
  })

  it('rejects an unknown profile field in not/requires/only_if', () => {
    const requires = base()
    requires.rules = { ...requires.rules, requires: ['has_bank_acount' as never] }
    expect(codes(validateCatalogue([requires]))).toContain('unknown_field')

    const onlyIf = base()
    onlyIf.rules = { ...onlyIf.rules, only_if: { has_bank_acount: false } as never }
    expect(codes(validateCatalogue([onlyIf]))).toContain('unknown_field')
  })

  it('rejects an invalid age range and a negative income limit', () => {
    const range = base()
    range.rules = { ...range.rules, age_min: 60, age_max: 40 }
    expect(codes(validateCatalogue([range]))).toContain('conflicting_rules')

    const income = base()
    income.rules = { ...income.rules, income_max_monthly: -1 }
    expect(codes(validateCatalogue([income]))).toContain('invalid_rule_value')
  })

  it('rejects an empty occupation list and an unknown occupation', () => {
    const empty = base()
    empty.rules = { ...empty.rules, occupation_in: [] }
    expect(codes(validateCatalogue([empty]))).toContain('invalid_rule_value')

    const unknown = base()
    unknown.rules = { ...unknown.rules, occupation_in: ['farmer' as never] }
    expect(codes(validateCatalogue([unknown]))).toContain('unknown_occupation')
  })

  it('rejects a field that is both required and forbidden', () => {
    const both = base()
    both.rules = { ...both.rules, not: ['has_aadhaar'], requires: ['has_aadhaar'] }
    const report = validateCatalogue([both])
    expect(codes(report)).toContain('conflicting_rules')
  })
})

describe('validateCatalogue: geography', () => {
  it('rejects a state scheme with no states', () => {
    const report = validateCatalogue([base({ geography: { scope: 'state' } })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('missing_states')
  })

  it('rejects a central scheme that lists states', () => {
    const report = validateCatalogue([base({ geography: { scope: 'central', states: ['Telangana'] } })])
    expect(codes(report)).toContain('scope_mismatch')
  })

  it('requires districts for a district scheme, and warns that they cannot be cross-checked', () => {
    const missing = validateCatalogue([base({ geography: { scope: 'district', states: ['Telangana'] } })])
    expect(codes(missing)).toContain('missing_districts')

    const ok = validateCatalogue([
      base({ geography: { scope: 'district', states: ['Telangana'], districts: ['Hyderabad'] } }),
    ])
    expect(ok.ok).toBe(true)
    expect(ok.warnings.map((w) => w.code)).toContain('districts_unverified')
  })

  it('warns, but does not fail, on a state name it does not recognise', () => {
    const report = validateCatalogue([base({ geography: { scope: 'state', states: ['Atlantis'] } })])
    expect(report.ok).toBe(true)
    expect(report.warnings.map((w) => w.code)).toContain('unknown_state')
  })

  it('accepts a state name with a different spelling of a known state', () => {
    const report = validateCatalogue([base({ geography: { scope: 'state', states: ['telangana'] } })])
    expect(report.warnings.map((w) => w.code)).not.toContain('unknown_state')
  })

  it('warns about a repeated district', () => {
    const report = validateCatalogue([
      base({ geography: { scope: 'district', states: ['Telangana'], districts: ['Hyderabad', 'hyderabad'] } }),
    ])
    expect(report.warnings.map((w) => w.code)).toContain('duplicate_district')
  })

  it('accepts a Telangana-only scheme', () => {
    const report = validateCatalogue([
      base({ geography: { scope: 'state', states: ['Telangana'], authority: 'Government of Telangana' } }),
    ])
    expect(report.ok).toBe(true)
    expect(report.schemes[0].geography.states).toEqual(['Telangana'])
  })
})

describe('validateCatalogue: localization', () => {
  it('warns about a missing Telugu translation instead of inventing one', () => {
    const scheme = base({ name_te: undefined, benefit_te: undefined })
    scheme.documents = scheme.documents.map((d) => ({ ...d, te: undefined }))
    const report = validateCatalogue([scheme])
    expect(report.ok).toBe(true)
    expect(report.warnings.filter((w) => w.code === 'missing_telugu').length).toBeGreaterThan(1)
  })

  it('rejects Devanagari text in a Telugu field', () => {
    const report = validateCatalogue([base({ name_te: 'ई-श्रम' })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('wrong_script')
  })
})

describe('validateCatalogue: documents and dependencies', () => {
  it('rejects a scheme with no documents', () => {
    expect(codes(validateCatalogue([base({ documents: [] })]))).toContain('missing_documents')
  })

  it('rejects a document missing its Hindi text', () => {
    const scheme = base()
    scheme.documents = [{ ...scheme.documents[0], hi: '' }]
    const report = validateCatalogue([scheme])
    expect(codes(report)).toContain('missing_field')
    expect(report.errors.some((e) => e.path.includes('documents[0]'))).toBe(true)
  })

  it('rejects a prerequisite scheme id that does not exist', () => {
    const report = validateCatalogue([base({ prerequisites: ['ghost_scheme'] })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('missing_prerequisite')
  })

  it('detects a circular prerequisite chain', () => {
    const a = base({ id: 'a', name_en: 'A', prerequisites: ['b'] })
    const b = base({ id: 'b', name_en: 'B', prerequisites: ['a'] })
    const report = validateCatalogue([a, b])
    expect(codes(report)).toContain('circular_dependency')
    expect(report.errors.find((e) => e.code === 'circular_dependency')!.cycle).toEqual(['a', 'b', 'a'])
  })

  it('returns no schemes at all when any error exists, so an import cannot half-apply', () => {
    const report = validateCatalogue([base({ id: 'ok' }), base({ id: '' })])
    expect(report.ok).toBe(false)
    expect(report.schemes).toEqual([])
  })
})

describe('validateCatalogue: verification integrity', () => {
  it('rejects a verified scheme with no check date', () => {
    const report = validateCatalogue([base({ verification: { status: 'VERIFIED' } })])
    expect(report.ok).toBe(false)
    expect(codes(report)).toContain('missing_checked_on')
  })

  it('requires a date for partially verified rules too, but not for unverified ones', () => {
    expect(codes(validateCatalogue([base({ verification: { status: 'PARTIALLY_VERIFIED' } })]))).toContain(
      'missing_checked_on',
    )
    expect(validateCatalogue([base({ verification: { status: 'UNVERIFIED' } })]).ok).toBe(true)
  })

  it('downgrades lapsed verification to OUTDATED instead of presenting it as current', () => {
    const report = validateCatalogue(
      [base({ verification: { status: 'VERIFIED', checkedOn: '2026-01-01', expiresOn: '2026-06-01' } })],
      { today: '2026-11-27' },
    )
    expect(report.ok).toBe(true)
    expect(report.warnings.map((w) => w.code)).toContain('expired_verification')
    expect(report.schemes[0].verification.status).toBe('OUTDATED')
    expect(report.schemes[0].rules_verified).toBe(false)
  })

  it('accepts a verification window that is still open', () => {
    const report = validateCatalogue(
      [
        base({
          verification: {
            status: 'VERIFIED',
            checkedOn: '2026-11-27',
            effectiveOn: '2026-11-01',
            expiresOn: '2027-11-01',
          },
        }),
      ],
      { today: '2026-11-27' },
    )
    expect(report.ok).toBe(true)
    expect(report.schemes[0].verification.status).toBe('VERIFIED')
  })

  it('rejects an expiry that is before its effective date', () => {
    const report = validateCatalogue(
      [
        base({
          verification: {
            status: 'VERIFIED',
            checkedOn: '2026-01-01',
            effectiveOn: '2026-06-01',
            expiresOn: '2026-03-01',
          },
        }),
      ],
      { today: '2026-11-27' },
    )
    expect(codes(report)).toContain('invalid_date_range')
  })

  it('warns about a source that has lapsed', () => {
    const report = validateCatalogue(
      [
        base({
          verification: {
            status: 'VERIFIED',
            checkedOn: '2026-01-01',
            sources: [{ url: 'https://labour.gov.in/x', expiresOn: '2026-02-01' }],
          },
        }),
      ],
      { today: '2026-11-27' },
    )
    expect(report.ok).toBe(true)
    expect(report.warnings.map((w) => w.code)).toContain('expired_source')
  })
})
