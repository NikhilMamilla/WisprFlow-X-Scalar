import { SCHEMES, type MatchResult, type Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import './ResultsScreen.css'

const GROUPS: { status: MatchResult['status']; heading: string }[] = [
  { status: 'needs_prerequisite', heading: 'results_heading_do_first' },
  { status: 'qualifies', heading: 'results_heading_qualify' },
  { status: 'needs_info', heading: 'results_heading_maybe' },
  { status: 'does_not_qualify', heading: 'results_heading_not_eligible' },
]

function schemeName(id: string, lang: StringLang): string {
  const scheme = SCHEMES.find((s) => s.id === id)
  if (!scheme) return id
  return lang === 'hi' ? scheme.name_hi : scheme.name_en
}

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

function Card({ result, profile, lang }: { result: MatchResult; profile: Profile; lang: StringLang }) {
  const scheme = SCHEMES.find((s) => s.id === result.id)
  if (!scheme) return null
  // Quote the user's own words for whichever rule this scheme actually passed on.
  const evidenceLine = result.passed
    .map((ruleId) => profile.evidence[fieldOf(ruleId) as keyof typeof profile.evidence])
    .find(Boolean)

  return (
    <div className="result-card">
      <h3>{schemeName(result.id, lang)}</h3>
      <p className="benefit">{scheme.benefit_en}</p>

      {result.status === 'qualifies' && evidenceLine && (
        <p className="why">&ldquo;{evidenceLine}&rdquo;</p>
      )}
      {result.status === 'needs_prerequisite' && result.unlocked_by && (
        <p className="why">{t(lang, 'needs_prerequisite_reason', { scheme: schemeName(result.unlocked_by, lang) })}</p>
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

      <p className="documents">{scheme.documents.join(', ')}</p>
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
  onAbout,
}: {
  results: MatchResult[]
  profile: Profile
  lang: StringLang
  onViewSheet: () => void
  onAbout: () => void
}) {
  return (
    <div className="results-screen">
      <h1>{t(lang, 'results_summary_header')}</h1>
      {GROUPS.map(({ status, heading }) => {
        const group = results.filter((r) => r.status === status)
        if (group.length === 0) return null
        return (
          <section key={status} className="result-group">
            <h2>{t(lang, heading)}</h2>
            {group.map((r) => (
              <Card key={r.id} result={r} profile={profile} lang={lang} />
            ))}
          </section>
        )
      })}
      <div className="results-actions">
        <button type="button" onClick={onViewSheet}>
          Sheet dekhiye
        </button>
        <button type="button" onClick={onAbout}>
          About
        </button>
      </div>
    </div>
  )
}
