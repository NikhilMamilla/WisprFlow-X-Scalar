export interface VoiceOption {
  name: string
  lang: string
  localService: boolean
}

export function isSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// Matches voices whose lang starts with the language code's 2-letter prefix
// (e.g. "hi-IN" matches "hi-IN", "hi_IN", "hi").
export function getVoicesForLanguage(langCode: string): VoiceOption[] {
  if (!isSynthesisSupported()) return []
  const prefix = langCode.split('-')[0].toLowerCase()
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(prefix))
    .map((v) => ({ name: v.name, lang: v.lang, localService: v.localService }))
}

// Voice lists load asynchronously on first page load in some browsers.
export function onVoicesChanged(callback: () => void): () => void {
  if (!isSynthesisSupported()) return () => {}
  window.speechSynthesis.addEventListener('voiceschanged', callback)
  return () => window.speechSynthesis.removeEventListener('voiceschanged', callback)
}

export function speak(text: string, lang: string, onEnd?: () => void): void {
  if (!isSynthesisSupported()) {
    onEnd?.()
    return
  }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export function cancel(): void {
  if (!isSynthesisSupported()) return
  window.speechSynthesis.cancel()
}

export function getAllVoices(): VoiceOption[] {
  if (!isSynthesisSupported()) return []
  return window.speechSynthesis.getVoices().map((v) => ({ name: v.name, lang: v.lang, localService: v.localService }))
}

function hasVoiceFor(prefix: string, voices: VoiceOption[]): boolean {
  return voices.some((v) => v.lang.toLowerCase().startsWith(prefix))
}

export type SpeechDecision =
  | { kind: 'voice'; speakLang: string } // speak the chosen language's own string, with its own voice
  | { kind: 'fallback_en'; speakLang: 'en-IN' } // Hindi only: no hi voice, but an en-IN voice exists
  | { kind: 'text_only' } // no usable voice: show text, don't call speechSynthesis

// Pure: decides which voice/language to speak with, given what's installed.
// Telugu never borrows another language's voice; Hindi may fall back to en-IN.
export function chooseSpeech(lang: string, voices: VoiceOption[]): SpeechDecision {
  const prefix = lang.split('-')[0].toLowerCase()
  if (hasVoiceFor(prefix, voices)) return { kind: 'voice', speakLang: lang }
  if (lang === 'hi-IN' && hasVoiceFor('en', voices)) return { kind: 'fallback_en', speakLang: 'en-IN' }
  return { kind: 'text_only' }
}
