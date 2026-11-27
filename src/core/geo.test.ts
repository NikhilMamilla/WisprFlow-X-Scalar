import { describe, expect, it } from 'vitest'
import {
  DISTRICTS_BY_STATE,
  REGIONS,
  STATE_KEYWORDS,
  findRegion,
  lookupDistrict,
  normalizeDistrict,
  normalizeText,
  regionName,
  sameDistrict,
  sameRegion,
} from './geo'

describe('the region table', () => {
  it('covers all 28 states and 8 union territories with unique codes', () => {
    expect(REGIONS.filter((r) => r.type === 'state')).toHaveLength(28)
    expect(REGIONS.filter((r) => r.type === 'union_territory')).toHaveLength(8)
    expect(new Set(REGIONS.map((r) => r.code)).size).toBe(REGIONS.length)
    expect(new Set(REGIONS.map((r) => r.name)).size).toBe(REGIONS.length)
  })

  it('marks Telangana as a state and Delhi as a union territory', () => {
    expect(findRegion('Telangana')?.type).toBe('state')
    expect(findRegion('Delhi')?.type).toBe('union_territory')
  })
})

describe('state normalisation', () => {
  it('ignores case, spacing, punctuation and unicode width', () => {
    for (const input of ['Telangana', 'telangana', 'TELANGANA', '  telangana  ', 'Telangana.']) {
      expect(regionName(input)).toBe('Telangana')
    }
    expect(regionName('ＴＥＬＡＮＧＡＮＡ')).toBe('Telangana') // full-width characters
  })

  it('accepts codes and common alternative spellings', () => {
    expect(regionName('TS')).toBe('Telangana')
    expect(regionName('tg')).toBe('Telangana')
    expect(regionName('AP')).toBe('Andhra Pradesh')
    expect(regionName('andhra')).toBe('Andhra Pradesh')
    expect(regionName('orissa')).toBe('Odisha')
    expect(regionName('pondicherry')).toBe('Puducherry')
    expect(regionName('uttaranchal')).toBe('Uttarakhand')
    expect(regionName('bengal')).toBe('West Bengal')
  })

  it('accepts Hindi and Telugu spellings', () => {
    expect(regionName('तेलंगाना')).toBe('Telangana')
    expect(regionName('బీహార్')).toBe('Bihar')
    expect(regionName('आंध्र प्रदेश')).toBe('Andhra Pradesh')
  })

  it('ignores a trailing "state"/"rajya" but not a real part of the name', () => {
    expect(regionName('Telangana state')).toBe('Telangana')
    expect(regionName('बिहार राज्य')).toBe('Bihar')
    expect(regionName('Uttar Pradesh')).toBe('Uttar Pradesh') // "Pradesh" is part of the name
  })

  it('returns null for a place it does not know instead of guessing', () => {
    expect(findRegion('Atlantis')).toBeNull()
    expect(findRegion('')).toBeNull()
    expect(findRegion('Bihar Sharif')).toBeNull() // a district name, not the state
  })

  it('compares states through their canonical identity', () => {
    expect(sameRegion('telangana', 'TELANGANA')).toBe(true)
    expect(sameRegion('TS', 'Telangana')).toBe(true)
    expect(sameRegion('Telangana', 'Bihar')).toBe(false)
    expect(sameRegion('unknown place', 'unknown   place')).toBe(true) // falls back to normalised text
  })

  it('gives the story extractor canonical names with script-aware keywords', () => {
    const telangana = STATE_KEYWORDS.find(([name]) => name === 'Telangana')!
    const keywords = telangana[1].map((k) => k.toLowerCase())
    expect(keywords).toContain('telangana')
    expect(telangana[1]).toContain('తెలంగాణ*') // Telugu suffix-tolerant prefix
    expect(telangana[1]).toContain('तेलंगाना')
  })

  it('does not feed two-letter codes to the story extractor', () => {
    // "main 35 ka hoon" must never become Karnataka through the code "KA".
    const keywords = STATE_KEYWORDS.flatMap(([, list]) => list)
    expect(keywords).not.toContain('KA')
    expect(keywords).not.toContain('UP')
    expect(regionName('KA')).toBe('Karnataka') // still valid as a typed location answer
  })
})

describe('district normalisation', () => {
  it('keeps the user spelling, trims noise and drops a trailing "district"', () => {
    expect(normalizeDistrict('  hyderabad district ')).toEqual({
      value: 'Hyderabad',
      normalized: 'hyderabad',
      script: 'latin',
    })
    expect(normalizeDistrict('Hyderabad')).toEqual(normalizeDistrict('HYDERABAD'))
  })

  it('rejects an empty or numeric answer', () => {
    expect(normalizeDistrict('   ')).toBeNull()
    expect(normalizeDistrict('123')).toBeNull()
    expect(normalizeDistrict('district')).toBeNull()
  })

  it('flags an Indic-script district as unverifiable instead of guessing a translation', () => {
    const parsed = normalizeDistrict('హైదరాబాద్ జిల్లా')!
    expect(parsed.script).toBe('indic')
    expect(sameDistrict('Hyderabad', parsed.value)).toBeNull()
  })

  it('compares districts case- and spacing-insensitively', () => {
    expect(sameDistrict('Hyderabad', ' hyderabad ')).toBe(true)
    expect(sameDistrict('Hyderabad', 'Warangal')).toBe(false)
  })
})

describe('the district table extension point', () => {
  const table = { Telangana: ['Hyderabad', 'Warangal'] }

  it('ships empty, so nothing is rejected from an unverified list', () => {
    expect(Object.keys(DISTRICTS_BY_STATE)).toHaveLength(0)
    expect(lookupDistrict(DISTRICTS_BY_STATE, 'Telangana', 'Hyderabad')).toBe('no_table')
  })

  it('matches a district from a supplied table, through the state name or code', () => {
    expect(lookupDistrict(table, 'Telangana', 'hyderabad')).toBe('match')
    expect(lookupDistrict(table, 'TS', 'Warangal district')).toBe('match')
  })

  it('distinguishes a wrong district, a state with no table and an unknown state', () => {
    expect(lookupDistrict(table, 'Telangana', 'Karimnagar')).toBe('no_match')
    expect(lookupDistrict(table, 'Bihar', 'Patna')).toBe('no_table')
    expect(lookupDistrict(table, 'Atlantis', 'Somewhere')).toBe('unknown_state')
  })
})

describe('normalizeText', () => {
  it('collapses whitespace and strips punctuation', () => {
    expect(normalizeText('  Madhya   Pradesh. ')).toBe('madhya pradesh')
  })
})
