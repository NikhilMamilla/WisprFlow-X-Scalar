import { useState } from 'react'
import type { Profile } from '../core'
import { FIXED_SAMPLE_SENTENCE } from '../voice/languages'
import ProfileChips from './ProfileChips'
import './StoryScreen.css'

export default function StoryScreen({
  profile,
  listening,
  interim,
  onMicTap,
  onSubmitText,
}: {
  profile: Profile
  listening: boolean
  interim: string
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
      <p className="prompt">Apni kahani bataiye — aap kya kaam karte hain, ghar mein kitne log hain.</p>

      <button
        type="button"
        className={listening ? 'story-mic listening' : 'story-mic'}
        onClick={onMicTap}
      >
        {listening ? 'Rukiye' : 'Boliye'}
      </button>
      {listening && <div className="pulse" aria-hidden="true" />}

      <p className="transcript">{interim || (listening ? 'Sun raha hoon...' : ' ')}</p>

      <ProfileChips profile={profile} />

      <div className="fallback">
        <textarea
          className="type-box"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Yahan type kariye..."
          rows={3}
        />
        <div className="fallback-buttons">
          <button type="button" onClick={submitTyped}>
            Submit
          </button>
          <button type="button" onClick={() => onSubmitText(FIXED_SAMPLE_SENTENCE)}>
            Sample sunayein
          </button>
        </div>
      </div>
    </div>
  )
}
