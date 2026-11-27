import { describe, expect, it } from 'vitest'
import {
  applyTransition,
  canTransition,
  eligibilityVerified,
  filterResearchRecords,
  missingSources,
  validateResearch,
  type ResearchRecord,
} from './research'

const source = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  url: `https://labour.gov.in/${id}`,
  title: `Source ${id}`,
  issuedBy: 'Ministry of Labour and Employment',
  level: 'CENTRAL',
  tier: 'PRIMARY_OFFICIAL',
  kind: 'notification',
  retrievedOn: '2026-11-01',
  change: { status: 'UNCHECKED' },
  ...overrides,
})

const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'r1',
  name: 'Scheme One',
  level: 'CENTRAL',
  category: 'labour',
  status: 'CATALOGUED',
  verificationStatus: 'UNVERIFIED',
  discoveredOn: '2026-11-01',
  lastResearchedOn: '2026-11-02',
  importReadiness: 'NOT_READY',
  discoveryUrl: 'https://labour.gov.in/scheme-one',
  eligibilityEvidence: [{ sourceId: 's1' }],
  verificationEvidence: [],
  eligibilityConditions: [],
  unresolvedQuestions: [],
  ...overrides,
})

const document = (records: unknown[], sources: unknown[] = [source('s1')], extra: Record<string, unknown> = {}) => ({
  records,
  sources,
  ...extra,
})

const codes = (report: ReturnType<typeof validateResearch>) =>
  [...report.errors, ...report.warnings].map((issue) => issue.code)

const validated = (overrides: Record<string, unknown> = {}): ResearchRecord => {
  const report = validateResearch(document([record(overrides)]), { today: '2026-11-27' })
  expect(report.errors).toEqual([])
  return report.records[0]
}

