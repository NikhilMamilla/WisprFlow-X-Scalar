import { describe, expect, it } from 'vitest'
import { initialState, step, type DialogEvent, type DialogState } from './dialog'
import { MAX_FOLLOWUPS, pickNextFollowUp } from './followups'
import { matchSchemes } from './matcher'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { emptyProfile, type Profile, type ProfileField } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

// Fixtures only: nothing here is added to data/schemes.json.
function fixture(id: string, geography: Scheme['geography']): Scheme {
  return {
    ...clone(SCHEMES[0]),
    id,
    name_en: id,
    aliases: [],
    prerequisites: [],
    provides: [],
    geography,
    rules: { age_min: 18, not: [], requires: [] },
  }
}

const telangana = fixture('tg_state', { scope: 'state', states: ['Telangana'] })
const hyderabad = fixture('tg_district', { scope: 'district', states: ['Telangana'], districts: ['Hyderabad'] })

function send(state: DialogState, event: DialogEvent, schemes: Scheme[] = SCHEMES): DialogState {
  return step(state, event, schemes).state
}

// Age 30 in the story, confirmed at read-back, then whatever question comes next.
function afterReadback(schemes: Scheme[]): DialogState {
  let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' }, schemes)
  state = send(state, { type: 'storyDone', transcript: 'main 30 saal ka hoon' }, schemes)
  expect(state.screen).toBe('readback')
  return send(state, { type: 'yesNoAnswer', value: 'yes' }, schemes)
}

describe('when the app asks for a location', () => {
  it('never asks for a state when every scheme is national', () => {
    const profile = emptyProfile()
    const asked: ProfileField[] = []
    for (let q = pickNextFollowUp(profile, matchSchemes(profile), asked); q; ) {
      asked.push(q.field)
      if (asked.length >= MAX_FOLLOWUPS) break
      q = pickNextFollowUp(profile, matchSchemes(profile), asked)
    }
    expect(asked).not.toContain('state')
    expect(asked).not.toContain('district')
  })

  it('asks for the state only when a state scheme is blocked on it', () => {
    const profile: Profile = {
      ...emptyProfile(),
      age: 30,
      occupation: 'street_vendor',
      urban_or_rural: 'urban',
      monthly_income: 8000,
      has_bank_account: true,
      has_aadhaar: true,
      in_epf_esic_nps: false,
      pays_income_tax: false,
    }
    // The bundled catalogue now contains one state scheme, so the state is the
    // first thing blocked; with central schemes only, nothing asks for it.
    const centralOnly = SCHEMES.filter((scheme) => scheme.geography.scope === 'central')
    expect(pickNextFollowUp(profile, matchSchemes(profile, centralOnly), [])).toBeNull()
    expect(pickNextFollowUp(profile, matchSchemes(profile), [])?.field).toBe('state')
    const results = matchSchemes(profile, [telangana])
    expect(results[0].status).toBe('needs_info')
    expect(pickNextFollowUp(profile, results, [])).toEqual({ field: 'state', answer: 'text', readBack: false })
  })

  it('asks for a district only after the state is known', () => {
    const results = matchSchemes({ ...emptyProfile(), age: 30 }, [hyderabad])
    const asked = pickNextFollowUp({ ...emptyProfile(), age: 30 }, results, [])
    expect(asked?.field).toBe('state') // not district
  })
})

