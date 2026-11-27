import { LANGUAGES } from '../voice/languages'
import type { LanguageCode } from '../core'
import './LanguageScreen.css'

export default function LanguageScreen({ onPick }: { onPick: (lang: LanguageCode) => void }) {
  return (
    <div className="language-screen">
      <h1>Haq Bolo</h1>
      <p className="tagline">Speak. We find your schemes.</p>
      <div className="language-buttons">
        {LANGUAGES.map((lang) => (
          <button key={lang.code} type="button" className="language-button" onClick={() => onPick(lang.code)}>
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  )
}
