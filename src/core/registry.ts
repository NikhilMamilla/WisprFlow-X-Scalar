// Central catalogue index. The matcher and the UI both read schemes from here;
// nothing else keeps its own copy of scheme information.
import { normalizeDistrict, normalizeText, sameRegion } from './geo'
import { matchSchemes, type MatchResult } from './matcher'
import { checksFor, type CompiledChecks } from './rules'
import { SCHEMES } from './schemes'
import type { BeneficiaryGroup, Scheme, SchemeScope, VerificationStatus } from './scheme'
import { buildSearchIndex, type SearchIndex } from './search'
import type { BooleanField, Occupation, Profile } from './types'

export interface SchemeRegistry {
  schemes: Scheme[]
  byId: ReadonlyMap<string, Scheme>
  byAlias: ReadonlyMap<string, Scheme>
  byCategory: ReadonlyMap<string, Scheme[]>
  byState: ReadonlyMap<string, Scheme[]>
  byDistrict: ReadonlyMap<string, Scheme[]>
  searchIndex: SearchIndex
  // scheme id -> compiled, frozen rule set. Built once with the registry.
  checks: ReadonlyMap<string, CompiledChecks>
  // Boolean field -> scheme ids that provide it (e.g. has_bank_account -> pmjdy)
  providers: ReadonlyMap<BooleanField, string[]>
  // scheme id -> schemes that require it
  dependents: ReadonlyMap<string, Scheme[]>
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key) ?? []
  if (!list.includes(value)) list.push(value)
  map.set(key, list)
}

export function buildRegistry(schemes: Scheme[]): SchemeRegistry {
  const byId = new Map<string, Scheme>()
  const byAlias = new Map<string, Scheme>()
  const byCategory = new Map<string, Scheme[]>()
  const byState = new Map<string, Scheme[]>()
  const byDistrict = new Map<string, Scheme[]>()
  const providers = new Map<BooleanField, string[]>()
  const dependents = new Map<string, Scheme[]>()
  const checks = new Map<string, CompiledChecks>()

  for (const s of schemes) {
    if (byId.has(s.id)) throw new Error(`duplicate scheme id "${s.id}"`)
    // Compile here, once, so matching never recompiles a rule set.
    checks.set(s.id, checksFor(s))
    byId.set(s.id, s)
    for (const alias of s.aliases ?? []) {
      const key = alias.trim().toLowerCase()
      const owner = byAlias.get(key)
      if (owner && owner.id !== s.id) throw new Error(`alias "${alias}" is used by ${owner.id} and ${s.id}`)
      byAlias.set(key, s)
    }
    if (s.category) push(byCategory, s.category, s)
    // Keys are normalised so "Telangana", "telangana" and "TS" land in one bucket.
    for (const state of s.geography.states ?? []) push(byState, normalizeText(state), s)
    for (const district of s.geography.districts ?? []) push(byDistrict, normalizeText(district), s)
    for (const field of s.provides ?? []) push(providers, field, s.id)
    for (const dep of s.prerequisites ?? []) push(dependents, dep, s)
  }

  return {
    schemes,
    byId,
    byAlias,
    byCategory,
    byState,
    byDistrict,
    searchIndex: buildSearchIndex(schemes),
    checks,
    providers,
    dependents,
  }
}

export function findScheme(registry: SchemeRegistry, idOrAlias: string): Scheme | undefined {
  return registry.byId.get(idOrAlias) ?? registry.byAlias.get(idOrAlias.trim().toLowerCase())
}

// Schemes from a scheme-id's dependents that are not discontinued.
export function dependentsOf(registry: SchemeRegistry, schemeId: string): Scheme[] {
  return (registry.dependents.get(schemeId) ?? []).filter((s) => s.verification.status !== 'DISCONTINUED')
}

// Central schemes plus the schemes explicitly applicable in a state.
export function applicableInState(registry: SchemeRegistry, state: string): Scheme[] {
  return registry.schemes.filter(
    (s) => s.geography.scope === 'central' || (s.geography.states ?? []).some((x) => sameRegion(x, state)),
  )
}

// The internal filtering foundation for a larger catalogue. Every filter is
// optional; category and state use the prebuilt index, the rest are a single
// pass over the narrowed list.
export interface CatalogueFilter {
  category?: string
  tag?: string
  beneficiaryGroup?: BeneficiaryGroup
  scope?: SchemeScope
  state?: string
  // Schemes that apply in this district: district-restricted ones that list it,
  // plus every scheme without a district restriction.
  district?: string
  occupation?: Occupation
  verification?: VerificationStatus | VerificationStatus[]
  provides?: BooleanField
  requiresScheme?: string
  availableOnly?: boolean
}

export function filterSchemes(registry: SchemeRegistry, filter: CatalogueFilter = {}): Scheme[] {
  let list: Scheme[] =
    filter.category !== undefined ? (registry.byCategory.get(filter.category) ?? []) : registry.schemes
  if (filter.state !== undefined) {
    const state = filter.state
    list = list.filter(
      (s) => s.geography.scope === 'central' || (s.geography.states ?? []).some((x) => sameRegion(x, state)),
    )
  }
  if (filter.district !== undefined) {
    const district = filter.district
    const wanted = normalizeDistrict(district)?.normalized ?? normalizeText(district)
    list = list.filter((s) => {
      const districts = s.geography.districts ?? []
      return districts.length === 0 || districts.some((d) => normalizeText(d) === wanted)
    })
  }
  if (filter.requiresScheme !== undefined) {
    list = list.filter((s) => (s.prerequisites ?? []).includes(filter.requiresScheme!))
  }
  const verification = filter.verification === undefined ? undefined : ([] as VerificationStatus[]).concat(filter.verification)
  return list.filter((s) => {
    if (filter.availableOnly && s.verification.status === 'DISCONTINUED') return false
    if (filter.scope && s.geography.scope !== filter.scope) return false
    if (filter.tag && !(s.tags ?? []).includes(filter.tag)) return false
    if (filter.beneficiaryGroup && !(s.beneficiaryGroups ?? []).includes(filter.beneficiaryGroup)) return false
    if (filter.occupation && !(s.rules.occupation_in ?? []).includes(filter.occupation)) return false
    if (verification && !verification.includes(s.verification.status)) return false
    if (filter.provides && !(s.provides ?? []).includes(filter.provides)) return false
    return true
  })
}

// Matching through the registry reuses the prebuilt provider map, so a larger
// catalogue does not rebuild it on every story. Evaluation is still one pass
// per scheme: O(schemes x conditions) with no repeated parsing.
export function matchCatalogue(registry: SchemeRegistry, profile: Profile): MatchResult[] {
  return matchSchemes(profile, registry.schemes, registry.providers, registry.checks)
}

export const REGISTRY: SchemeRegistry = buildRegistry(SCHEMES)
