// Picks the right-language text out of a Scheme's per-language fields, and labels
// profile values (occupation, urban_or_rural) that are otherwise raw code identifiers.
// The fallback rule itself lives in src/core/localization.ts.
import { textIn } from '../core/localization'
import type { Occupation, Scheme } from '../core'
import { t, type StringLang } from '../i18n/strings'

export function schemeName(scheme: Scheme, lang: StringLang): string {
  return textIn({ en: scheme.name_en, hi: scheme.name_hi, te: scheme.name_te }, lang)
}

// Hinglish (lang 'en') uses the Roman-script benefit, as before.
export function schemeBenefit(scheme: Scheme, lang: StringLang): string {
  return textIn(
    { en: scheme.benefit_en, hi: scheme.benefit_hi, en_roman: scheme.benefit_en_roman, te: scheme.benefit_te },
    lang,
    { roman: lang === 'en' },
  )
}

export function documentNames(scheme: Scheme, lang: StringLang): string[] {
  return scheme.documents.map((d) =>
    textIn({ en: d.en, hi: d.hi, en_roman: d.en_roman, te: d.te }, lang, { roman: lang === 'en' }),
  )
}

export function occupationLabel(occupation: Occupation, lang: StringLang): string {
  return t(lang, `label_occupation_${occupation}`)
}

export function urbanRuralLabel(value: 'urban' | 'rural', lang: StringLang): string {
  return t(lang, value === 'urban' ? 'label_urban' : 'label_rural')
}
