import { t, type StringLang } from '../i18n/strings'

// Footer row: About on the left, team name on the right. It sits inside the flow
// shell instead of floating over the content.
export default function Footer({ lang, onAbout }: { lang: StringLang; onAbout?: () => void }) {
  return (
    <footer className="app-footer">
      {onAbout ? (
        <button type="button" className="about-link" onClick={onAbout}>
          {t(lang, 'app_about_link')}
        </button>
      ) : (
        <span />
      )}
      <span>Team Abhyudaya</span>
    </footer>
  )
}
