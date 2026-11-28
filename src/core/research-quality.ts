// Research quality reporting. Everything is derived from the register: source
// tiers, change states, evidence links and coverage claims. No network, no
// clock, no heuristics that are not written down here.
//
// A record is never labelled "complete" because its fields are filled in. It is
// complete only when it has an authoritative, reachable, non-conflicting source
// for its conditions and its verification status is confirmed.
import { buildCoverageReport, discoveredOnly, type CoverageReport } from './research-coverage'
import {
  assessRecordPriority,
  type ResearchPriority,
} from './research-priority'
import {
  type CoverageClaim,
  type ImportReadiness,
  type ResearchRecord,
  type ResearchSource,
  type ResearchStatus,
  type SourceTier,
} from './research'
import type { VerificationStatus } from './scheme'

export type SourceAuthority = 'AUTHORITATIVE' | 'SECONDARY' | 'NOT_AUTHORITATIVE' | 'UNKNOWN'

// Tier is about the publisher. Authority is about whether that publisher may be
// used to assert eligibility: only legal and official primary sources may.
export function sourceAuthority(tier: SourceTier): SourceAuthority {
  if (tier === 'PRIMARY_LEGAL' || tier === 'PRIMARY_OFFICIAL') return 'AUTHORITATIVE'
  if (tier === 'SECONDARY_OFFICIAL') return 'SECONDARY'
  if (tier === 'AGGREGATOR') return 'NOT_AUTHORITATIVE'
  return 'UNKNOWN'
}

export type ResearchOutcome =
  | 'COMPLETE'
  | 'NO_INFORMATION_FOUND'
  | 'NOT_RESEARCHED'
  | 'SOURCE_INACCESSIBLE'
  | 'SOURCE_NOT_AUTHORITATIVE'
  | 'CONFLICTING'
  | 'CONDITION_UNVERIFIED'
  | 'SOURCE_OUTDATED'

// The order matters: a conflict or a dead link outranks a merely unverified
// condition, because fixing it may change what the condition should say.
const OUTCOME_PRECEDENCE: ResearchOutcome[] = [
  'CONFLICTING',
  'SOURCE_INACCESSIBLE',
  'SOURCE_OUTDATED',
  'SOURCE_NOT_AUTHORITATIVE',
  'CONDITION_UNVERIFIED',
  'NOT_RESEARCHED',
  'COMPLETE',
]

export interface SourceHealth {
  id: string
  url: string
  tier: SourceTier
  authority: SourceAuthority
  state: string
  lastCheckedOn: string | null
  ageDays: number | null
}

export interface RecordQuality {
  recordId: string
  name: string
  status: ResearchStatus
  verificationStatus: VerificationStatus
  importReadiness: ImportReadiness
  outcome: ResearchOutcome
  task: string
  reason: string
  evidenceSourceIds: string[]
  authority: SourceAuthority
  gaps: string[]
  priority: number
}

export interface FreshnessBuckets {
  current: number // checked within 90 days
  aging: number // 91-180 days
  stale: number // older than 180 days, or never checked
  unknown: number // no date at all
}

export interface QualityTotals {
  records: number
  researched: number
  discoveredOnly: number
  verified: number
  partiallyVerified: number
  unverified: number
  conflicts: number
  outdated: number
  importReady: number
  imported: number
  noConditions: number
  noApplicationUrl: number
  noBenefit: number
  inaccessibleSources: number
  aggregatorOnlySources: number
}

export interface QualityReport {
  totals: QualityTotals
  statusDistribution: Record<string, number>
  verificationDistribution: Record<string, number>
  authorityDistribution: Record<string, number>
  sourceStateDistribution: Record<string, number>
  freshness: FreshnessBuckets
  sources: SourceHealth[]
  priorities: ResearchPriority[]
  queue: RecordQuality[]
  coverage: CoverageReport
  outcomeDistribution: Record<string, number>
}

const DAY_MS = 24 * 60 * 60 * 1000

