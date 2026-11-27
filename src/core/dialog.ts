// Pure dialog reducer for the happy-path flow. No browser or server imports:
// the UI reads `effects` and performs the actual speaking/listening/navigation.
import { extractWithConflicts, type Conflict } from './extractor'
import { pickNextFollowUp, READ_BACK_FIELDS, type FollowUp } from './followups'
import { findRegion, normalizeDistrict } from './geo'
import { matchSchemes, type MatchResult } from './matcher'
import { SCHEMES } from './schemes'
import type { Scheme } from './scheme'
import { emptyProfile, PROFILE_FIELDS, type Profile, type ProfileField } from './types'

export type Screen = 'language' | 'story' | 'readback' | 'followup' | 'conflict' | 'results' | 'sheet'
export type LanguageCode = 'hi-IN' | 'te-IN' | 'en-IN'
export type ListenMode = 'story' | 'yesno' | 'number' | 'open'

export const LOW_CONFIDENCE_LIMIT = 2 // after this many, the UI makes manual controls primary
export const OFF_TOPIC_LIMIT = 1 // after this many, the UI offers a Skip button

export interface DialogState {
  screen: Screen
  lang: LanguageCode | null
  profile: Profile
  locked: ProfileField[] // confirmed at read-back: never overwritten by a later extraction
  asked: ProfileField[] // follow-up fields already asked (at most MAX_FOLLOWUPS)
  currentFollowup: FollowUp | null
  pendingReadback: ProfileField | null
  conflict: Conflict | null // two different values for one field in a single utterance
  lowConfidenceFailures: number // empty/low-confidence recognition on the current question
  offTopicFailures: number // recognised fine, but didn't answer the current question
  results: MatchResult[]
}

export type Effect =
  | { type: 'speak'; key: string; params?: Record<string, string | number | boolean> }
  | { type: 'listen'; mode: ListenMode }
  | { type: 'show'; screen: Screen }

export type DialogEvent =
  | { type: 'languagePicked'; lang: LanguageCode }
  | { type: 'storyDone'; transcript: string }
  | { type: 'yesNoAnswer'; value: 'yes' | 'no' }
  | { type: 'numberAnswer'; value: number }
  | { type: 'textAnswer'; text: string }
  | { type: 'conflictResolved'; value: string | number | boolean }
  | { type: 'locationCorrection' } // "change my state/district": clear it and ask again
  | { type: 'recognitionFailed' } // empty transcript or confidence below 0.6
  | { type: 'offTopicAnswer' } // recognised, but didn't fit the question asked
  | { type: 'skip' }
  | { type: 'restart' }

export interface StepResult {
  state: DialogState
  effects: Effect[]
}

export function initialState(): DialogState {
  return {
    screen: 'language',
    lang: null,
    profile: emptyProfile(),
    locked: [],
    asked: [],
    currentFollowup: null,
    pendingReadback: null,
    conflict: null,
    lowConfidenceFailures: 0,
    offTopicFailures: 0,
    results: [],
  }
}

// Later non-null answers override earlier ones; a locked field is never touched again.
// (A contradiction within one utterance already comes back null from the extractor,
// so it falls through to an ordinary follow-up question for that field.)
function mergeProfile(prev: Profile, incoming: Profile, locked: ProfileField[]): Profile {
  const merged: Profile = { ...prev, evidence: { ...prev.evidence } }
  for (const field of PROFILE_FIELDS) {
    if (locked.includes(field)) continue
    const value = incoming[field]
    if (value === null) continue
    merged[field] = value as never
    const evidence = incoming.evidence[field]
    if (evidence) merged.evidence[field] = evidence
    if (field === 'monthly_income') merged.income_estimated = incoming.income_estimated
  }
  return merged
}

function applyYesNo(profile: Profile, field: ProfileField, value: 'yes' | 'no'): Profile {
  if (field === 'urban_or_rural') return { ...profile, urban_or_rural: value === 'yes' ? 'urban' : 'rural' }
  return { ...profile, [field]: value === 'yes' } as Profile // every other yes/no field is boolean
}

function listenModeFor(followup: FollowUp): ListenMode {
  // Occupation and location are open answers; a state name is not a yes/no.
  if (followup.field === 'occupation' || followup.answer === 'text') return 'open'
  return followup.answer === 'number' ? 'number' : 'yesno'
}

function speakKeyFor(followup: FollowUp): string {
  return followup.field === 'occupation' ? 'ask_occupation_open' : `followup_${followup.field}`
}

function conflictKeyFor(field: ProfileField): string {
  return field === 'age' ? 'conflict_age' : 'conflict_generic'
}

