// A listening session: one accumulating transcript across however many recognition
// runs it takes. Android Chrome stops recognition after short pauses, so the session
// auto-restarts it while still wanted, instead of losing the rest of the story.
import { createRecognizer, isRecognitionSupported, type RecognitionErrorCode } from './recognition'

export interface SessionUpdate {
  transcript: string // every final result so far, joined
  interim: string // the current, not-yet-final result
  listening: boolean
}

export interface StopResult {
  transcript: string
  confidence: number // of the last final result seen; 0 if none arrived
}

export interface ListeningSession {
  start: () => void
  stop: () => StopResult // stops and returns the final accumulated transcript
  abort: () => void
}

export function createSession(
  lang: string,
  onUpdate: (update: SessionUpdate) => void,
  onError?: (code: RecognitionErrorCode) => void,
): ListeningSession {
  let transcript = ''
  let interim = ''
  let confidence = 0
  let wanted = false
  let current: ReturnType<typeof createRecognizer> = null

  function emit(listening: boolean) {
    onUpdate({ transcript, interim, listening })
  }

  function attach() {
    current = createRecognizer(lang, {
      onResult: (result) => {
        if (result.isFinal) {
          transcript = transcript ? `${transcript} ${result.transcript}`.trim() : result.transcript.trim()
          confidence = result.confidence
          interim = ''
        } else {
          interim = result.transcript
        }
        emit(true)
      },
      onError: (code) => {
        if (code !== 'no-speech' && code !== 'aborted') wanted = false
        onError?.(code)
      },
      onEnd: () => {
        if (wanted) attach()
        else emit(false)
      },
    })
    current?.start()
  }

  return {
    start() {
      if (wanted) return
      if (!isRecognitionSupported()) {
        onError?.('unknown')
        return
      }
      wanted = true
      transcript = ''
      interim = ''
      confidence = 0
      attach()
      emit(true)
    },
    stop() {
      wanted = false
      current?.stop()
      return { transcript, confidence }
    },
    abort() {
      wanted = false
      current?.abort()
    },
  }
}
