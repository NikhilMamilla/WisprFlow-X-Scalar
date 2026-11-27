// Thin wrapper over the (non-standard, vendor-prefixed) Web Speech recognition
// API. Typed locally instead of relying on ambient lib.dom types, which don't
// reliably cover webkitSpeechRecognition across TS/lib versions.

export type RecognitionErrorCode =
  | 'not-allowed'
  | 'no-speech'
  | 'network'
  | 'language-not-supported'
  | 'aborted'
  | 'audio-capture'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'unknown'

export interface RecognitionResult {
  transcript: string
  isFinal: boolean
  confidence: number
}

export interface RecognitionHandlers {
  onResult: (result: RecognitionResult) => void
  onError: (code: RecognitionErrorCode) => void
  onStart?: () => void
  onEnd?: () => void
}

interface MinimalSpeechRecognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isRecognitionSupported(): boolean {
  return getRecognitionCtor() !== null
}

export function createRecognizer(
  lang: string,
  handlers: RecognitionHandlers,
): MinimalSpeechRecognition | null {
  const Ctor = getRecognitionCtor()
  if (!Ctor) return null

  const recognizer = new Ctor()
  recognizer.lang = lang
  recognizer.interimResults = true
  recognizer.continuous = false

  recognizer.onresult = (event: any) => {
    const results = event.results
    const last = results[results.length - 1]
    const alt = last[0]
    handlers.onResult({
      transcript: String(alt.transcript),
      isFinal: Boolean(last.isFinal),
      confidence: Number(alt.confidence) || 0,
    })
  }
  recognizer.onerror = (event: any) => {
    const code = (event?.error as RecognitionErrorCode) ?? 'unknown'
    handlers.onError(code)
  }
  recognizer.onstart = handlers.onStart ?? null
  recognizer.onend = handlers.onEnd ?? null

  return recognizer
}
