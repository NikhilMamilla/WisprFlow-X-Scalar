import { describe, expect, it } from 'vitest'
import { extract, extractProfile } from './extractor'
import { PROFILE_FIELDS, type Profile } from './types'

type Expected = Partial<Omit<Profile, 'evidence'>>

// Every field not listed must be null: the extractor may not guess.
function expectOnly(transcript: string, expected: Expected) {
  const p = extractProfile(transcript)
  for (const f of PROFILE_FIELDS) expect(p[f], f).toBe(expected[f] ?? null)
  expect(p.income_estimated, 'income_estimated').toBe(expected.income_estimated ?? false)
  return p
}

describe('must-pass cases', () => {
  const story =
    'Main thela lagata hoon, teen bachche hain, kiraye ke ghar mein rehta hoon, bank account bhai ke naam pe hai'

  it('thela story: vendor, 3 kids, account in brother\'s name is not theirs', () => {
    const p = expectOnly(story, { occupation: 'street_vendor', dependants: 3, has_bank_account: false })
    expect(p.evidence.has_bank_account).toContain('bhai ke naam')
    expect(p.evidence.occupation).toContain('thela')
    expect(p.evidence.dependants).toBe('teen bachche')
  })

  it('same story without punctuation, as speech recognition returns it', () => {
    expectOnly(story.replace(/,/g, ''), { occupation: 'street_vendor', dependants: 3, has_bank_account: false })
  })
})

describe('Hinglish (Roman)', () => {
  it.each<[string, Expected]>([
    ['Meri umar battis saal hai', { age: 32 }],
    ['main 42 saal ka hoon', { age: 42 }],
    ['Main bayalees saal ka hoon', { age: 42 }],
    ['mahine ke das hazaar milte hain', { monthly_income: 10000 }],
    ['roz paanch sau milte hain', { monthly_income: 13000, income_estimated: true }],
    ['do hazaar paanch sau mahina kamata hoon', { monthly_income: 2500 }],
    ['Zomato mein delivery karta hoon', { occupation: 'delivery_rider' }],
    ['main mistri ka kaam karta hoon', { occupation: 'construction_worker' }],
    ['ghar ka kaam karti hoon, jhadu pocha', { occupation: 'domestic_worker' }],
    ['aadhaar card nahi hai', { has_aadhaar: false }],
    ['PF katta hai', { in_epf_esic_nps: true }],
    ['income tax nahi bharta', { pays_income_tax: false }],
    ['shahar mein rehta hoon', { urban_or_rural: 'urban' }],
    ['gaon mein rehti hoon', { urban_or_rural: 'rural' }],
    ['Uttar Pradesh se hoon', { state: 'Uttar Pradesh' }],
    ['bank account hai aur aadhaar nahi hai', { has_bank_account: true, has_aadhaar: false }],
    ['das saal se thela laga raha hoon', { occupation: 'street_vendor' }],
    ['bachche nahi hain', { dependants: 0 }],
    ['pata nahi', {}],
    ['mere saath teen bachche rehte hain', { dependants: 3 }],
    ['account hai na, mere naam pe', { has_bank_account: true }],
    ['beti ki umar 12 saal hai, meri umar chalis', { age: 40 }],
    ['main auto chalata hoon', { occupation: 'other' }],
    ['delivery driver hoon', { occupation: 'delivery_rider' }],
    ['pehle mistri tha ab thela lagata hoon', {}], // two occupations: ask, don't pick
    ['main 35 ka hoon', { age: 35 }],
    ['35 ka hu', { age: 35 }],
    ['mai 35 ki hoon', { age: 35 }],
    ['ek 12 saal ka aur ek 8 saal ka, main 35 ka hoon', { age: 35 }],
    ['meri salary das hazaar hai', { monthly_income: 10000 }],
    ['meri tankhwah panch hazaar hai', { monthly_income: 5000 }],
  ])('%s', (text, expected) => {
    expectOnly(text, expected)
  })
})

describe('Hindi (Devanagari)', () => {
  it.each<[string, Expected]>([
    ['मेरी उम्र बत्तीस साल है', { age: 32 }],
    ['मैं ठेला लगाता हूँ', { occupation: 'street_vendor' }],
    ['मेरे पास बैंक खाता नहीं है', { has_bank_account: false }],
    ['महीने के दस हज़ार कमाता हूँ', { monthly_income: 10000 }],
    ['रोज़ पांच सौ मिलते हैं', { monthly_income: 13000, income_estimated: true }],
    ['तीन बच्चे हैं', { dependants: 3 }],
    ['आधार कार्ड है', { has_aadhaar: true }],
    ['पीएफ कटता है', { in_epf_esic_nps: true }],
    ['मैं गाँव में रहता हूँ', { urban_or_rural: 'rural' }],
    ['बिहार से हूँ, मज़दूरी करता हूँ', { state: 'Bihar', occupation: 'construction_worker' }],
    ['बैंक खाता भाई के नाम पर है', { has_bank_account: false }],
    ['मैं पैंतीस का हूँ', { age: 35 }],
    ['मेरी तनख्वाह पांच हज़ार है', { monthly_income: 5000 }],
  ])('%s', (text, expected) => {
    expectOnly(text, expected)
  })
})

describe('mixed scripts in one sentence', () => {
  it('Roman + Devanagari', () => {
    expectOnly('main 32 साल का hoon aur mera bank account nahi hai', { age: 32, has_bank_account: false })
  })
})

describe('Telugu (script)', () => {
  it.each<[string, Expected]>([
    ['నాకు ముప్పై రెండు సంవత్సరాలు', { age: 32 }], // NEEDS NATIVE TELUGU REVIEW
    ['౩౨ సంవత్సరాలు', { age: 32 }], // NEEDS NATIVE TELUGU REVIEW
    ['నాకు బ్యాంక్ అకౌంట్ లేదు', { has_bank_account: false }], // NEEDS NATIVE TELUGU REVIEW
    ['ఆధార్ కార్డు ఉంది', { has_aadhaar: true }], // NEEDS NATIVE TELUGU REVIEW
    ['ముగ్గురు పిల్లలు ఉన్నారు', { dependants: 3 }], // NEEDS NATIVE TELUGU REVIEW
    ['నెలకు పది వేలు వస్తాయి', { monthly_income: 10000 }], // NEEDS NATIVE TELUGU REVIEW
    ['రోజుకు ఐదు వందలు వస్తాయి', { monthly_income: 13000, income_estimated: true }], // NEEDS NATIVE TELUGU REVIEW
    ['నేను కూలి పని చేస్తాను', { occupation: 'construction_worker' }], // NEEDS NATIVE TELUGU REVIEW
    ['నేను తెలంగాణలో ఉంటాను', { state: 'Telangana' }], // NEEDS NATIVE TELUGU REVIEW
    ['బ్యాంక్ అకౌంట్ మా అన్న పేరు మీద ఉంది', { has_bank_account: false }], // NEEDS NATIVE TELUGU REVIEW
    ['నేను పల్లెలో ఉంటాను', { urban_or_rural: 'rural' }], // NEEDS NATIVE TELUGU REVIEW
    ['పిల్లలు లేరు', { dependants: 0 }], // NEEDS NATIVE TELUGU REVIEW
  ])('%s', (text, expected) => {
    expectOnly(text, expected)
  })
})

describe('extract (async ExtractFn)', () => {
  it('resolves to the same profile as the sync core', async () => {
    const text = 'umar 32 saal'
    expect(await extract(text, 'en-IN')).toEqual(extractProfile(text))
  })
})
