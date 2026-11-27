// Coverage audit over research records. Everything here is derived from the
// records and coverage claims actually in the repository; nothing is estimated
// and no national scheme count is assumed.
//
// NONE_FOUND is a statement about a search that was performed. It never proves
// that no scheme exists for that area, and the report says so.
// The 28 states and 8 UTs come from the one geography table the app already
// uses; there is no second list of states.
import { REGIONS, findRegion } from './geo'
import {
  COVERAGE_AGE_BANDS,
  RESEARCH_GROUPS,
  eligibilityVerified,
  missingSources,
  type CoverageClaim,
  type CoverageStatus,
  type ResearchRecord,
} from './research'

export type CoverageKind = 'central' | 'state' | 'ut' | 'group' | 'age' | 'category'

export interface CoverageArea {
  key: string
  label: string
  kind: CoverageKind
  status: CoverageStatus
  records: number
  verified: number
  note?: string
}

export interface CoverageTotals {
  records: number
  central: number
  state: number
  unionTerritory: number
  verified: number
  partiallyVerified: number
  eligibilityVerified: number
  importReady: number
  imported: number
  missingSources: number
  conflicts: number
  needsResearch: number
  noneFoundClaims: number
  categories: number
}

export interface CoverageReport {
  totals: CoverageTotals
  states: CoverageArea[]
  unionTerritories: CoverageArea[]
  groups: CoverageArea[]
  ageBands: CoverageArea[]
  categories: CoverageArea[]
  gaps: CoverageArea[]
  priorities: string[]
}

const needsWork = (record: ResearchRecord): boolean =>
  record.status === 'NEEDS_RESEARCH' ||
  record.status === 'CONFLICTING' ||
  record.importReadiness === 'NEEDS_INFO'

// Records exist and every one of them is verified -> COVERED. Records exist but
// at least one is not yet verified -> PARTIAL. No records -> whatever the
// researcher claimed, otherwise NOT_RESEARCHED.
function areaStatus(matched: ResearchRecord[]): CoverageStatus {
  if (matched.length === 0) return 'NOT_RESEARCHED'
  if (matched.some(needsWork)) return 'NEEDS_MORE_RESEARCH'
  if (matched.every((record) => record.verificationStatus === 'VERIFIED')) return 'COVERED'
  return 'PARTIAL'
}

function area(
  key: string,
  label: string,
  kind: CoverageKind,
  matched: ResearchRecord[],
  claim?: CoverageClaim,
): CoverageArea {
  const status = matched.length === 0 && claim ? claim.status : areaStatus(matched)
  return {
    key,
    label,
    kind,
    status,
    records: matched.length,
    verified: matched.filter((record) => record.verificationStatus === 'VERIFIED').length,
    ...(claim?.note && matched.length === 0 ? { note: claim.note } : {}),
  }
}

// A claim names a place, a group label/key or the central government.
function claimFor(claims: readonly CoverageClaim[], areaKey: string, labels: string[]): CoverageClaim | undefined {
  const wanted = new Set(labels.map((label) => label.trim().toLowerCase()))
  return claims.find((claim) => {
    const claimed = claim.area.trim().toLowerCase()
    if (claimed === areaKey.toLowerCase() || wanted.has(claimed)) return true
    const region = findRegion(claim.area)
    return region !== null && labels.includes(region.name)
  })
}

