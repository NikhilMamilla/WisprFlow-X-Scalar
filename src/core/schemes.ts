// Loads data/schemes.json, the single source of truth for scheme rules, through
// the catalogue validator. A bad file fails loudly at startup instead of
// silently changing eligibility.
import data from '../../data/schemes.json'
import { validateCatalogue } from './catalogue'
import type { Scheme } from './scheme'

// Validates an in-memory catalogue (used by tests and the import tool) and
// throws on the first report with errors, naming every problem found.
export function validateSchemes(schemes: Scheme[]): Scheme[] {
  const report = validateCatalogue(schemes)
  if (!report.ok) {
    throw new Error(report.errors.map((e) => `${e.path}: ${e.message}`).join('; '))
  }
  return report.schemes
}

const report = validateCatalogue(data)
if (!report.ok) {
  const details = report.errors.map((e) => `  ${e.path}: ${e.message}`).join('\n')
  throw new Error(`data/schemes.json failed validation:\n${details}`)
}

// Catalogue order is the order results are presented in; do not sort it.
export const SCHEMES: Scheme[] = report.schemes
