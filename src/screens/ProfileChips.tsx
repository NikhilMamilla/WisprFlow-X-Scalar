import type { Profile, ProfileField } from '../core'
import { t, type StringLang } from '../i18n/strings'
import './ProfileChips.css'

// Chips for fields the extractor has filled in, each showing the user's own words.
const ORDER: ProfileField[] = [
  'occupation', 'age', 'monthly_income', 'dependants', 'urban_or_rural', 'state',
  'has_bank_account', 'has_aadhaar', 'in_epf_esic_nps', 'pays_income_tax',
]

function displayValue(profile: Profile, field: ProfileField, lang: StringLang): string {
  const value = profile[field]
  if (typeof value === 'boolean') return value ? t(lang, 'label_yes') : t(lang, 'label_no')
  if (field === 'occupation') return t(lang, `label_occupation_${value}`)
  if (field === 'urban_or_rural') return t(lang, value === 'urban' ? 'label_urban' : 'label_rural')
  if (field === 'age') return `${t(lang, 'chip_age')}: ${value}`
  if (field === 'monthly_income' && typeof value === 'number') {
    const amount = `${profile.income_estimated ? '~' : ''}₹${value}${t(lang, 'chip_month_suffix')}`
    return `${t(lang, 'chip_income')}: ${amount}`
  }
  if (field === 'dependants') return `${t(lang, 'chip_dependants')}: ${value}`
  return String(value)
}

export default function ProfileChips({ profile, lang }: { profile: Profile; lang: StringLang }) {
  const known = ORDER.filter((f) => profile[f] !== null)
  if (known.length === 0) return null
  return (
    <div className="chips">
      {known.map((field, i) => (
        <span className="chip" key={field} style={{ animationDelay: `${i * 80}ms` }}>
          <strong>{displayValue(profile, field, lang)}</strong>
          {profile.evidence[field] && <em>&ldquo;{profile.evidence[field]}&rdquo;</em>}
        </span>
      ))}
    </div>
  )
}
