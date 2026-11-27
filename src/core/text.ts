// Tokenising and normalising mixed-script speech transcripts (Roman, Devanagari, Telugu).

export const BOUNDARY = '|'

const DEVANAGARI_DIGIT = /[०-९]/g
const TELUGU_DIGIT = /[౦-౯]/g

// Roman Hindi has no fixed spelling (battis/battees, bachche/bacche, aadhaar/adhar),
// so both the input and every keyword list pass through the same folding.
function foldRoman(t: string): string {
  return t
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/aa/g, 'a')
    .replace(/chch/g, 'ch')
    .replace(/chh/g, 'ch')
    .replace(/(.)\1+/g, '$1')
    .replace(/ah$/, 'a')
}

export function normalizeToken(token: string): string {
  const t = token
    .toLowerCase()
    .normalize('NFD')
    .replace(/़/g, '') // Devanagari nukta: ड़ -> ड, ज़ -> ज
    .normalize('NFC')
    .replace(/ँ/g, 'ं') // chandrabindu -> anusvara: पाँच -> पांच
    .replace(DEVANAGARI_DIGIT, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(TELUGU_DIGIT, (d) => String(d.charCodeAt(0) - 0x0c66))
  return /^[a-z]+$/.test(t) ? foldRoman(t) : t
}

export interface Tokens {
  raw: string[] // as spoken, for quoting evidence back
  norm: string[] // same indices, normalised for matching
}

export function tokenize(text: string): Tokens {
  const prepared = text
    .replace(/[‌‍]/g, '')
    .replace(/(\d),(?=\d)/g, '$1') // 10,000 -> 10000
    .replace(/\b[a-z](?:\.[a-z])+\.?/gi, (m) => m.replace(/\./g, '')) // P.F. -> PF
    .replace(/[,.!?।॥;:]+/g, ` ${BOUNDARY} `)
    .replace(/[^\p{L}\p{M}\p{N}|\s]/gu, ' ')
  const raw = prepared.split(/\s+/).filter(Boolean)
  return { raw, norm: raw.map(normalizeToken) }
}

// A trailing * marks a prefix keyword, for Telugu's attached suffixes
// (తెలంగాణలో = "in Telangana"). Opt-in only: అన్న (brother) must not match అన్నం (rice).
export function tokenMatches(token: string, keyword: string): boolean {
  return keyword.endsWith('*') ? token.startsWith(keyword.slice(0, -1)) : token === keyword
}

export type Phrase = string[]

export function phrases(list: string[]): Phrase[] {
  return list
    .map((p) => p.split(/\s+/).map(normalizeToken))
    .sort((a, b) => b.length - a.length) // longest first
}

export interface Hit {
  start: number
  end: number // inclusive
}

// Non-overlapping occurrences of any phrase, longest match winning at each position.
export function findAll(norm: string[], list: Phrase[]): Hit[] {
  const hits: Hit[] = []
  for (let i = 0; i < norm.length; i++) {
    const p = list.find((ph) => ph.every((w, j) => i + j < norm.length && tokenMatches(norm[i + j], w)))
    if (p) {
      hits.push({ start: i, end: i + p.length - 1 })
      i += p.length - 1
    }
  }
  return hits
}

export function hasAny(norm: string[], from: number, to: number, list: Phrase[]): boolean {
  const slice = norm.slice(Math.max(0, from), Math.min(norm.length, to + 1))
  return findAll(slice, list).length > 0
}

export function quote(raw: string[], from: number, to: number): string {
  return raw
    .slice(Math.max(0, from), to + 1)
    .filter((t) => t !== BOUNDARY)
    .join(' ')
}
