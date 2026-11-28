import { SCHEMES, locationSensitive, type MatchResult, type Profile } from '../core'
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
  pillClass,
  pillLabel,
}: {
  result: MatchResult
  profile: Profile
  lang: StringLang
  highlighted?: boolean
  pillClass: string
  pillLabel: string
}) {
  const scheme = SCHEMES.find((s) => s.id === result.id)
  if (!scheme) return null
  // A rule set that is not fully verified can never read as "you qualify": it is a
  // possible match the worker must confirm at the office.
  const label = result.status === 'qualifies' && !scheme.rules_verified ? t(lang, 'status_possible_confirm') : pillLabel
  // Quote the user's own words for whichever rule this scheme actually passed on.
  const evidenceLine = result.passed
    .map((ruleId) => profile.evidence[fieldOf(ruleId) as keyof typeof profile.evidence])
    .find(Boolean)

  return (
    <div className={highlighted ? 'card card-highlight result-card' : 'card result-card'}>
      <span className={`pill ${pillClass}`}>{label}</span>
      <h3>{schemeName(scheme, lang)}</h3>
      <p className="benefit">{schemeBenefit(scheme, lang)}</p>

      {result.status === 'qualifies' && evidenceLine && <p className="why">&ldquo;{evidenceLine}&rdquo;</p>}
      {result.status === 'needs_prerequisite' && result.unlocked_by && (
        <p className="why">
          {t(lang, 'needs_prerequisite_reason', { scheme: schemeName(SCHEMES.find((s) => s.id === result.unlocked_by)!, lang) })}
        </p>
      )}
      {result.status === 'needs_info' && result.missing.length > 0 && (
        <p className="why">
          {t(lang, 'needs_info_reason', { fields: result.missing.map((f) => t(lang, `field_${f}`)).join(', ') })}
        </p>
      )}
      {result.status === 'does_not_qualify' && (
        <ul className="why-list">
          {reasons(result, lang).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <p className="documents">{documentNames(scheme, lang).join(', ')}</p>
      <p className="checked-on">
        {t(lang, 'checked_on')} {scheme.verification.checkedOn ?? '—'} ·{' '}
        <a className="quiet-link" href={scheme.source_url} target="_blank" rel="noreferrer">
          {t(lang, 'link_source')}
        </a>
      </p>
      {!scheme.rules_verified && <span className="badge-unverified">{t(lang, 'badge_unverified')}</span>}
    </div>
  )
}

export default function ResultsScreen({
  results,
  profile,
  lang,
  onViewSheet,
  onChangeLocation,
}: {
  results: MatchResult[]
  profile: Profile
  lang: StringLang
  onViewSheet: () => void
  onChangeLocation?: () => void
}) {
  // The scheme(s) that other results point to via unlocked_by: when the user qualifies for one
  // of those directly, it's the actionable first step, not just an ordinary "you qualify" item.
  const unlockerIds = new Set(
    results.filter((r) => r.status === 'needs_prerequisite' && r.unlocked_by).map((r) => r.unlocked_by!),
  )
  // Only offer a location correction when a state/UT/district scheme exists, so the
  // six central schemes never add a pointless button.
  const geographyMatters = results.some((r) => {
    const scheme = SCHEMES.find((s) => s.id === r.id)
    return scheme ? locationSensitive(scheme) : false
  })
  const groups: { heading: string; items: MatchResult[]; highlight?: boolean; pillClass: string; pillKey: string }[] = [
    {
      heading: 'results_heading_do_first',
      items: results.filter((r) => r.status === 'qualifies' && unlockerIds.has(r.id)),
      highlight: true,
      pillClass: 'pill-do_first',
      pillKey: 'status_do_this_first',
    },
    {
      heading: 'results_heading_qualify',
      items: results.filter((r) => r.status === 'qualifies' && !unlockerIds.has(r.id)),
      pillClass: 'pill-qualify',
      pillKey: 'status_qualifies',
    },
    {
      heading: 'results_heading_unlocks_after',
      items: results.filter((r) => r.status === 'needs_prerequisite'),
      pillClass: 'pill-unlocks',
      pillKey: 'status_unlocks_after',
    },
    {
      heading: 'results_heading_maybe',
      items: results.filter((r) => r.status === 'needs_info'),
      pillClass: 'pill-maybe',
      pillKey: 'status_maybe',
    },
    {
      heading: 'results_heading_not_eligible',
      items: results.filter((r) => r.status === 'does_not_qualify'),
      pillClass: 'pill-not_eligible',
      pillKey: 'status_not_eligible',
    },
  ]

  return (
    <div className="results-screen">
      <span className="eyebrow">{t(lang, 'eyebrow_results')}</span>
      <h1>{t(lang, 'results_summary_header')}</h1>
      <p className="why">{t(lang, 'results_trust_note')}</p>
      {groups.map(({ heading, items, highlight, pillClass, pillKey }) => {
        if (items.length === 0) return null
        return (
          <section key={heading} className="result-group">
            <h2>{t(lang, heading)}</h2>
            {items.map((r) => (
              <Card
                key={r.id}
                result={r}
                profile={profile}
                lang={lang}
                highlighted={highlight}
                pillClass={pillClass}
                pillLabel={t(lang, pillKey)}
              />
            ))}
          </section>
        )
      })}
      <div className="results-actions">
        <button type="button" className="btn btn-primary" onClick={onViewSheet}>
          {t(lang, 'results_cta_sheet')}
        </button>
        {geographyMatters && onChangeLocation && (
          <button type="button" className="btn btn-secondary" onClick={onChangeLocation}>
            {t(lang, 'results_change_location')}
          </button>
        )}
      </div>
    </div>
  )
}
