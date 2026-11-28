import { describe, expect, it } from 'vitest'
import {
  assessRecordQuality,
  buildQualityReport,
  formatQualityReport,
  importReadinessProblems,
  sourceAuthority,
  type SourceHealth,
} from './research-quality'
import type { ResearchRecord, ResearchSource } from './research'

const source = (overrides: Partial<ResearchSource> = {}): ResearchSource => ({
  id: 's1',
  url: 'https://example.gov.in/a.pdf',
  title: 'Guideline',
  issuedBy: 'Department',
  level: 'STATE',
  tier: 'PRIMARY_OFFICIAL',
  kind: 'guidelines',
  retrievedOn: '2026-11-01',
  change: { status: 'UNCHECKED', lastCheckedOn: '2026-11-01' },
  ...overrides,
})

const record = (overrides: Partial<ResearchRecord> = {}): ResearchRecord => ({
  id: 'r1',
  name: 'Test scheme',
  aliases: [],
  level: 'STATE',
  state: 'Telangana',
  category: 'social_welfare',
  beneficiaryGroups: ['senior_citizens'],
  ageBands: [],
  districts: [],
  eligibilityEvidence: [{ sourceId: 's1' }],
  verificationEvidence: [{ sourceId: 's1' }],
  eligibilityConditions: [{ text: 'Be a resident', sourceId: 's1' }],
  exclusions: [],
  prerequisites: [],
  documents: [],
  status: 'ELIGIBILITY_VERIFIED',
  verificationStatus: 'VERIFIED',
  discoveredOn: '2026-11-01',
  lastResearchedOn: '2026-11-01',
  lastVerifiedOn: '2026-11-01',
  unresolvedQuestions: [],
  relationships: [],
  importReadiness: 'NEEDS_INFO',
  statusHistory: [],
  ...overrides,
})

const health = (overrides: Partial<SourceHealth> = {}): SourceHealth => ({
  id: 's1',
  url: 'https://example.gov.in/a.pdf',
  tier: 'PRIMARY_OFFICIAL',
  authority: 'AUTHORITATIVE',
  state: 'UNCHECKED',
  lastCheckedOn: '2026-11-01',
  ageDays: 27,
  ...overrides,
})

const today = '2026-11-28'

describe('source authority', () => {
  it('only lets primary legal and official sources assert eligibility', () => {
    expect(sourceAuthority('PRIMARY_LEGAL')).toBe('AUTHORITATIVE')
    expect(sourceAuthority('PRIMARY_OFFICIAL')).toBe('AUTHORITATIVE')
    expect(sourceAuthority('SECONDARY_OFFICIAL')).toBe('SECONDARY')
    expect(sourceAuthority('AGGREGATOR')).toBe('NOT_AUTHORITATIVE')
    expect(sourceAuthority('UNKNOWN')).toBe('UNKNOWN')
  })
})

describe('record quality', () => {
  it('marks a sourced, reachable, verified record complete', () => {
    const row = assessRecordQuality(record(), [health()], today)
    expect(row.outcome).toBe('COMPLETE')
    expect(row.task).toContain('No research task')
  })

  it('reports a conflict before anything else', () => {
    const row = assessRecordQuality(record({ status: 'CONFLICTING' }), [health()], today)
    expect(row.outcome).toBe('CONFLICTING')
    expect(row.gaps).toContain('sources conflict and the conflict is unresolved')
  })

  it('reports an unreachable source', () => {
    const row = assessRecordQuality(record(), [health({ state: 'GONE' })], today)
    expect(row.outcome).toBe('SOURCE_INACCESSIBLE')
    expect(row.gaps).toContain('a linked source is gone')
  })

  it('distinguishes secondary evidence from a genuine official source', () => {
    const row = assessRecordQuality(
      record({ verificationStatus: 'UNVERIFIED', status: 'SOURCE_IDENTIFIED' }),
      [health({ tier: 'SECONDARY_OFFICIAL', authority: 'SECONDARY' })],
      today,
    )
    expect(row.outcome).toBe('SOURCE_NOT_AUTHORITATIVE')
    expect(row.authority).toBe('SECONDARY')
  })

  it('reports an unsourced condition rather than calling the record done', () => {
    const row = assessRecordQuality(
      record({ eligibilityConditions: [{ text: 'Be a resident' }], verificationStatus: 'PARTIALLY_VERIFIED' }),
      [health()],
      today,
    )
    expect(row.outcome).toBe('CONDITION_UNVERIFIED')
    expect(row.gaps.join(' ')).toContain('without a source')
  })

  it('reports a listing-only record as not researched', () => {
    const row = assessRecordQuality(
      record({ status: 'CATALOGUED', verificationStatus: 'UNVERIFIED', eligibilityEvidence: [], verificationEvidence: [], eligibilityConditions: [] }),
      [health()],
      today,
    )
    expect(['NOT_RESEARCHED', 'CONDITION_UNVERIFIED']).toContain(row.outcome)
    expect(row.task.length).toBeGreaterThan(10)
  })

  it('reports an outdated record', () => {
    const row = assessRecordQuality(record({ status: 'OUTDATED', verificationStatus: 'OUTDATED' }), [health()], today)
    expect(row.outcome).toBe('SOURCE_OUTDATED')
  })

  it('never leaves the outcome label empty or generic', () => {
    const row = assessRecordQuality(record(), [health()], today)
    expect(row.outcome).not.toBe('')
    expect(row.reason).not.toBe('')
  })
})