function toConflict(state: DialogState, conflict: Conflict): StepResult {
  return {
    state: { ...state, screen: 'conflict', conflict, currentFollowup: null, pendingReadback: null },
    effects: [
      { type: 'speak', key: conflictKeyFor(conflict.field), params: { a: conflict.values[0], b: conflict.values[1] } },
      { type: 'listen', mode: 'open' },
      { type: 'show', screen: 'conflict' },
    ],
  }
}

function toReadback(state: DialogState, field: ProfileField): StepResult {
  const key =
    field === 'age' ? 'readback_age' : state.profile.income_estimated ? 'readback_income_roughly' : 'readback_income'
  const params: Record<string, string | number | boolean> = { value: state.profile[field] as number }
  return {
    state: { ...state, screen: 'readback', pendingReadback: field, currentFollowup: null },
    effects: [{ type: 'speak', key, params }, { type: 'listen', mode: 'yesno' }, { type: 'show', screen: 'readback' }],
  }
}

function toFollowup(state: DialogState, followup: FollowUp): StepResult {
  return {
    state: { ...state, screen: 'followup', currentFollowup: followup, pendingReadback: null },
    effects: [
      { type: 'speak', key: speakKeyFor(followup) },
      { type: 'listen', mode: listenModeFor(followup) },
      { type: 'show', screen: 'followup' },
    ],
  }
}

// Decide what happens after any profile/asked update: read back age/income first
// (one at a time), then the next follow-up, then results. A new question starts with
// a clean slate of failures.
function advance(stateIn: DialogState, schemes: Scheme[] = SCHEMES): StepResult {
  const state: DialogState = { ...stateIn, lowConfidenceFailures: 0, offTopicFailures: 0 }
  for (const field of READ_BACK_FIELDS) {
    if (state.profile[field] !== null && !state.locked.includes(field)) return toReadback(state, field)
  }
  const results = matchSchemes(state.profile, schemes)
  const followup = pickNextFollowUp(state.profile, results, state.asked)
  if (followup) return toFollowup(state, followup)
  return {
    state: { ...state, screen: 'results', currentFollowup: null, pendingReadback: null, results },
    effects: [{ type: 'speak', key: 'results_summary' }, { type: 'show', screen: 'results' }],
  }
}

