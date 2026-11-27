// Picks the next follow-up question: one at a time, at most four, each answerable by a number or yes/no.
import type { MatchResult } from './matcher'
import type { Profile, ProfileField } from './types'

export const MAX_FOLLOWUPS = 4

// Numbers are easy to mishear: read these back and wait for yes/no before using them,
// whether they came from a follow-up or from the first story.
export const READ_BACK_FIELDS: readonly ProfileField[] = ['age', 'monthly_income']

// occupation is asked as "are you a street vendor?" and urban_or_rural as "do you live in a town or city?"
// (the only values the rules in data/schemes.json check), so both are yes/no.
const ANSWER: Partial<Record<ProfileField, 'number' | 'yes_no'>> = {
  age: 'number',
  monthly_income: 'number',
  has_bank_account: 'yes_no',
  has_aadhaar: 'yes_no',
  in_epf_esic_nps: 'yes_no',
  pays_income_tax: 'yes_no',
  occupation: 'yes_no',
  urban_or_rural: 'yes_no',
}

// Tie-break order when two fields would settle the same number of schemes.
const PRIORITY: ProfileField[] = [
  'age',
  'monthly_income',
  'in_epf_esic_nps',
  'pays_income_tax',
  'has_bank_account',
  'has_aadhaar',
  'occupation',
  'urban_or_rural',
]

export interface FollowUp {
  field: ProfileField
  answer: 'number' | 'yes_no'
  readBack: boolean
}

export function pickNextFollowUp(profile: Profile, results: MatchResult[], asked: ProfileField[]): FollowUp | null {
  if (asked.length >= MAX_FOLLOWUPS) return null
  const open = results.filter((r) => r.status === 'needs_info')
  const candidates = PRIORITY.filter((f) => profile[f] === null && !asked.includes(f) && ANSWER[f])
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
