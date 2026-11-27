import { describe, expect, it } from 'vitest'
import { chooseSpeech, type VoiceOption } from './synthesis'

const voice = (lang: string): VoiceOption => ({ name: lang, lang, localService: true })

describe('chooseSpeech', () => {
  it('uses a voice for the chosen language when one exists', () => {
    expect(chooseSpeech('hi-IN', [voice('hi-IN')])).toEqual({ kind: 'voice', speakLang: 'hi-IN' })
    expect(chooseSpeech('te-IN', [voice('te-IN')])).toEqual({ kind: 'voice', speakLang: 'te-IN' })
    expect(chooseSpeech('en-IN', [voice('en-IN')])).toEqual({ kind: 'voice', speakLang: 'en-IN' })
  })

  it('Hindi falls back to an en-IN voice (speaking the Roman string) when no hi voice exists', () => {
    expect(chooseSpeech('hi-IN', [voice('en-IN'), voice('te-IN')])).toEqual({ kind: 'fallback_en', speakLang: 'en-IN' })
  })

  it('Hindi with no hi and no en voice at all is text only', () => {
    expect(chooseSpeech('hi-IN', [voice('te-IN')])).toEqual({ kind: 'text_only' })
    expect(chooseSpeech('hi-IN', [])).toEqual({ kind: 'text_only' })
  })

  it('Telugu never borrows another language\'s voice', () => {
    expect(chooseSpeech('te-IN', [voice('en-IN'), voice('hi-IN')])).toEqual({ kind: 'text_only' })
  })

  it('en-IN with no matching voice is text only (no further fallback)', () => {
    expect(chooseSpeech('en-IN', [voice('hi-IN')])).toEqual({ kind: 'text_only' })
  })
})
