import { describe, expect, it } from 'vitest'
import {
  CITIZEN_STATES,
  NOT_VERIFIED,
  assessEvidence,
  citizenQuestions,
  citizenStateForCondition,
  explainForCitizen,
  explainScheme,
  formatAnswer,
  questionForField,
  stateLabel,
} from './citizen'
import { SCHEMES } from './schemes'
import type { Scheme } from './scheme'
import { emptyProfile, type Profile } from './types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const byId = (id: string) => SCHEMES.find((s) => s.id === id)!
const profile = (fields: Partial<Profile>): Profile => ({ ...emptyProfile(), ...fields })

const vendor = profile({
  age: 32,
  occupation: 'street_vendor',
  urban_or_rural: 'urban',
  monthly_income: 10000,
  has_bank_account: true,
  has_aadhaar: true,
  in_epf_esic_nps: false,
  pays_income_tax: false,
})

// A state scheme built from a real record, so no invented rules enter data/schemes.json.
const telanganaScheme: Scheme = {
  ...clone(byId('pmsym')),
  id: 'telangana_explanation_test',
  name_en: 'Telangana explanation test scheme',
  aliases: [],
  prerequisites: [],
  provides: [],
  rules: { age_min: 18, not: [], requires: [] },
  geography: { scope: 'state', states: ['Telangana'], districts: ['Warangal'] },
}

describe('citizen result states', () => {
  it('reports LIKELY_ELIGIBLE when every condition passes on verified rules', () => {
    const result = explainScheme(vendor, byId('pmsym'))
    expect(result.state).toBe('LIKELY_ELIGIBLE')
    expect(result.failed).toEqual([])
    expect(result.unknown).toEqual([])
    expect(result.conditions.every((c) => c.result === 'PASSED')).toBe(true)
    expect(result.evidence.sufficient).toBe(true)
  })

  it('reports NOT_ELIGIBLE with the exact failed condition and why', () => {
    const result = explainScheme({ ...vendor, age: 42 }, byId('pmsym'))
    expect(result.state).toBe('NOT_ELIGIBLE')
    expect(result.failed).toEqual(['pmsym:age_max'])
    const age = result.conditions.find((c) => c.id === 'pmsym:age_max')!
    expect(age).toMatchObject({ result: 'FAILED', yourValue: 42, requirementValue: 40, prerequisite: false })
    expect(age.reason).toContain('42')
    expect(age.reason).toContain('40')
    // Passing conditions are still reported, so the explanation is not one-sided.
    expect(result.satisfied).toContain('pmsym:age_min')
  })

  it('reports MORE_INFORMATION_NEEDED for a missing answer, never a failure', () => {
    const result = explainScheme({ ...vendor, monthly_income: null }, byId('pmsym'))
    expect(result.state).toBe('MORE_INFORMATION_NEEDED')
    expect(result.failed).toEqual([])
    expect(result.unknown).toEqual(['pmsym:income_max_monthly'])
    const income = result.conditions.find((c) => c.id === 'pmsym:income_max_monthly')!
    expect(income.result).toBe('UNKNOWN')
    expect(income.yourValue).toBeNull()
    expect(income.reason).toBe('You have not answered this yet.')
  })

  it('reports NEEDS_VERIFICATION when answers fit but the rules are not confirmed', () => {
    const result = explainScheme(vendor, byId('eshram'))
    expect(result.state).toBe('NEEDS_VERIFICATION')
    expect(result.failed).toEqual([])
    expect(result.evidence.sufficient).toBe(false)
    expect(result.evidence.reasons.join(' ')).toMatch(/not been checked|part of this scheme/i)
    expect(result.evidence.notes.join(' ')).toContain('upper age limit')
  })

  it('does not call an unverified failure a definite rejection', () => {
    // svanidhi is PARTIALLY_VERIFIED and urban-only: a rural answer fails a rule
    // whose coverage is incomplete, so the honest state is NEEDS_VERIFICATION.
    const result = explainScheme({ ...vendor, urban_or_rural: 'rural' }, byId('svanidhi'))
    expect(result.failed).toEqual(['svanidhi:urban_only'])
    expect(result.state).toBe('NEEDS_VERIFICATION')
    expect(result.evidence.sufficient).toBe(false)
  })

  it('treats a failed prerequisite as a blocker with the scheme that unblocks it', () => {
    const result = explainScheme({ ...vendor, has_bank_account: false }, byId('pmsby'))
    expect(result.state).toBe('NOT_ELIGIBLE')
    expect(result.blockedBy).toEqual(['has_bank_account'])
    expect(result.unlockedBy).toBe('pmjdy')
    expect(result.conditions.find((c) => c.prerequisite)!.result).toBe('FAILED')
    expect(result.summary.toLowerCase()).toContain('bank account')
  })

  it('marks a discontinued scheme as excluded rather than rejected', () => {
    const discontinued: Scheme = { ...clone(byId('pmsym')), verification: { status: 'DISCONTINUED' }, rules_verified: false }
    const report = explainForCitizen(vendor, [discontinued])
    expect(report.results).toEqual([])
    expect(report.excluded).toEqual([
      expect.objectContaining({ schemeId: 'pmsym', reason: 'discontinued' }),
    ])
  })
})

