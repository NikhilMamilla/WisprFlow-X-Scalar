import { describe, expect, it } from 'vitest'
import { initialState, step, type DialogEvent, type DialogState } from './dialog'

function send(state: DialogState, event: DialogEvent): DialogState {
  return step(state, event).state
}

// Answers every open question with a plausible, uncontroversial value, regardless of
// which field the reducer happens to pick next. Drives the flow to 'results'.
function driveToResults(state: DialogState, maxSteps = 20): DialogState {
  for (let i = 0; i < maxSteps; i++) {
    if (state.screen === 'results') return state
    if (state.screen === 'readback') state = send(state, { type: 'yesNoAnswer', value: 'yes' })
    else if (state.screen === 'followup' && state.currentFollowup) {
      const f = state.currentFollowup
      if (f.field === 'occupation') state = send(state, { type: 'textAnswer', text: 'mazdoor' })
      else if (f.answer === 'number') state = send(state, { type: 'numberAnswer', value: f.field === 'age' ? 30 : 8000 })
      else state = send(state, { type: 'yesNoAnswer', value: 'yes' })
    } else throw new Error(`stuck on screen ${state.screen}`)
  }
  throw new Error('did not reach results within maxSteps')
}

describe('dialog reducer', () => {
  it('the demo story reaches results, with age read back and locked, within the 4-question cap', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    expect(state.screen).toBe('story')

    state = send(state, {
      type: 'storyDone',
      transcript: 'Main thela lagata hoon, teen bachche hain, kiraye ke ghar mein rehta hoon, bank account bhai ke naam pe hai',
    })
    expect(state.profile.occupation).toBe('street_vendor')
    expect(state.profile.dependants).toBe(3)
    expect(state.profile.has_bank_account).toBe(false)
    expect(state.profile.age).toBeNull() // not mentioned: must stay null, never guessed

    state = driveToResults(state)
    expect(state.screen).toBe('results')
    expect(state.locked).toContain('age') // age was read back and confirmed along the way
    expect(state.asked.length).toBeLessThanOrEqual(4)
    expect(state.results.length).toBeGreaterThan(0)
  })

  it('a read-back "no" clears the value and re-asks it as a number follow-up', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'main 42 saal ka hoon' })
    expect(state.screen).toBe('readback')
    expect(state.pendingReadback).toBe('age')
    expect(state.profile.age).toBe(42)

    state = send(state, { type: 'yesNoAnswer', value: 'no' })
    expect(state.screen).toBe('followup')
    expect(state.currentFollowup).toEqual({ field: 'age', answer: 'number', readBack: true })
    expect(state.profile.age).toBeNull() // cleared, not kept

    state = send(state, { type: 'numberAnswer', value: 40 })
    expect(state.screen).toBe('readback')
    expect(state.pendingReadback).toBe('age')
    expect(state.profile.age).toBe(40)

    state = send(state, { type: 'yesNoAnswer', value: 'yes' })
    expect(state.locked).toContain('age')
    expect(state.profile.age).toBe(40)
  })

  it('a locked value is never overwritten by a later extraction', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'main 40 saal ka hoon' })
    state = send(state, { type: 'yesNoAnswer', value: 'yes' }) // locks age at 40

    state = send(state, { type: 'restart' })
    // restart fully resets; re-do the lock, then prove a second story can't move it
    state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'main 40 saal ka hoon' })
    state = send(state, { type: 'yesNoAnswer', value: 'yes' })
    expect(state.locked).toContain('age')

    state = send(state, { type: 'storyDone', transcript: 'main 50 saal ka hoon' })
    expect(state.profile.age).toBe(40) // the new "50" is ignored
  })

  it('never asks more than 4 follow-up questions, even from a profile with nothing extracted', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'pata nahi kya bataun' })
    expect(state.screen).toBe('followup')

    state = driveToResults(state)
    expect(state.screen).toBe('results')
    expect(state.asked.length).toBeLessThanOrEqual(4)
  })

  it('a contradiction in the story goes to the conflict screen, and picking a value locks it', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'Meri umar tees saal hai... nahi nahi, paintees saal.' })
    expect(state.screen).toBe('conflict')
    expect(state.conflict).toEqual({ field: 'age', values: [30, 35] })
    expect(state.profile.age).toBeNull()

    state = send(state, { type: 'conflictResolved', value: 35 })
    expect(state.profile.age).toBe(35)
    expect(state.locked).toContain('age') // confirmed, so no read-back needed again
    expect(state.conflict).toBeNull()
  })

  it('low-confidence recognition re-listens on the same question and counts failures', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'pata nahi' }) // -> a followup screen
    expect(state.screen).toBe('followup')
    const field = state.currentFollowup!.field

    state = send(state, { type: 'recognitionFailed' })
    expect(state.screen).toBe('followup')
    expect(state.currentFollowup!.field).toBe(field) // same question, not advanced
    expect(state.lowConfidenceFailures).toBe(1)

    state = send(state, { type: 'recognitionFailed' })
    expect(state.lowConfidenceFailures).toBe(2) // UI makes manual controls primary at this point

    // answering normally afterwards clears the counter for the next question
    state = send(state, { type: 'yesNoAnswer', value: 'yes' })
    expect(state.lowConfidenceFailures).toBe(0)
  })

  it('an off-topic answer re-asks once, then the UI can offer Skip', () => {
    let state = send(initialState(), { type: 'languagePicked', lang: 'en-IN' })
    state = send(state, { type: 'storyDone', transcript: 'pata nahi' })
    expect(state.screen).toBe('followup')
    const field = state.currentFollowup!.field

    state = send(state, { type: 'offTopicAnswer' })
    expect(state.offTopicFailures).toBe(1)
    expect(state.currentFollowup!.field).toBe(field)

    state = send(state, { type: 'skip' }) // the UI's Skip button
    expect(state.asked).toContain(field)
    expect(state.profile[field]).toBeNull() // skipped, not guessed
  })
})
