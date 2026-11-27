import { useEffect, useRef, useState } from 'react'
import {
  initialState,
  step,
  LOW_CONFIDENCE_LIMIT,
  OFF_TOPIC_LIMIT,
  type DialogEvent,
  type DialogState,
  type Effect,
  type ListenMode,
} from './core'
import { parseSpokenNumber, parseYesNo } from './core/answers'
import { stringLangFor, t, type StringLang } from './i18n/strings'
import { createRecognizer, isRecognitionSupported, type RecognitionErrorCode } from './voice/recognition'
import { createSession, type ListeningSession } from './voice/session'
import { recognitionLocaleFor } from './voice/languages'
import { cancel, chooseSpeech, getAllVoices, isSynthesisSupported, onVoicesChanged, speak } from './voice/synthesis'
import Footer from './components/Footer'
import Header from './components/Header'
import WhatIUnderstood from './components/WhatIUnderstood'
import AboutScreen from './screens/AboutScreen'
import ConflictScreen from './screens/ConflictScreen'
import LanguageScreen from './screens/LanguageScreen'
import QuestionScreen from './screens/QuestionScreen'
import ResultsScreen from './screens/ResultsScreen'
import SheetScreen from './screens/SheetScreen'
import StoryScreen from './screens/StoryScreen'
import './Flow.css'

const NIGHT_SCREENS = new Set(['language', 'story'])
const SILENCE_NUDGE_MS = 6000
const SILENCE_STOP_MS = 12000
const CONFIDENCE_FLOOR = 0.6

