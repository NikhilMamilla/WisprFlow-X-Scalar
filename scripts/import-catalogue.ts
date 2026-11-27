// Validates a research file and (optionally) merges it into the catalogue.
//
//   npm run import:catalogue -- research/telangana.json                 (dry run)
//   npm run import:catalogue -- research/telangana.json --write         (apply)
//   npm run import:catalogue -- file.json --base data/schemes.json --out data/schemes.json
//
// The merge is atomic: on any error nothing is written, and the existing
// catalogue is left exactly as it was. The base file's top-level metadata
// (_note, checked_on) is preserved.
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { validateCatalogue } from '../src/core/catalogue.ts'
import { formatImportReport, importSchemes } from '../src/core/import.ts'

const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}
const has = (name: string) => args.includes(`--${name}`)

const incomingPath = positional[0]
if (!incomingPath) {
  console.error('usage: npm run import:catalogue -- <research.json> [--base path] [--out path] [--write]')
  process.exit(2)
}
const basePath = valueOf('base') ?? 'data/schemes.json'
const outPath = valueOf('out') ?? basePath
const write = has('write')

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'))
  } catch (error) {
    console.error(`could not read ${path}: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(2)
  }
}

const baseJson = readJson(basePath) as { schemes?: unknown[] }
const baseReport = validateCatalogue(baseJson)
if (!baseReport.ok) {
  console.error(`the base catalogue ${basePath} is already invalid; refusing to import into it`)
  for (const issue of baseReport.errors) console.error(`error ${issue.path} [${issue.code}] ${issue.message}`)
  process.exit(3)
}

const incomingJson = readJson(incomingPath)
const report = importSchemes(baseReport.schemes, incomingJson)

for (const issue of report.warnings) console.warn(`warning ${issue.path} [${issue.code}] ${issue.message}`)
for (const issue of report.errors) console.error(`error   ${issue.path} [${issue.code}] ${issue.message}`)
console.log(`\n${formatImportReport(report)}\n`)

if (!report.ok) {
  console.error('nothing was written.')
  process.exit(1)
}
if (!write) {
  console.log('dry run: re-run with --write to merge these schemes into the catalogue.')
  process.exit(0)
}

const incomingList = Array.isArray(incomingJson)
  ? incomingJson
  : ((incomingJson as { schemes?: unknown[] }).schemes ?? [])
const merged = { ...(baseJson as Record<string, unknown>), schemes: [...(baseJson.schemes ?? []), ...incomingList] }

// Write to a sibling temp file, then rename: a crash cannot leave half a catalogue.
const target = resolve(process.cwd(), outPath)
const tmp = resolve(dirname(target), `.${process.pid}-${Date.now()}-import.tmp`)
writeFileSync(tmp, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
renameSync(tmp, target)
console.log(`wrote ${report.addedIds.length} new scheme(s) to ${outPath}`)
