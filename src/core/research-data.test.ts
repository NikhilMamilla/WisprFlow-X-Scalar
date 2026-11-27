// The register shipped in data/research/records.json is data like any other, so
// it is validated in CI against the real catalogue: an imported record must name
// a scheme that exists, and no record may drift from the six scheme ids.
import { describe, expect, it } from 'vitest'
import researchJson from '../../data/research/records.json'
import { validateResearch } from './research'
import { SCHEMES } from './schemes'

const schemeIds = SCHEMES.map((scheme) => scheme.id)

describe('shipped research register', () => {
  it('validates against the catalogue', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-27' })
    expect(report.errors).toEqual([])
    expect(report.ok).toBe(true)
    expect(report.records.length).toBeGreaterThan(0)
  })

  it('only points at schemes that actually exist', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-27' })
    for (const record of report.records) {
      if (record.schemeId) expect(schemeIds).toContain(record.schemeId)
    }
  })

  it('still describes the same six catalogue schemes', () => {
    expect(schemeIds).toEqual(['eshram', 'pmsym', 'pmsby', 'pmjjby', 'svanidhi', 'pmjdy'])
  })
})
