import { useEffect, useRef, useState } from 'react'
import { FIXED_SAMPLE_SENTENCE, LANGUAGES, type VoiceLanguage } from './voice/languages'
import {
  createRecognizer,
  isRecognitionSupported,
  type RecognitionErrorCode,
} from './voice/recognition'
import {
  getVoicesForLanguage,
  isSynthesisSupported,
  onVoicesChanged,
  speak,
  type VoiceOption,
} from './voice/synthesis'
import './DiagnosticPage.css'

type Status = 'idle' | 'listening' | 'error'

function DiagnosticPage() {
  const [lang, setLang] = useState<VoiceLanguage>(LANGUAGES[0])
  const [status, setStatus] = useState<Status>('idle')
  const [errorCode, setErrorCode] = useState<RecognitionErrorCode | null>(null)
  const [liveTranscript, setLiveTranscript] = useState('')
  const [lastConfidence, setLastConfidence] = useState<number | null>(null)
  const [typedText, setTypedText] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)
  const [speakText, setSpeakText] = useState(lang.sample)
  const [voices, setVoices] = useState<VoiceOption[]>([])

  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null)

  useEffect(() => {
    setVoices(getVoicesForLanguage(lang.code))
    const unsubscribe = onVoicesChanged(() => setVoices(getVoicesForLanguage(lang.code)))
    return unsubscribe
  }, [lang])

  function pickLanguage(next: VoiceLanguage) {
    setLang(next)
    setSpeakText(next.sample)
  }

  function startListening() {
    setErrorCode(null)
    setLiveTranscript('')
    const recognizer = createRecognizer(lang.code, {
      onResult: (result) => {
        setLiveTranscript(result.transcript)
        if (result.isFinal) setLastConfidence(result.confidence)
      },
      onError: (code) => {
        setErrorCode(code)
        setStatus('error')
      },
      onStart: () => setStatus('listening'),
      onEnd: () => setStatus((s) => (s === 'error' ? s : 'idle')),
    })
    if (!recognizer) {
      setErrorCode('unknown')
      setStatus('error')
      return
    }
    recognizerRef.current = recognizer
    recognizer.start()
  }

  function stopListening() {
    recognizerRef.current?.stop()
  }

  function handleMicTap() {
    if (status === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }

  function handleSubmitTyped() {
    setSubmitted(typedText)
  }

  function handlePlaySample() {
    setSubmitted(FIXED_SAMPLE_SENTENCE)
  }

  return (
    <div className="diagnostic">
      <section className="panel support-panel">
        <h2>Environment</h2>
        <p>SpeechRecognition supported: {String(isRecognitionSupported())}</p>
        <p>speechSynthesis supported: {String(isSynthesisSupported())}</p>
        <p className="ua">{navigator.userAgent}</p>
      </section>

      <section className="panel">
        <h2>Language</h2>
        <div className="lang-buttons">
          {LANGUAGES.map((option) => (
            <button
              key={option.code}
              type="button"
              className={option.code === lang.code ? 'lang-button active' : 'lang-button'}
              onClick={() => pickLanguage(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Microphone</h2>
        <button
          type="button"
          className={status === 'listening' ? 'mic-button listening' : 'mic-button'}
          onClick={handleMicTap}
        >
          {status === 'listening' ? 'Stop' : 'Tap to speak'}
        </button>
        <p className="status-line">
          Status: {status}
          {status === 'error' && errorCode ? ` (${errorCode})` : ''}
        </p>
        <p>Live transcript: {liveTranscript || '—'}</p>
        <p>
          Last confidence: {lastConfidence !== null ? lastConfidence.toFixed(2) : '—'}
        </p>
      </section>

      <section className="panel">
        <h2>Speak this text</h2>
        <textarea
          className="speak-box"
          value={speakText}
          onChange={(e) => setSpeakText(e.target.value)}
          rows={3}
        />
        <div className="button-row">
          <button type="button" onClick={() => speak(speakText, lang.code)}>
            Speak
          </button>
          <button type="button" onClick={() => setSpeakText(lang.sample)}>
            Sample sentence ({lang.label})
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Voices for {lang.label}</h2>
        {voices.length === 0 ? (
          <p>No voice for this language.</p>
        ) : (
          <ul className="voice-list">
            {voices.map((v) => (
              <li key={`${v.name}-${v.lang}`}>
                {v.name} — {v.lang} — {v.localService ? 'local' : 'remote'}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Typed transcript (fallback)</h2>
        <textarea
          className="speak-box"
          value={typedText}
          onChange={(e) => setTypedText(e.target.value)}
          rows={3}
          placeholder="Type what you would have said"
        />
        <div className="button-row">
          <button type="button" onClick={handleSubmitTyped}>
            Submit
          </button>
          <button type="button" onClick={handlePlaySample}>
            Play sample
          </button>
        </div>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </section>
    </div>
  )
}

export default DiagnosticPage
