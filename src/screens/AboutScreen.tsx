import { t, type StringLang } from '../i18n/strings'
import './AboutScreen.css'

export default function AboutScreen({ lang, onBack }: { lang: StringLang; onBack: () => void }) {
  return (
    <div className="about-screen">
      <span className="eyebrow">{t(lang, 'eyebrow_about')}</span>
      <h1>{t(lang, 'about_title')}</h1>
      <p>{t(lang, 'about_honesty_schemes')}</p>
      <p>{t(lang, 'about_honesty_decision')}</p>
      <p>{t(lang, 'about_honesty_voice')}</p>
      <button type="button" className="btn btn-secondary" onClick={onBack}>
        {t(lang, 'back_label')}
      </button>
    </div>
  )
}
