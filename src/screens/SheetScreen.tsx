import { SCHEMES, type MatchResult, type Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import { documentNames, occupationLabel, schemeName, urbanRuralLabel } from './localize'
import './SheetScreen.css'

function statusLabel(id: string, status: MatchResult['status'], lang: StringLang): string {
  if (status === 'qualifies') return t(lang, id === 'pmjdy' ? 'status_do_this_first' : 'status_qualifies')
  return t(lang, 'status_unlocks_after')
}

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
  // Jan Dhan (if present) leads the list and its documents lead the checklist: it's the step to do first.
  const ordered = [...relevant].sort((a, b) => (a.id === 'pmjdy' ? -1 : b.id === 'pmjdy' ? 1 : 0))
  const documents = [
    ...new Set(ordered.flatMap((r) => documentNames(SCHEMES.find((s) => s.id === r.id)!, lang))),
  ]

  return (
    <div className="sheet-screen">
      <div className="sheet-actions no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <div className="sheet-page">
        <span className="eyebrow no-print">Your sheet</span>
        <h1>{t(lang, 'sheet_title')}</h1>
        <p>
          Age: {profile.age ?? '—'} · Occupation: {profile.occupation ? occupationLabel(profile.occupation, lang) : '—'} ·{' '}
          {profile.urban_or_rural ? urbanRuralLabel(profile.urban_or_rural, lang) : '—'}
        </p>

        <table>
          <tbody>
            {ordered.map((r) => {
              const scheme = SCHEMES.find((s) => s.id === r.id)
              if (!scheme) return null
              return (
                <tr key={r.id}>
                  <td>{schemeName(scheme, lang)}</td>
                  <td>{statusLabel(r.id, r.status, lang)}</td>
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
