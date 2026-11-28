import { describe, expect, it } from 'vitest'
import { PRIORITY_MODEL_VERSION, assessRecordPriority, rankResearchPriorities } from './research-priority'
import type { ResearchGroup, ResearchRecord } from './research'

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
  eligibilityEvidence: [],
  verificationEvidence: [],
  eligibilityConditions: [],
  exclusions: [],
  prerequisites: [],
  documents: [],
  status: 'CATALOGUED',
  verificationStatus: 'UNVERIFIED',
  discoveredOn: '2026-11-01',
  lastResearchedOn: '2026-11-01',
  unresolvedQuestions: [],
  relationships: [],
  importReadiness: 'NEEDS_INFO',
  statusHistory: [],
  ...overrides,
})

const factorValue = (assessment: ReturnType<typeof assessRecordPriority>, key: string) =>
  assessment.factors.find((factor) => factor.key === key)!

describe('priority model', () => {
  it('is deterministic and versioned', () => {
    const records = [record({ id: 'a' }), record({ id: 'b', status: 'CONFLICTING' })]
    expect(rankResearchPriorities(records)).toEqual(rankResearchPriorities(records))
    for (const entry of rankResearchPriorities(records)) expect(entry.modelVersion).toBe(PRIORITY_MODEL_VERSION)
  })

  it('breaks score ties by record id', () => {
    const ranked = rankResearchPriorities([record({ id: 'z' }), record({ id: 'a' })])
    expect(ranked.map((entry) => entry.recordId)).toEqual(['a', 'z'])
  })

  it('weights every factor and the score is their sum', () => {
    const assessment = assessRecordPriority(record())
    expect(assessment.factors.map((factor) => factor.key)).toEqual([
      'vulnerability',
      'benefit',
      'breadth',
      'urgency',
      'uncertainty',
      'coverage_gap',
      'likelihood',
    ])
    expect(assessment.factors.reduce((sum, factor) => sum + factor.weight, 0)).toBe(100)
    const sum = Math.round(assessment.factors.reduce((total, factor) => total + factor.contribution, 0) * 10) / 10
    expect(assessment.score).toBe(sum)
  })

  it('ranks a highly vulnerable group above an ordinary one, all else equal', () => {
    const disabled = assessRecordPriority(record({ id: 'pwd', beneficiaryGroups: ['persons_with_disabilities'] }))
    const entrepreneurs = assessRecordPriority(record({ id: 'biz', beneficiaryGroups: ['entrepreneurs'] }))
    expect(factorValue(disabled, 'vulnerability').score).toBeGreaterThan(factorValue(entrepreneurs, 'vulnerability').score)
    expect(disabled.score).toBeGreaterThan(entrepreneurs.score)
    expect(factorValue(disabled, 'vulnerability').reason).toContain('disabilities')
  })

  it('scores a record with no beneficiary group low and says why', () => {
    const assessment = assessRecordPriority(record({ beneficiaryGroups: [] }))
    const vulnerability = factorValue(assessment, 'vulnerability')
    expect(vulnerability.score).toBeLessThan(0.5)
    expect(vulnerability.reason).toContain('No beneficiary group')
  })

  it('separates a documented amount from prose-only or absent benefits', () => {
    const amount = assessRecordPriority(record({ benefit: { kind: 'cash', amountInr: 5000 } }))
    const prose = assessRecordPriority(record({ benefitSummary: 'Some support' }))
    const none = assessRecordPriority(record())
    expect(factorValue(amount, 'benefit').score).toBeGreaterThan(factorValue(prose, 'benefit').score)
    expect(factorValue(prose, 'benefit').score).toBeGreaterThan(factorValue(none, 'benefit').score)
    expect(factorValue(none, 'benefit').reason).toContain('No benefit')
    expect(factorValue(amount, 'benefit').reason).toContain('5,000')
  })

  it('scores a weaker evidence state as more uncertain, not less', () => {
    const unverified = assessRecordPriority(record({ status: 'CATALOGUED', verificationStatus: 'UNVERIFIED' }))
    const verified = assessRecordPriority(record({ status: 'IMPORTED', verificationStatus: 'VERIFIED' }))
    expect(factorValue(unverified, 'uncertainty').score).toBeGreaterThan(factorValue(verified, 'uncertainty').score)
  })

  it('raises uncertainty when conditions are missing, and names it', () => {
    const noConditions = assessRecordPriority(record())
    const sourced = assessRecordPriority(
      record({ status: 'ELIGIBILITY_VERIFIED', verificationStatus: 'VERIFIED', eligibilityConditions: [{ text: 'Be a resident', sourceId: 's1' }] }),
    )
    expect(factorValue(noConditions, 'uncertainty').score).toBeGreaterThan(factorValue(sourced, 'uncertainty').score)
    expect(factorValue(noConditions, 'uncertainty').reason).toContain('no eligibility condition')
  })

  it('scores a thin beneficiary group as a bigger coverage gap', () => {
    const all = [
      record({ id: 'one', beneficiaryGroups: ['transgender'] }),
      ...Array.from({ length: 6 }, (_, index) => record({ id: `m${index}`, beneficiaryGroups: ['farmers'] })),
    ]
    const thin = assessRecordPriority(all[0], { records: all })
    const covered = assessRecordPriority(all[1], { records: all })
    expect(factorValue(thin, 'coverage_gap').score).toBeGreaterThan(factorValue(covered, 'coverage_gap').score)
    expect(factorValue(thin, 'coverage_gap').reason).toContain('Transgender')
    expect(factorValue(covered, 'coverage_gap').score).toBe(0)
  })

  it('explains gaps without inventing evidence', () => {
    const assessment = assessRecordPriority(
      record({ status: 'CONFLICTING', eligibilityConditions: [{ text: 'Unsupported claim' }] }),
    )
    expect(assessment.gaps).toContain('conflicting sources, unresolved')
    expect(assessment.gaps).toContain('conditions without a source')
    expect(assessment.gaps).toContain('no official application link')
    expect(assessment.rationale.length).toBeGreaterThan(0)
    for (const factor of assessment.factors) expect(factor.reason.length).toBeGreaterThan(0)
  })

  it('limits the ranked list without touching the rest', () => {
    const records = Array.from({ length: 5 }, (_, index) => record({ id: `r${index}` }))
    const ranked = rankResearchPriorities(records, { limit: 2 })
    expect(ranked).toHaveLength(2)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
  })

  it('is a planning aid only: it never changes the record it reads', () => {
    const input = record({ status: 'CONFLICTING' })
    const before = JSON.stringify(input)
    assessRecordPriority(input)
    rankResearchPriorities([input])
    expect(JSON.stringify(input)).toBe(before)
  })

  it('covers every registered group without throwing', () => {
    const groups: ResearchGroup[] = ['women', 'children', 'farmers', 'students', 'senior_citizens', 'transgender']
    for (const group of groups) {
      expect(assessRecordPriority(record({ beneficiaryGroups: [group] })).score).toBeGreaterThan(0)
    }
  })
})
