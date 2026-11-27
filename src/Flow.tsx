import { useRef, useState } from 'react'
import { initialState, step, type DialogEvent, type DialogState, type Effect, type ListenMode } from './core'
import { parseSpokenNumber, parseYesNo } from './core/answers'
import { stringLangFor, t, type StringLang } from './i18n/strings'
import { createRecognizer, type RecognitionErrorCode } from './voice/recognition'
import { createSession, type ListeningSession } from './voice/session'
import { getVoicesForLanguage, isSynthesisSupported, speak } from './voice/synthesis'
import AboutScreen from './screens/AboutScreen'
import LanguageScreen from './screens/LanguageScreen'
import QuestionScreen from './screens/QuestionScreen'
import ResultsScreen from './screens/ResultsScreen'
import SheetScreen from './screens/SheetScreen'
import StoryScreen from './screens/StoryScreen'
import './Flow.css'

export default function Flow() {
  const [state, setState] = useState<DialogState>(() => initialState())
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [showAbout, setShowAbout] = useState(false)
  const storySession = useRef<ListeningSession | null>(null)
  const answerRecognizer = useRef<ReturnType<typeof createRecognizer>>(null)

  const lang = state.lang ?? 'en-IN'
  const stringLang = stringLangFor(lang)
  const noVoice = state.lang !== null && isSynthesisSupported() && getVoicesForLanguage(lang).length === 0

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
      const text = t(stringLangFor(nextLang), speakEffect.key, speakEffect.params)
      speak(text, nextLang, startListening)
    } else {
      startListening()
    }
  }

  function startAnswerListening(mode: ListenMode, listenLang: string) {
    setInterim('')
    setListening(true)
    const recognizer = createRecognizer(listenLang, {
      onResult: (result) => {
        if (!result.isFinal) {
          setInterim(result.transcript)
          return
        }
        setListening(false)
        setInterim('')
        handleSpokenAnswer(mode, result.transcript)
      },
      onError: (_code: RecognitionErrorCode) => setListening(false),
      onEnd: () => setListening(false),
    })
    answerRecognizer.current = recognizer
    recognizer?.start()
  }

  function handleSpokenAnswer(mode: ListenMode, transcript: string) {
    if (mode === 'yesno') {
      const value = parseYesNo(transcript)
      if (value) dispatch({ type: 'yesNoAnswer', value })
    } else if (mode === 'number') {
      const value = parseSpokenNumber(transcript)
      if (value !== null) dispatch({ type: 'numberAnswer', value })
    } else if (mode === 'open') {
      dispatch({ type: 'textAnswer', text: transcript })
    }
  }

  function toggleStoryMic() {
    if (listening) {
      const transcript = storySession.current?.stop() ?? ''
      setListening(false)
      setInterim('')
      dispatch({ type: 'storyDone', transcript })
      return
    }
    setInterim('')
    const session = createSession(
      lang,
      (update) => setInterim(update.transcript ? `${update.transcript} ${update.interim}`.trim() : update.interim),
      () => setListening(false),
    )
    storySession.current = session
    session.start()
    setListening(true)
  }

  function submitStoryText(text: string) {
    dispatch({ type: 'storyDone', transcript: text })
  }

  if (showAbout) return <AboutScreen lang={stringLang} onBack={() => setShowAbout(false)} />

  return (
    <div className="flow">
      {noVoice && <p className="no-voice-banner">{t(stringLang, 'no_voice_notice')}</p>}

      {state.screen === 'language' && (
        <LanguageScreen onPick={(pickedLang) => dispatch({ type: 'languagePicked', lang: pickedLang })} />
      )}

      {state.screen === 'story' && (
        <StoryScreen
          profile={state.profile}
          listening={listening}
          interim={interim}
          onMicTap={toggleStoryMic}
          onSubmitText={submitStoryText}
        />
      )}

      {(state.screen === 'readback' || state.screen === 'followup') && (
        <QuestionScreen
          text={questionText(state, stringLang)}
          mode={questionMode(state)}
          listening={listening}
          interim={interim}
          onYesNo={(value) => dispatch({ type: 'yesNoAnswer', value })}
          onNumber={(value) => dispatch({ type: 'numberAnswer', value })}
          onText={(text) => dispatch({ type: 'textAnswer', text })}
        />
      )}

      {state.screen === 'results' && (
        <ResultsScreen
          results={state.results}
          profile={state.profile}
          lang={stringLang}
          onViewSheet={() => dispatch({ type: 'skip' })}
          onAbout={() => setShowAbout(true)}
        />
      )}

      {state.screen === 'sheet' && (
        <SheetScreen
          results={state.results}
          profile={state.profile}
          lang={stringLang}
          onBack={() => dispatch({ type: 'restart' })}
        />
      )}

      {state.screen !== 'sheet' && (
        <button type="button" className="about-link" onClick={() => setShowAbout(true)}>
          About
        </button>
      )}
    </div>
  )
}

function questionMode(state: DialogState): 'yesno' | 'number' | 'open' {
  if (state.screen === 'readback') return 'yesno'
  const followup = state.currentFollowup
  if (!followup) return 'yesno'
  if (followup.field === 'occupation') return 'open'
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
