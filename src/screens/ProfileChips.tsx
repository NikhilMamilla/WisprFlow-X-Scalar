import type { Profile, ProfileField } from '../core'
import './ProfileChips.css'

// Chips for fields the extractor has filled in, each showing the user's own words.
const ORDER: ProfileField[] = [
  'occupation', 'age', 'monthly_income', 'dependants', 'urban_or_rural', 'state',
  'has_bank_account', 'has_aadhaar', 'in_epf_esic_nps', 'pays_income_tax',
]

function displayValue(profile: Profile, field: ProfileField): string {
  const value = profile[field]
  if (typeof value === 'boolean') return value ? 'Haan' : 'Nahi'
  if (field === 'monthly_income' && typeof value === 'number') {
    return profile.income_estimated ? `~₹${value}/month` : `₹${value}/month`
  }
  return String(value)
}

export default function ProfileChips({ profile }: { profile: Profile }) {
  const known = ORDER.filter((f) => profile[f] !== null)
  if (known.length === 0) return null
  return (
    <div className="chips">
      {known.map((field, i) => (
        <span className="chip" key={field} style={{ animationDelay: `${i * 80}ms` }}>
          <strong>{displayValue(profile, field)}</strong>
          {profile.evidence[field] && <em>&ldquo;{profile.evidence[field]}&rdquo;</em>}
        </span>
      ))}
    </div>
  )
}