export default function Flow() {
  const [state, setState] = useState<DialogState>(() => initialState())
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const [voicesReady, setVoicesReady] = useState(false)
  const [micMessage, setMicMessage] = useState<string | null>(null)

  const storySession = useRef<ListeningSession | null>(null)
  const answerRecognizer = useRef<ReturnType<typeof createRecognizer>>(null)
  const silenceTimer = useRef<number | undefined>(undefined)
  const hardStopTimer = useRef<number | undefined>(undefined)

  const lang = state.lang ?? 'en-IN'
  const stringLang = stringLangFor(lang)
  const noVoice =
    voicesReady && state.lang !== null && isSynthesisSupported() && chooseSpeech(lang, getAllVoices()).kind === 'text_only'

  // Voices can finish loading after first paint; re-check a couple of times before trusting "none".
  useEffect(() => {
    if (!isSynthesisSupported()) {
      setVoicesReady(true)
      return
    }
    const check = () => {
      if (getAllVoices().length > 0) setVoicesReady(true)
    }
    check()
    const unsubscribe = onVoicesChanged(check)
    const t1 = window.setTimeout(check, 500)
    const t2 = window.setTimeout(() => {
      check()
      setVoicesReady(true) // give up waiting either way
    }, 1500)
    return () => {
      unsubscribe()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [])

  function clearSilenceTimers() {
    window.clearTimeout(silenceTimer.current)
    window.clearTimeout(hardStopTimer.current)
  }

  function startSilenceTimers(speakLang: string) {
    clearSilenceTimers()
    silenceTimer.current = window.setTimeout(() => speak(t(stringLangFor(speakLang as never), 'silence_nudge'), speakLang), SILENCE_NUDGE_MS)
    hardStopTimer.current = window.setTimeout(forceStopListening, SILENCE_STOP_MS)
  }

  function bumpSilenceNudge(speakLang: string) {
    window.clearTimeout(silenceTimer.current)
    silenceTimer.current = window.setTimeout(() => speak(t(stringLangFor(speakLang as never), 'silence_nudge'), speakLang), SILENCE_NUDGE_MS)
  }

  function forceStopListening() {
    clearSilenceTimers()
    storySession.current?.abort()
    answerRecognizer.current?.abort()
    setListening(false)
  }

  function dispatch(event: DialogEvent) {
    const result = step(state, event)
    setState(result.state)
    runEffects(result.effects, result.state)
  }

  function runEffects(effects: Effect[], next: DialogState) {
    const speakEffect = effects.find((e): e is Effect & { type: 'speak' } => e.type === 'speak')
    const listenEffect = effects.find((e): e is Effect & { type: 'listen' } => e.type === 'listen')
    const nextLang = next.lang ?? 'en-IN'
    const startListening = () => {
      if (listenEffect && listenEffect.mode !== 'story') startAnswerListening(listenEffect.mode, nextLang)
    }
    if (speakEffect) {
      const decision = chooseSpeech(nextLang, getAllVoices())
      if (decision.kind === 'text_only') {
        startListening()
        return
      }
      const speakStrLang = decision.kind === 'fallback_en' ? 'en' : stringLangFor(nextLang)
      const text = t(speakStrLang, speakEffect.key, speakEffect.params)
      speak(text, decision.speakLang, startListening)
    } else {
      startListening()
    }
  }

  function startAnswerListening(mode: ListenMode, listenLang: string) {
    cancel() // interruption: a new listen cycle always wins over any speech still playing
    const uiLang = stringLangFor(listenLang as never)
    if (!isRecognitionSupported()) {
      setMicMessage(t(uiLang, 'recognition_unsupported_message'))
      return
    }
    setMicMessage(null)
    setInterim('')
    setListening(true)
    startSilenceTimers(listenLang)
    const recognizer = createRecognizer(recognitionLocaleFor(listenLang as never), {
      onResult: (result) => {
        cancel()
        bumpSilenceNudge(listenLang)
        if (!result.isFinal) {
          setInterim(result.transcript)
          return
        }
        clearSilenceTimers()
        setListening(false)
        setInterim('')
        handleSpokenAnswer(mode, result.transcript, result.confidence)
      },
      onError: (code: RecognitionErrorCode) => {
        clearSilenceTimers()
        setListening(false)
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setMicMessage(t(uiLang, 'mic_denied_message'))
        } else if (code === 'language-not-supported' || code === 'audio-capture') {
          // The browser cannot listen in this language: say so, text input still works.
          setMicMessage(t(uiLang, code === 'language-not-supported' ? 'language_unsupported_message' : 'mic_denied_message'))
        }
      },
      onEnd: () => setListening(false),
    })
    answerRecognizer.current = recognizer
    recognizer?.start()
  }

  function handleSpokenAnswer(mode: ListenMode, transcript: string, confidence: number) {
    if (!transcript.trim() || confidence < CONFIDENCE_FLOOR) {
      dispatch({ type: 'recognitionFailed' })
      return
    }
    if (state.screen === 'conflict' && state.conflict) {
      const n = parseSpokenNumber(transcript)
      const match = state.conflict.values.find((v) => v === n || String(v).toLowerCase() === transcript.trim().toLowerCase())
      if (match !== undefined) dispatch({ type: 'conflictResolved', value: match })
      else dispatch({ type: 'offTopicAnswer' })
      return
    }
    if (mode === 'yesno') {
      const value = parseYesNo(transcript)
      if (value) dispatch({ type: 'yesNoAnswer', value })
      else dispatch({ type: 'offTopicAnswer' })
    } else if (mode === 'number') {
      const value = parseSpokenNumber(transcript)
      if (value !== null) dispatch({ type: 'numberAnswer', value })
      else dispatch({ type: 'offTopicAnswer' })
    } else if (mode === 'open') {
      dispatch({ type: 'textAnswer', text: transcript })
    }
  }

  function toggleStoryMic() {
    if (listening) {
      clearSilenceTimers()
      const result = storySession.current?.stop() ?? { transcript: '', confidence: 0 }
      setListening(false)
      setInterim('')
      if (!result.transcript.trim() || result.confidence < CONFIDENCE_FLOOR) {
        dispatch({ type: 'recognitionFailed' })
      } else {
        dispatch({ type: 'storyDone', transcript: result.transcript })
      }
      return
    }
    cancel() // interruption: tapping the mic always wins over any speech still playing
    if (!isRecognitionSupported()) {
      setMicMessage(t(stringLang, 'recognition_unsupported_message'))
      return
    }
    setMicMessage(null)
    setInterim('')
    const session = createSession(
      recognitionLocaleFor(lang),
      (update) => {
        bumpSilenceNudge(lang)
        setInterim(update.transcript ? `${update.transcript} ${update.interim}`.trim() : update.interim)
      },
      (code) => {
        clearSilenceTimers()
        setListening(false)
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setMicMessage(t(stringLang, 'mic_denied_message'))
        } else if (code === 'language-not-supported' || code === 'audio-capture') {
          setMicMessage(t(stringLang, code === 'language-not-supported' ? 'language_unsupported_message' : 'mic_denied_message'))
        }
      },
    )
    storySession.current = session
    session.start()
    startSilenceTimers(lang)
    setListening(true)
  }

  function submitStoryText(text: string) {
    dispatch({ type: 'storyDone', transcript: text })
  }

  const isNight = !showAbout && NIGHT_SCREENS.has(state.screen)
  const primaryFallback = state.lowConfidenceFailures >= LOW_CONFIDENCE_LIMIT
  const showSkip = state.offTopicFailures >= OFF_TOPIC_LIMIT

  return (
    <div className={isNight ? 'flow theme-night' : 'flow'}>
      <Header />
      {noVoice && <p className="no-voice-banner">{t(stringLang, 'no_voice_notice')}</p>}

      <div key={showAbout ? 'about' : state.screen} className="screen-enter">
        {showAbout && <AboutScreen lang={stringLang} onBack={() => setShowAbout(false)} />}

        {!showAbout && state.screen === 'language' && (
          <LanguageScreen onPick={(pickedLang) => dispatch({ type: 'languagePicked', lang: pickedLang })} />
        )}

        {!showAbout && state.screen === 'story' && (
          <StoryScreen
            profile={state.profile}
            lang={stringLang}
            listening={listening}
            interim={interim}
            primaryFallback={primaryFallback}
            message={micMessage}
            onMicTap={toggleStoryMic}
            onSubmitText={submitStoryText}
          />
        )}

        {!showAbout && (state.screen === 'readback' || state.screen === 'followup') && (
          <>
            <WhatIUnderstood profile={state.profile} lang={stringLang} />
            <QuestionScreen
              text={questionText(state, stringLang)}
              mode={questionMode(state)}
              lang={stringLang}
              quick={state.currentFollowup?.field === 'occupation'}
              listening={listening}
              interim={interim}
              primaryFallback={primaryFallback}
              showSkip={state.screen === 'followup' && showSkip}
              onYesNo={(value) => dispatch({ type: 'yesNoAnswer', value })}
              onNumber={(value) => dispatch({ type: 'numberAnswer', value })}
              onText={(text) => dispatch({ type: 'textAnswer', text })}
              onSkip={() => dispatch({ type: 'skip' })}
            />
          </>
        )}

        {!showAbout && state.screen === 'conflict' && state.conflict && (
          <ConflictScreen
            text={conflictText(state, stringLang)}
            values={state.conflict.values}
            lang={stringLang}
            onPick={(value) => dispatch({ type: 'conflictResolved', value })}
          />
        )}

        {!showAbout && state.screen === 'results' && (
          <>
            <WhatIUnderstood profile={state.profile} lang={stringLang} />
            <ResultsScreen
              results={state.results}
              profile={state.profile}
              lang={stringLang}
              onViewSheet={() => dispatch({ type: 'skip' })}
              onChangeLocation={() => dispatch({ type: 'locationCorrection' })}
            />
          </>
        )}

        {!showAbout && state.screen === 'sheet' && (
          <SheetScreen
            results={state.results}
            profile={state.profile}
            lang={stringLang}
            onBack={() => dispatch({ type: 'restart' })}
          />
        )}
      </div>

      {state.screen !== 'sheet' && (
        <button type="button" className="about-link" onClick={() => setShowAbout((v) => !v)}>
          {t(stringLang, 'app_about_link')}
        </button>
      )}

      <Footer />
    </div>
  )
}

function questionMode(state: DialogState): 'yesno' | 'number' | 'open' {
  if (state.screen === 'readback') return 'yesno'
  const followup = state.currentFollowup
  if (!followup) return 'yesno'
  if (followup.field === 'occupation' || followup.answer === 'text') return 'open'
  return followup.answer === 'number' ? 'number' : 'yesno'
}

function questionText(state: DialogState, lang: StringLang): string {
  if (state.screen === 'readback' && state.pendingReadback) {
    const field = state.pendingReadback
    const key = field === 'age' ? 'readback_age' : state.profile.income_estimated ? 'readback_income_roughly' : 'readback_income'
    return t(lang, key, { value: state.profile[field] as number })
  }
  const followup = state.currentFollowup
  if (!followup) return ''
  const key = followup.field === 'occupation' ? 'ask_occupation_open' : `followup_${followup.field}`
  return t(lang, key)
}

function conflictText(state: DialogState, lang: StringLang): string {
  if (!state.conflict) return ''
  const key = state.conflict.field === 'age' ? 'conflict_age' : 'conflict_generic'
  return t(lang, key, { a: state.conflict.values[0] as never, b: state.conflict.values[1] as never })
}
