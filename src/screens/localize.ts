// Picks the right-language text out of a Scheme's bilingual fields, and labels
// profile values (occupation, urban_or_rural) that are otherwise raw code identifiers.
import type { Occupation, Scheme } from '../core'
import { t, type StringLang } from '../i18n/strings'

export function schemeName(scheme: Scheme, lang: StringLang): string {
  return lang === 'en' ? scheme.name_en : scheme.name_hi // te falls back to hi, same as name_hi/name_en wording asks
}

export function schemeBenefit(scheme: Scheme, lang: StringLang): string {
  return lang === 'en' ? scheme.benefit_en_roman : scheme.benefit_hi // te falls back to hi
}

export function documentNames(scheme: Scheme, lang: StringLang): string[] {
  return scheme.documents.map((d) => (lang === 'en' ? d.en_roman : d.hi)) // te falls back to hi
}

export function occupationLabel(occupation: Occupation, lang: StringLang): string {
  return t(lang, `label_occupation_${occupation}`)
}

export function urbanRuralLabel(value: 'urban' | 'rural', lang: StringLang): string {
  return t(lang, value === 'urban' ? 'label_urban' : 'label_rural')
}
