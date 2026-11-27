import { describe, expect, it } from 'vitest'
import { REGISTRY, buildRegistry, dependentsOf, applicableInState, filterSchemes, findScheme } from './registry'
import { searchSchemes } from './search'
import type { Scheme } from './scheme'
import { SCHEMES } from './schemes'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const ids = (schemes: Scheme[]) => schemes.map((s) => s.id)

describe('the bundled registry', () => {
  it('indexes all six schemes by id', () => {
    expect([...REGISTRY.byId.keys()]).toEqual(['eshram', 'pmsym', 'pmsby', 'pmjjby', 'svanidhi', 'pmjdy'])
  })

  it('finds a scheme by id or alias', () => {
    expect(findScheme(REGISTRY, 'pmjdy')!.id).toBe('pmjdy')
    expect(findScheme(REGISTRY, 'jan dhan')!.id).toBe('pmjdy')
    expect(findScheme(REGISTRY, 'pm-sym')!.id).toBe('pmsym')
    expect(findScheme(REGISTRY, 'not a scheme')).toBeUndefined()
  })

  it('indexes by category and by the field a scheme provides', () => {
    expect(ids(REGISTRY.byCategory.get('insurance')!)).toEqual(['pmsby', 'pmjjby'])
    expect(REGISTRY.byCategory.get('pension')!.map((s) => s.id)).toEqual(['pmsym'])
    expect(REGISTRY.providers.get('has_bank_account')).toEqual(['pmjdy'])
    expect(REGISTRY.byState.size).toBe(0) // all six are central schemes
  })

  it('treats every central scheme as applicable in any state', () => {
    expect(ids(applicableInState(REGISTRY, 'Telangana'))).toHaveLength(6)
  })

  it('has no dependency edges until scheme-id prerequisites are added', () => {
    expect(REGISTRY.dependents.size).toBe(0)
    expect(dependentsOf(REGISTRY, 'pmjdy')).toEqual([])
  })
})

describe('filterSchemes', () => {
  it('filters on the axes the catalogue is expected to grow along', () => {
    expect(ids(filterSchemes(REGISTRY, { category: 'insurance' }))).toEqual(['pmsby', 'pmjjby'])
    expect(ids(filterSchemes(REGISTRY, { scope: 'central' }))).toHaveLength(6)
    expect(ids(filterSchemes(REGISTRY, { occupation: 'street_vendor' }))).toEqual(['svanidhi'])
    expect(ids(filterSchemes(REGISTRY, { provides: 'has_bank_account' }))).toEqual(['pmjdy'])
    expect(ids(filterSchemes(REGISTRY, { verification: 'VERIFIED' }))).toHaveLength(4)
    expect(ids(filterSchemes(REGISTRY, { beneficiaryGroup: 'business' }))).toEqual(['svanidhi'])
    expect(ids(filterSchemes(REGISTRY, { tag: 'street_vendors' }))).toEqual(['svanidhi'])
    expect(ids(filterSchemes(REGISTRY, { state: 'Telangana', availableOnly: true }))).toHaveLength(6)
    expect(filterSchemes(REGISTRY, { category: 'nope' })).toEqual([])
  })

  it('can ask which schemes depend on a given scheme', () => {
    const withDep: Scheme[] = [
      ...clone(SCHEMES),
      { ...clone(SCHEMES[2]), id: 'pmsby_state', name_en: 'State accident cover', aliases: [], prerequisites: ['pmjdy'] },
    ]
    const registry = buildRegistry(withDep)
    expect(ids(filterSchemes(registry, { requiresScheme: 'pmjdy' }))).toEqual(['pmsby_state'])
    expect(ids(dependentsOf(registry, 'pmjdy'))).toEqual(['pmsby_state'])
  })
})

describe('geography indexes', () => {
  const stateScheme: Scheme = {
    ...clone(SCHEMES[0]),
    id: 'tg_state',
    name_en: 'Telangana state scheme',
    aliases: [],
    geography: { scope: 'state', states: ['Telangana'] },
  }
  const districtScheme: Scheme = {
    ...stateScheme,
    id: 'tg_district',
    name_en: 'Telangana district scheme',
    geography: { scope: 'district', states: ['Telangana'], districts: ['Hyderabad'] },
  }
  const registry = buildRegistry([...clone(SCHEMES), stateScheme, districtScheme])

  it('indexes states under a normalised key, and resolves a code through the evaluator', () => {
    expect(ids(registry.byState.get('telangana')!)).toEqual(['tg_state', 'tg_district'])
    // A code is not a separate index key, but it still resolves when filtering.
    expect(ids(applicableInState(registry, 'TS'))).toContain('tg_state')
  })

  it('indexes districts', () => {
    expect(ids(registry.byDistrict.get('hyderabad')!)).toEqual(['tg_district'])
  })

  it('filters by state including national schemes, with any spelling', () => {
    expect(ids(filterSchemes(registry, { state: 'telangana' }))).toContain('tg_state')
    expect(ids(filterSchemes(registry, { state: 'TS' }))).toContain('tg_district')
    expect(ids(filterSchemes(registry, { state: 'Bihar' }))).not.toContain('tg_state')
  })

  it('filters by district without dropping schemes that have no district restriction', () => {
    const inHyderabad = ids(filterSchemes(registry, { district: 'Hyderabad' }))
    expect(inHyderabad).toContain('tg_district')
    expect(inHyderabad).toContain('tg_state') // state-wide, so applies in every district
    expect(inHyderabad).toContain('pmsym')
    expect(ids(filterSchemes(registry, { district: 'Warangal' }))).not.toContain('tg_district')
  })

  it('searches through the registry index', () => {
    expect(searchSchemes(registry.searchIndex, 'telangana').map((s) => s.id)).toEqual(['tg_state', 'tg_district'])
  })
})

describe('buildRegistry guards', () => {
  it('refuses a duplicate id', () => {
    expect(() => buildRegistry([clone(SCHEMES[0]), clone(SCHEMES[0])])).toThrow(/duplicate scheme id/)
  })

  it('refuses an alias owned by another scheme', () => {
    const clash: Scheme = { ...clone(SCHEMES[1]), id: 'pension_copy', name_en: 'Pension copy', aliases: ['jan dhan'] }
    expect(() => buildRegistry([...clone(SCHEMES), clash])).toThrow(/alias/)
  })

  it('stays quick with a catalogue in the thousands', () => {
    const many: Scheme[] = Array.from({ length: 2000 }, (_, i) => ({
      ...clone(SCHEMES[0]),
      id: `scheme_${i}`,
      name_en: `Scheme ${i}`,
      aliases: [`alias_${i}`],
      category: i % 2 === 0 ? 'insurance' : 'pension',
    }))
    const registry = buildRegistry(many)
    expect(filterSchemes(registry, { category: 'insurance' })).toHaveLength(1000)
    expect(findScheme(registry, 'alias_1999')!.id).toBe('scheme_1999')
  })
})
