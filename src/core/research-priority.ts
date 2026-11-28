// Deterministic research prioritisation. This is a planning tool only: nothing
// here touches eligibility, verification status, import readiness or the
// catalogue. Scores are derived from fields already in the register, every factor
// is reported with its reason, and a missing input is scored low and named —
// never silently treated as a good score.
//
// Changing a weight or a table means changing PRIORITY_MODEL_VERSION, so an old
// ranking can always be identified.
import {
  RESEARCH_GROUPS,
  type BenefitKind,
  type ResearchGroup,
  type ResearchRecord,
} from './research'

export const PRIORITY_MODEL_VERSION = '1.0.0'

// Why a group scores as it does. Vulnerability is about the cost of *not*
// knowing: a wrong answer hurts more when the citizen has less room to absorb it.
const GROUP_VULNERABILITY: Record<ResearchGroup, number> = {
  persons_with_disabilities: 1,
  transgender: 1,
  orphans: 1,
  widows: 0.9,
  children: 0.9,
  senior_citizens: 0.8,
  migrants: 0.75,
  construction_workers: 0.7,
  gig_workers: 0.7,
  sc_st_obc: 0.7,
  women: 0.65,
  weavers: 0.6,
  fisherfolk: 0.6,
  unorganised_workers: 0.6,
  farmers: 0.55,
  artisans: 0.55,
  street_vendors: 0.55,
  minorities: 0.5,
  students: 0.5,
  veterans: 0.5,
  entrepreneurs: 0.35,
}

// What the benefit is worth to a household in cash terms. A loan is real help but
// not the same as money received, so it scores below direct cash.
const BENEFIT_KIND_SCORE: Record<BenefitKind, number> = {
  cash: 1,
  subsidy: 0.85,
  insurance: 0.8,
  in_kind: 0.65,
  loan: 0.6,
  service: 0.5,
}

// How badly a citizen needs an answer *now*: a pension or a hospital bill cannot
// wait a month; a training scheme can.
const URGENCY_BY_CATEGORY: Record<string, number> = {
  pension: 1,
  health: 1,
  insurance: 0.9,
  social_welfare: 0.85,
  housing: 0.8,
  financial_inclusion: 0.7,
  agriculture: 0.7,
  women_child: 0.75,
  labour: 0.7,
  disability: 0.9,
  education: 0.6,
  utilities: 0.6,
  transport: 0.55,
  entrepreneurship: 0.45,
  employment: 0.5,
  skill_development: 0.45,
  environment: 0.4,
}

// How likely an informal worker in Telangana is to need this scheme at all.
const LIKELIHOOD_BY_CATEGORY: Record<string, number> = {
  financial_inclusion: 1,
  insurance: 1,
  pension: 1,
  health: 1,
  labour: 0.9,
  agriculture: 0.85,
  social_welfare: 0.85,
  housing: 0.8,
  utilities: 0.8,
  women_child: 0.8,
  disability: 0.8,
  education: 0.7,
  transport: 0.6,
  employment: 0.6,
  skill_development: 0.55,
  entrepreneurship: 0.5,
  environment: 0.4,
}

const DEFAULT_LOW_SCORE = 0.2 // used for a category or group the tables do not cover
const DEFAULT_CATEGORY_SCORE = 0.4

const STATUS_UNCERTAINTY: Record<string, number> = {
  CATALOGUED: 1,
  SOURCE_IDENTIFIED: 0.85,
  NEEDS_RESEARCH: 1,
  CONFLICTING: 1,
  OUTDATED: 0.8,
  ELIGIBILITY_VERIFIED: 0.35,
  OFFICIALLY_VERIFIED: 0.25,
  IMPORTED: 0.1,
}

const VERIFICATION_UNCERTAINTY: Record<string, number> = {
  UNVERIFIED: 1,
  PARTIALLY_VERIFIED: 0.5,
  OUTDATED: 0.8,
  VERIFIED: 0,
  DISCONTINUED: 0,
}

const SOURCE_TIER_AUTHORITY: Record<string, number> = {
  PRIMARY_LEGAL: 1,
  PRIMARY_OFFICIAL: 0.95,
  SECONDARY_OFFICIAL: 0.6,
  AGGREGATOR: 0.2,
  UNKNOWN: 0.2,
}

export interface PriorityFactor {
  key: 'vulnerability' | 'benefit' | 'breadth' | 'urgency' | 'uncertainty' | 'coverage_gap' | 'likelihood'
  label: string
  weight: number // points available
  score: number // 0..1
  contribution: number // weight * score, rounded
  reason: string
}

export interface ResearchPriority {
  recordId: string
  name: string
  level: string
  state: string | null
  groups: ResearchGroup[]
  groupLabels: string[]
  status: string
  verificationStatus: string
  score: number // 0..100
  modelVersion: string
  factors: PriorityFactor[]
  gaps: string[]
  rationale: string
}

export interface PriorityOptions {
  // The whole register, for group coverage. Without it the coverage gap factor is
  // scored low and says so rather than pretending the group is well covered.
  records?: readonly ResearchRecord[]
  limit?: number
}

