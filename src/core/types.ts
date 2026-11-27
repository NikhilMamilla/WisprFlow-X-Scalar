export const OCCUPATIONS = [
  'street_vendor',
  'construction_worker',
  'delivery_rider',
  'domestic_worker',
  'other',
] as const
export type Occupation = (typeof OCCUPATIONS)[number]

export const BOOLEAN_FIELDS = [
  'has_bank_account',
  'has_aadhaar',
  'in_epf_esic_nps',
  'pays_income_tax',
] as const
export type BooleanField = (typeof BOOLEAN_FIELDS)[number]

export const PROFILE_FIELDS = [
  'age',
  'occupation',
  'urban_or_rural',
  'monthly_income',
  ...BOOLEAN_FIELDS,
  'dependants',
  'state',
  'district',
] as const
export type ProfileField = (typeof PROFILE_FIELDS)[number]

// null = the user did not say it. Never fill a field by guessing.
export interface Profile {
  age: number | null
  occupation: Occupation | null
  urban_or_rural: 'urban' | 'rural' | null
  monthly_income: number | null
  income_estimated: boolean // true when monthly_income was derived (e.g. daily wage x 26)
  has_bank_account: boolean | null
  has_aadhaar: boolean | null
  in_epf_esic_nps: boolean | null
  pays_income_tax: boolean | null
  dependants: number | null
  state: string | null // canonical state/UT name once recognised
  district: string | null // user's own district spelling; never guessed
  evidence: Partial<Record<ProfileField, string>> // the user's exact words per field
}

export type ExtractFn = (transcript: string, lang: string) => Promise<Profile>

export function emptyProfile(): Profile {
  return {
    age: null,
    occupation: null,
    urban_or_rural: null,
    monthly_income: null,
    income_estimated: false,
    has_bank_account: null,
    has_aadhaar: null,
    in_epf_esic_nps: null,
    pays_income_tax: null,
    dependants: null,
    state: null,
    district: null,
    evidence: {},
  }
}

const nullableBool = { type: ['boolean', 'null'] }

// Same shape as Profile, for the optional LLM extractor (M5) to return.
export const PROFILE_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Profile',
  type: 'object',
  additionalProperties: false,
  required: [...PROFILE_FIELDS, 'income_estimated', 'evidence'],
  properties: {
    age: { type: ['integer', 'null'], minimum: 0, maximum: 120 },
    occupation: { enum: [...OCCUPATIONS, null] },
    urban_or_rural: { enum: ['urban', 'rural', null] },
    monthly_income: { type: ['number', 'null'], minimum: 0 },
    income_estimated: { type: 'boolean' },
    has_bank_account: nullableBool,
    has_aadhaar: nullableBool,
    in_epf_esic_nps: nullableBool,
    pays_income_tax: nullableBool,
    dependants: { type: ['integer', 'null'], minimum: 0 },
    state: { type: ['string', 'null'] },
    district: { type: ['string', 'null'] },
    evidence: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(PROFILE_FIELDS.map((f) => [f, { type: 'string' }])),
    },
  },
} as const
