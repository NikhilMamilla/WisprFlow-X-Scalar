// Catalogue search over the prebuilt index. Case-, spacing- and punctuation-
// insensitive, and local to the app: no network, no external service.
import { findRegion } from './geo'
import type { Scheme } from './scheme'

export interface SearchEntry {
  scheme: Scheme
  name: string // normalised official name
  aliases: string[] // normalised aliases
  keys: string[] // normalised category, tags, beneficiary groups, states
  haystack: string // every searchable field, normalised
}

export interface SearchIndex {
  entries: SearchEntry[]
}

export function searchNormalize(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’'`".,()[\]{}/\\|_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function localized(scheme: Scheme): string[] {
  return [
    scheme.name_en,
    scheme.name_hi,
    scheme.name_te ?? '',
    scheme.benefit_en,
    scheme.benefit_hi,
    scheme.benefit_te ?? '',
    scheme.benefit_en_roman,
  ]
}

export function buildSearchIndex(schemes: Scheme[]): SearchIndex {
  const entries = schemes.map((scheme) => {
    const keys = [
      scheme.category ?? '',
      ...(scheme.tags ?? []),
      ...(scheme.beneficiaryGroups ?? []),
      ...(scheme.geography.states ?? []),
    ]
    const haystack = searchNormalize(
      [...localized(scheme), ...(scheme.aliases ?? []), ...keys, scheme.id].join(' '),
    )
    return {
      scheme,
      name: searchNormalize(scheme.name_en),
      aliases: (scheme.aliases ?? []).map(searchNormalize),
      keys: keys.map(searchNormalize).filter(Boolean),
      haystack,
    }
  })
  return { entries }
}

export interface SearchOptions {
  limit?: number
}

// Higher is a better match. Exact and prefix name hits win, then aliases, then
// category/tags, then any text (benefit, description). Results keep catalogue
// order on a tie so output is stable.
function score(entry: SearchEntry, query: string): number {
  if (!query) return 0
  if (entry.name === query) return 100
  if (entry.name.startsWith(query)) return 80
  if (entry.aliases.some((a) => a === query)) return 70
  if (entry.aliases.some((a) => a.startsWith(query))) return 60
  if (entry.name.includes(query)) return 50
  if (entry.aliases.some((a) => a.includes(query))) return 40
  if (entry.keys.some((k) => k === query)) return 30
  if (entry.keys.some((k) => k.includes(query))) return 25
  if (entry.haystack.includes(query)) return 20
  return 0
}

export function searchSchemes(index: SearchIndex, query: string, options: SearchOptions = {}): Scheme[] {
  const q = searchNormalize(query)
  if (!q) return []
  // "TS" or "orissa" should find a scheme that lists "Telangana" or "Odisha".
  const region = findRegion(q)
  const terms = region && searchNormalize(region.name) !== q ? [q, searchNormalize(region.name)] : [q]
  const limit = options.limit ?? 20
  const scored: { scheme: Scheme; score: number; order: number }[] = []
  index.entries.forEach((entry, order) => {
    const value = Math.max(...terms.map((term) => score(entry, term)))
    if (value > 0) scored.push({ scheme: entry.scheme, score: value, order })
  })
  scored.sort((a, b) => b.score - a.score || a.order - b.order)
  return scored.slice(0, limit).map((s) => s.scheme)
}