describe('answering the location question', () => {
  it('stores a recognised state and re-evaluates to a real result', () => {
    const state = afterReadback([telangana])
    expect(state.screen).toBe('followup')
    expect(state.currentFollowup?.field).toBe('state')

    const next = send(state, { type: 'textAnswer', text: 'Telangana' }, [telangana])
    expect(next.profile.state).toBe('Telangana')
    expect(next.screen).toBe('results')
    expect(next.results[0].status).toBe('qualifies')
  })

  it('accepts a differently spelled state', () => {
    const state = afterReadback([telangana])
    expect(send(state, { type: 'textAnswer', text: '  telangana ' }, [telangana]).profile.state).toBe('Telangana')
  })

  it('re-asks instead of storing a place it does not recognise', () => {
    const state = afterReadback([telangana])
    const { state: next, effects } = step(state, { type: 'textAnswer', text: 'atlantis' }, [telangana])
    expect(next.profile.state).toBeNull()
    expect(next.screen).toBe('followup')
    expect(next.currentFollowup?.field).toBe('state')
    expect(effects.some((e) => e.type === 'speak' && e.key === 'location_unknown')).toBe(true)
  })

  it('marks a wrong state as not applicable, never as ineligible on a rule', () => {
    const state = afterReadback([telangana])
    const next = send(state, { type: 'textAnswer', text: 'Bihar' }, [telangana])
    expect(next.results[0].status).toBe('not_applicable')
    expect(next.results[0].failed).toEqual([])
  })

  it('asks for a district after the state, then settles the scheme', () => {
    const withState = send(afterReadback([hyderabad]), { type: 'textAnswer', text: 'Telangana' }, [hyderabad])
    expect(withState.currentFollowup?.field).toBe('district')

    const done = send(withState, { type: 'textAnswer', text: 'Hyderabad district' }, [hyderabad])
    expect(done.profile.district).toBe('Hyderabad')
    expect(done.results[0].status).toBe('qualifies')
  })

  it('treats the wrong district as not applicable', () => {
    const withState = send(afterReadback([hyderabad]), { type: 'textAnswer', text: 'Telangana' }, [hyderabad])
    const done = send(withState, { type: 'textAnswer', text: 'Warangal' }, [hyderabad])
    expect(done.results[0].status).toBe('not_applicable')
  })

  it('does not reject when the user skips the location question', () => {
    const state = afterReadback([telangana])
    const skipped = send(state, { type: 'skip' }, [telangana])
    expect(skipped.asked).toContain('state')
    expect(skipped.profile.state).toBeNull()
    expect(skipped.results[0].status).toBe('needs_info')
    expect(skipped.results[0].failed).toEqual([])
  })

  it('keeps the four-question cap even when geography is in play', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' }, [telangana])
    state = send(state, { type: 'storyDone', transcript: 'pata nahi' }, [telangana])
    for (let i = 0; i < 20 && state.screen === 'followup'; i++) {
      const f = state.currentFollowup!
      if (f.answer === 'text') state = send(state, { type: 'textAnswer', text: f.field === 'state' ? 'Telangana' : 'Hyderabad' }, [telangana])
      else if (f.answer === 'number') state = send(state, { type: 'numberAnswer', value: 30 }, [telangana])
      else state = send(state, { type: 'yesNoAnswer', value: 'yes' }, [telangana])
    }
    expect(state.asked.length).toBeLessThanOrEqual(MAX_FOLLOWUPS)
  })
})

describe('correcting the location', () => {
  it('clears only the location and asks again, keeping the rest of the profile', () => {
    const wrong = send(afterReadback([telangana]), { type: 'textAnswer', text: 'Bihar' }, [telangana])
    expect(wrong.results[0].status).toBe('not_applicable')

    const correcting = send(wrong, { type: 'locationCorrection' }, [telangana])
    expect(correcting.profile.state).toBeNull()
    expect(correcting.profile.district).toBeNull()
    expect(correcting.profile.age).toBe(30) // untouched
    expect(correcting.asked).not.toContain('state') // may be asked again
    expect(correcting.screen).toBe('followup')
    expect(correcting.currentFollowup?.field).toBe('state')

    const fixed = send(correcting, { type: 'textAnswer', text: 'Telangana' }, [telangana])
    expect(fixed.results[0].status).toBe('qualifies')
  })

  it('drops the old district when a new state is given', () => {
    const withDistrict = send(afterReadback([hyderabad]), { type: 'textAnswer', text: 'Telangana' }, [hyderabad])
    const done = send(withDistrict, { type: 'textAnswer', text: 'Hyderabad' }, [hyderabad])
    expect(done.profile.district).toBe('Hyderabad')

    const corrected = send(done, { type: 'locationCorrection' }, [hyderabad])
    expect(corrected.profile.district).toBeNull()
    const reasked = send(corrected, { type: 'textAnswer', text: 'Telangana' }, [hyderabad])
    expect(reasked.profile.district).toBeNull() // asked again, not silently kept
  })
})
