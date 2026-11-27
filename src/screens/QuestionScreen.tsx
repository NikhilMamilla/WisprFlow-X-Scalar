import { useState } from 'react'
import './QuestionScreen.css'

const OCCUPATION_QUICK = [
  { label: 'Thela / Rehdi', text: 'thela' },
  { label: 'Construction', text: 'mazdoor' },
  { label: 'Delivery', text: 'delivery' },
  { label: 'Other', text: 'auto' },
]

export default function QuestionScreen({
  text,
  mode,
  listening,
  interim,
  onYesNo,
  onNumber,
  onText,
}: {
  text: string
  mode: 'yesno' | 'number' | 'open'
  listening: boolean
  interim: string
  onYesNo: (value: 'yes' | 'no') => void
  onNumber: (value: number) => void
  onText: (text: string) => void
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
    <div className="question-screen">
      <p className="question-text">{text}</p>
      {listening && (
        <p className="listening-indicator">{interim || 'Sun raha hoon...'}</p>
      )}

      {mode === 'yesno' && (
        <div className="yesno-buttons">
          <button type="button" className="yes-button" onClick={() => onYesNo('yes')}>
            Haan
          </button>
          <button type="button" className="no-button" onClick={() => onYesNo('no')}>
            Nahi
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
          <button type="button" onClick={submitNumber}>
            Submit
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
              placeholder="Yahan type kariye..."
            />
            <button type="button" onClick={submitText}>
              Submit
            </button>
          </div>
          <div className="occupation-quick">
            {OCCUPATION_QUICK.map((o) => (
              <button key={o.label} type="button" onClick={() => onText(o.text)}>
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
