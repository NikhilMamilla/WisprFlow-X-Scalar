import { useState } from 'react'
import type { Profile, ProfileField } from '../core'
import { t, type StringLang } from '../i18n/strings'
import './ProfileChips.css'

// Chips for fields the extractor has filled in, each with an explicit label so no
// chip is a bare "Haan" or "Shahar".
const ORDER: ProfileField[] = [
  'occupation', 'age', 'monthly_income', 'dependants', 'urban_or_rural', 'state', 'district',
  'has_bank_account', 'has_aadhaar', 'in_epf_esic_nps', 'pays_income_tax', 'worked_90_days_construction',
]

const FIELD_LABEL: Partial<Record<ProfileField, string>> = {
  has_bank_account: 'chip_bank',
  has_aadhaar: 'chip_aadhaar',
  in_epf_esic_nps: 'chip_epf_esic',
  pays_income_tax: 'chip_income_tax',
  worked_90_days_construction: 'chip_construction_90',
}

// Mobile shows only "Label: value"; the quote lives in the title/aria-label.
const COMPACT_LIMIT = 4

function chipParts(profile: Profile, field: ProfileField, lang: StringLang): { label: string; value: string } {
  const value = profile[field]
  const yesNo = typeof value === 'boolean' ? t(lang, value ? 'label_yes' : 'label_no') : ''

  if (field === 'occupation') return { label: t(lang, 'chip_occupation'), value: t(lang, `label_occupation_${value}`) }
  if (field === 'age') return { label: t(lang, 'chip_age'), value: String(value) }
  if (field === 'monthly_income') {
    const amount = `${profile.income_estimated ? '~' : ''}₹${value}${t(lang, 'chip_month_suffix')}`
    return { label: t(lang, 'chip_income'), value: amount }
  }
  if (field === 'dependants') return { label: t(lang, 'chip_dependants'), value: String(value) }
  if (field === 'urban_or_rural') {
    return { label: t(lang, 'chip_place'), value: t(lang, value === 'urban' ? 'label_urban' : 'label_rural') }
  }
  if (field === 'state') return { label: t(lang, 'chip_state'), value: String(value) }
  if (field === 'district') return { label: t(lang, 'chip_district'), value: String(value) }
  return { label: t(lang, FIELD_LABEL[field] ?? field), value: yesNo }
}

function Chip({ profile, field, lang }: { profile: Profile; field: ProfileField; lang: StringLang }) {
  const { label, value } = chipParts(profile, field, lang)
  const quote = profile.evidence[field]
  return (
    <span className="chip" title={quote ? `“${quote}”` : undefined} aria-label={`${label}: ${value}${quote ? `. “${quote}”` : ''}`}>
      <strong>
        {label}: {value}
      </strong>
      {quote && <em aria-hidden="true">&ldquo;{quote}&rdquo;</em>}
    </span>
  )
}

export default function ProfileChips({
  profile,
  lang,
  mode = 'full',
}: {
  profile: Profile
  lang: StringLang
  mode?: 'full' | 'compact' | 'results'
}) {
  const [expanded, setExpanded] = useState(false)
  const known = ORDER.filter((f) => profile[f] !== null)
  if (known.length === 0) return null

  if (mode === 'results') {
    return (
      <div className="chips-summary">
        <button type="button" className="chips-summary-toggle" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {t(lang, 'what_i_understood_count', { n: known.length })}
        </button>
        {expanded && (
          <div className="chips">
            {known.map((field) => (
              <Chip key={field} profile={profile} field={field} lang={lang} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Read-back and question screens keep the row to two lines; the rest collapse into "+N".
  const limited = mode === 'compact' && !expanded
  const visible = limited ? known.slice(0, COMPACT_LIMIT) : known
  const hidden = known.length - visible.length

  return (
    <div className="chips">
      {visible.map((field) => (
        <Chip key={field} profile={profile} field={field} lang={lang} />
      ))}
      {hidden > 0 && (
        <button type="button" className="chips-more" aria-expanded={false} onClick={() => setExpanded(true)}>
          +{hidden}
        </button>
      )}
    </div>
  )
}
