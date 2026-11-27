// Pure dialog reducer for the happy-path flow. No browser or server imports:
// the UI reads `effects` and performs the actual speaking/listening/navigation.
import { extractProfile } from './extractor'
import { pickNextFollowUp, READ_BACK_FIELDS, type FollowUp } from './followups'
import { matchSchemes, type MatchResult } from './matcher'
import { emptyProfile, PROFILE_FIELDS, type Profile, type ProfileField } from './types'

export type Screen = 'language' | 'story' | 'readback' | 'followup' | 'results' | 'sheet'
export type LanguageCode = 'hi-IN' | 'te-IN' | 'en-IN'
export type ListenMode = 'story' | 'yesno' | 'number' | 'open'

export interface DialogState {
  screen: Screen
  lang: LanguageCode | null
  profile: Profile
  locked: ProfileField[] // confirmed at read-back: never overwritten by a later extraction
  asked: ProfileField[] // follow-up fields already asked (at most MAX_FOLLOWUPS)
  currentFollowup: FollowUp | null
  pendingReadback: ProfileField | null
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
  if (followup.field === 'occupation') return 'open' // M3 decision: open question, never yes/no
  return followup.answer === 'number' ? 'number' : 'yesno'
}

function speakKeyFor(followup: FollowUp): string {
  return followup.field === 'occupation' ? 'ask_occupation_open' : `followup_${followup.field}`
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
// (one at a time), then the next follow-up, then results.
function advance(state: DialogState): StepResult {
  for (const field of READ_BACK_FIELDS) {
    if (state.profile[field] !== null && !state.locked.includes(field)) return toReadback(state, field)
  }
  const results = matchSchemes(state.profile)
  const followup = pickNextFollowUp(state.profile, results, state.asked)
  if (followup) return toFollowup(state, followup)
  return {
    state: { ...state, screen: 'results', currentFollowup: null, pendingReadback: null, results },
    effects: [{ type: 'speak', key: 'results_summary' }, { type: 'show', screen: 'results' }],
  }
}

export function step(state: DialogState, event: DialogEvent): StepResult {
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
      const profile = mergeProfile(state.profile, extractProfile(event.transcript), state.locked)
      return advance({ ...state, profile })
    }

    case 'yesNoAnswer': {
      if (state.screen === 'readback' && state.pendingReadback) {
        const field = state.pendingReadback
        if (event.value === 'yes') return advance({ ...state, locked: [...state.locked, field], pendingReadback: null })
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
        return advance({ ...state, profile, asked: [...state.asked, field], currentFollowup: null })
      }
      return { state, effects: [] }
    }

    case 'numberAnswer': {
      if (state.screen === 'followup' && state.currentFollowup?.answer === 'number') {
        const field = state.currentFollowup.field
        const profile = { ...state.profile, [field]: event.value } as Profile
        const asked = state.asked.includes(field) ? state.asked : [...state.asked, field]
        return advance({ ...state, profile, asked, currentFollowup: null })
      }
      return { state, effects: [] }
    }

    case 'textAnswer': {
      if (state.screen === 'followup' && state.currentFollowup?.field === 'occupation') {
        const profile = mergeProfile(state.profile, extractProfile(event.text), state.locked)
        return advance({ ...state, profile, asked: [...state.asked, 'occupation' as ProfileField], currentFollowup: null })
      }
      return { state, effects: [] }
    }

    case 'skip': {
      if (state.screen === 'followup' && state.currentFollowup) {
        return advance({ ...state, asked: [...state.asked, state.currentFollowup.field], currentFollowup: null })
      }
      if (state.screen === 'readback' && state.pendingReadback) {
        // Skipping confirmation trusts the extracted value, so it doesn't get asked forever.
        return advance({ ...state, locked: [...state.locked, state.pendingReadback], pendingReadback: null })
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