describe('research record validation', () => {
  it('accepts a minimal register and fills the optional arrays', () => {
    const report = validateResearch(document([record()]), { today: '2026-11-27' })
    expect(report.errors).toEqual([])
    expect(report.ok).toBe(true)
    const [only] = report.records
    expect(only.aliases).toEqual([])
    expect(only.relationships).toEqual([])
    expect(only.statusHistory).toEqual([])
    expect(only.documents).toEqual([])
  })

  it('rejects a missing or duplicate research id', () => {
    expect(codes(validateResearch(document([record({ id: undefined })])))).toContain('missing_id')
    expect(codes(validateResearch(document([record(), record()])))).toContain('duplicate_id')
  })

  it('checks the government level against the state', () => {
    expect(codes(validateResearch(document([record({ level: 'STATE' })])))).toContain('missing_state')
    expect(codes(validateResearch(document([record({ level: 'STATE', state: 'Atlantis' })])))).toContain('invalid_state')
    // A UT cannot be recorded as a state, and a state cannot be recorded as a UT.
    expect(codes(validateResearch(document([record({ level: 'STATE', state: 'Delhi' })])))).toContain('level_mismatch')
    expect(codes(validateResearch(document([record({ level: 'UT', state: 'Bihar' })])))).toContain('level_mismatch')
    expect(codes(validateResearch(document([record({ level: 'CENTRAL', state: 'Bihar' })])))).toContain('level_mismatch')
    const ok = validateResearch(document([record({ level: 'STATE', state: 'Bihar' })]))
    expect(ok.errors).toEqual([])
    expect(ok.records[0].state).toBe('Bihar')
  })

  it('rejects an unknown beneficiary group or age band', () => {
    expect(codes(validateResearch(document([record({ beneficiaryGroups: ['farmers', 'astronauts'] })])))).toContain('invalid_group')
    expect(codes(validateResearch(document([record({ ageBands: ['adults_25_59', 'immortals'] })])))).toContain('invalid_age_band')
  })

  it('requires a source or discovery URL for every record', () => {
    const report = validateResearch(
      document([record({ discoveryUrl: undefined, eligibilityEvidence: [] })]),
    )
    expect(codes(report)).toContain('missing_source_urls')
  })

  it('rejects an evidence entry pointing at an unregistered source', () => {
    expect(codes(validateResearch(document([record({ eligibilityEvidence: [{ sourceId: 'nope' }] })])))).toContain(
      'unknown_source',
    )
  })

  it('never accepts an aggregator portal as eligibility evidence', () => {
    const aggregator = source('agg', { tier: 'AGGREGATOR', kind: 'aggregator', url: 'https://example.com/scheme' })
    const report = validateResearch(
      document([record({ eligibilityEvidence: [{ sourceId: 'agg' }] })], [source('s1'), aggregator]),
    )
    expect(codes(report)).toContain('aggregator_evidence')
    expect(report.ok).toBe(false)
  })

  it('rejects a verified record without evidence or a verification date', () => {
    const report = validateResearch(
      document([record({ verificationStatus: 'VERIFIED', verificationEvidence: [] })]),
    )
    const found = codes(report)
    expect(found).toContain('verified_without_evidence')
    expect(found).toContain('missing_last_verified')
  })

  it('rejects verification claimed before the record was researched', () => {
    const report = validateResearch(
      document([
        record({
          status: 'SOURCE_IDENTIFIED',
          verificationStatus: 'VERIFIED',
          verificationEvidence: [{ sourceId: 's1' }],
          lastVerifiedOn: '2026-11-20',
        }),
      ]),
    )
    expect(codes(report)).toContain('premature_verification')
  })

  it('rejects a conflicting record marked verified', () => {
    const report = validateResearch(
      document([
        record({
          status: 'CONFLICTING',
          verificationStatus: 'PARTIALLY_VERIFIED',
          verificationEvidence: [{ sourceId: 's1' }],
          lastVerifiedOn: '2026-11-20',
        }),
      ]),
    )
    expect(codes(report)).toContain('conflicting_verified')
  })

  it('requires provenance for an imported record', () => {
    const imported = {
      status: 'IMPORTED',
      importReadiness: 'IMPORTED',
      verificationEvidence: [{ sourceId: 's1' }],
      lastVerifiedOn: '2026-11-20',
    }
    expect(codes(validateResearch(document([record(imported)])))).toContain('imported_without_provenance')
    const unknownScheme = validateResearch(document([record({ ...imported, schemeId: 'not-in-catalogue' })]), {
      schemeIds: ['eshram'],
    })
    expect(codes(unknownScheme)).toContain('unknown_scheme')
    expect(validateResearch(document([record({ ...imported, schemeId: 'eshram' })]), { schemeIds: ['eshram'] }).errors).toEqual([])
  })

  it('blocks import readiness while questions are open', () => {
    const report = validateResearch(
      document([
        record({
          status: 'READY_FOR_IMPORT',
          importReadiness: 'READY',
          verificationStatus: 'PARTIALLY_VERIFIED',
          verificationEvidence: [{ sourceId: 's1' }],
          lastVerifiedOn: '2026-11-20',
          unresolvedQuestions: ['Is there an age limit?'],
        }),
      ]),
    )
    expect(codes(report)).toContain('ready_with_open_questions')
    expect(report.ok).toBe(false)
  })

  it('warns when an eligibility condition has no source attribution', () => {
    const report = validateResearch(
      document([record({ eligibilityConditions: [{ text: 'Must be 18 or older' }] })]),
    )
    expect(codes(report)).toContain('unsourced_condition')
    expect(report.ok).toBe(true)
  })

  it('rejects a relationship that points nowhere', () => {
    expect(
      codes(validateResearch(document([record({ relationships: [{ type: 'RELATED', recordId: 'ghost' }] })]))),
    ).toContain('unknown_relationship_target')
    expect(
      codes(validateResearch(document([record({ relationships: [{ type: 'SAME_SCHEME' }] })]))),
    ).toContain('missing_relationship_target')
    expect(
      codes(
        validateResearch(
          document([record({ relationships: [{ type: 'RELATED', schemeId: 'ghost' }] })]),
          { schemeIds: ['eshram'] },
        ),
      ),
    ).toContain('unknown_relationship_target')
  })

  it('flags a possible duplicate as a warning instead of merging it', () => {
    const report = validateResearch(
      document([record({ id: 'r1', name: 'Same Name' }), record({ id: 'r2', name: 'Same Name' })]),
    )
    expect(report.ok).toBe(true)
    expect(codes(report)).toContain('possible_duplicate')
    expect(report.records).toHaveLength(2)
  })

  it('validates the source register', () => {
    expect(codes(validateResearch(document([record()], [source('s1', { url: 'not a url' })])))).toContain('invalid_url')
    expect(codes(validateResearch(document([record()], [source('s1'), source('s1')])))).toContain('duplicate_source_id')
          expect(codes(validateResearch(document([record()], [source('s1', { tier: 'BOGUS' })])))).toContain(
        'invalid_source_tier',
      )
  })

  it('requires a NONE_FOUND claim to say what was searched', () => {
    const report = validateResearch(
      document([], [], { coverageClaims: [{ area: 'Lakshadweep', status: 'NONE_FOUND' }] }),
    )
    expect(codes(report)).toContain('missing_field')
    const ok = validateResearch(
      document([], [], {
        coverageClaims: [{ area: 'Lakshadweep', status: 'NONE_FOUND', note: 'Searched official UT portal on 2026-11-27' }],
      }),
    )
    expect(ok.errors).toEqual([])
    expect(ok.coverageClaims).toHaveLength(1)
  })
})

