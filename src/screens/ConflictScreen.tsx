import type { StringLang } from '../i18n/strings'
import './ConflictScreen.css'

export default function ConflictScreen({
  text,
  values,
  onPick,
}: {
  text: string
  values: (string | number | boolean)[]
  lang: StringLang
  onPick: (value: string | number | boolean) => void
}) {
  return (
    <div className="question-screen conflict-screen">
      <span className="eyebrow">Which one?</span>
      <p className="question-text">{text}</p>
      <div className="conflict-buttons">
        {values.map((v) => (
          <button key={String(v)} type="button" className="btn btn-primary" onClick={() => onPick(v)}>
            {String(v)}
          </button>
        ))}
      </div>
    </div>
  )
}
