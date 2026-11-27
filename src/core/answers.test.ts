import { describe, expect, it } from 'vitest'
import { parseYesNo } from './answers'

describe('parseYesNo', () => {
  it.each([
    'haan', 'ha', 'ji', 'haan ji', 'sahi', 'theek', 'bilkul',
    'हाँ', 'हां', 'जी', 'सही', 'ठीक है', 'बिलकुल',
  ])('%s -> yes', (text) => {
    expect(parseYesNo(text)).toBe('yes')
  })

  it.each([
    'nahi', 'nahin', 'na', 'galat', 'no',
    'नहीं', 'नही', 'ना', 'गलत',
  ])('%s -> no', (text) => {
    expect(parseYesNo(text)).toBe('no')
  })

  // NEEDS NATIVE TELUGU REVIEW
  it.each(['హా', 'అవును'])('Telugu %s -> yes', (text) => {
    expect(parseYesNo(text)).toBe('yes')
  })
  it.each(['కాదు', 'లేదు'])('Telugu %s -> no', (text) => {
    expect(parseYesNo(text)).toBe('no')
  })

  it('negation wins when both appear', () => {
    expect(parseYesNo('haan nahi')).toBe('no')
  })

  it('unknown text returns null', () => {
    expect(parseYesNo('pata nahi kya bolu')).toBe('no') // contains "nahi"
    expect(parseYesNo('kal milte hain')).toBeNull()
    expect(parseYesNo('')).toBeNull()
  })
})
