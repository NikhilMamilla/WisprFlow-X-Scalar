import type { Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import ProfileChips from '../screens/ProfileChips'
import './WhatIUnderstood.css'

// The key demo moment: shows the user's own words back to them, as chips, with a
// short staggered fade-rise. Renders nothing until at least one field is known.
export default function WhatIUnderstood({ profile, lang }: { profile: Profile; lang: StringLang }) {
  if (Object.keys(profile.evidence).length === 0) return null
  return (
    <div className="what-i-understood">
      <span className="eyebrow">{t(lang, 'what_i_understood')}</span>
      <ProfileChips profile={profile} />
    </div>
  )
}
