import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchSchemes } from './search'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const index = buildSearchIndex(SCHEMES)
const ids = (query: string) => searchSchemes(index, query).map((s) => s.id)

describe('scheme search', () => {
  it('finds a scheme by its official name', () => {
    expect(ids('PM SVANidhi')[0]).toBe('svanidhi')
    expect(ids('e-Shram')[0]).toBe('eshram')
  })

  it('finds a scheme by an alias', () => {
    expect(ids('jan dhan')[0]).toBe('pmjdy')
    expect(ids('pm-sym')[0]).toBe('pmsym')
    expect(ids('suraksha bima')[0]).toBe('pmsby')
  })

  it('finds a scheme by category and tag, with category matches ranked first', () => {
    // PM Jan Dhan mentions insurance in its benefit text, so it appears too, lower.
    expect(ids('insurance').slice(0, 2)).toEqual(['pmsby', 'pmjjby'])
    expect(ids('pension')).toContain('pmsym')
    expect(ids('street vendors')).toEqual(['svanidhi'])
  })

  it('searches the description/benefit text', () => {
    expect(ids('unorganised')).toContain('eshram')
    expect(ids('accident')).toContain('pmsby')
  })

  it('searches Hindi and Telugu names', () => {
    expect(ids('जन धन')[0]).toBe('pmjdy')
    expect(ids('జన్ ధన్')[0]).toBe('pmjdy')
    expect(ids('స్వనిధి')).toContain('svanidhi')
  })

  it('ignores case, extra spaces and punctuation', () => {
    expect(ids('  JAN   DHAN. ')[0]).toBe('pmjdy')
    expect(ids('e shram')[0]).toBe('eshram')
  })

  it('returns nothing for an empty or unknown query', () => {
    expect(searchSchemes(index, '')).toEqual([])
    expect(searchSchemes(index, '   ')).toEqual([])
    expect(searchSchemes(index, 'no such scheme')).toEqual([])
  })

  it('honours a result limit', () => {
    expect(searchSchemes(index, 'bima', { limit: 1 })).toHaveLength(1)
    expect(searchSchemes(index, 'bima').length).toBeGreaterThan(1)
  })

  it('finds a state scheme by its state', () => {
    const telangana: Scheme = {
      ...clone(SCHEMES[0]),
      id: 'tg_state',
      name_en: 'Telangana Rythu Bharosa',
      aliases: [],
      geography: { scope: 'state', states: ['Telangana'] },
    }
    const withState = buildSearchIndex([...clone(SCHEMES), telangana])
    expect(searchSchemes(withState, 'telangana').map((s) => s.id)).toEqual(['tg_state'])
    expect(searchSchemes(withState, 'TS').map((s) => s.id)).toEqual(['tg_state'])
  })

  it('stays usable with a catalogue of two thousand schemes', () => {
    const many: Scheme[] = Array.from({ length: 2000 }, (_, i) => ({
      ...clone(SCHEMES[0]),
      id: `scheme_${i}`,
      name_en: `Test Scheme ${i}`,
      aliases: [`alias ${i}`],
      category: i % 2 === 0 ? 'insurance' : 'pension',
    }))
    const bigIndex = buildSearchIndex(many)
    expect(searchSchemes(bigIndex, 'Test Scheme 1999').map((s) => s.id)).toEqual(['scheme_1999'])
    expect(searchSchemes(bigIndex, 'alias 42')[0].id).toBe('scheme_42')
    expect(searchSchemes(bigIndex, 'insurance', { limit: 5 })).toHaveLength(5)
  })
})