describe('geography in explanations', () => {
  it('asks for the state instead of guessing, and offers it as a question', () => {
    const result = explainScheme(profile({ age: 30 }), telanganaScheme)
    expect(result.state).toBe('MORE_INFORMATION_NEEDED')
    expect(result.conditions.map((c) => c.id)).toContain('telangana_explanation_test:geography_state')
    expect(result.unknown).toContain('telangana_explanation_test:geography_state')
    const questions = citizenQuestions([result])
    expect(questions.map((q) => q.field)).toEqual(['state', 'district'])
  })

  it('excludes a scheme outside the citizen state', () => {
    const report = explainForCitizen(profile({ state: 'Bihar' }), [telanganaScheme])
    expect(report.results).toEqual([])
    expect(report.excluded[0]).toMatchObject({ reason: 'outside_your_state' })
    expect(report.excluded[0].detail).toContain('Telangana')
  })

  it('passes the location conditions once state and district are known', () => {
    const result = explainScheme(profile({ age: 30, state: 'Telangana', district: 'Warangal' }), telanganaScheme)
    const state = result.conditions.find((c) => c.id.endsWith(':geography_state'))!
    const district = result.conditions.find((c) => c.id.endsWith(':geography_district'))!
    expect(state).toMatchObject({ result: 'PASSED', yourValue: 'Telangana' })
    expect(district.result).toBe('PASSED')
  })
})

describe('citizen questions', () => {
  it('asks for missing information only, and never twice for the same field', () => {
    const report = explainForCitizen(emptyProfile())
    const fields = report.questions.map((q) => q.field)
    expect(new Set(fields).size).toBe(fields.length)
    expect(new Set(report.questions.map((q) => q.id)).size).toBe(report.questions.length)
    for (const question of report.questions) {
      expect(question.conditions.length).toBeGreaterThan(0)
      expect(question.schemes.length).toBeGreaterThan(0)
      expect(question.required).toBe(true)
    }
  })

  it('groups one shared field into a single question for every scheme that needs it', () => {
    const report = explainForCitizen(emptyProfile())
    const age = report.questions.find((q) => q.field === 'age')!
    expect(age.id).toBe('question_age')
    expect(age.schemes).toEqual(expect.arrayContaining(['eshram', 'pmsym', 'pmsby', 'pmjjby']))
    expect(age.conditions).toContain('pmsym:age_min')
    expect(age.conditions).toContain('pmsby:age_max')
  })

  it('does not ask anything once every condition is answered', () => {
    const report = explainForCitizen(vendor)
    expect(report.questions).toEqual([])
    expect(report.results.every((r) => r.state !== 'MORE_INFORMATION_NEEDED')).toBe(true)
  })

  it('asks only for questions that appear on an unanswered condition', () => {
    const report = explainForCitizen(profile({ age: 30, state: 'Bihar' }))
    const conditionIds = new Set(report.results.flatMap((r) => r.conditions.map((c) => c.id)))
    for (const question of report.questions) {
      for (const id of question.conditions) expect(conditionIds.has(id)).toBe(true)
    }
  })

  it('never asks for a district when no scheme in play restricts districts', () => {
    const report = explainForCitizen(emptyProfile())
    expect(report.questions.some((q) => q.field === 'district')).toBe(false)
  })

  it('carries validation rules the citizen answer can be checked against', () => {
    expect(questionForField('age').validation).toEqual({ min: 0, max: 120, integer: true })
    expect(questionForField('monthly_income').validation).toEqual({ min: 0, max: 100000000 })
    expect(questionForField('state').validation?.options).toContain('Telangana')
    expect(questionForField('occupation').validation?.options).toContain('street vendor')
    expect(questionForField('has_aadhaar')).toMatchObject({ input: 'yes_no', group: 'your_situation' })
    expect(questionForField('occupation').input).toBe('choice')
  })

  it('uses stable ids and human wording, with no internal vocabulary', () => {
    const report = explainForCitizen(emptyProfile())
    for (const question of report.questions) {
      expect(question.id).toBe(`question_${question.field}`)
      expect(question.text.endsWith('?')).toBe(true)
      expect(question.text).not.toMatch(/monthly_income|has_aadhaar|in_epf|urban_or_rural|only_if|ruleId/)
    }
  })

  it('orders questions by how many schemes they unblock, then a fixed order', () => {
    const report = explainForCitizen(emptyProfile())
    for (let i = 1; i < report.questions.length; i += 1) {
      expect(report.questions[i - 1].schemes.length).toBeGreaterThanOrEqual(report.questions[i].schemes.length)
    }
  })
})

