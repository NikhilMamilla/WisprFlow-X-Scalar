import { describe, expect, it } from 'vitest'
import { formatImportReport, importSchemes } from './import'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

// A valid scheme for import tests: a real bundled scheme, re-identified.
function candidate(id: string, overrides: Partial<Scheme> = {}): Scheme {
  return { ...clone(SCHEMES[0]), id, name_en: `Test scheme ${id}`, aliases: [], ...overrides }
}

const existing = SCHEMES
const existingIds = SCHEMES.map((s) => s.id)

describe('a valid import', () => {
  it('applies a single scheme and returns a new catalogue', () => {
    const report = importSchemes(existing, [candidate('research_one')])
    expect(report.ok).toBe(true)
    expect(report.counts).toMatchObject({ examined: 1, valid: 1, invalid: 0 })
    expect(report.addedIds).toEqual(['research_one'])
    expect(report.catalogue.map((s) => s.id)).toEqual([...existingIds, 'research_one'])
    expect(existing).toHaveLength(7) // the input catalogue is never mutated
  })

  it('accepts the { schemes: [...] } research-file shape', () => {
    const report = importSchemes(existing, { schemes: [candidate('research_obj')] })
    expect(report.ok).toBe(true)
    expect(report.addedIds).toEqual(['research_obj'])
  })

  it('applies a batch in order', () => {
    const report = importSchemes(existing, [candidate('a'), candidate('b'), candidate('c')])
    expect(report.ok).toBe(true)
    expect(report.addedIds).toEqual(['a', 'b', 'c'])
    expect(report.catalogue.slice(-3).map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('summarises what happened in one screen', () => {
    const text = formatImportReport(importSchemes(existing, [candidate('x')]))
    expect(text).toContain('examined: 1')
    expect(text).toContain('IMPORTED 1 scheme(s)')
  })
})

describe('atomicity', () => {
  it('rejects the whole batch when one scheme is invalid', () => {
    const report = importSchemes(existing, [candidate('good'), candidate('bad', { name_hi: '' })])
    expect(report.ok).toBe(false)
    expect(report.catalogue).toBe(existing) // literally unchanged
    expect(report.addedIds).toEqual([])
    expect(report.counts).toMatchObject({ examined: 2, valid: 1, invalid: 1 })
    expect(report.counts.missingFields).toBeGreaterThan(0)
  })

  it('rejects the whole batch when a dependency cycle exists', () => {
    const a = candidate('cyc_a', { prerequisites: ['cyc_b'] })
    const b = candidate('cyc_b', { prerequisites: ['cyc_a'] })
    const report = importSchemes(existing, [a, b])
    expect(report.ok).toBe(false)
    expect(report.counts.dependencyIssues).toBeGreaterThan(0)
    expect(report.catalogue).toBe(existing)
  })

  it('rejects garbage input without throwing', () => {
    for (const input of [null, 42, 'schemes', {}, { schemes: 'no' }]) {
      const report = importSchemes(existing, input)
      expect(report.ok).toBe(false)
      expect(report.catalogue).toBe(existing)
      expect(report.errors[0].code).toBe('invalid_catalogue')
    }
  })
})

describe('duplicate and conflict detection', () => {
  it('counts an id that already exists in the catalogue', () => {
    const report = importSchemes(existing, [candidate('pmsym')])
    expect(report.ok).toBe(false)
    expect(report.counts.duplicateIds).toBe(1)
  })

  it('counts a duplicated id inside the batch', () => {
    const report = importSchemes(existing, [candidate('twice'), candidate('twice', { name_en: 'Other' })])
    expect(report.ok).toBe(false)
    expect(report.counts.duplicateIds).toBeGreaterThan(0)
  })

  it('counts an alias collision with an existing scheme', () => {
    const report = importSchemes(existing, [candidate('aliasy', { aliases: ['jan dhan'] })])
    expect(report.ok).toBe(false)
    expect(report.counts.aliasCollisions).toBeGreaterThan(0)
  })

  it('reports a duplicate official name, but importing a valid new id still works', () => {
    const report = importSchemes(existing, [candidate('same_name', { name_en: SCHEMES[1].name_en })])
    expect(report.ok).toBe(true)
    expect(report.counts.duplicates).toBeGreaterThan(0)
  })
})

describe('quality failures are counted, not guessed around', () => {
  it('counts a missing field', () => {
    const report = importSchemes(existing, [candidate('no_name', { name_hi: '' })])
    expect(report.counts.missingFields).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('counts an invalid rule', () => {
    const bad = candidate('bad_rule')
    bad.rules = { ...bad.rules, age_min: 90, age_max: 20 }
    const report = importSchemes(existing, [bad])
    expect(report.counts.invalidRules).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('counts invalid geography', () => {
    const report = importSchemes(existing, [candidate('bad_geo', { geography: { scope: 'state' } })])
    expect(report.counts.invalidGeography).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('does not count an unofficial-source warning as an invalid source', () => {
    const report = importSchemes(existing, [
      candidate('unofficial', {
        source_url: 'https://example.com/scheme',
        verification: { status: 'UNVERIFIED', checkedOn: '2026-11-27' },
      }),
    ])
    expect(report.ok).toBe(true)
    expect(report.counts.invalidSources).toBe(0)
    expect(report.warnings.some((w) => w.code === 'unofficial_source')).toBe(true)
  })

  it('counts an invalid source URL', () => {
    const report = importSchemes(existing, [candidate('bad_url', { source_url: 'not a url' })])
    expect(report.counts.invalidSources).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('counts a verification status without a check date as blocking', () => {
    const report = importSchemes(existing, [
      candidate('no_check_date', { verification: { status: 'VERIFIED' } }),
    ])
    expect(report.counts.verificationWarnings).toBeGreaterThan(0)
    expect(report.ok).toBe(false)
  })

  it('counts missing Telugu as a localization gap without blocking the import', () => {
    const scheme = candidate('no_telugu', { name_te: undefined, benefit_te: undefined })
    scheme.documents = scheme.documents.map((d) => ({ ...d, te: undefined }))
    const report = importSchemes(existing, [scheme])
    expect(report.ok).toBe(true)
    expect(report.counts.localizationGaps).toBeGreaterThan(0)
    expect(report.warnings.some((w) => w.code === 'missing_telugu')).toBe(true)
  })

  it('never upgrades verification on import', () => {
    const unverified = candidate('stays_unverified', {
      verification: { status: 'UNVERIFIED', checkedOn: '2026-11-27' },
    })
    const report = importSchemes(existing, [unverified])
    expect(report.ok).toBe(true)
    const imported = report.catalogue.find((s) => s.id === 'stays_unverified')!
    expect(imported.verification.status).toBe('UNVERIFIED')
    expect(imported.rules_verified).toBe(false)
  })
})
