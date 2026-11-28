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
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-28' })
    expect(report.errors).toEqual([])
    expect(report.ok).toBe(true)
    expect(report.records.length).toBeGreaterThan(0)
  })

  it('only points at schemes that actually exist', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-28' })
    for (const record of report.records) {
      if (record.schemeId) expect(schemeIds).toContain(record.schemeId)
    }
  })

  it('still describes the same catalogue schemes', () => {
    expect(schemeIds).toEqual(['eshram', 'pmsym', 'pmsby', 'pmjjby', 'svanidhi', 'pmjdy', 'telangana-bocwwb'])
  })

  it('keeps the Telangana batch in the register, not in the matcher catalogue', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-28' })
    const telangana = report.records.filter((record) => record.state === 'Telangana')
    expect(telangana).toHaveLength(85)
    expect(telangana.every((record) => record.schemeId === undefined)).toBe(true)
    expect(schemeIds).toHaveLength(7)
  })

  it('keeps unverified expansion discoveries unverified and unimportable', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-28' })
    const discovered = report.records.filter(
      (record) => record.discoveredOn >= '2026-11-28' && record.status === 'CATALOGUED',
    )
    expect(discovered.length).toBeGreaterThan(30)
    for (const record of discovered) {
      // A discovery may not claim verification it did not earn.
      expect(record.verificationStatus).toBe('UNVERIFIED')
      expect(record.importReadiness).toBe('NEEDS_INFO')
      expect(record.discoveryUrl).toMatch(/^https?:\/\//)
      expect(record.eligibilityConditions).toEqual([])
    }
    // Every discovery has exactly one registered official source.
    for (const record of discovered) {
      const sources = report.sources.filter((source) => source.schemeIds?.includes(record.id))
      expect(sources.length).toBeGreaterThan(0)
      expect(sources.every((source) => source.tier === 'PRIMARY_OFFICIAL')).toBe(true)
    }
  })

  it('gives every verification claim a registered source', () => {
    const report = validateResearch(researchJson, { schemeIds, today: '2026-11-28' })
    const verified = report.records.filter((record) => record.lastVerifiedOn !== undefined)
    expect(verified.length).toBeGreaterThanOrEqual(20)
    const sourceIds = new Set(report.sources.map((source) => source.id))
    for (const record of verified) {
      // A status without evidence is the failure mode this milestone exists to stop.
      if (record.status === 'ELIGIBILITY_VERIFIED') {
        expect(record.eligibilityConditions.length).toBeGreaterThan(0)
        expect(record.eligibilityEvidence.length).toBeGreaterThan(0)
      }
      for (const condition of record.eligibilityConditions) {
        expect(condition.sourceId).toBeTruthy()
        expect(sourceIds.has(condition.sourceId ?? '')).toBe(true)
      }
      for (const evidence of [...record.eligibilityEvidence, ...record.verificationEvidence]) {
        expect(sourceIds.has(evidence.sourceId)).toBe(true)
      }
    }
  })
})
