// Parses short yes/no answers (Haan/Nahi) across Hindi, Hinglish and Telugu.
import { findAll, phrases, tokenize } from './text'

const YES = phrases([
  'haan', 'ha', 'ji', 'haanji', 'sahi', 'theek', 'thik', 'bilkul', 'yes', 'yeah', 'ok', 'okay',
  'हाँ', 'हां', 'हा', 'जी', 'सही', 'ठीक', 'बिलकुल', 'बिल्कुल',
  'హా', 'అవును', // NEEDS NATIVE TELUGU REVIEW
])
const NO = phrases([
  'nahi', 'nahin', 'na', 'galat', 'no', 'nope',
  'नहीं', 'नही', 'ना', 'गलत',
  'కాదు', 'లేదు', // NEEDS NATIVE TELUGU REVIEW
])

// Negation wins: "haan nahi" (changed my mind) reads as no.
export function parseYesNo(text: string): 'yes' | 'no' | null {
  const { norm } = tokenize(text)
  if (findAll(norm, NO).length > 0) return 'no'
  if (findAll(norm, YES).length > 0) return 'yes'
  return null
}

export { parseSpokenNumber } from './numbers'