// Worst case across the record's groups: a scheme that serves even one highly
// vulnerable group is prioritised for that group.
function vulnerability(record: ResearchRecord): PriorityFactor {
  if (record.beneficiaryGroups.length === 0) {
    return {
      key: 'vulnerability',
      label: 'Beneficiary vulnerability',
      weight: 25,
      score: DEFAULT_LOW_SCORE,
      contribution: 5,
      reason: 'No beneficiary group is recorded, so vulnerability cannot be argued.',
    }
  }
  const scored = record.beneficiaryGroups.map((group) => ({
    group,
    score: GROUP_VULNERABILITY[group] ?? DEFAULT_LOW_SCORE,
  }))
  const worst = scored.reduce((best, entry) => (entry.score > best.score ? entry : best))
  const label = RESEARCH_GROUPS.find((group) => group.key === worst.group)?.label ?? worst.group
  return {
    key: 'vulnerability',
    label: 'Beneficiary vulnerability',
    weight: 25,
    score: worst.score,
    contribution: Math.round(25 * worst.score * 10) / 10,
    reason: `Serves ${label}.`,
  }
}

function benefit(record: ResearchRecord): PriorityFactor {
  const amount = record.benefit?.amountInr
  const kind = record.benefit?.kind
  const base = kind ? (BENEFIT_KIND_SCORE[kind] ?? DEFAULT_LOW_SCORE) : record.benefitSummary ? 0.4 : DEFAULT_LOW_SCORE
  const withAmount = amount !== undefined ? Math.min(1, base + 0.1) : base
  const reason = !record.benefit && !record.benefitSummary
    ? 'No benefit is recorded, so its value is unknown.'
    : amount === undefined
      ? `Recorded as ${kind ?? 'prose only'} with no confirmed amount.`
      : `Recorded as ${kind} worth ₹${amount.toLocaleString('en-IN')}.`
  return {
    key: 'benefit',
    label: 'Material value of the benefit',
    weight: 15,
    score: withAmount,
    contribution: Math.round(15 * withAmount * 10) / 10,
    reason,
  }
}

function breadth(record: ResearchRecord): PriorityFactor {
  const districtLimited = record.districts.length > 0
  const score = districtLimited ? 0.5 : record.level === 'CENTRAL' ? 1 : 0.7
  const place = districtLimited ? `${record.districts.length} district(s)` : record.level === 'CENTRAL' ? 'all of India' : record.state ?? 'one state'
  return {
    key: 'breadth',
    label: 'Breadth of eligible citizens',
    weight: 10,
    score,
    contribution: Math.round(10 * score * 10) / 10,
    reason: `Applies in ${place}.`,
  }
}

function urgency(record: ResearchRecord): PriorityFactor {
  const score = URGENCY_BY_CATEGORY[record.category ?? ''] ?? DEFAULT_CATEGORY_SCORE
  return {
    key: 'urgency',
    label: 'Urgency of the benefit',
    weight: 10,
    score,
    contribution: Math.round(10 * score * 10) / 10,
    reason: record.category ? `Category "${record.category}".` : 'No category recorded; scored as a general scheme.',
  }
}

// Uncertainty is the one factor where missing evidence raises the score: an
// unverified record needs work, and the reason says which kind of gap it is.
function uncertainty(record: ResearchRecord): PriorityFactor {
  const base = STATUS_UNCERTAINTY[record.status] ?? 0.5
  const verification = VERIFICATION_UNCERTAINTY[record.verificationStatus] ?? 0.5
  let score = (base + verification) / 2
  const notes: string[] = []
  if (record.eligibilityConditions.length === 0) {
    score = Math.min(1, score + 0.2)
    notes.push('no eligibility condition is recorded')
  } else if (record.eligibilityConditions.some((condition) => !condition.sourceId)) {
    score = Math.min(1, score + 0.1)
    notes.push('some conditions have no source')
  }
  if (!record.applicationUrl) notes.push('no official application link')
  if (!record.benefit && !record.benefitSummary) notes.push('no benefit recorded')
  if (record.status === 'CONFLICTING') notes.push('sources conflict')
  return {
    key: 'uncertainty',
    label: 'Evidence uncertainty',
    weight: 25,
    score: Math.round(score * 100) / 100,
    contribution: Math.round(25 * score * 10) / 10,
    reason: notes.length > 0
      ? `Status ${record.status}, verification ${record.verificationStatus}; ${notes.join('; ')}.`
      : `Status ${record.status}, verification ${record.verificationStatus}.`,
  }
}

