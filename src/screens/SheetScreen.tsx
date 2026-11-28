import { SCHEMES, type MatchResult, type Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import { CHIP_ORDER, chipLabel, chipParts } from './ProfileChips'
import { documentNames, formatCheckedOn, schemeName } from './localize'
import './SheetScreen.css'

function statusLabel(id: string, status: MatchResult['status'], lang: StringLang): string {
  if (status === 'qualifies') {
    const scheme = SCHEMES.find((s) => s.id === id)
    // Unverified rules: a possible match to confirm, never a guarantee.
    if (scheme && !scheme.rules_verified) return t(lang, 'status_possible_confirm')
    return t(lang, id === 'pmjdy' ? 'status_do_this_first' : 'status_qualifies')
  }
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
  const hasUnverified = ordered.some((r) => !(SCHEMES.find((s) => s.id === r.id)?.rules_verified ?? true))

  return (
    <div className="sheet-screen">
      <div className="sheet-actions no-print">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          {t(lang, 'back_label')}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          {t(lang, 'print_label')}
        </button>
      </div>

      <div className="sheet-page">
        <p className="sheet-prepared">{t(lang, 'sheet_footer')}</p>
        <span className="eyebrow no-print">{t(lang, 'eyebrow_sheet')}</span>
        <h1>{t(lang, 'sheet_title')}</h1>

        <h2>{t(lang, 'sheet_details_heading')}</h2>
        <dl className="sheet-details">
          {CHIP_ORDER.map((field) => {
            const known = profile[field] !== null
            // The 90-day question only applies to construction workers; skip it when never asked.
            if (!known && field === 'worked_90_days_construction') return null
            return (
              <div key={field} className="sheet-detail">
                <dt>{chipLabel(field, lang)}</dt>
                <dd>{known ? chipParts(profile, field, lang).value : t(lang, 'sheet_not_told')}</dd>
              </div>
            )
          })}
        </dl>

        <h2>{t(lang, 'sheet_schemes_heading')}</h2>
        <ul className="sheet-schemes">
          {ordered.map((r) => {
            const scheme = SCHEMES.find((s) => s.id === r.id)
            if (!scheme) return null
            return (
              <li key={r.id}>
                <strong>{schemeName(scheme, lang)}</strong>
                <span className="sheet-status">{statusLabel(r.id, r.status, lang)}</span>
                <span className="sheet-checked">
                  {t(lang, 'checked_on')} {formatCheckedOn(scheme.verification.checkedOn)} ·{' '}
                  <a className="quiet-link" href={scheme.source_url} target="_blank" rel="noreferrer">
                    {t(lang, 'link_source')}
                  </a>
                </span>
              </li>
            )
          })}
        </ul>

        <h2>{t(lang, 'sheet_documents_heading')}</h2>
        <ul className="sheet-docs">
          {documents.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>

        {hasUnverified && <p className="sheet-note">{t(lang, 'sheet_note_unverified')}</p>}
      </div>
    </div>
  )
}
