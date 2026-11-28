// Research CLI. Reads the research register, validates it against the real
// catalogue, and prints listings, gaps, coverage or a machine-readable export.
//
//   npm run research -- list
//   npm run research -- list --status NEEDS_RESEARCH --level STATE --state Bihar
//   npm run research -- list --unverified | --missing-sources | --conflicts | --ready
//   npm run research -- show research-eshram
//   npm run research -- validate
//   npm run research -- coverage
//   npm run research -- gaps
//   npm run research -- sources [--days 90] [--today 2026-11-28]
//   npm run research -- quality [--limit 10] [--today 2026-11-28]
//   npm run research -- export --out research-export.json
//
// Optional: --file data/research/records.json --catalogue data/schemes.json
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateCatalogue } from '../src/core/catalogue.ts'
import { buildCoverageReport, formatCoverageReport } from '../src/core/research-coverage.ts'
import { buildQualityReport, formatQualityReport, importReadinessProblems } from '../src/core/research-quality.ts'
import {
  COVERAGE_STATUSES,
  GOVERNMENT_LEVELS,
  RESEARCH_GROUPS,
  RESEARCH_STATUSES,
  eligibilityVerified,
  filterResearchRecords,
  missingSources,
  staleSources,
  validateResearch,
  type ResearchFilter,
  type ResearchRecord,
  type ResearchStatus,
} from '../src/core/research.ts'

