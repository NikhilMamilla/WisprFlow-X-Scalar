import { t, type StringLang } from '../i18n/strings'
import './ConflictScreen.css'

export default function ConflictScreen({
  text,
  values,
  lang,
  onPick,
}: {
  text: string
  values: (string | number | boolean)[]
  lang: StringLang
  onPick: (value: string | number | boolean) => void
}) {
  return (
    <div className="question-screen conflict-screen">
      <span className="eyebrow">{t(lang, 'eyebrow_conflict')}</span>
      <p className="question-text" tabIndex={-1} data-screen-title>
        {text}
      </p>
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
