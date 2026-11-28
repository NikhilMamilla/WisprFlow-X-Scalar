import { useState } from 'react'
import type { Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import { sampleStoryFor } from '../voice/languages'
import DotField from '../components/DotField'
import Waveform from '../components/Waveform'
import ProfileChips from './ProfileChips'
import './StoryScreen.css'

export default function StoryScreen({
  profile,
  lang,
  listening,
  interim,
  primaryFallback,
  message,
  onMicTap,
  onSubmitText,
}: {
  profile: Profile
  lang: StringLang
  listening: boolean
  interim: string
  primaryFallback?: boolean // after two low-confidence failures: make typed/sample stand out
  message?: string | null // mic denied, recognition unsupported, etc.
  onMicTap: () => void
  onSubmitText: (text: string) => void
}) {
  const [sampleIndex, setSampleIndex] = useState(0)
  const [typed, setTyped] = useState('')

  function submitTyped() {
    if (!typed.trim()) return
    onSubmitText(typed.trim())
    setTyped('')
  }

  return (
    <div className="story-screen">
      <DotField />
      <div className="story-content">
        <span className="eyebrow">{t(lang, 'eyebrow_story')}</span>
        <h1 className="story-title" tabIndex={-1} data-screen-title>
          {t(lang, 'story_prompt')}
        </h1>

        {message && <p className="mic-message">{message}</p>}

        <div className="mic-wrap">
          {listening && (
            <div className="mic-rings" aria-hidden="true">
              <span className="ring" />
              <span className="ring" />
              <span className="ring" />
            </div>
          )}
          <button
            type="button"
            className={listening ? 'story-mic listening' : 'story-mic'}
            aria-pressed={listening}
            aria-label={t(lang, listening ? 'mic_stop' : 'mic_start')}
            onClick={onMicTap}
          >
            {listening ? t(lang, 'mic_stop') : t(lang, 'mic_start')}
          </button>
        </div>

        <Waveform active={listening} bars={7} />

        <p className="transcript" aria-live="polite">
          {interim || (listening ? t(lang, 'mic_listening') : ' ')}
        </p>

        <ProfileChips profile={profile} lang={lang} />

        <div className={primaryFallback ? 'fallback primary-fallback' : 'fallback'}>
          <textarea
            className="type-box"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t(lang, 'type_instead_placeholder')}
            rows={3}
          />
          <div className="fallback-buttons">
            <button type="button" className="btn btn-primary" onClick={submitTyped}>
              {t(lang, 'submit_label')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => {
                onSubmitText(sampleStoryFor(lang, sampleIndex))
                setSampleIndex((n) => n + 1)
              }}>
              {t(lang, 'play_sample_label')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