describe('quality report', () => {
  const records = [
    record({ id: 'complete' }),
    record({ id: 'conflict', status: 'CONFLICTING', verificationStatus: 'UNVERIFIED' }),
    record({ id: 'gone', verificationEvidence: [{ sourceId: 's2' }] }),
  ]
  const sources = [
    source(),
    source({ id: 's2', change: { status: 'GONE', lastCheckedOn: '2026-11-01' } }),
  ]

  it('counts the register without estimating anything', () => {
    const report = buildQualityReport(records, sources, { today })
    expect(report.totals.records).toBe(3)
    expect(report.totals.conflicts).toBe(1)
    expect(report.totals.inaccessibleSources).toBe(1)
    expect(report.totals.verified).toBe(2)
    expect(report.outcomeDistribution.CONFLICTING).toBe(1)
  })

  it('buckets freshness by days since the last check', () => {
    const report = buildQualityReport(records, [
      source({ id: 'fresh', change: { status: 'UNCHECKED', lastCheckedOn: '2026-11-01' } }),
      source({ id: 'aging', change: { status: 'UNCHECKED', lastCheckedOn: '2026-07-01' } }),
      source({ id: 'stale', change: { status: 'UNCHECKED', lastCheckedOn: '2025-01-01' } }),
      source({ id: 'never', retrievedOn: '', change: undefined }),
    ], { today })
    expect(report.freshness.current).toBeGreaterThanOrEqual(1)
    expect(report.freshness.aging).toBe(1)
    expect(report.freshness.stale).toBe(1)
    expect(report.freshness.unknown).toBe(1)
  })

  it('keeps only unfinished work in the queue, highest priority first', () => {
    const report = buildQualityReport(records, sources, { today })
    expect(report.queue.every((row) => row.outcome !== 'COMPLETE')).toBe(true)
    for (let index = 1; index < report.queue.length; index += 1) {
      expect(report.queue[index - 1].priority).toBeGreaterThanOrEqual(report.queue[index].priority)
    }
  })

  it('is deterministic for the same inputs and day', () => {
    expect(buildQualityReport(records, sources, { today })).toEqual(buildQualityReport(records, sources, { today }))
  })

  it('formats a readable report that names the limitations of the score', () => {
    const text = formatQualityReport(buildQualityReport(records, sources, { today }))
    expect(text).toContain('Research quality')
    expect(text).toContain('Research action queue')
    expect(text).toContain('never changes eligibility')
  })

  it('flags readiness claims the evidence does not support, and changes nothing', () => {
    const claimed = record({ id: 'ready-claim', importReadiness: 'READY', verificationStatus: 'PARTIALLY_VERIFIED' })
    const before = JSON.stringify(claimed)
    const problems = importReadinessProblems([claimed, record({ id: 'fine' })], (entry) => entry.verificationStatus === 'VERIFIED')
    expect(problems.map((row) => row.recordId)).toEqual(['ready-claim'])
    expect(problems[0].task).toContain('Withdraw')
    expect(JSON.stringify(claimed)).toBe(before)
    expect([claimed].every((entry) => entry.importReadiness === 'READY')).toBe(true)
  })
})
