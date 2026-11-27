// Picking text out of a localized record. One place decides the fallback rule:
// Telugu falls back to Hindi, never to English or Roman script, and a missing
// Hindi string is a catalogue error (see catalogue.ts) rather than something
// the UI silently papers over.
import type { LocalizedText } from './scheme'

export type TextLang = 'en' | 'hi' | 'te'

export interface TextOptions {
  // Hinglish uses the Roman-script field when the record has one.
  roman?: boolean
}

export function textIn(text: LocalizedText, lang: TextLang, options: TextOptions = {}): string {
  if (lang === 'hi') return text.hi
  if (lang === 'te') return text.te ?? text.hi
  return options.roman ? (text.en_roman ?? text.en) : text.en
}

// True when this record still needs a Telugu translation (used by the
// catalogue validator's warnings).
export function needsTelugu(text: LocalizedText): boolean {
  return !text.te || text.te.trim() === ''
}
