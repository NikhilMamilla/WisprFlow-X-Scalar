import { describe, expect, it } from 'vitest'
import { ASKABLE_FIELDS } from '../core/followups'
import { checksFor, type MatchStatus } from '../core/matcher'
import { SCHEMES } from '../core/schemes'
import { STRINGS } from './strings'

// Every status the matcher can return must have a spoken/displayed label.
const STATUS_KEY: Record<MatchStatus, string> = {
  qualifies: 'status_qualifies',
  does_not_qualify: 'status_not_eligible',
  needs_info: 'status_maybe',
  needs_prerequisite: 'status_do_this_first',
  not_needed: 'status_not_needed',
}

function requiredKeys(): string[] {
  const keys = new Set<string>(['welcome', 'results_summary', 'ask_occupation_open'])

  // Every askable field in followups.ts: a follow-up question, or (age/income) a retry prompt.
  for (const field of ASKABLE_FIELDS) {
    keys.add(field === 'occupation' ? 'ask_occupation_open' : `followup_${field}`)
  }
  keys.add('readback_age')
  keys.add('readback_income')
  keys.add('readback_income_roughly')
  keys.add('ask_again_age')
  keys.add('ask_again_monthly_income')

  // Every match status.
  for (const key of Object.values(STATUS_KEY)) keys.add(key)

  // Every rule id that data/schemes.json actually produces.
  for (const scheme of SCHEMES) {
    for (const check of checksFor(scheme)) keys.add(`rule_${check.ruleId.replace(':', '_')}`)
  }

  return [...keys]
}

describe('every key the dialog/UI can build has hi and en strings', () => {
  it.each(requiredKeys())('%s', (key) => {
    const entry = STRINGS[key]
    expect(entry, `missing STRINGS entry for "${key}"`).toBeDefined()
    expect(entry.hi, `missing hi text for "${key}"`).toBeTruthy()
    expect(entry.en, `missing en text for "${key}"`).toBeTruthy()
  })
})