export function step(state: DialogState, event: DialogEvent, schemes: Scheme[] = SCHEMES): StepResult {
  // `schemes` is injectable so geography behaviour can be tested with a state
  // scheme without adding invented schemes to the real catalogue.
  const go = (next: DialogState) => advance(next, schemes)
  switch (event.type) {
    case 'languagePicked':
      return {
        state: { ...state, screen: 'story', lang: event.lang },
        effects: [
          { type: 'speak', key: 'welcome' },
          { type: 'listen', mode: 'story' },
          { type: 'show', screen: 'story' },
        ],
      }

    case 'restart':
      return { state: initialState(), effects: [{ type: 'show', screen: 'language' }] }

    case 'storyDone': {
      if (state.screen !== 'story') return { state, effects: [] }
      const { profile: extracted, conflicts } = extractWithConflicts(event.transcript)
      const profile = mergeProfile(state.profile, extracted, state.locked)
      const conflict = conflicts.find((c) => !state.locked.includes(c.field))
      if (conflict) return toConflict({ ...state, profile }, conflict)
              return go({ ...state, profile })
    }

    case 'yesNoAnswer': {
      if (state.screen === 'readback' && state.pendingReadback) {
        const field = state.pendingReadback
        if (event.value === 'yes') return go({ ...state, locked: [...state.locked, field], pendingReadback: null })
        // "no": clear it and ask again, routed back through the number follow-up screen.
        const profile = { ...state.profile, [field]: null } as Profile
        const followup: FollowUp = { field, answer: 'number', readBack: true }
        return {
          state: { ...state, profile, pendingReadback: null, screen: 'followup', currentFollowup: followup },
          effects: [
            { type: 'speak', key: `ask_again_${field}` },
            { type: 'listen', mode: 'number' },
            { type: 'show', screen: 'followup' },
          ],
        }
      }
      if (state.screen === 'followup' && state.currentFollowup?.answer === 'yes_no') {
        const field = state.currentFollowup.field
        const profile = applyYesNo(state.profile, field, event.value)
        return go({ ...state, profile, asked: [...state.asked, field], currentFollowup: null })
      }
      return { state, effects: [] }
    }

    case 'numberAnswer': {
      if (state.screen === 'followup' && state.currentFollowup?.answer === 'number') {
        const field = state.currentFollowup.field
        const profile = { ...state.profile, [field]: event.value } as Profile
        const asked = state.asked.includes(field) ? state.asked : [...state.asked, field]
        return go({ ...state, profile, asked, currentFollowup: null })
      }
      return { state, effects: [] }
    }

    case 'textAnswer': {
      if (state.screen !== 'followup' || !state.currentFollowup) return { state, effects: [] }
      const field = state.currentFollowup.field

      if (field === 'occupation') {
        const { profile: extracted, conflicts } = extractWithConflicts(event.text)
        const profile = mergeProfile(state.profile, extracted, state.locked)
        const asked = [...state.asked, 'occupation' as ProfileField]
        const conflict = conflicts.find((c) => !state.locked.includes(c.field))
        if (conflict) return toConflict({ ...state, profile, asked }, conflict)
        return go({ ...state, profile, asked, currentFollowup: null })
      }

      if (field === 'state') {
        // Only a recognised state/UT is accepted: an unrecognised answer must not be
        // stored as "somewhere else", because that would wrongly exclude state schemes.
        const region = findRegion(event.text)
        if (!region) return { state, effects: [{ type: 'speak', key: 'location_unknown' }, { type: 'listen', mode: 'open' }] }
        const profile: Profile = {
          ...state.profile,
          state: region.name,
          district: null, // a different state invalidates the old district
          evidence: { ...state.profile.evidence, state: event.text },
        }
        return go({ ...state, profile, asked: [...state.asked, 'state'], currentFollowup: null })
      }

      if (field === 'district') {
        const district = normalizeDistrict(event.text)
        if (!district) return { state, effects: [{ type: 'speak', key: 'location_unknown' }, { type: 'listen', mode: 'open' }] }
        const profile: Profile = {
          ...state.profile,
          district: district.value,
          evidence: { ...state.profile.evidence, district: event.text },
        }
        return go({ ...state, profile, asked: [...state.asked, 'district'], currentFollowup: null })
      }

      return { state, effects: [] }
    }

    case 'locationCorrection': {
      // Correcting location must re-evaluate, not reset unrelated answers: only the
      // two location fields and their "already asked" marks are cleared.
      const evidence = { ...state.profile.evidence }
      delete evidence.state
      delete evidence.district
      const profile: Profile = { ...state.profile, state: null, district: null, evidence }
      const asked = state.asked.filter((f) => f !== 'state' && f !== 'district')
      const locked = state.locked.filter((f) => f !== 'state' && f !== 'district')
      return go({ ...state, profile, asked, locked, currentFollowup: null, pendingReadback: null })
    }

    case 'conflictResolved': {
      if (state.screen !== 'conflict' || !state.conflict) return { state, effects: [] }
      const field = state.conflict.field
      const profile = { ...state.profile, [field]: event.value } as Profile
      return go({ ...state, profile, locked: [...state.locked, field], conflict: null })
    }

    case 'recognitionFailed': {
      const failures = state.lowConfidenceFailures + 1
      const next = { ...state, lowConfidenceFailures: failures }
      if (state.screen === 'story') {
        return { state: next, effects: [{ type: 'speak', key: 'low_confidence' }, { type: 'listen', mode: 'story' }] }
      }
      if (state.screen === 'readback' && state.pendingReadback) {
        return { state: next, effects: [{ type: 'speak', key: 'low_confidence' }, { type: 'listen', mode: 'yesno' }] }
      }
      if (state.screen === 'followup' && state.currentFollowup) {
        return {
          state: next,
          effects: [{ type: 'speak', key: 'low_confidence' }, { type: 'listen', mode: listenModeFor(state.currentFollowup) }],
        }
      }
      if (state.screen === 'conflict') {
        return { state: next, effects: [{ type: 'speak', key: 'low_confidence' }, { type: 'listen', mode: 'open' }] }
      }
      return { state, effects: [] }
    }

    case 'offTopicAnswer': {
      if (state.screen !== 'followup' && state.screen !== 'readback') return { state, effects: [] }
      const mode = state.screen === 'readback' ? 'yesno' : listenModeFor(state.currentFollowup!)
      return {
        state: { ...state, offTopicFailures: state.offTopicFailures + 1 },
        effects: [{ type: 'speak', key: 'off_topic_hint' }, { type: 'listen', mode }],
      }
    }

    case 'skip': {
      if (state.screen === 'followup' && state.currentFollowup) {
        return go({ ...state, asked: [...state.asked, state.currentFollowup.field], currentFollowup: null })
      }
      if (state.screen === 'readback' && state.pendingReadback) {
        // Skipping confirmation trusts the extracted value, so it doesn't get asked forever.
        return go({ ...state, locked: [...state.locked, state.pendingReadback], pendingReadback: null })
      }
      if (state.screen === 'results') {
        return { state: { ...state, screen: 'sheet' }, effects: [{ type: 'show', screen: 'sheet' }] }
      }
      return { state, effects: [] }
    }

    default:
      return { state, effects: [] }
  }
}
