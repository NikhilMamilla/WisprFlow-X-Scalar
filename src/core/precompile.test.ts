import { describe, expect, it } from 'vitest'
import { matchScheme, matchSchemes } from './matcher'
import { buildRegistry, matchCatalogue } from './registry'
import { type CompiledChecks, checksFor, compileChecks } from './rules'
import { providerMap, type Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { emptyProfile, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const profiles: Profile[] = [
  emptyProfile(),
  { ...emptyProfile(), age: 32, monthly_income: 10000, has_bank_account: true, has_aadhaar: true },
  {
    ...emptyProfile(),
    age: 42,
    monthly_income: 18000,
    has_bank_account: false,
    has_aadhaar: true,
    in_epf_esic_nps: true,
    pays_income_tax: true,
    occupation: 'street_vendor',
    urban_or_rural: 'rural',
  },
  { ...emptyProfile(), age: 17 },
]

const pmsby = () => SCHEMES.find((s) => s.id === 'pmsby')!

describe('compiled rules are built once and immutable', () => {
  it('returns the same compiled object for the same scheme object', () => {
    expect(checksFor(pmsby())).toBe(checksFor(pmsby()))
  })

  it('freezes the rule set and every criterion', () => {
    const checks = checksFor(pmsby())
    expect(Object.isFrozen(checks)).toBe(true)
    expect(Object.isFrozen(checks[0])).toBe(true)
  })

  it('refuses a caller trying to edit the compiled set', () => {
    const checks = checksFor(pmsby()) as unknown as { push: (value: unknown) => void }
    expect(() => checks.push({})).toThrow()
  })

  it('keeps the existing rule order and ids', () => {
    expect(checksFor(SCHEMES.find((s) => s.id === 'pmsym')!).map((c) => c.ruleId)).toEqual([
      'age_min',
      'age_max',
      'income_max_monthly',
      'not:pays_income_tax',
      'not:in_epf_esic_nps',
      'requires:has_aadhaar',
      'requires:has_bank_account',
    ])
  })

  it('compileChecks stays a pure builder, so the cache cannot leak into a fresh compile', () => {
    expect(compileChecks(pmsby())).not.toBe(compileChecks(pmsby()))
    expect(compileChecks(pmsby())).not.toBe(checksFor(pmsby()))
  })
})

describe('compiled and recompiled rules are equivalent', () => {
  it('produces identical match results for every scheme and profile', () => {
    const providers = providerMap(SCHEMES)
    for (const scheme of SCHEMES) {
      const cached = checksFor(scheme)
      for (const profile of profiles) {
        expect(matchScheme(profile, scheme, providers, cached)).toEqual(
          matchScheme(profile, scheme, providers, compileChecks(scheme)),
        )
      }
    }
  })

  it('is the same through matchSchemes, the registry and matchCatalogue', () => {
    const registry = buildRegistry(SCHEMES)
    for (const profile of profiles) {
      expect(matchCatalogue(registry, profile)).toEqual(matchSchemes(profile, SCHEMES))
    }
  })

  it('stores one compiled set per scheme in the registry', () => {
    const registry = buildRegistry(SCHEMES)
    for (const scheme of SCHEMES) expect(registry.checks.get(scheme.id)).toBe(checksFor(scheme))
    expect(registry.checks.size).toBe(SCHEMES.length)
  })
})

describe('registry rebuilds', () => {
  it('compiles the rebuilt catalogue and leaves the earlier compilation alone', () => {
    const modified: Scheme[] = SCHEMES.map((s) => (s.id === 'pmsby' ? { ...s, rules: { ...s.rules, age_max: 12 } } : s))
    const registry = buildRegistry(modified)

    const compiledMax = registry.checks.get('pmsby')!.find((c) => c.ruleId === 'age_max')!
    expect(compiledMax.expected).toBe(12)

    const originalMax = checksFor(pmsby()).find((c) => c.ruleId === 'age_max')!
    expect(originalMax.expected).toBe(70)

    // And the rebuilt rule really changes the outcome for a 32-year-old.
    const result = matchCatalogue(registry, { ...emptyProfile(), age: 32, monthly_income: 1000 })
    expect(result.find((r) => r.id === 'pmsby')!.failed.map((f) => f.ruleId)).toContain('age_max')
  })

  it('does not share compiled sets between two catalogues with different objects', () => {
    const a = buildRegistry(clone(SCHEMES))
    const b = buildRegistry(clone(SCHEMES))
    expect(a.checks.get('pmsby')).not.toBe(b.checks.get('pmsby'))
    // The predicates are per-object closures, so compare the rule data itself.
    const shape = (checks: CompiledChecks) =>
      checks.map((c) => ({ ruleId: c.ruleId, kind: c.kind, field: c.field, expected: c.expected }))
    expect(shape(a.checks.get('pmsby')!)).toEqual(shape(b.checks.get('pmsby')!))
  })
})

describe('scale', () => {
  it('matches a 5,000-scheme catalogue with the compiled rules', () => {
    const many: Scheme[] = Array.from({ length: 5000 }, (_, i) => ({
      ...clone(SCHEMES[0]),
      id: `scheme_${i}`,
      name_en: `Synthetic ${i}`,
      aliases: [],
    }))
    const registry = buildRegistry(many)
    const results = matchCatalogue(registry, profiles[1])
    expect(results).toHaveLength(5000)
    expect(results[0].id).toBe('scheme_0')
    expect(results[4999].id).toBe('scheme_4999')
  })

  it('keeps a compiled set per scheme at that size', () => {
    const many: Scheme[] = Array.from({ length: 1000 }, (_, i) => ({
      ...clone(SCHEMES[0]),
      id: `s_${i}`,
      name_en: `S ${i}`,
      aliases: [],
    }))
    const registry = buildRegistry(many)
    expect(registry.checks.size).toBe(1000)
    const checks: CompiledChecks = registry.checks.get('s_999')!
    expect(checks.length).toBeGreaterThan(0)
  })
})
