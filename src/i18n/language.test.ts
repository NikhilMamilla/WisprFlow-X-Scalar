import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractProfile } from '../core/extractor'
import { initialState, step } from '../core/dialog'
import { SCHEMES } from '../core/schemes'
import { documentNames, schemeBenefit, schemeName } from '../screens/localize'
import { recognitionLocaleFor, SAMPLE_STORY } from '../voice/languages'
import { STRINGS, stringLangFor, t, type StringLang } from './strings'

const DEVANAGARI = /[\u0900-\u097F]/
const TELUGU = /[\u0C00-\u0C7F]/
const LANGS: StringLang[] = ['hi', 'en', 'te']
const KEYS = Object.keys(STRINGS)

describe('translation coverage', () => {
  it.each(KEYS)('%s has text in all three languages', (key) => {
    for (const lang of LANGS) {
      expect(STRINGS[key][lang], `${key} is missing ${lang}`).toBeTruthy()
    }
  })

  it('every Telugu string is really Telugu (no silent Hindi fallback)', () => {
    for (const key of KEYS) {
      const te = STRINGS[key].te!
      if (DEVANAGARI.test(te)) throw new Error(`${key}.te is Devanagari, not Telugu`)
      expect(t('te', key), `${key} resolves to Hindi in Telugu`).toBe(te)
    }
  })

  it('Hindi and Hinglish strings are not swapped', () => {
    for (const key of KEYS) {
      expect(TELUGU.test(STRINGS[key].hi)).toBe(false)
      expect(TELUGU.test(STRINGS[key].en)).toBe(false)
    }
  })

  it('maps a picked language to its UI language', () => {
    expect(stringLangFor('hi-IN')).toBe('hi')
    expect(stringLangFor('te-IN')).toBe('te')
    expect(stringLangFor('en-IN')).toBe('en')
  })
})

describe('scheme content in every language', () => {
  it.each(SCHEMES.map((s) => s.id))('%s has Telugu name, benefit and documents', (id) => {
    const scheme = SCHEMES.find((s) => s.id === id)!
    expect(scheme.name_te).toBeTruthy()
    expect(scheme.benefit_te).toBeTruthy()
    for (const doc of scheme.documents) expect(doc.te).toBeTruthy()
  })

  it.each(SCHEMES.map((s) => s.id))('%s reads in Telugu, not Hindi or Roman', (id) => {
    const scheme = SCHEMES.find((s) => s.id === id)!
    for (const text of [schemeName(scheme, 'te'), schemeBenefit(scheme, 'te'), ...documentNames(scheme, 'te')]) {
      expect(DEVANAGARI.test(text)).toBe(false)
      expect(TELUGU.test(text) || /[A-Za-z0-9₹]/.test(text)).toBe(true)
    }
    expect(schemeName(scheme, 'hi')).toBe(scheme.name_hi)
    expect(schemeName(scheme, 'en')).toBe(scheme.name_en)
  })
})

describe('sample mode follows the selected language', () => {
  it.each(LANGS)('%s has its own sample story', (lang) => {
    const sample = SAMPLE_STORY[lang]
    expect(sample).toBeTruthy()
    if (lang === 'te') expect(DEVANAGARI.test(sample)).toBe(false)
    if (lang === 'hi') expect(DEVANAGARI.test(sample)).toBe(true)
    if (lang === 'en') expect(DEVANAGARI.test(sample)).toBe(false)
  })

  it.each(LANGS)('%s sample maps to the same fields, with the bank account not in the user’s name', (lang) => {
    const profile = extractProfile(SAMPLE_STORY[lang])
    expect(profile.occupation).toBe('street_vendor')
    expect(profile.dependants).toBe(3)
    expect(profile.has_bank_account).toBe(false)
  })
})

describe('speech locales', () => {
  it('uses the language’s own recognition locale, and hi-IN for Hinglish speech', () => {
    expect(recognitionLocaleFor('hi-IN')).toBe('hi-IN')
    expect(recognitionLocaleFor('te-IN')).toBe('te-IN')
    expect(recognitionLocaleFor('en-IN')).toBe('hi-IN')
  })
})

describe('changing language keeps the profile', () => {
  it('picking a language only sets the language and moves to the story screen', () => {
    const start = { ...initialState(), lang: 'te-IN' as const }
    const result = step(start, { type: 'languagePicked', lang: 'hi-IN' })
    expect(result.state.lang).toBe('hi-IN')
    expect(result.state.screen).toBe('story')
    expect(result.state.profile).toEqual(start.profile)
  })
})

// Guards against new user-facing text being hardcoded in a screen again.
describe('screens have no hardcoded Hindi', () => {
  // HelloBubbles is the intentional trilingual decoration on the language picker (aria-hidden).
  const files = ['src/screens', 'src/components'].flatMap((dir) =>
    readdirSync(resolve(process.cwd(), dir))
      .filter((f) => f.endsWith('.tsx') && f !== 'HelloBubbles.tsx')
      .map((f) => [dir, f] as const),
  )
  it.each(files)('%s/%s', (dir, file) => {
    const source = readFileSync(resolve(process.cwd(), dir, file), 'utf8')
    expect(DEVANAGARI.test(source), `${file} contains hardcoded Devanagari`).toBe(false)
    expect(TELUGU.test(source), `${file} contains hardcoded Telugu`).toBe(false)
  })
})
