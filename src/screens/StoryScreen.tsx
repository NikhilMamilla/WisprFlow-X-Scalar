import { useState } from 'react'
import type { Profile } from '../core'
import type { StringLang } from '../i18n/strings'
import { FIXED_SAMPLE_SENTENCE } from '../voice/languages'
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
        <span className="eyebrow">Your story</span>
        <p className="prompt">Apni kahani bataiye — aap kya kaam karte hain, ghar mein kitne log hain.</p>

        {message && <p className="mic-message">{message}</p>}

        <div className="mic-wrap">
          {listening && (
            <div className="mic-rings" aria-hidden="true">
              <span className="ring" />
              <span className="ring" />
              <span className="ring" />
            </div>
          )}
          <button type="button" className={listening ? 'story-mic listening' : 'story-mic'} onClick={onMicTap}>
            {listening ? 'Rukiye' : 'Boliye'}
          </button>
        </div>

        <Waveform active={listening} bars={7} />

        <p className="transcript">{interim || (listening ? 'Sun raha hoon...' : ' ')}</p>

        <ProfileChips profile={profile} lang={lang} />

        <div className={primaryFallback ? 'fallback primary-fallback' : 'fallback'}>
          <textarea
            className="type-box"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Yahan type kariye..."
            rows={3}
          />
          <div className="fallback-buttons">
            <button type="button" className="btn btn-primary" onClick={submitTyped}>
              Submit
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onSubmitText(FIXED_SAMPLE_SENTENCE)}>
              Sample sunayein
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