describe('application and source transparency', () => {
  it('never invents an application step, link, amount or deadline', () => {
    const result = explainScheme(vendor, byId('pmsym'))
    expect(result.application.procedure).toEqual([])
    expect(result.application.link).toBeNull()
    expect(result.application.deadline).toBeNull()
    expect(result.application.amount).toBeNull()
    expect(result.application.unavailable).toContain('application link')
    expect(result.application.unavailable).toContain('assistance amount')
    // Documents do exist in the catalogue, so they are reported, not withheld.
    expect(result.application.documents.length).toBeGreaterThan(0)
  })

  it('exposes documented application facts when the scheme has them', () => {
    const withApplication: Scheme = {
      ...clone(byId('pmsym')),
      application: {
        steps: [{ en: 'Apply at the bank branch where you hold the account.', hi: 'आवेदन करें।' }],
        url: 'https://www.npscra.nsdl.co.in/',
        deadline: '2026-12-31',
      },
      documents: [{ en: 'Aadhaar card', hi: 'आधार कार्ड', en_roman: 'Aadhaar card' }],
    }
    const result = explainScheme(vendor, withApplication)
    expect(result.application.procedure).toEqual(['Apply at the bank branch where you hold the account.'])
    expect(result.application.link).toBe('https://www.npscra.nsdl.co.in/')
    expect(result.application.deadline).toBe('2026-12-31')
    expect(result.application.unavailable).not.toContain('application link')
  })

  it('attributes every condition to the scheme source without claiming verification', () => {
    const result = explainScheme(vendor, byId('eshram'))
    expect(result.sources).toHaveLength(1)
    expect(result.sources[0]).toMatchObject({
      url: byId('eshram').source_url,
      official: true,
      verificationStatus: 'PARTIALLY_VERIFIED',
      checkedOn: byId('eshram').verification.checkedOn,
    })
    for (const condition of result.conditions) expect(condition.sourceUrl).toBe(byId('eshram').source_url)
    // A partially verified scheme is never dressed up as verified.
    expect(result.sources[0].verificationStatus).not.toBe('VERIFIED')
  })

  it('keeps a titled source title and department', () => {
    const withSource: Scheme = {
      ...clone(byId('pmsby')),
      verification: {
        ...byId('pmsby').verification,
        sources: [{ title: 'PMSBY guidelines', url: 'https://jansuraksha.gov.in/pmsby.pdf', issuedBy: 'DFS' }],
      },
    }
    const result = explainScheme(vendor, withSource)
    expect(result.sources[0]).toMatchObject({ title: 'PMSBY guidelines', department: 'DFS' })
  })

  it('flags short evidence and carries the register note verbatim', () => {
    const evidence = assessEvidence(byId('svanidhi'))
    expect(evidence.sufficient).toBe(false)
    expect(evidence.reasons).toHaveLength(1)
    expect(evidence.notes.length).toBeGreaterThan(0)
  })
})

describe('report level behaviour', () => {
  it('reports nothing as eligible when almost nothing is known', () => {
    const report = explainForCitizen(emptyProfile())
    expect(report.counts.LIKELY_ELIGIBLE).toBe(0)
    expect(report.counts.NOT_ELIGIBLE).toBe(0)
    expect(report.counts.MORE_INFORMATION_NEEDED).toBe(report.results.length)
    expect(report.counts.NEEDS_VERIFICATION).toBe(0)
  })

  it('counts every result under exactly one state', () => {
    const report = explainForCitizen(vendor)
    const total = CITIZEN_STATES.reduce((sum, state) => sum + report.counts[state], 0)
    expect(total).toBe(report.results.length)
    expect(report.results.length + report.excluded.length).toBe(SCHEMES.length)
  })

  it('is deterministic across runs', () => {
    expect(explainForCitizen(vendor)).toEqual(explainForCitizen(vendor))
    expect(explainForCitizen(emptyProfile())).toEqual(explainForCitizen(emptyProfile()))
  })

  it('labels states in citizen words while keeping stable keys', () => {
    expect(CITIZEN_STATES).toEqual(['LIKELY_ELIGIBLE', 'NOT_ELIGIBLE', 'MORE_INFORMATION_NEEDED', 'NEEDS_VERIFICATION'])
    expect(stateLabel('MORE_INFORMATION_NEEDED')).toBe('More information needed')
    expect(citizenStateForCondition('unknown')).toBe('UNKNOWN')
    expect(NOT_VERIFIED).toBe('Information not verified yet.')
  })

  it('formats answers in words, never raw enum values', () => {
    expect(formatAnswer('street_vendor', 'occupation')).toBe('street vendor')
    expect(formatAnswer('urban', 'urban_or_rural')).toBe('a town or city')
    expect(formatAnswer(true, 'has_bank_account')).toBe('yes')
    expect(formatAnswer(32, 'age')).toBe('32')
  })
})
