// Prerequisite and dependency handling. Two kinds of dependency exist:
//   1. profile-field prerequisites (rules.requires): true/false conditions such
//      as "needs a bank account". These can be satisfied, unmet or unknown.
//   2. scheme-id prerequisites: "this scheme needs that scheme first". These are
//      structural and used for ordering and validation.
import type { Scheme } from './scheme'
import type { BooleanField, Profile } from './types'

export type DependencyErrorCode = 'missing_prerequisite' | 'circular_dependency'

export interface DependencyError {
  code: DependencyErrorCode
  path: string
  message: string
  cycle?: string[]
}

export interface DependencyGraph {
  // scheme id -> scheme ids it directly depends on
  deps: ReadonlyMap<string, string[]>
  // scheme id -> scheme ids that point at it
  dependents: ReadonlyMap<string, string[]>
  errors: DependencyError[]
}

export function buildDependencyGraph(schemes: readonly Scheme[]): DependencyGraph {
  const ids = new Set(schemes.map((s) => s.id))
  const deps = new Map<string, string[]>()
  const dependents = new Map<string, string[]>()
  const errors: DependencyError[] = []

  for (const s of schemes) {
    const list = [...new Set(s.prerequisites ?? [])]
    deps.set(s.id, list)
    for (const [i, dep] of list.entries()) {
      if (!ids.has(dep)) {
        errors.push({
          code: 'missing_prerequisite',
          path: `schemes.${s.id}.prerequisites[${i}]`,
          message: `${s.id} requires unknown scheme "${dep}"`,
        })
        continue
      }
      if (dep === s.id) {
        errors.push({
          code: 'circular_dependency',
          path: `schemes.${s.id}.prerequisites[${i}]`,
          message: `${s.id} requires itself`,
          cycle: [s.id, s.id],
        })
        continue
      }
      const back = dependents.get(dep) ?? []
      if (!back.includes(s.id)) back.push(s.id)
      dependents.set(dep, back)
    }
  }

  // Depth-first search for cycles; each cycle is reported once from its
  // smallest id so the message does not depend on catalogue order.
  const seen = new Set<string>()
  const reported = new Set<string>()
  const stack: string[] = []
  const onStack = new Set<string>()

  function visit(id: string) {
    if (onStack.has(id)) {
      const cycle = stack.slice(stack.indexOf(id)).concat(id)
      const key = [...cycle].sort().join('>')
      if (!reported.has(key)) {
        reported.add(key)
        errors.push({
          code: 'circular_dependency',
          path: `schemes.${id}.prerequisites`,
          message: `circular prerequisite chain: ${cycle.join(' -> ')}`,
          cycle,
        })
      }
      return
    }
    if (seen.has(id)) return
    seen.add(id)
    stack.push(id)
    onStack.add(id)
    for (const dep of deps.get(id) ?? []) {
      // A self-reference is already reported above; walking it again would
      // report the same cycle twice.
      if (dep !== id && ids.has(dep)) visit(dep)
    }
    stack.pop()
    onStack.delete(id)
  }

  for (const id of ids) visit(id)
  return { deps, dependents, errors }
}

export interface PrerequisiteStep {
  kind: 'field' | 'scheme'
  id: string // profile field name, or scheme id
  // true: already met, false: known unmet, null: not known yet
  satisfied: boolean | null
  // for a field step: the scheme that provides it, if any
  providedBy?: string
}

export interface PrerequisiteReport {
  // schemes to satisfy first, in evaluation order, starting with direct deps
  order: string[]
  steps: PrerequisiteStep[]
  unknownFields: BooleanField[]
  unmetFields: BooleanField[]
  missingSchemeIds: string[]
  cycle: string[] | null
}

// Flattens both dependency kinds for one scheme. `profile` may be partial;
// unknown values stay null and are reported, never treated as unmet.
export function resolvePrerequisites(
  schemes: readonly Scheme[],
  schemeId: string,
  profile: Profile,
  providers: ReadonlyMap<BooleanField, string[]> = new Map(),
): PrerequisiteReport {
  const byId = new Map(schemes.map((s) => [s.id, s]))
  const scheme = byId.get(schemeId)
  const report: PrerequisiteReport = {
    order: [],
    steps: [],
    unknownFields: [],
    unmetFields: [],
    missingSchemeIds: [],
    cycle: null,
  }
  if (!scheme) return report

  for (const field of scheme.rules.requires) {
    const value = profile[field]
    const step: PrerequisiteStep = { kind: 'field', id: field, satisfied: value === null ? null : value === true }
    const provider = providers.get(field)?.[0]
    if (provider) step.providedBy = provider
    report.steps.push(step)
    if (value === null) report.unknownFields.push(field)
    else if (value === false) report.unmetFields.push(field)
  }

  const visiting = new Set<string>()
  const chain: string[] = []
  function walk(id: string) {
    if (visiting.has(id)) {
      const cycle = chain.slice(chain.indexOf(id)).concat(id)
      report.cycle = cycle
      return
    }
    const node = byId.get(id)
    if (!node) {
      if (!report.missingSchemeIds.includes(id)) report.missingSchemeIds.push(id)
      return
    }
    visiting.add(id)
    chain.push(id)
    for (const dep of node.prerequisites ?? []) {
      if (!report.missingSchemeIds.includes(dep)) {
        report.steps.push({ kind: 'scheme', id: dep, satisfied: null })
        if (byId.has(dep)) report.order.push(dep)
      }
      walk(dep)
    }
    chain.pop()
    visiting.delete(id)
  }
  walk(schemeId)

  return report
}

// Schemes that cannot be reached because they sit in a prerequisite cycle.
export function schemesInCycles(schemes: readonly Scheme[]): string[][] {
  const graph = buildDependencyGraph(schemes)
  return graph.errors.filter((e) => e.code === 'circular_dependency' && e.cycle).map((e) => e.cycle!)
}
