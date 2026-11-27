// Loads data/schemes.json, the single source of truth for scheme rules.
import data from '../../data/schemes.json'
import { BOOLEAN_FIELDS, OCCUPATIONS, type BooleanField, type Occupation } from './types'

export interface SchemeRules {
  age_min?: number | null
  age_max?: number | null
  income_max_monthly?: number | null
  occupation_in?: Occupation[]
  urban_only?: boolean
  // The scheme is 'not_needed' unless every field here matches. Checked before the other rules.
  only_if?: Partial<Record<BooleanField, boolean>>
  not: BooleanField[] // must be false
  requires: BooleanField[] // must be true
}

export interface DocumentName {
  en: string
  hi: string
  en_roman: string // Hinglish, Roman script
}

export interface Scheme {
  id: string
  name_en: string
  name_hi: string
  benefit_en: string
  benefit_hi: string
  benefit_en_roman: string // Hinglish, Roman script
  rules: SchemeRules
  documents: DocumentName[]
  source_url: string
  rules_verified: boolean
  verify_note: string
}

// The file is hand-edited: fail loudly on a field name the matcher would silently ignore.
export function validateSchemes(schemes: Scheme[]): Scheme[] {
  for (const s of schemes) {
    for (const f of [...s.rules.not, ...s.rules.requires]) {
      if (!(BOOLEAN_FIELDS as readonly string[]).includes(f)) throw new Error(`schemes.json ${s.id}: unknown field "${f}"`)
    }
    for (const o of s.rules.occupation_in ?? []) {
      if (!(OCCUPATIONS as readonly string[]).includes(o)) throw new Error(`schemes.json ${s.id}: unknown occupation "${o}"`)
    }
    for (const f of Object.keys(s.rules.only_if ?? {})) {
      if (!(BOOLEAN_FIELDS as readonly string[]).includes(f)) throw new Error(`schemes.json ${s.id}: unknown field "${f}" in only_if`)
    }
  }
  return schemes
}

export const SCHEMES: Scheme[] = validateSchemes(data.schemes as Scheme[])
