import { SCHEMES, type MatchResult, type Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import './SheetScreen.css'

export default function SheetScreen({
  results,
  profile,
  lang,
  onBack,
}: {
  results: MatchResult[]
  profile: Profile
  lang: StringLang
  onBack: () => void
}) {
  const relevant = results.filter((r) => r.status === 'qualifies' || r.status === 'needs_prerequisite')
  const documents = [...new Set(relevant.flatMap((r) => SCHEMES.find((s) => s.id === r.id)?.documents ?? []))]

  return (
    <div className="sheet-screen">
      <div className="sheet-actions no-print">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <button type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="sheet-page">
        <h1>{t(lang, 'sheet_title')}</h1>
        <p>
          Age: {profile.age ?? '—'} · Occupation: {profile.occupation ?? '—'} ·{' '}
          {profile.urban_or_rural ?? '—'}
        </p>

        <table>
          <tbody>
            {relevant.map((r) => {
              const scheme = SCHEMES.find((s) => s.id === r.id)
              if (!scheme) return null
              return (
                <tr key={r.id}>
                  <td>{lang === 'hi' ? scheme.name_hi : scheme.name_en}</td>
                  <td>{r.status === 'needs_prerequisite' ? t(lang, 'status_do_this_first') : t(lang, 'status_qualifies')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <h2>{t(lang, 'sheet_documents_heading')}</h2>
        <ul>
          {documents.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        <p className="footer">{t(lang, 'sheet_footer')}</p>
      </div>
    </div>
  )
}
