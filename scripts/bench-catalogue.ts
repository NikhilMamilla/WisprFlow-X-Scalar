// Benchmarks registry construction, matching, search and filtering on synthetic
// catalogues. Synthetic entries are clones of a real (valid) scheme: they are
// never written to data/schemes.json and never validated as real research.
//
//   npm run bench:catalogue              all sizes
//   npm run bench:catalogue -- 5000      one size
//
// Matching is measured against precompiled rules (matchCatalogue). The
// "recompile" column measures what the engine would pay if it compiled the rule
// sets on every profile instead, so the precompilation win is visible.
import { performance } from 'node:perf_hooks'
import { compileChecks } from '../src/core/rules.ts'
import { matchCatalogue } from '../src/core/registry.ts'
import { buildRegistry } from '../src/core/registry.ts'
import { filterSchemes, findScheme } from '../src/core/registry.ts'
import { searchSchemes } from '../src/core/search.ts'
import type { Scheme } from '../src/core/scheme.ts'
import { SCHEMES } from '../src/core/schemes.ts'
import { emptyProfile, type Profile } from '../src/core/types.ts'

const requested = process.argv[2] ? [Number(process.argv[2])] : [6, 100, 500, 1000, 2000, 5000, 10000]
if (requested.some((n) => !Number.isFinite(n) || n <= 0)) {
  console.error('usage: npm run bench:catalogue -- [size]')
  process.exit(2)
}

const profile: Profile = {
  ...emptyProfile(),
  age: 32,
  monthly_income: 10000,
  has_bank_account: true,
  has_aadhaar: true,
  in_epf_esic_nps: false,
  pays_income_tax: false,
}

function catalogueOf(size: number): Scheme[] {
  if (size <= SCHEMES.length) return SCHEMES.slice(0, size)
  const base = SCHEMES[0]
  return Array.from({ length: size }, (_, i) => ({
    ...structuredClone(base),
    id: `scheme_${i}`,
    name_en: `Synthetic Scheme ${i}`,
    aliases: [`alias ${i}`],
    category: i % 2 === 0 ? 'insurance' : 'pension',
    geography: i % 10 === 0 ? { scope: 'state', states: ['Telangana'] } : { scope: 'central' },
    // A real dependency edge so the reverse index does work.
    prerequisites: i > 0 && i % 10 === 0 ? ['scheme_0'] : [],
  }))
}

function ms(runs: number, fn: () => void): string {
  fn() // warm-up
  const start = performance.now()
  for (let i = 0; i < runs; i++) fn()
  return ((performance.now() - start) / runs).toFixed(3)
}

const rows: string[] = []
for (const size of requested) {
  const catalogue = catalogueOf(size)

  const heapBefore = process.memoryUsage().heapUsed
  const buildStart = performance.now()
  const registry = buildRegistry(catalogue)
  const buildMs = (performance.now() - buildStart).toFixed(1)
  const heapMb = ((process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024).toFixed(1)

  const matchRuns = size >= 5000 ? 5 : 20
  const mid = Math.floor(size / 2)
  rows.push(
    [
      String(size).padStart(6),
      buildMs.padStart(9),
      ms(matchRuns, () => matchCatalogue(registry, profile)).padStart(10),
      ms(5, () => catalogue.forEach((s) => compileChecks(s))).padStart(11),
      ms(300, () => searchSchemes(registry.searchIndex, `synthetic scheme ${mid}`)).padStart(9),
      ms(300, () => filterSchemes(registry, { category: 'insurance' })).padStart(9),
      ms(500, () => findScheme(registry, 'alias 1')).padStart(8),
      ms(500, () => registry.dependents.get('scheme_0')).padStart(8),
      heapMb.padStart(8),
    ].join(' | '),
  )
}

console.log(
  [
    ' size | build ms | match ms | recompile ms | search ms | filter ms | alias ms | deps ms | heap MB',
    '------+----------+----------+--------------+-----------+-----------+----------+---------+--------',
    ...rows,
  ].join('\n'),
)
