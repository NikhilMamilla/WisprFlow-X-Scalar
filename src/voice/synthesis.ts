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