function ageInDays(date: string | undefined, today: string): number | null {
  if (!date) return null
  const time = Date.parse(`${date}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(time) || Number.isNaN(now)) return null
  return Math.floor((now - time) / DAY_MS)
}

function sourceHealth(source: ResearchSource, today: string): SourceHealth {
  const lastChecked = source.change?.lastCheckedOn ?? source.verifiedOn ?? source.retrievedOn
  const age = ageInDays(lastChecked, today)
  return {
    id: source.id,
    url: source.url,
    tier: source.tier,
    authority: sourceAuthority(source.tier),
    state: source.change?.status ?? 'UNCHECKED',
    lastCheckedOn: lastChecked ?? null,
    ageDays: age,
  }
}

function evidenceIds(record: ResearchRecord): string[] {
  return [...new Set([...record.eligibilityEvidence, ...record.verificationEvidence].map((entry) => entry.sourceId))]
}

function bestAuthority(record: ResearchRecord, byId: ReadonlyMap<string, SourceHealth>): SourceAuthority {
  const ranks: Record<SourceAuthority, number> = { AUTHORITATIVE: 3, SECONDARY: 2, NOT_AUTHORITATIVE: 1, UNKNOWN: 0 }
  let best: SourceAuthority = 'UNKNOWN'
  for (const id of evidenceIds(record)) {
    const health = byId.get(id)
    if (!health) continue
    if (ranks[health.authority] > ranks[best]) best = health.authority
  }
  return best
}

// A record's outcome is the most serious problem it has, not an average, and the
// task names the single next action.
export function assessRecordQuality(
  record: ResearchRecord,
  sources: readonly SourceHealth[],
  today: string,
  all: readonly ResearchRecord[] = [record],
): RecordQuality {
  const byId = new Map(sources.map((source) => [source.id, source]))
  const linked = evidenceIds(record).map((id) => byId.get(id)).filter((source): source is SourceHealth => source !== undefined)
  const authority = bestAuthority(record, byId)
  const gaps: string[] = []
  const found = new Set<ResearchOutcome>()

  if (record.status === 'CONFLICTING') found.add('CONFLICTING')
  if (linked.some((source) => source.state === 'GONE')) found.add('SOURCE_INACCESSIBLE')
  if (linked.length > 0 && linked.every((source) => source.state === 'GONE')) gaps.push('every linked source is unreachable')
  const stale = linked.filter((source) => source.ageDays === null || source.ageDays > 365)
  if (
    record.status === 'OUTDATED' ||
    (linked.length > 0 && stale.length === linked.length && record.lastVerifiedOn !== undefined && (ageInDays(record.lastVerifiedOn, today) ?? 0) > 365)
  ) {
    found.add('SOURCE_OUTDATED')
  }
  if (linked.length > 0 && authority !== 'AUTHORITATIVE') found.add('SOURCE_NOT_AUTHORITATIVE')
  if (discoveredOnly(record) || record.verificationStatus === 'UNVERIFIED') found.add('NOT_RESEARCHED')
  const unsourcedConditions = record.eligibilityConditions.filter((condition) => !condition.sourceId)
  if (record.eligibilityConditions.length === 0 || unsourcedConditions.length > 0) found.add('CONDITION_UNVERIFIED')

  const outcome = OUTCOME_PRECEDENCE.find((candidate) => found.has(candidate)) ?? 'COMPLETE'

  if (record.eligibilityConditions.length === 0) gaps.push('no eligibility conditions recorded')
  if (unsourcedConditions.length > 0) gaps.push(`${unsourcedConditions.length} condition(s) without a source`)
  if (!record.applicationUrl) gaps.push('no official application link')
  if (!record.benefit && !record.benefitSummary) gaps.push('benefit not recorded')
  if (record.benefit && record.benefit.amountInr === undefined) gaps.push('benefit amount not established')
  if (record.status === 'CONFLICTING') gaps.push('sources conflict and the conflict is unresolved')
  if (linked.some((source) => source.state === 'GONE')) gaps.push('a linked source is gone')
  if (record.unresolvedQuestions.length > 0) gaps.push(`${record.unresolvedQuestions.length} unresolved question(s)`)

  const task = {
    COMPLETE: 'No research task: evidence is confirmed and reachable.',
    'NO_INFORMATION_FOUND': 'Record a search note and re-check later; absence of evidence is not evidence of absence.',
    NOT_RESEARCHED: 'Retrieve the scheme guidelines and register each condition with a source.',
    SOURCE_INACCESSIBLE: 'Replace the unreachable link with an accessible official copy.',
    SOURCE_NOT_AUTHORITATIVE: 'Find the official document behind the secondary source.',
    CONFLICTING: 'Resolve the conflict with a primary document, or record both values as an open conflict.',
    CONDITION_UNVERIFIED: 'Verify each eligibility condition against the scheme guidelines.',
    SOURCE_OUTDATED: 'Re-check the order and confirm it still applies.',
  }[outcome]

  const reason = {
    COMPLETE: 'An authoritative, reachable source covers the recorded conditions.',
    'NO_INFORMATION_FOUND': 'Only a recorded search, with no source establishing the scheme.',
    NOT_RESEARCHED: 'No evidence is registered beyond the discovery listing.',
    SOURCE_INACCESSIBLE: 'At least one linked source is marked GONE.',
    SOURCE_NOT_AUTHORITATIVE: 'The best linked source is secondary or an aggregator.',
    CONFLICTING: 'The record is marked CONFLICTING.',
    CONDITION_UNVERIFIED: 'One or more eligibility conditions have no source.',
    SOURCE_OUTDATED: 'The record or its sources are older than a year, or marked OUTDATED.',
  }[outcome]

  return {
    recordId: record.id,
    name: record.name,
    status: record.status,
    verificationStatus: record.verificationStatus,
    importReadiness: record.importReadiness,
    outcome,
    task,
    reason,
    evidenceSourceIds: evidenceIds(record),
    authority,
    gaps,
    priority: assessRecordPriority(record, { records: all }).score,
  }
}

function countBy<T>(items: readonly T[], key: (item: T) => string | undefined): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const value = key(item) ?? 'unknown'
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

export interface QualityOptions {
  claims?: readonly CoverageClaim[]
  today?: string
  limit?: number // priority rows; the queue always lists every non-complete record
}

export function buildQualityReport(
  records: readonly ResearchRecord[],
  sources: readonly ResearchSource[],
  options: QualityOptions = {},
): QualityReport {
  const today = options.today ?? new Date().toISOString().slice(0, 10)
  const health = sources.map((source) => sourceHealth(source, today))
  const byId = new Map(health.map((source) => [source.id, source]))

  const recordsQuality = records.map((record) => assessRecordQuality(record, health, today, records))
  const priorities = records
    .map((record) => assessRecordPriority(record, { records, sources }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.recordId.localeCompare(b.recordId)))
    .slice(0, options.limit ?? 10)

  const queue = recordsQuality
    .filter((row) => row.outcome !== 'COMPLETE')
    .sort((a, b) => (b.priority !== a.priority ? b.priority - a.priority : a.recordId.localeCompare(b.recordId)))

  const freshness: FreshnessBuckets = { current: 0, aging: 0, stale: 0, unknown: 0 }
  for (const source of health) {
    if (source.ageDays === null) freshness.unknown += 1
    else if (source.ageDays <= 90) freshness.current += 1
    else if (source.ageDays <= 180) freshness.aging += 1
    else freshness.stale += 1
  }

  const accessed = new Set(records.flatMap(evidenceIds))
  return {
    totals: {
      records: records.length,
      researched: records.filter((record) => !discoveredOnly(record)).length,
      discoveredOnly: records.filter(discoveredOnly).length,
      verified: records.filter((record) => record.verificationStatus === 'VERIFIED').length,
      partiallyVerified: records.filter((record) => record.verificationStatus === 'PARTIALLY_VERIFIED').length,
      unverified: records.filter((record) => record.verificationStatus === 'UNVERIFIED').length,
      conflicts: records.filter((record) => record.status === 'CONFLICTING').length,
      outdated: records.filter((record) => record.status === 'OUTDATED').length,
      importReady: records.filter((record) => record.importReadiness === 'READY').length,
      imported: records.filter((record) => record.importReadiness === 'IMPORTED').length,
      noConditions: records.filter((record) => record.eligibilityConditions.length === 0).length,
      noApplicationUrl: records.filter((record) => !record.applicationUrl).length,
      noBenefit: records.filter((record) => !record.benefit && !record.benefitSummary).length,
      inaccessibleSources: health.filter((source) => source.state === 'GONE').length,
      aggregatorOnlySources: [...accessed].filter((id) => byId.get(id)?.authority === 'NOT_AUTHORITATIVE').length,
    },
    statusDistribution: countBy(records, (record) => record.status),
    verificationDistribution: countBy(records, (record) => record.verificationStatus),
    authorityDistribution: countBy(health, (source) => source.authority),
    sourceStateDistribution: countBy(health, (source) => source.state),
    freshness,
    sources: health,
    priorities,
    queue,
    coverage: buildCoverageReport(records, options.claims ?? []),
    outcomeDistribution: countBy(recordsQuality, (record) => record.outcome),
  }
}

// A record is only ready for human review when its evidence, not its prose, is
// complete. This never promotes anything: it reports records whose stated
// readiness is not supported.
export function importReadinessProblems(records: readonly ResearchRecord[], eligibilityVerified: (record: ResearchRecord) => boolean): RecordQuality[] {
  return records
    .filter((record) => record.importReadiness === 'READY' || record.importReadiness === 'IMPORTED')
    .filter((record) => !eligibilityVerified(record) || record.verificationStatus !== 'VERIFIED' || record.eligibilityConditions.length === 0)
    .map((record) => ({
      recordId: record.id,
      name: record.name,
      status: record.status,
      verificationStatus: record.verificationStatus,
      importReadiness: record.importReadiness,
      outcome: 'CONDITION_UNVERIFIED' as ResearchOutcome,
      task: 'Withdraw the readiness claim until the conditions are verified.',
      reason: 'Readiness is claimed without verified, sourced conditions.',
      evidenceSourceIds: evidenceIds(record),
      authority: 'UNKNOWN' as SourceAuthority,
      gaps: ['readiness exceeds evidence'],
      priority: 0,
    }))
}

const OUTCOME_INDIA: Record<string, string> = {
  NO_INFORMATION_FOUND: 'no information found',
  NOT_RESEARCHED: 'not researched',
  SOURCE_INACCESSIBLE: 'source inaccessible',
  SOURCE_NOT_AUTHORITATIVE: 'source not authoritative',
  CONFLICTING: 'evidence conflicting',
  CONDITION_UNVERIFIED: 'condition not verified',
  SOURCE_OUTDATED: 'source outdated',
  COMPLETE: 'complete',
}

export function formatQualityReport(report: QualityReport): string {
  const t = report.totals
  const lines = [
    'Research quality',
    '----------------',
    `records: ${t.records} (researched ${t.researched}, listing only ${t.discoveredOnly})`,
    `verified: ${t.verified}  partially verified: ${t.partiallyVerified}  unverified: ${t.unverified}`,
    `conflicts: ${t.conflicts}  outdated: ${t.outdated}  import ready: ${t.importReady}`,
    `no conditions: ${t.noConditions}  no application link: ${t.noApplicationUrl}  no benefit: ${t.noBenefit}`,
    `sources: ${report.sources.length}  inaccessible: ${t.inaccessibleSources}`,
    `source authority: ${Object.entries(report.authorityDistribution).map(([key, n]) => `${key} ${n}`).join(', ')}`,
    `freshness: current ${report.freshness.current}, aging ${report.freshness.aging}, stale ${report.freshness.stale}, never checked ${report.freshness.unknown}`,
    `outcomes: ${Object.entries(report.outcomeDistribution).map(([key, n]) => `${OUTCOME_INDIA[key] ?? key} ${n}`).join(', ')}`,
    '',
    'Highest research priorities',
    '---------------------------',
  ]
  for (const priority of report.priorities) {
    lines.push(`${priority.score.toFixed(1).padStart(5)}  ${priority.recordId}  ${priority.name}`)
    lines.push(`       ${priority.rationale}`)
    if (priority.gaps.length > 0) lines.push(`       gaps: ${priority.gaps.slice(0, 4).join('; ')}`)
  }
  lines.push('', 'Research action queue', '---------------------')
  for (const row of report.queue.slice(0, 20)) {
    lines.push(`${row.priority.toFixed(1).padStart(5)}  ${OUTCOME_INDIA[row.outcome]}  ${row.recordId}`)
    lines.push(`       ${row.task}`)
  }
  if (report.queue.length > 20) lines.push(`... ${report.queue.length - 20} more record(s) in the queue`)
  lines.push('', 'A priority score is a research planning aid. It never changes eligibility, verification or import readiness.')
  return lines.join('\n')
}
