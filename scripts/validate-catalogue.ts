// Validates a scheme catalogue file before it becomes part of the app.
// Usage: npm run validate:catalogue -- data/schemes.json
// Exits 1 when the catalogue has errors, so an import can be blocked in CI.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateCatalogue } from '../src/core/catalogue.ts'

const file = process.argv[2]
if (!file) {
  console.error('usage: npm run validate:catalogue -- <path/to/catalogue.json>')
  process.exit(2)
}

let parsed: unknown
try {
  parsed = JSON.parse(readFileSync(resolve(process.cwd(), file), 'utf8'))
} catch (error) {
  console.error(`could not read ${file}: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
}

const report = validateCatalogue(parsed)
for (const issue of report.warnings) console.warn(`warning ${issue.path} [${issue.code}] ${issue.message}`)
for (const issue of report.errors) console.error(`error   ${issue.path} [${issue.code}] ${issue.message}`)

if (!report.ok) {
  console.error(`\n${report.errors.length} error(s): the catalogue was NOT loaded.`)
  process.exit(1)
}
console.log(`\n${report.schemes.length} scheme(s) valid, ${report.warnings.length} warning(s).`)
