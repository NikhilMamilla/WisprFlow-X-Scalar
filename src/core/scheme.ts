// The scheme data model: one shape for central, state, union territory and
// district schemes. The rule values stay in data/schemes.json; nothing here
// decides eligibility, it only describes what a scheme record may contain.
import type { BooleanField, Occupation } from './types'

export const SCHEME_SCOPES = ['central', 'state', 'union_territory', 'multi_state', 'district'] as const
export type SchemeScope = (typeof SCHEME_SCOPES)[number]

export const BENEFICIARY_GROUPS = [
  'individual',
  'household',
  'family',
  'student',
  'worker',
  'farmer',
  'business',
  'organization',
  'community',
] as const
export type BeneficiaryGroup = (typeof BENEFICIARY_GROUPS)[number]

// Verification is metadata about how much of the rule set has been checked
// against official sources. It never changes eligibility on its own.
export const VERIFICATION_STATUSES = [
  'VERIFIED',
  'PARTIALLY_VERIFIED',
  'UNVERIFIED',
  'OUTDATED',
  'DISCONTINUED',
  'UNKNOWN',
] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const SOURCE_TYPES = [
  'government_portal',
  'ministry',
  'state_government',
  'scheme_portal',
  'notification',
  'other',
] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export type Confidence = (typeof CONFIDENCE_LEVELS)[number]

// Any user-facing text that exists in more than one language. Telugu is
// optional here only so that adding a scheme does not require a Telugu
// translator before it can be validated; the UI falls back Telugu -> Hindi and
// never to English (see localization.ts).
export interface LocalizedText {
  en: string
  hi: string
  en_roman?: string
  te?: string
}

// The eligibility rule operators the engine understands. Adding a new operator
// means adding it here, compiling it in rules.ts, and adding its UI string.
export const RULE_KEYS = [
  'age_min',
  'age_max',
  'income_max_monthly',
  'occupation_in',
  'urban_only',
  'only_if',
  'not',
  'requires',
] as const
export type RuleKey = (typeof RULE_KEYS)[number]

export interface SchemeRules {
  age_min?: number | null
  age_max?: number | null
  income_max_monthly?: number | null
  occupation_in?: Occupation[]
  urban_only?: boolean
  // The scheme is 'not_needed' unless every field here matches. Checked first.
  only_if?: Partial<Record<BooleanField, boolean>>
  not: BooleanField[] // must be false
  requires: BooleanField[] // must be true
}

export interface DocumentName {
  en: string
  hi: string
  en_roman: string // Hinglish, Roman script
  te?: string
  // A missing `required` means required. Optional/conditional/alternative
  // documents are supported so that a bigger catalogue does not force every
  // document into one flat list.
  required?: boolean
  condition?: string // rule id this document depends on, e.g. "has_aadhaar_false"
  alternatives?: LocalizedText[]
  notes?: LocalizedText
}

export interface SchemeGeography {
  scope: SchemeScope
  states?: string[] // names or codes; required for every scope except central
  districts?: string[]
  authority?: string
}

export interface SchemeSource {
  title?: string
  url: string
  type?: SourceType
  issuedBy?: string
  official?: boolean // derived from the domain when not stated
  publishedOn?: string // YYYY-MM-DD
  lastChecked?: string // YYYY-MM-DD
  effectiveOn?: string // YYYY-MM-DD, when the source takes effect
  expiresOn?: string // YYYY-MM-DD, when the source lapses
  notes?: string
}

export interface SchemeVerification {
  status: VerificationStatus
  // Required for VERIFIED and PARTIALLY_VERIFIED: a status without a date is a claim.
  checkedOn?: string
  effectiveOn?: string // YYYY-MM-DD
  // After this date the status is downgraded to OUTDATED at load time, so stale
  // rules are never presented as current.
  expiresOn?: string
  confidence?: Confidence
  sources?: SchemeSource[]
  notes?: string
}

export interface SchemeApplication {
  steps?: LocalizedText[]
  url?: string
  online?: boolean
  offline?: boolean
  department?: string
  helpline?: string
  deadline?: string
}

// Structured benefits, for schemes whose benefit is more than one sentence.
// The flat benefit_* fields stay the user-facing one-liner.
export interface SchemeBenefit {
  description: LocalizedText
  amount?: number
  amountNote?: string
  frequency?: string
  duration?: string
  conditions?: LocalizedText
}

export interface Scheme {
  id: string
  aliases?: string[]
  name_en: string
  name_hi: string
  name_te?: string
  benefit_en: string
  benefit_hi: string
  benefit_en_roman: string // Hinglish, Roman script
  benefit_te?: string
  category?: string // free text: adding a category is a data change, not a code change
  tags?: string[]
  beneficiaryGroups?: BeneficiaryGroup[]
  geography: SchemeGeography
  rules: SchemeRules
  documents: DocumentName[]
  // Boolean profile fields this scheme establishes for the user, e.g. PM Jan
  // Dhan provides has_bank_account. Used to point a blocked scheme at the
  // scheme that unblocks it.
  provides?: BooleanField[]
  // Scheme-id dependencies. Field-level requirements live in rules.requires.
  prerequisites?: string[]
  application?: SchemeApplication
  benefits?: SchemeBenefit[]
  source_url: string
  verification: SchemeVerification
  rules_verified: boolean // derived: verification.status === 'VERIFIED'
  verify_note: string
}

// Official-looking domains we are willing to call official without a human
// checking each one. A source may also set `official` explicitly.
const OFFICIAL_SUFFIXES = ['.gov.in', '.nic.in', '.gov', '.mil.in']

export function isOfficialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return OFFICIAL_SUFFIXES.some((suffix) => host === suffix.slice(1) || host.endsWith(suffix))
  } catch {
    return false
  }
}

// A scheme provides every boolean field it says it provides; PM Jan Dhan
// provides has_bank_account. First scheme by catalogue order wins the pointer.
export function providerMap(schemes: readonly Scheme[]): Map<BooleanField, string[]> {
  const out = new Map<BooleanField, string[]>()
  for (const s of schemes) {
    for (const field of s.provides ?? []) {
      const list = out.get(field) ?? []
      if (!list.includes(s.id)) list.push(s.id)
      out.set(field, list)
    }
  }
  return out
}
