import { describe, expect, it } from 'vitest'
import { buildCoverageReport, formatCoverageReport } from './research-coverage'
import type { CoverageClaim, ResearchRecord } from './research'

const record = (overrides: Partial<ResearchRecord> = {}): ResearchRecord => ({
  id: 'r',
  name: 'R',
  aliases: [],
  level: 'CENTRAL',
  beneficiaryGroups: [],
  ageBands: [],
  eligibilityEvidence: [{ sourceId: 's1' }],
  verificationEvidence: [{ sourceId: 's1' }],
  eligibilityConditions: [],
  districts: [],
  exclusions: [],
  prerequisites: [],
  documents: [],
  status: 'IMPORTED',
  verificationStatus: 'VERIFIED',
  discoveredOn: '2026-11-01',
  lastResearchedOn: '2026-11-02',
  lastVerifiedOn: '2026-11-02',
  unresolvedQuestions: [],
  relationships: [],
  importReadiness: 'IMPORTED',
  statusHistory: [],
  ...overrides,
})

const areaOf = (report: ReturnType<typeof buildCoverageReport>, label: string) =>
  [...report.states, ...report.unionTerritories].find((entry) => entry.label === label)

describe('coverage audit', () => {
  it('reports every state and UT as not researched when there are no records', () => {
    const report = buildCoverageReport([])
    expect(report.states).toHaveLength(28)
    expect(report.unionTerritories).toHaveLength(8)
    expect(report.states.every((entry) => entry.status === 'NOT_RESEARCHED')).toBe(true)
    expect(report.totals.records).toBe(0)
  })

  it('derives state coverage from records instead of assuming it', () => {
    const report = buildCoverageReport([
      record({ id: 'a', level: 'STATE', state: 'Telangana', verificationStatus: 'VERIFIED' }),
      record({ id: 'b', level: 'STATE', state: 'Bihar', verificationStatus: 'PARTIALLY_VERIFIED' }),
    ])
    expect(areaOf(report, 'Telangana')?.status).toBe('COVERED')
    expect(areaOf(report, 'Telangana')?.records).toBe(1)
    expect(areaOf(report, 'Bihar')?.status).toBe('PARTIAL')
    expect(areaOf(report, 'Kerala')?.status).toBe('NOT_RESEARCHED')
    expect(report.totals.state).toBe(2)
    // A state code in the record resolves to the same state.
    const byCode = buildCoverageReport([record({ level: 'UT', state: 'DL' })])
    expect(areaOf(byCode, 'Delhi')?.records).toBe(1)
  })

  it('treats a started-but-blocked area as needing more research, ahead of untouched ones', () => {
    const report = buildCoverageReport([
      record({ id: 'a', level: 'STATE', state: 'Bihar', status: 'CONFLICTING' }),
    ])
    expect(areaOf(report, 'Bihar')?.status).toBe('NEEDS_MORE_RESEARCH')
    expect(report.gaps[0].label).toBe('Bihar')
    expect(report.priorities[0]).toContain('Bihar')
  })

  it('never turns a NONE_FOUND claim into proof of absence or into a record', () => {
    const claims: CoverageClaim[] = [
      { area: 'Lakshadweep', status: 'NONE_FOUND', note: 'Searched the UT portal on 2026-11-27' },
    ]
    const report = buildCoverageReport([], claims)
    const lakshadweep = areaOf(report, 'Lakshadweep')
    expect(lakshadweep?.status).toBe('NONE_FOUND')
    expect(lakshadweep?.records).toBe(0)
    expect(report.totals.records).toBe(0)
    expect(report.totals.noneFoundClaims).toBe(1)
    expect(areaOf(report, 'Kerala')?.status).toBe('NOT_RESEARCHED')
    expect(formatCoverageReport(report)).toContain('never proof that no scheme exists')
  })

  it('ignores a claim once real records exist for the area', () => {
    const report = buildCoverageReport([record({ level: 'STATE', state: 'Bihar' })], [
      { area: 'Bihar', status: 'NONE_FOUND', note: 'stale claim' },
    ])
    expect(areaOf(report, 'Bihar')?.status).toBe('COVERED')
  })

  it('counts beneficiary groups, age bands and categories from the records', () => {
    const report = buildCoverageReport([
      record({ id: 'a', category: 'pension', beneficiaryGroups: ['unorganised_workers'], ageBands: ['adults_25_59'] }),
      record({ id: 'b', category: 'pension', beneficiaryGroups: ['street_vendors'] }),
    ])
    const workers = report.groups.find((entry) => entry.key === 'unorganised_workers')
    expect(workers?.records).toBe(1)
    expect(report.groups.find((entry) => entry.key === 'orphans')?.status).toBe('NOT_RESEARCHED')
    expect(report.ageBands.find((entry) => entry.key === 'adults_25_59')?.status).toBe('COVERED')
    expect(report.categories).toHaveLength(1)
    expect(report.categories[0].records).toBe(2)
    expect(report.totals.categories).toBe(1)
  })

  it('reports derived totals only', () => {
    const report = buildCoverageReport([
      record({ id: 'a' }),
      record({ id: 'b', status: 'NEEDS_RESEARCH', verificationStatus: 'UNVERIFIED', verificationEvidence: [], importReadiness: 'NEEDS_INFO' }),
      record({ id: 'c', level: 'STATE', state: 'Kerala', verificationStatus: 'PARTIALLY_VERIFIED', importReadiness: 'READY' }),
      record({ id: 'd', eligibilityEvidence: [], verificationEvidence: [], importReadiness: 'NOT_READY' }),
    ])
    expect(report.totals.records).toBe(4)
    expect(report.totals.central).toBe(3)
    expect(report.totals.state).toBe(1)
    expect(report.totals.verified).toBe(2)
    expect(report.totals.partiallyVerified).toBe(1)
    expect(report.totals.needsResearch).toBe(1)
    expect(report.totals.importReady).toBe(1)
    expect(report.totals.missingSources).toBe(1)
  })

  it('does not count a listing-only record as researched coverage', () => {
    const listing = record({
      id: 'listing',
      level: 'STATE',
      state: 'Bihar',
      status: 'CATALOGUED',
      verificationStatus: 'UNVERIFIED',
      eligibilityEvidence: [],
      verificationEvidence: [],
      importReadiness: 'NEEDS_INFO',
    })
    const report = buildCoverageReport([listing])
    const bihar = areaOf(report, 'Bihar')
    expect(bihar?.records).toBe(1)
    expect(bihar?.researched).toBe(0)
    expect(bihar?.discovered).toBe(1)
    expect(bihar?.status).toBe('NEEDS_MORE_RESEARCH')
    expect(report.totals.researched).toBe(0)
    expect(report.totals.discoveredOnly).toBe(1)
    expect(formatCoverageReport(report)).toContain('discovery is not coverage: 1')
  })

  it('is only COVERED when every record in the area is researched and verified', () => {
    const researched = record({ id: 'a', level: 'STATE', state: 'Bihar' })
    const listing = record({
      id: 'b',
      level: 'STATE',
      state: 'Bihar',
      status: 'CATALOGUED',
      verificationStatus: 'UNVERIFIED',
      eligibilityEvidence: [],
      verificationEvidence: [],
      importReadiness: 'NEEDS_INFO',
    })
    expect(areaOf(buildCoverageReport([researched]), 'Bihar')?.status).toBe('COVERED')
    const mixed = areaOf(buildCoverageReport([researched, listing]), 'Bihar')
    expect(mixed?.status).toBe('PARTIAL')
    expect(mixed?.researched).toBe(1)
    expect(mixed?.discovered).toBe(1)
  })

  it('renders a report with the caveat and the gaps', () => {
    const text = formatCoverageReport(buildCoverageReport([record({ category: 'labour' })]))
    expect(text).toContain('Research coverage')
    expect(text).toContain('records: 1')
    expect(text).toContain('Coverage by beneficiary group')
    expect(text).toContain('Research gaps and priorities')
    expect(text).toContain('never proof that no scheme exists')
  })
})
