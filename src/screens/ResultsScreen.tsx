import { SCHEMES, type MatchResult, type Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import { documentNames, schemeBenefit, schemeName } from './localize'
import './ResultsScreen.css'

function reasons(result: MatchResult, lang: StringLang): string[] {
  return result.failed.map((f) =>
    t(lang, `rule_${f.ruleId.replace(':', '_')}`, {
      actual: String(f.detail.actual),
      expected: Array.isArray(f.detail.expected) ? f.detail.expected.join(', ') : String(f.detail.expected),
    }),
  )
}

function fieldOf(ruleId: string): string {
  if (ruleId === 'age_min' || ruleId === 'age_max') return 'age'
  if (ruleId === 'income_max_monthly') return 'monthly_income'
  if (ruleId === 'occupation_in') return 'occupation'
  if (ruleId === 'urban_only') return 'urban_or_rural'
  return ruleId.split(':')[1]
}

function Card({
  result,
  profile,
  lang,
  highlighted,
}: {
  result: MatchResult
  profile: Profile
  lang: StringLang
  highlighted?: boolean
}) {
  const scheme = SCHEMES.find((s) => s.id === result.id)
  if (!scheme) return null
  // Quote the user's own words for whichever rule this scheme actually passed on.
  const evidenceLine = result.passed
    .map((ruleId) => profile.evidence[fieldOf(ruleId) as keyof typeof profile.evidence])
    .find(Boolean)

  return (
    <div className={highlighted ? 'result-card highlighted' : 'result-card'}>
      <h3>{schemeName(scheme, lang)}</h3>
      <p className="benefit">{schemeBenefit(scheme, lang)}</p>

      {result.status === 'qualifies' && evidenceLine && <p className="why">&ldquo;{evidenceLine}&rdquo;</p>}
      {result.status === 'needs_prerequisite' && result.unlocked_by && (
        <p className="why">
          {t(lang, 'needs_prerequisite_reason', { scheme: schemeName(SCHEMES.find((s) => s.id === result.unlocked_by)!, lang) })}
        </p>
      )}
      {result.status === 'needs_info' && result.missing.length > 0 && (
        <p className="why">{t(lang, 'needs_info_reason', { fields: result.missing.join(', ') })}</p>
      )}
      {result.status === 'does_not_qualify' && (
        <ul className="why-list">
          {reasons(result, lang).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <p className="documents">{documentNames(scheme, lang).join(', ')}</p>
      <a href={scheme.source_url} target="_blank" rel="noreferrer">
        Source
      </a>
      {!scheme.rules_verified && <span className="unverified-badge">Rules not fully verified</span>}
    </div>
  )
}

export default function ResultsScreen({
  results,
  profile,
  lang,
  onViewSheet,
}: {
  results: MatchResult[]
  profile: Profile
  lang: StringLang
  onViewSheet: () => void
}) {
  // The scheme(s) that other results point to via unlocked_by: when the user qualifies for one
  // of those directly, it's the actionable first step, not just an ordinary "you qualify" item.
  const unlockerIds = new Set(
    results.filter((r) => r.status === 'needs_prerequisite' && r.unlocked_by).map((r) => r.unlocked_by!),
  )
  const groups: { heading: string; items: MatchResult[]; highlight?: boolean }[] = [
    { heading: 'results_heading_do_first', items: results.filter((r) => r.status === 'qualifies' && unlockerIds.has(r.id)), highlight: true },
    { heading: 'results_heading_qualify', items: results.filter((r) => r.status === 'qualifies' && !unlockerIds.has(r.id)) },
    { heading: 'results_heading_unlocks_after', items: results.filter((r) => r.status === 'needs_prerequisite') },
    { heading: 'results_heading_maybe', items: results.filter((r) => r.status === 'needs_info') },
    { heading: 'results_heading_not_eligible', items: results.filter((r) => r.status === 'does_not_qualify') },
  ]

  return (
    <div className="results-screen">
      <h1>{t(lang, 'results_summary_header')}</h1>
      {groups.map(({ heading, items, highlight }) => {
        if (items.length === 0) return null
        return (
          <section key={heading} className="result-group">
            <h2>{t(lang, heading)}</h2>
            {items.map((r) => (
              <Card key={r.id} result={r} profile={profile} lang={lang} highlighted={highlight} />
            ))}
          </section>
        )
      })}
      <div className="results-actions">
        <button type="button" onClick={onViewSheet}>
          Sheet dekhiye
        </button>
      </div>
    </div>
  )
}
