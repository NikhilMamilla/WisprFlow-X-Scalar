// Picks the next follow-up question: one at a time, at most four, each answerable by a number or yes/no.
import type { MatchResult } from './matcher'
import type { Profile, ProfileField } from './types'

export const MAX_FOLLOWUPS = 4

// Numbers are easy to mishear: read these back and wait for yes/no before using them,
// whether they came from a follow-up or from the first story.
export const READ_BACK_FIELDS: readonly ProfileField[] = ['age', 'monthly_income']

// occupation is asked as an open question, urban_or_rural as "do you live in a town
// or city?", and state/district as a spoken or typed place name.
const ANSWER: Partial<Record<ProfileField, 'number' | 'yes_no' | 'text'>> = {
  age: 'number',
  monthly_income: 'number',
  has_bank_account: 'yes_no',
  has_aadhaar: 'yes_no',
  in_epf_esic_nps: 'yes_no',
  pays_income_tax: 'yes_no',
  worked_90_days_construction: 'yes_no',
  occupation: 'yes_no',
  urban_or_rural: 'yes_no',
  state: 'text',
  district: 'text',
}

// Every field that can ever be asked about, as a follow-up or (age/monthly_income) a read-back retry.
export const ASKABLE_FIELDS = Object.keys(ANSWER) as ProfileField[]

// Tie-break order when two fields would settle the same number of schemes.
const PRIORITY: ProfileField[] = [
  'age',
  'monthly_income',
  'in_epf_esic_nps',
  'pays_income_tax',
  'worked_90_days_construction',
  'has_bank_account',
  'has_aadhaar',
  'occupation',
  'urban_or_rural',
  // Geography comes last: it is only offered when a result is actually blocked on
  // it, and it should not use up a slot while a rule question is more useful.
  'state',
  'district',
]

export interface FollowUp {
  field: ProfileField
  answer: 'number' | 'yes_no' | 'text'
  readBack: boolean
}

export function pickNextFollowUp(profile: Profile, results: MatchResult[], asked: ProfileField[]): FollowUp | null {
  if (asked.length >= MAX_FOLLOWUPS) return null
  const open = results.filter((r) => r.status === 'needs_info')
  const candidates = PRIORITY.filter((f) => {
    if (profile[f] !== null || asked.includes(f) || !ANSWER[f]) return false
    // A district is meaningless before the state is known, so never ask it first.
    if (f === 'district' && profile.state === null) return false
    return true
  })
  let best: { field: ProfileField; needed: number; settles: number } | null = null
  for (const field of candidates) {
    const needed = open.filter((r) => r.missing.includes(field)).length
    const settles = open.filter((r) => r.missing.length === 1 && r.missing[0] === field).length
    if (needed === 0) continue
    if (!best || needed > best.needed || (needed === best.needed && settles > best.settles)) {
      best = { field, needed, settles }
    }
  }
  if (!best) return null
  return { field: best.field, answer: ANSWER[best.field]!, readBack: READ_BACK_FIELDS.includes(best.field) }
}
