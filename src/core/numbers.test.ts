import { describe, expect, it } from 'vitest'
import { findNumbers, parseSpokenNumber } from './numbers'
import { tokenize } from './text'

describe('parseSpokenNumber', () => {
  it.each([
    ['battis', 32],
    ['battees', 32],
    ['बत्तीस', 32],
    ['bayalees', 42],
    ['बयालीस', 42],
    ['32', 32],
    ['३२', 32],
    ['do hazaar paanch sau', 2500],
    ['दो हज़ार पाँच सौ', 2500],
    ['das hazaar', 10000],
    ['paanch sau pachas', 550],
    ['ek lakh bees hazaar', 120000],
    ['10 hazaar', 10000],
    ['thirty two', 32],
    ['ten thousand', 10000],
    ['unnis', 19],
    ['tees', 30],
    ['teen', 3],
  ])('%s -> %d', (text, expected) => {
    expect(parseSpokenNumber(text)).toBe(expected)
  })

  // NEEDS NATIVE TELUGU REVIEW
  it.each([
    ['ముప్పై రెండు', 32],
    ['పది వేలు', 10000],
    ['ఐదు వందలు', 500],
    ['ముగ్గురు', 3],
    ['౩౨', 32],
  ])('Telugu %s -> %d', (text, expected) => {
    expect(parseSpokenNumber(text)).toBe(expected)
  })

  it.each([['do teen'], ['battis chalis'], ['saath do'], ['hello'], ['']])(
    'refuses to guess: "%s"',
    (text) => {
      expect(parseSpokenNumber(text)).toBeNull()
    },
  )
})

describe('findNumbers', () => {
  it('reads "saath" as "with" when a number follows', () => {
    const { norm } = tokenize('mere saath teen bachche rehte hain')
    expect(findNumbers(norm).map((s) => s.value)).toEqual([3])
  })

  it('finds several numbers in one sentence', () => {
    const { norm } = tokenize('umar 32 saal, mahine ke das hazaar')
    expect(findNumbers(norm).map((s) => s.value)).toEqual([32, 10000])
  })
})