const args = process.argv.slice(2)
const COMMANDS = new Set(['list', 'show', 'validate', 'coverage', 'gaps', 'sources', 'quality', 'export'])
const command = args[0] !== undefined && COMMANDS.has(args[0]) ? args[0] : 'list'
const has = (name: string) => args.includes(`--${name}`)
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
// A status or state value must never be mistaken for a command or an id.
const VALUE_OPTIONS = new Set(['status', 'level', 'state', 'category', 'group', 'file', 'catalogue', 'out', 'days', 'today', 'limit'])
const positionals: string[] = []
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i]
  if (arg.startsWith('--')) {
    if (VALUE_OPTIONS.has(arg.slice(2))) i += 1
    continue
  }
  positionals.push(arg)
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'))
  } catch (error) {
    console.error(`could not read ${path}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }
}

const researchPath = valueOf('file') ?? 'data/research/records.json'
const cataloguePath = valueOf('catalogue') ?? 'data/schemes.json'

const catalogue = validateCatalogue(readJson(cataloguePath))
if (!catalogue.ok) {
  console.error(`the catalogue ${cataloguePath} is invalid; fix it before reading research data`)
  process.exit(3)
}
const schemeIds = catalogue.schemes.map((scheme) => scheme.id)

const report = validateResearch(readJson(researchPath), { schemeIds })
for (const issue of report.warnings) console.warn(`warning ${issue.path} [${issue.code}] ${issue.message}`)
for (const issue of report.errors) console.error(`error   ${issue.path} [${issue.code}] ${issue.message}`)

if (!report.ok) {
  console.error(`\nresearch data is invalid: ${report.errors.length} error(s). Nothing else was run.`)
  process.exit(1)
}

const records = report.records

const STATUS = (value: string): ResearchStatus => {
  if (!(RESEARCH_STATUSES as readonly string[]).includes(value)) {
    console.error(`unknown status "${value}". Use one of: ${RESEARCH_STATUSES.join(', ')}`)
    process.exit(2)
  }
  return value as ResearchStatus
}

function line(record: ResearchRecord): string {
  const place = record.level === 'CENTRAL' ? 'Central' : `${record.state ?? '?'} (${record.level})`
  const flags = [
    record.verificationStatus,
    record.importReadiness,
    missingSources(record) ? 'NO SOURCE' : null,
  ].filter(Boolean)
  return `${record.id.padEnd(22)} ${record.status.padEnd(20)} ${place.padEnd(22)} ${record.name} [${flags.join(', ')}]`
}

function detail(record: ResearchRecord): string {
  const sources = new Map(report.sources.map((source) => [source.id, source]))
  const evidence = [...record.eligibilityEvidence, ...record.verificationEvidence]
  return [
    `${record.name} (${record.id})`,
    `  scheme id: ${record.schemeId ?? '-'}`,
    `  level: ${record.level}${record.state ? ` / ${record.state}` : ''}`,
    `  department: ${record.department ?? '-'}`,
    `  category: ${record.category ?? '-'}${record.subcategory ? ` / ${record.subcategory}` : ''}`,
    `  groups: ${record.beneficiaryGroups.join(', ') || '-'}   age bands: ${record.ageBands.join(', ') || '-'}`,
    `  status: ${record.status}   verification: ${record.verificationStatus}   readiness: ${record.importReadiness}`,
    `  dates: discovered ${record.discoveredOn}, researched ${record.lastResearchedOn}${record.lastVerifiedOn ? `, verified ${record.lastVerifiedOn}` : ''}`,
    `  conditions (${record.eligibilityConditions.length}):`,
    ...record.eligibilityConditions.map((condition) => `    - ${condition.text}${condition.sourceId ? ` [${condition.sourceId}]` : ' [NO SOURCE]'}`),
    `  evidence: ${evidence.length === 0 ? 'NONE' : ''}`,
    ...evidence.map((entry) => `    - ${sources.get(entry.sourceId)?.url ?? entry.sourceId}`),
    record.unresolvedQuestions.length > 0 ? '  unresolved:' : '',
    ...record.unresolvedQuestions.map((question) => `    ? ${question}`),
    record.relationships.length > 0 ? '  relationships:' : '',
    ...record.relationships.map((rel) => `    - ${rel.type} ${rel.recordId ?? rel.schemeId}${rel.note ? ` (${rel.note})` : ''}`),
    record.notes ? `  notes: ${record.notes}` : '',
  ]
    .filter((entry) => entry !== '')
    .join('\n')
}

if (command === 'list') {
  const filter: ResearchFilter = {}
  if (valueOf('status')) filter.status = STATUS(valueOf('status') as string)
  if (valueOf('level')) {
    const level = valueOf('level') as string
    if (!(GOVERNMENT_LEVELS as readonly string[]).includes(level)) {
      console.error(`unknown level "${level}". Use one of: ${GOVERNMENT_LEVELS.join(', ')}`)
      process.exit(2)
    }
    filter.level = level as ResearchFilter['level']
  }
  if (valueOf('state')) filter.state = valueOf('state')
  if (valueOf('category')) filter.category = valueOf('category')
  if (valueOf('group')) {
    const group = valueOf('group') as string
    if (!RESEARCH_GROUPS.some((entry) => entry.key === group)) {
      console.error(`unknown group "${group}". Use one of: ${RESEARCH_GROUPS.map((entry) => entry.key).join(', ')}`)
      process.exit(2)
    }
    filter.group = group as ResearchFilter['group']
  }
  if (has('unverified')) filter.onlyUnverified = true
  if (has('missing-sources')) filter.onlyMissingSources = true
  if (has('conflicts')) filter.onlyConflicts = true
  if (has('ready')) filter.onlyReady = true
  const list = filterResearchRecords(records, filter)
  console.log(list.length === 0 ? 'no research records match' : list.map(line).join('\n'))
  console.log(`\n${list.length} of ${records.length} record(s)`)
} else if (command === 'show') {
  const id = positionals.find((arg) => arg !== 'show')
  const record = records.find((entry) => entry.id === id)
  if (!record) {
    console.error(`no research record "${id ?? ''}"`)
    process.exit(1)
  }
  console.log(detail(record))
} else if (command === 'sources') {
  // Deterministic re-verification queue. No network: a fetch failure is never
  // proof that a scheme closed, so checking stays a deliberate manual step.
  const days = Number(valueOf('days') ?? 90)
  const stale = staleSources(report.sources, { today: valueOf('today'), days })
  const counts = report.sources.reduce<Record<string, number>>((acc, source) => {
    const state = source.change?.status ?? 'UNCHECKED'
    acc[state] = (acc[state] ?? 0) + 1
    return acc
  }, {})
  console.log(`sources: ${report.sources.length} total, ${stale.length} need a check (older than ${days} days or never checked)`)
  console.log(`by change state: ${Object.entries(counts).map(([state, n]) => `${state} ${n}`).join(', ')}`)
  for (const entry of stale) {
    const age = entry.ageDays === null ? 'never checked' : `${entry.ageDays}d ago`
    console.log(`  ${entry.state.padEnd(10)} ${age.padEnd(14)} ${entry.url}`)
  }
  console.log('A stale or unreachable source is a re-review task; it never changes a verification status on its own.')
} else if (command === 'quality') {
  // Deterministic report: no network and no clock unless --today is given.
  const limit = Number(valueOf('limit') ?? 10)
  const quality = buildQualityReport(records, report.sources, {
    claims: report.coverageClaims,
    today: valueOf('today'),
    limit,
  })
  console.log(formatQualityReport(quality))
  const unsupported = importReadinessProblems(records, eligibilityVerified)
  if (unsupported.length > 0) {
    console.log('')
    console.log('Readiness claims that the evidence does not support:')
    for (const row of unsupported) console.log(`  ${row.recordId}: ${row.reason}`)
  }
} else if (command === 'validate') {
  console.log(
    `ok: ${records.length} record(s), ${report.sources.length} source(s), ${report.coverageClaims.length} coverage claim(s); ` +
      `${report.warnings.length} warning(s)`,
  )
} else if (command === 'coverage' || command === 'gaps') {
  const coverage = buildCoverageReport(records, report.coverageClaims)
  if (command === 'coverage') {
    console.log(formatCoverageReport(coverage))
  } else {
    console.log(`research gaps: ${coverage.gaps.length}`)
    for (const gap of coverage.gaps) console.log(`  ${gap.kind.padEnd(8)} ${gap.label}: ${gap.status}`)
    console.log('')
    console.log(`NONE_FOUND claims: ${coverage.totals.noneFoundClaims} (never proof that a scheme does not exist)`)
  }
} else if (command === 'export') {
  const out = valueOf('out')
  const payload = {
    generated_on: new Date().toISOString().slice(0, 10),
    _note: 'Derived from the validated research register. Not a claim of complete coverage.',
    totals: buildCoverageReport(records, report.coverageClaims).totals,
    sources: report.sources,
    records,
    coverageClaims: report.coverageClaims,
  }
  const json = `${JSON.stringify(payload, null, 2)}\n`
  if (out) {
    writeFileSync(resolve(process.cwd(), out), json, 'utf8')
    console.log(`wrote ${records.length} record(s) to ${out}`)
  } else {
    process.stdout.write(json)
  }
} else {
  console.error(
    `unknown command "${command}". Use: list, show, validate, coverage, gaps, sources, quality, export.\n` +
      `coverage statuses: ${COVERAGE_STATUSES.join(', ')}\n` +
      `statuses: ${RESEARCH_STATUSES.join(', ')}`,
  )
  process.exit(2)
}
