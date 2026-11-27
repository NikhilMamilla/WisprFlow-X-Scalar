import { describe, expect, it } from 'vitest'
import { buildDependencyGraph, resolvePrerequisites, schemesInCycles } from './dependencies'
import { providerMap, type Scheme } from './scheme'
import { SCHEMES } from './schemes'
import { emptyProfile, type BooleanField, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

function scheme(
  id: string,
  options: { prerequisites?: string[]; requires?: BooleanField[]; provides?: BooleanField[] } = {},
): Scheme {
  return {
    ...clone(SCHEMES[0]),
    id,
    name_en: id,
    prerequisites: options.prerequisites ?? [],
    provides: options.provides ?? [],
    rules: { ...clone(SCHEMES[0].rules), requires: options.requires ?? [], not: [] },
  }
}

const profile = (fields: Partial<Profile>): Profile => ({ ...emptyProfile(), ...fields })

describe('buildDependencyGraph', () => {
  it('links a single prerequisite both ways', () => {
    const graph = buildDependencyGraph([scheme('a', { prerequisites: ['b'] }), scheme('b')])
    expect(graph.deps.get('a')).toEqual(['b'])
    expect(graph.dependents.get('b')).toEqual(['a'])
    expect(graph.errors).toEqual([])
  })

  it('handles several prerequisites and a chain', () => {
    const graph = buildDependencyGraph([
      scheme('a', { prerequisites: ['b', 'c'] }),
      scheme('b', { prerequisites: ['c'] }),
      scheme('c'),
    ])
    expect(graph.deps.get('a')).toEqual(['b', 'c'])
    expect(graph.dependents.get('c')).toEqual(['a', 'b'])
    expect(graph.errors).toEqual([])
  })

  it('reports a missing prerequisite id instead of dropping it', () => {
    const graph = buildDependencyGraph([scheme('a', { prerequisites: ['ghost'] })])
    expect(graph.errors).toHaveLength(1)
    expect(graph.errors[0].code).toBe('missing_prerequisite')
    expect(graph.errors[0].message).toContain('ghost')
  })

  it('detects a two-scheme cycle, a longer cycle and a self-reference', () => {
    const two = buildDependencyGraph([scheme('a', { prerequisites: ['b'] }), scheme('b', { prerequisites: ['a'] })])
    expect(two.errors.map((e) => e.code)).toEqual(['circular_dependency'])
    expect(two.errors[0].cycle).toEqual(['a', 'b', 'a'])

    const three = buildDependencyGraph([
      scheme('a', { prerequisites: ['b'] }),
      scheme('b', { prerequisites: ['c'] }),
      scheme('c', { prerequisites: ['a'] }),
    ])
    expect(three.errors.some((e) => e.code === 'circular_dependency')).toBe(true)
    expect(schemesInCycles([scheme('a', { prerequisites: ['a'] })])).toEqual([['a', 'a']])
  })

  it('does not report a cycle for a diamond dependency', () => {
    const graph = buildDependencyGraph([
      scheme('a', { prerequisites: ['b', 'c'] }),
      scheme('b', { prerequisites: ['d'] }),
      scheme('c', { prerequisites: ['d'] }),
      scheme('d'),
    ])
    expect(graph.errors).toEqual([])
  })
})

describe('resolvePrerequisites', () => {
  const providers = providerMap(SCHEMES)

  it('lists the scheme chain in evaluation order', () => {
    const schemes = [
      scheme('a', { prerequisites: ['b'] }),
      scheme('b', { prerequisites: ['c'] }),
      scheme('c'),
    ]
    const report = resolvePrerequisites(schemes, 'a', emptyProfile())
    expect(report.order).toEqual(['b', 'c'])
    expect(report.steps.filter((s) => s.kind === 'scheme').map((s) => s.id)).toEqual(['b', 'c'])
    expect(report.cycle).toBeNull()
  })

  it('distinguishes a satisfied, unmet and unknown field prerequisite', () => {
    const schemes = [scheme('a', { requires: ['has_aadhaar'] })]
    expect(resolvePrerequisites(schemes, 'a', profile({ has_aadhaar: true })).unmetFields).toEqual([])
    expect(resolvePrerequisites(schemes, 'a', profile({ has_aadhaar: false })).unmetFields).toEqual(['has_aadhaar'])
    const unknown = resolvePrerequisites(schemes, 'a', emptyProfile())
    expect(unknown.unknownFields).toEqual(['has_aadhaar'])
    expect(unknown.unmetFields).toEqual([])
  })

  it('points a missing bank account at PM Jan Dhan', () => {
    const report = resolvePrerequisites(SCHEMES, 'pmsby', profile({ has_bank_account: false }), providers)
    expect(report.unmetFields).toEqual(['has_bank_account'])
    expect(report.steps.find((s) => s.id === 'has_bank_account')!.providedBy).toBe('pmjdy')
  })

  it('reports a cycle and a missing scheme id rather than recursing forever', () => {
    const cyclic = resolvePrerequisites(
      [scheme('a', { prerequisites: ['b'] }), scheme('b', { prerequisites: ['a'] })],
      'a',
      emptyProfile(),
    )
    expect(cyclic.cycle).toEqual(['a', 'b', 'a'])

    const missing = resolvePrerequisites([scheme('a', { prerequisites: ['ghost'] })], 'a', emptyProfile())
    expect(missing.missingSchemeIds).toEqual(['ghost'])
  })
})
