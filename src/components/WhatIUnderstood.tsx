import type { Profile } from '../core'
import { t, type StringLang } from '../i18n/strings'
import ProfileChips from '../screens/ProfileChips'
import './WhatIUnderstood.css'

// The key demo moment: shows the user's own words back to them, as chips, with a
// short staggered fade-rise. Renders nothing until at least one field is known.
export default function WhatIUnderstood({
  profile,
  lang,
  mode = 'full',
}: {
  profile: Profile
  lang: StringLang
  mode?: 'full' | 'compact' | 'results'
}) {
  if (Object.keys(profile.evidence).length === 0) return null
  if (mode === 'results') {
    return (
      <div className="what-i-understood">
        <ProfileChips profile={profile} lang={lang} mode="results" />
      </div>
    )
  }
  return (
    <div className="what-i-understood">
      <span className="eyebrow">{t(lang, 'what_i_understood')}</span>
      <ProfileChips profile={profile} lang={lang} mode={mode} />
    </div>
  )
}