export function buildCoverageReport(records: readonly ResearchRecord[], claims: readonly CoverageClaim[] = []): CoverageReport {
  const inRegion = (name: string) =>
    records.filter((record) => record.state !== undefined && findRegion(record.state)?.name === name)

  const stateAreas = REGIONS.filter((region) => region.type === 'state').map((region) =>
    area(region.code, region.name, 'state', inRegion(region.name), claimFor(claims, region.code, [region.name, region.code])),
  )
  const unionAreas = REGIONS.filter((region) => region.type === 'union_territory').map((region) =>
    area(region.code, region.name, 'ut', inRegion(region.name), claimFor(claims, region.code, [region.name, region.code])),
  )

  const centralRecords = records.filter((record) => record.level === 'CENTRAL')
  const centralArea = area('CENTRAL', 'Central Government', 'central', centralRecords, claimFor(claims, 'CENTRAL', ['central', 'central government', 'india']))

  const groupAreas = RESEARCH_GROUPS.map((group) =>
    area(
      group.key,
      group.label,
      'group',
      records.filter((record) => record.beneficiaryGroups.includes(group.key)),
      claimFor(claims, group.key, [group.key, group.label]),
    ),
  )

  const ageAreas = COVERAGE_AGE_BANDS.map((band) =>
    area(
      band.key,
      band.label,
      'age',
      records.filter((record) => record.ageBands.includes(band.key)),
      claimFor(claims, band.key, [band.key, band.label]),
    ),
  )

  const categoryKeys = [...new Set(records.map((record) => record.category ?? 'uncategorised'))].sort()
  const categoryAreas = categoryKeys.map((key) =>
    area(key, key, 'category', records.filter((record) => (record.category ?? 'uncategorised') === key)),
  )

  const gaps = [centralArea, ...stateAreas, ...unionAreas, ...groupAreas, ...ageAreas].filter(
    (entry) => entry.status === 'NOT_RESEARCHED' || entry.status === 'NEEDS_MORE_RESEARCH',
  )
  // Needs-more-research first: an area we started and could not finish is a
  // sharper task than an area nobody has looked at.
  gaps.sort((a, b) => {
    const rank = (entry: CoverageArea) => (entry.status === 'NEEDS_MORE_RESEARCH' ? 0 : 1)
    return rank(a) - rank(b)
  })

  const totals: CoverageTotals = {
    records: records.length,
    central: centralRecords.length,
    state: records.filter((record) => record.level === 'STATE').length,
    unionTerritory: records.filter((record) => record.level === 'UT').length,
    verified: records.filter((record) => record.verificationStatus === 'VERIFIED').length,
    partiallyVerified: records.filter((record) => record.verificationStatus === 'PARTIALLY_VERIFIED').length,
    eligibilityVerified: records.filter(eligibilityVerified).length,
    importReady: records.filter((record) => record.importReadiness === 'READY').length,
    imported: records.filter((record) => record.importReadiness === 'IMPORTED').length,
    missingSources: records.filter(missingSources).length,
    conflicts: records.filter((record) => record.status === 'CONFLICTING').length,
    needsResearch: records.filter((record) => record.status === 'NEEDS_RESEARCH').length,
    noneFoundClaims: claims.filter((claim) => claim.status === 'NONE_FOUND').length,
    categories: categoryAreas.length,
  }

  const priorities = gaps.slice(0, 15).map((entry) => `${entry.label} (${entry.status})`)

  return {
    totals,
    states: stateAreas,
    unionTerritories: unionAreas,
    groups: groupAreas,
    ageBands: ageAreas,
    categories: categoryAreas,
    gaps,
    priorities,
  }
}

function countLine(label: string, entries: CoverageArea[]): string {
  const counts = new Map<CoverageStatus, number>()
  for (const entry of entries) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1)
  const parts = [...counts.entries()].map(([status, count]) => `${status} ${count}`)
  return `${label}: ${entries.length}${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`
}

export function formatCoverageReport(report: CoverageReport): string {
  const t = report.totals
  const lines = [
    'Research coverage',
    '-----------------',
    `records: ${t.records}  central: ${t.central}  state: ${t.state}  UT: ${t.unionTerritory}`,
    `verified: ${t.verified}  partially verified: ${t.partiallyVerified}  eligibility stage + evidence: ${t.eligibilityVerified}`,
    `import ready: ${t.importReady}  imported: ${t.imported}  missing sources: ${t.missingSources}`,
    `conflicting: ${t.conflicts}  needs research: ${t.needsResearch}  categories: ${t.categories}`,
    '',
    countLine('States', report.states),
    countLine('Union Territories', report.unionTerritories),
    countLine('Beneficiary groups', report.groups),
    countLine('Age bands', report.ageBands),
    '',
    'Coverage by beneficiary group',
    ...report.groups.map((g) => `  ${g.label}: ${g.status} (${g.records} record(s))`),
    '',
    'Coverage by category',
    ...report.categories.map((c) => `  ${c.label}: ${c.status} (${c.records} record(s))`),
    '',
    'Research gaps and priorities',
    ...report.priorities.map((p) => `  ${p}`),
    report.gaps.length > report.priorities.length ? `  ... and ${report.gaps.length - report.priorities.length} more` : '',
    '',
    'States and UTs with no state/UT scheme records',
    ...[...report.states, ...report.unionTerritories]
      .filter((entry) => entry.records === 0)
      .map((entry) => `  ${entry.label}: ${entry.status}`),
    '',
    `NONE_FOUND claims: ${t.noneFoundClaims}. NONE_FOUND records that a search found nothing; it is never proof that no scheme exists.`,
  ]
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
