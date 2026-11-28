import { useState } from 'react'
import { t, type StringLang } from '../i18n/strings'
import './QuestionScreen.css'

// `text` is what the extractor receives, so it stays in the spellings it understands;
// only the visible label is translated.
const OCCUPATION_QUICK = [
  { labelKey: 'quick_vendor', text: 'thela' },
  { labelKey: 'quick_construction', text: 'mazdoor' },
  { labelKey: 'quick_delivery', text: 'delivery' },
  { labelKey: 'quick_other', text: 'auto' },
]

export default function QuestionScreen({
  text,
  mode,
  lang,
  quick,
  listening,
  interim,
  primaryFallback,
  showSkip,
  onYesNo,
  onNumber,
  onText,
  onSkip,
}: {
  text: string
  mode: 'yesno' | 'number' | 'open'
  lang: StringLang
  quick?: boolean // occupation shortcuts only: a state question must not show "Thela / Rehdi"
  listening: boolean
  interim: string
  primaryFallback?: boolean // after two low-confidence failures: make manual controls stand out
  showSkip?: boolean // after an off-topic answer: offer a way out
  onYesNo: (value: 'yes' | 'no') => void
  onNumber: (value: number) => void
  onText: (text: string) => void
  onSkip: () => void
}) {
  const [numberInput, setNumberInput] = useState('')
  const [textInput, setTextInput] = useState('')

  function submitNumber() {
    const n = Number(numberInput)
    if (numberInput.trim() !== '' && !Number.isNaN(n)) onNumber(n)
    setNumberInput('')
  }

  function submitText() {
    if (!textInput.trim()) return
    onText(textInput.trim())
    setTextInput('')
  }

  return (
    <div className={primaryFallback ? 'question-screen primary-fallback' : 'question-screen'}>
      <span className="eyebrow">{t(lang, 'eyebrow_question')}</span>
      <div aria-live="polite" aria-atomic="true">
        <p className="question-text" tabIndex={-1} data-screen-title>
          {text}
        </p>
      </div>
      {listening && <p className="listening-indicator">{interim || t(lang, 'mic_listening')}</p>}

      {mode === 'yesno' && (
        <div className="yesno-buttons">
          <button type="button" className="btn btn-primary yes-button" onClick={() => onYesNo('yes')}>
            {t(lang, 'label_yes')}
          </button>
          <button type="button" className="btn btn-secondary no-button" onClick={() => onYesNo('no')}>
            {t(lang, 'label_no')}
          </button>
        </div>
      )}

      {mode === 'number' && (
        <div className="number-input-row">
          <input
            type="number"
            inputMode="numeric"
            className="number-input"
            value={numberInput}
            onChange={(e) => setNumberInput(e.target.value)}
            placeholder="0"
          />
          <button type="button" className="btn btn-primary" onClick={submitNumber}>
            {t(lang, 'submit_label')}
          </button>
        </div>
      )}

      {mode === 'open' && (
        <>
          <div className="open-input-row">
            <input
              type="text"
              className="open-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t(lang, 'type_instead_placeholder')}
            />
            <button type="button" className="btn btn-primary" onClick={submitText}>
              {t(lang, 'submit_label')}
            </button>
          </div>
          {quick && (
            <div className="occupation-quick">
              {OCCUPATION_QUICK.map((o) => (
                <button key={o.labelKey} type="button" className="btn btn-secondary" onClick={() => onText(o.text)}>
                  {t(lang, o.labelKey)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {showSkip && (
        <button type="button" className="btn btn-secondary skip-button" onClick={onSkip}>
          {t(lang, 'skip_label')}
        </button>
      )}
    </div>
  )
}