describe('research lifecycle', () => {
  it('only allows the declared transitions', () => {
    expect(canTransition('CATALOGUED', 'SOURCE_IDENTIFIED')).toBe(true)
    expect(canTransition('CATALOGUED', 'READY_FOR_IMPORT')).toBe(false)
    expect(canTransition('IMPORTED', 'IMPORTED')).toBe(false)
    expect(canTransition('CLOSED', 'DISCOVERED')).toBe(false)
    expect(canTransition('SOURCE_IDENTIFIED', 'NEEDS_RESEARCH')).toBe(true)
  })

  it('records the change without touching verification status', () => {
    const recordBefore = validated()
    const result = applyTransition(recordBefore, 'SOURCE_IDENTIFIED', { on: '2026-11-05', by: 'researcher' })
    expect(result.ok).toBe(true)
    expect(result.record.status).toBe('SOURCE_IDENTIFIED')
    expect(result.record.verificationStatus).toBe(recordBefore.verificationStatus)
    expect(result.record.lastResearchedOn).toBe('2026-11-05')
    expect(result.record.statusHistory).toEqual([
      { status: 'SOURCE_IDENTIFIED', on: '2026-11-05', by: 'researcher' },
    ])
    // The original record is untouched.
    expect(recordBefore.status).toBe('CATALOGUED')
  })

  it('refuses eligibility verification without evidence', () => {
    const recordBefore = validated({ status: 'OFFICIALLY_VERIFIED', verificationStatus: 'UNVERIFIED' })
    const result = applyTransition(recordBefore, 'ELIGIBILITY_VERIFIED', { on: '2026-11-05' })
    expect(result.ok).toBe(false)
    expect(result.errors.join(' ')).toContain('evidence')
    expect(result.record.status).toBe('OFFICIALLY_VERIFIED')
  })

  it('refuses import readiness before eligibility is verified', () => {
    // Reached the status without evidence: the guard, not the status string, decides.
    const recordBefore = validated({ status: 'ELIGIBILITY_VERIFIED', verificationStatus: 'UNVERIFIED' })
    const result = applyTransition(recordBefore, 'READY_FOR_IMPORT', { on: '2026-11-05' })
    expect(result.ok).toBe(false)
    expect(result.record.importReadiness).toBe('NOT_READY')
  })

  it('treats official verification as separate from eligibility verification', () => {
    const official = validated({
      status: 'OFFICIALLY_VERIFIED',
      verificationStatus: 'PARTIALLY_VERIFIED',
      verificationEvidence: [{ sourceId: 's1' }],
      lastVerifiedOn: '2026-11-20',
    })
    expect(eligibilityVerified(official)).toBe(false)
    const eligible = { ...official, status: 'ELIGIBILITY_VERIFIED' as const }
    expect(eligibilityVerified(eligible)).toBe(true)
    expect(eligibilityVerified({ ...eligible, verificationEvidence: [] })).toBe(false)
  })

  it('moves an eligible record to import-ready', () => {
    const eligible = validated({
      status: 'ELIGIBILITY_VERIFIED',
      verificationStatus: 'PARTIALLY_VERIFIED',
      verificationEvidence: [{ sourceId: 's1' }],
      lastVerifiedOn: '2026-11-20',
      importReadiness: 'NEEDS_INFO',
    })
    const result = applyTransition(eligible, 'READY_FOR_IMPORT', { on: '2026-11-21' })
    expect(result.ok).toBe(true)
    expect(result.record.importReadiness).toBe('READY')
  })
})

describe('research filtering', () => {
  const records = [
    validated({ id: 'r1', name: 'One', status: 'CATALOGUED', verificationStatus: 'UNVERIFIED' }),
    validated({ id: 'r2', name: 'Two', level: 'STATE', state: 'Bihar', status: 'CONFLICTING', category: 'health' }),
  ]

  it('filters by status, level, state, category and group', () => {
    expect(filterResearchRecords(records, { status: 'CONFLICTING' }).map((r) => r.id)).toEqual(['r2'])
    expect(filterResearchRecords(records, { level: 'STATE' }).map((r) => r.id)).toEqual(['r2'])
    // "Bihar" and "BR" are the same place.
    expect(filterResearchRecords(records, { state: 'BR' }).map((r) => r.id)).toEqual(['r2'])
    expect(filterResearchRecords(records, { category: 'health' }).map((r) => r.id)).toEqual(['r2'])
    expect(filterResearchRecords(records, { onlyConflicts: true }).map((r) => r.id)).toEqual(['r2'])
  })

  it('finds records with no sources at all', () => {
    expect(missingSources(records[0])).toBe(false)
    const bare = { ...records[0], eligibilityEvidence: [], verificationEvidence: [], discoveryUrl: undefined }
    expect(missingSources(bare)).toBe(true)
    expect(filterResearchRecords([bare], { onlyMissingSources: true })).toHaveLength(1)
  })
})