function coverageGap(record: ResearchRecord, all: readonly ResearchRecord[]): PriorityFactor {
  if (record.beneficiaryGroups.length === 0) {
    return {
      key: 'coverage_gap',
      label: 'Coverage gap for this group',
      weight: 10,
      score: DEFAULT_LOW_SCORE,
      contribution: 2,
      reason: 'No beneficiary group recorded.',
    }
  }
  // "Thin" means fewer than six records for the group. The threshold is a
  // reporting choice, not a claim about the world.
  const counts = record.beneficiaryGroups.map((group) => ({
    group,
    count: all.filter((other) => other.beneficiaryGroups.includes(group)).length,
  }))
  const thinnest = counts.reduce((best, entry) => (entry.count < best.count ? entry : best))
  const score = Math.max(0, 1 - Math.min(thinnest.count, 6) / 6)
  const label = RESEARCH_GROUPS.find((group) => group.key === thinnest.group)?.label ?? thinnest.group
  return {
    key: 'coverage_gap',
    label: 'Coverage gap for this group',
    weight: 10,
    score: Math.round(score * 100) / 100,
    contribution: Math.round(10 * score * 10) / 10,
    reason: `${thinnest.count} record(s) in the register for ${label} (six is treated as covered).`,
  }
}

function likelihood(record: ResearchRecord): PriorityFactor {
  const score = LIKELIHOOD_BY_CATEGORY[record.category ?? ''] ?? DEFAULT_CATEGORY_SCORE
  return {
    key: 'likelihood',
    label: 'Likelihood a citizen needs it',
    weight: 5,
    score,
    contribution: Math.round(5 * score * 10) / 10,
    reason: record.category ? `Everyday relevance of "${record.category}".` : 'No category recorded; scored as ordinary.',
  }
}

function sourceAuthority(record: ResearchRecord, sources: readonly { id: string; tier: string }[]): number {
  const ids = new Set([...record.eligibilityEvidence, ...record.verificationEvidence].map((entry) => entry.sourceId))
  const tiers = sources.filter((source) => ids.has(source.id)).map((source) => SOURCE_TIER_AUTHORITY[source.tier] ?? 0.2)
  if (tiers.length === 0) return 0
  return Math.max(...tiers)
}

function gapsFor(record: ResearchRecord, all: readonly ResearchRecord[], sources: readonly { id: string; tier: string }[]): string[] {
  const gaps: string[] = []
  if (record.status === 'CATALOGUED') gaps.push('listing only: no evidence registered')
  if (record.verificationStatus === 'UNVERIFIED') gaps.push('eligibility not verified')
  if (record.verificationStatus === 'PARTIALLY_VERIFIED') gaps.push('partially verified rules')
  if (record.status === 'CONFLICTING') gaps.push('conflicting sources, unresolved')
  if (record.status === 'OUTDATED') gaps.push('record marked outdated')
  if (record.eligibilityConditions.length === 0) gaps.push('no eligibility conditions recorded')
  if (record.eligibilityConditions.some((condition) => !condition.sourceId)) gaps.push('conditions without a source')
  if (!record.applicationUrl) gaps.push('no official application link')
  if (!record.benefit && !record.benefitSummary) gaps.push('benefit not recorded')
  if (record.benefit && record.benefit.amountInr === undefined) gaps.push('benefit amount not established')
  if (record.unresolvedQuestions.length > 0) gaps.push(`${record.unresolvedQuestions.length} unresolved question(s)`)
  // Only claim a missing authority when evidence and tiers were actually provided.
  if (sources.length > 0 && sourceAuthority(record, sources) === 0) gaps.push('no authoritative source linked')
  if (record.beneficiaryGroups.length > 1 && all.length > 0) {
    const thinnest = Math.min(...record.beneficiaryGroups.map((group) => all.filter((other) => other.beneficiaryGroups.includes(group)).length))
    if (thinnest <= 1) gaps.push('only record for one beneficiary group it serves')
  }
  return gaps
}

export interface PriorityContext {
  records?: readonly ResearchRecord[]
  sources?: readonly { id: string; tier: string }[]
}

export function assessRecordPriority(record: ResearchRecord, context: PriorityContext = {}): ResearchPriority {
  const all = context.records ?? []
  const sources = context.sources ?? []
  const factors = [
    vulnerability(record),
    benefit(record),
    breadth(record),
    urgency(record),
    uncertainty(record),
    coverageGap(record, all),
    likelihood(record),
  ]
  const score = Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0) * 10) / 10
  const groupLabels = record.beneficiaryGroups.map(
    (group) => RESEARCH_GROUPS.find((entry) => entry.key === group)?.label ?? group,
  )
  const gaps = gapsFor(record, all, sources)
  return {
    recordId: record.id,
    name: record.name,
    level: record.level,
    state: record.state ?? null,
    groups: [...record.beneficiaryGroups],
    groupLabels,
    status: record.status,
    verificationStatus: record.verificationStatus,
    score,
    modelVersion: PRIORITY_MODEL_VERSION,
    factors,
    gaps,
    rationale: `${factors
      .slice()
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map((factor) => `${factor.label.toLowerCase()}: ${factor.reason}`)
      .join(' ')}`,
  }
}

// Highest score first; ties by record id, so the queue never reshuffles between
// runs on the same data.
export function rankResearchPriorities(records: readonly ResearchRecord[], options: PriorityOptions = {}): ResearchPriority[] {
  const all = options.records ?? records
  const ranked = records
    .map((record) => assessRecordPriority(record, { records: all }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.recordId.localeCompare(b.recordId)))
  return options.limit !== undefined ? ranked.slice(0, options.limit) : ranked
}
