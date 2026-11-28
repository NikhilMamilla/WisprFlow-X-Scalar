import { LANGUAGES } from '../voice/languages'
import type { LanguageCode } from '../core'
import DotField from '../components/DotField'
import HelloBubbles from '../components/HelloBubbles'
import './LanguageScreen.css'

export default function LanguageScreen({ onPick }: { onPick: (lang: LanguageCode) => void }) {
  return (
    <div className="language-screen">
      <DotField />
      <div className="language-content">
        <HelloBubbles />
        <h1 tabIndex={-1} data-screen-title>
          Haq <span className="accent">Bolo</span>
        </h1>
        <p className="tagline">Speak. We find your schemes.</p>
        <div className="language-buttons">
          {LANGUAGES.map((lang) => (
            <button key={lang.code} type="button" className="btn btn-primary language-button" onClick={() => onPick(lang.code)}>
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
