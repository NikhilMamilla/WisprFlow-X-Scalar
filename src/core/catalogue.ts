// Catalogue validation and normalization. This is the gate every scheme passes
// through before the app uses it, whether it comes from data/schemes.json or a
// future import file. It never mutates its input and never returns a partially
// valid catalogue: if there is one error, `schemes` is empty.
import {
  BENEFICIARY_GROUPS,
  CONFIDENCE_LEVELS,
  RULE_KEYS,
  SCHEME_SCOPES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  isOfficialUrl,
  type LocalizedText,
  type Scheme,
  type SchemeSource,
  type VerificationStatus,
} from './scheme'
import { buildDependencyGraph } from './dependencies'
import { DISTRICTS_BY_STATE, findRegion, lookupDistrict, normalizeText } from './geo'
import { BOOLEAN_FIELDS, OCCUPATIONS } from './types'

export type IssueSeverity = 'error' | 'warning'

export interface ValidationIssue {
  path: string
  code: string
  message: string
  severity: IssueSeverity
  // Set for a circular dependency: the scheme ids that form the loop.
  cycle?: string[]
}

export interface ValidationReport {
  ok: boolean
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  schemes: Scheme[] // empty unless ok
}

export interface ValidationOptions {
  today?: string // YYYY-MM-DD, for date sanity checks (tests pass a fixed date)
  checkedOn?: string // catalogue-level checked_on, used when a scheme omits dates
}

const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const inList = (list: readonly string[], value: unknown): boolean => typeof value === 'string' && list.includes(value)

function validUrl(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false
  const time = Date.parse(`${value}T00:00:00Z`)
  return !Number.isNaN(time)
}

function isFutureDate(value: string, today: string): boolean {
  return value > today
}

function isValidLocalized(value: unknown, requireHindi: boolean): value is LocalizedText {
  if (!isRecord(value)) return false
  if (!isText(value.en)) return false
  if (requireHindi && !isText(value.hi)) return false
  if (value.en_roman !== undefined && !isText(value.en_roman)) return false
  if (value.te !== undefined && !isText(value.te)) return false
  return true
}

export function validateCatalogue(input: unknown, options: ValidationOptions = {}): ValidationReport {
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const error = (path: string, code: string, message: string) => errors.push({ path, code, message, severity: 'error' })
  const warn = (path: string, code: string, message: string) => warnings.push({ path, code, message, severity: 'warning' })

  const today = options.today ?? new Date().toISOString().slice(0, 10)
  const catalogue = Array.isArray(input) ? { schemes: input } : input
  if (!isRecord(catalogue) || !Array.isArray(catalogue.schemes)) {
    error('catalogue', 'invalid_catalogue', 'expected an object with a "schemes" array (or an array of schemes)')
    return { ok: false, errors, warnings, schemes: [] }
  }
  const checkedOn = isText(options.checkedOn)
    ? options.checkedOn
    : isText(catalogue.checked_on)
      ? catalogue.checked_on
      : undefined
  if (checkedOn !== undefined && !validDate(checkedOn)) {
    error('catalogue.checked_on', 'invalid_date', `"${checkedOn}" is not a YYYY-MM-DD date`)
  }

  const rawSchemes = catalogue.schemes
  const ids = new Set<string>()
  const names = new Map<string, string>() // normalized name -> id
  const aliasOwners = new Map<string, string>() // alias -> id

  rawSchemes.forEach((raw, index) => {
    const at = `schemes[${index}]`
    if (!isRecord(raw)) {
      error(at, 'invalid_scheme', 'scheme must be an object')
      return
    }
    const id = isText(raw.id) ? raw.id : ''
    const path = id ? `schemes.${id}` : at
    const key = (field: string) => `${path}.${field}`

    // --- identity ---
    if (!isText(raw.id)) error(key('id'), 'missing_id', 'scheme has no id')
    else if (!ID_PATTERN.test(raw.id)) error(key('id'), 'invalid_id', `id "${raw.id}" must be lowercase letters, digits, - or _`)
    else if (ids.has(raw.id)) error(key('id'), 'duplicate_id', `duplicate scheme id "${raw.id}"`)
    else ids.add(raw.id)

    for (const field of ['name_en', 'name_hi', 'benefit_en', 'benefit_hi', 'benefit_en_roman', 'verify_note'] as const) {
      if (!isText(raw[field])) error(key(field), 'missing_field', `${field} is required`)
    }
    if (isText(raw.name_te) && raw.name_te.trim() === '') warn(key('name_te'), 'empty_translation', 'name_te is empty')
    if (isText(raw.name_te)) {
      // Telugu text must not contain Devanagari; a copy-paste of Hindi here is a
      // silent wrong-language fallback the user would hear.
      if (/[\u0900-\u097F]/.test(raw.name_te)) error(key('name_te'), 'wrong_script', 'name_te contains Devanagari')
    }
    if (isText(raw.benefit_te) && /[\u0900-\u097F]/.test(raw.benefit_te)) {
      error(key('benefit_te'), 'wrong_script', 'benefit_te contains Devanagari')
    }
    if (!isText(raw.name_te) || !isText(raw.benefit_te)) {
      warn(path, 'missing_telugu', 'Telugu name or benefit is missing; Telugu readers get Hindi')
    }

    const normalizedName = isText(raw.name_en) ? raw.name_en.trim().toLowerCase() : ''
    if (normalizedName) {
      const owner = names.get(normalizedName)
      if (owner) warn(key('name_en'), 'duplicate_scheme', `same official name as "${owner}"`)
      else names.set(normalizedName, id || at)
    }

    // --- aliases ---
    const aliases = new Set<string>()
    if (raw.aliases !== undefined) {
      if (!Array.isArray(raw.aliases)) error(key('aliases'), 'invalid_aliases', 'aliases must be an array of strings')
      else {
        raw.aliases.forEach((alias, i) => {
          if (!isText(alias)) {
            error(`${key('aliases')}[${i}]`, 'invalid_alias', 'alias must be a non-empty string')
            return
          }
          const n = alias.trim().toLowerCase()
          if (aliases.has(n)) warn(`${key('aliases')}[${i}]`, 'duplicate_alias', `alias "${alias}" is repeated`)
          aliases.add(n)
          if (ids.has(n) && n !== id) error(`${key('aliases')}[${i}]`, 'alias_collision', `alias "${alias}" is another scheme's id`)
          const owner = aliasOwners.get(n)
          if (owner && owner !== id) error(`${key('aliases')}[${i}]`, 'alias_collision', `alias "${alias}" already belongs to "${owner}"`)
          else aliasOwners.set(n, id || at)
        })
      }
    }
    // --- classification ---
    if (raw.category !== undefined && !isText(raw.category)) {
      error(key('category'), 'invalid_category', 'category must be a non-empty string')
    } else if (raw.category === undefined) {
      warn(path, 'missing_category', 'no category; catalogue filtering will not find this scheme')
    }
    if (raw.beneficiaryGroups !== undefined) {
      if (!Array.isArray(raw.beneficiaryGroups)) {
        error(key('beneficiaryGroups'), 'invalid_beneficiaries', 'beneficiaryGroups must be an array')
      } else {
        raw.beneficiaryGroups.forEach((group, i) => {
          if (!inList(BENEFICIARY_GROUPS, group)) {
            error(`${key('beneficiaryGroups')}[${i}]`, 'invalid_beneficiary', `unknown beneficiary group "${String(group)}"`)
          }
        })
      }
    }
    if (raw.tags !== undefined && (!Array.isArray(raw.tags) || raw.tags.some((t) => !isText(t)))) {
      error(key('tags'), 'invalid_tags', 'tags must be an array of non-empty strings')
    }

    // --- geography ---
    const geography = raw.geography
    if (geography === undefined) {
      warn(path, 'missing_geography', 'no geography; treated as a central scheme')
    } else if (!isRecord(geography)) {
      error(key('geography'), 'invalid_geography', 'geography must be an object')
    } else {
      const scope = geography.scope
      if (!inList(SCHEME_SCOPES, scope)) {
        error(key('geography.scope'), 'invalid_scope', `unknown scope "${String(scope)}"`)
      }
      const states = geography.states
      if (states !== undefined && (!Array.isArray(states) || states.some((s) => !isText(s)))) {
        error(key('geography.states'), 'invalid_states', 'states must be an array of non-empty strings')
      } else if (scope === 'central' && Array.isArray(states) && states.length > 0) {
        error(key('geography.states'), 'scope_mismatch', 'a central scheme cannot list states')
      } else if (scope !== 'central' && (!Array.isArray(states) || states.length === 0)) {
        error(key('geography.states'), 'missing_states', 'a state/UT/district scheme must list at least one state')
      }
      if (Array.isArray(states)) {
        states.forEach((state, i) => {
          // A warning, not an error: a genuinely new state/UT must not be blocked by
          // our list, but a typo would silently never match, so it is surfaced.
          if (isText(state) && !findRegion(state)) {
            warn(`${key('geography.states')}[${i}]`, 'unknown_state', `"${state}" is not a recognised state or UT name`)
          }
        })
      }
      if (geography.districts === undefined) {
        if (scope === 'district') error(key('geography.districts'), 'missing_districts', 'a district scheme must list its districts')
      } else if (!Array.isArray(geography.districts) || geography.districts.some((d) => !isText(d))) {
        error(key('geography.districts'), 'invalid_districts', 'districts must be an array of non-empty strings')
      } else {
        const districts = geography.districts as string[]
        if (scope === 'central' && districts.length > 0) {
          error(key('geography.districts'), 'scope_mismatch', 'a central scheme cannot list districts')
        }
        if (scope === 'district' && districts.length === 0) {
          error(key('geography.districts'), 'missing_districts', 'a district scheme must list its districts')
        }
        if (new Set(districts.map(normalizeText)).size !== districts.length) {
          warn(key('geography.districts'), 'duplicate_district', 'a district is listed more than once')
        }
        if (districts.length > 0) {
          const declaredStates = Array.isArray(states) ? (states as string[]) : []
          const checked = declaredStates.flatMap((state) => districts.map((d) => lookupDistrict(DISTRICTS_BY_STATE, state, d)))
          if (checked.includes('no_table') || checked.length === 0) {
            warn(key('geography.districts'), 'districts_unverified', 'districts cannot be cross-checked: no verified district table is bundled')
          }
          if (checked.includes('no_match')) {
            warn(key('geography.districts'), 'district_not_in_table', 'a declared district is not in the bundled district table for its state')
          }
        }
      }
    }

    // --- eligibility rules ---
    const rules = raw.rules
    if (!isRecord(rules)) {
      error(key('rules'), 'missing_rules', 'rules must be an object (use empty not/requires for unconditional schemes)')
    } else {
      for (const operator of Object.keys(rules)) {
        if (!(RULE_KEYS as readonly string[]).includes(operator)) {
          error(key(`rules.${operator}`), 'unknown_rule', `unsupported rule operator "${operator}"`)
        }
      }
      for (const field of ['not', 'requires'] as const) {
        const list = rules[field]
        if (!Array.isArray(list)) {
          error(key(`rules.${field}`), 'invalid_rule_list', `rules.${field} must be an array`)
          continue
        }
        list.forEach((f, i) => {
          if (!inList(BOOLEAN_FIELDS, f)) error(`${key(`rules.${field}`)}[${i}]`, 'unknown_field', `unknown profile field "${String(f)}"`)
        })
      }
      const notList = Array.isArray(rules.not) ? rules.not : []
      const requiresList = Array.isArray(rules.requires) ? rules.requires : []
      for (const f of notList) {
        if (requiresList.includes(f)) {
          error(key('rules'), 'conflicting_rules', `"${String(f)}" cannot be both required and forbidden`)
        }
      }

      for (const field of ['age_min', 'age_max'] as const) {
        const value = rules[field]
        if (value === undefined || value === null) continue
        if (!isNumber(value) || value < 0 || value > 120) error(key(`rules.${field}`), 'invalid_rule_value', `${field} must be a number between 0 and 120`)
      }
      if (isNumber(rules.age_min) && isNumber(rules.age_max) && rules.age_min > rules.age_max) {
        error(key('rules'), 'conflicting_rules', `age_min ${rules.age_min} is greater than age_max ${rules.age_max}`)
      }
      const income = rules.income_max_monthly
      if (income !== undefined && income !== null && (!isNumber(income) || income < 0)) {
        error(key('rules.income_max_monthly'), 'invalid_rule_value', 'income_max_monthly must be a number >= 0')
      }
      if (rules.occupation_in !== undefined) {
        if (!Array.isArray(rules.occupation_in) || rules.occupation_in.length === 0) {
          error(key('rules.occupation_in'), 'invalid_rule_value', 'occupation_in must be a non-empty array')
        } else {
          rules.occupation_in.forEach((o, i) => {
            if (!inList(OCCUPATIONS, o)) error(`${key('rules.occupation_in')}[${i}]`, 'unknown_occupation', `unknown occupation "${String(o)}"`)
          })
        }
      }
      if (rules.urban_only !== undefined && typeof rules.urban_only !== 'boolean') {
        error(key('rules.urban_only'), 'invalid_rule_value', 'urban_only must be true or false')
      }
      if (rules.only_if !== undefined) {
        if (!isRecord(rules.only_if)) error(key('rules.only_if'), 'invalid_only_if', 'only_if must be an object')
        else {
          for (const [f, v] of Object.entries(rules.only_if)) {
            if (!inList(BOOLEAN_FIELDS, f)) error(key(`rules.only_if.${f}`), 'unknown_field', `unknown profile field "${f}"`)
            if (typeof v !== 'boolean') error(key(`rules.only_if.${f}`), 'invalid_rule_value', 'only_if values must be true or false')
          }
        }
      }
    }

    // --- documents ---
    const documents = raw.documents
    if (!Array.isArray(documents) || documents.length === 0) {
      error(key('documents'), 'missing_documents', 'at least one required document is needed for the printed sheet')
    } else {
      documents.forEach((doc, i) => {
        const dpath = `${key('documents')}[${i}]`
        if (!isRecord(doc)) {
          error(dpath, 'invalid_document', 'document must be an object')
          return
        }
        for (const f of ['en', 'hi', 'en_roman'] as const) {
          if (!isText(doc[f])) error(`${dpath}.${f}`, 'missing_field', `${f} is required for a document`)
        }
        if (!isText(doc.te)) warn(dpath, 'missing_telugu', 'document has no Telugu text; Telugu readers get Hindi')
        if (doc.required !== undefined && typeof doc.required !== 'boolean') {
          error(`${dpath}.required`, 'invalid_rule_value', 'required must be true or false')
        }
        if (doc.alternatives !== undefined) {
          if (!Array.isArray(doc.alternatives) || !doc.alternatives.every((a) => isValidLocalized(a, false))) {
            error(`${dpath}.alternatives`, 'invalid_alternatives', 'alternatives must be localized text objects')
          }
        }
        if (doc.notes !== undefined && !isValidLocalized(doc.notes, false)) {
          error(`${dpath}.notes`, 'invalid_localization', 'notes must be localized text (en required)')
        }
      })
    }

    // --- sources and verification ---
    const legacyVerified = typeof raw.rules_verified === 'boolean' ? raw.rules_verified : undefined
    const verification = raw.verification
    let status: VerificationStatus | undefined
    if (verification === undefined) {
      if (legacyVerified === undefined) {
        warn(path, 'missing_verification', 'no verification block and no rules_verified flag; status UNKNOWN')
      }
    } else if (!isRecord(verification)) {
      error(key('verification'), 'invalid_verification', 'verification must be an object')
    } else {
      if (!inList(VERIFICATION_STATUSES, verification.status)) {
        error(key('verification.status'), 'invalid_verification_status', `unknown verification status "${String(verification.status)}"`)
      } else status = verification.status as VerificationStatus
      if (verification.checkedOn !== undefined) {
        if (!validDate(verification.checkedOn)) error(key('verification.checkedOn'), 'invalid_date', 'checkedOn must be YYYY-MM-DD')
        else if (isFutureDate(verification.checkedOn as string, today)) warn(key('verification.checkedOn'), 'future_date', 'checkedOn is in the future')
      }
      for (const field of ['effectiveOn', 'expiresOn'] as const) {
        if (verification[field] !== undefined && !validDate(verification[field])) {
          error(key(`verification.${field}`), 'invalid_date', `${field} must be YYYY-MM-DD`)
        }
      }
      if (
        validDate(verification.effectiveOn) &&
        validDate(verification.expiresOn) &&
        (verification.expiresOn as string) < (verification.effectiveOn as string)
      ) {
        error(key('verification'), 'invalid_date_range', 'expiresOn is before effectiveOn')
      }
      // A verification status without a date is an unfalsifiable claim.
      if ((status === 'VERIFIED' || status === 'PARTIALLY_VERIFIED') && !verification.checkedOn && !checkedOn) {
        error(key('verification.checkedOn'), 'missing_checked_on', 'a verified or partially verified scheme needs the date it was checked')
      }
      if (validDate(verification.expiresOn) && (verification.expiresOn as string) < today) {
        warn(key('verification.expiresOn'), 'expired_verification', 'verification has lapsed; the scheme will load as OUTDATED')
      }
      if (verification.confidence !== undefined && !inList(CONFIDENCE_LEVELS, verification.confidence)) {
        error(key('verification.confidence'), 'invalid_confidence', 'confidence must be high, medium or low')
      }
      if (verification.sources !== undefined) {
        if (!Array.isArray(verification.sources) || verification.sources.length === 0) {
          error(key('verification.sources'), 'invalid_sources', 'sources must be a non-empty array when present')
        } else {
          let official = false
          verification.sources.forEach((source, i) => {
            const spath = `${key('verification.sources')}[${i}]`
            if (!isRecord(source)) {
              error(spath, 'invalid_source', 'source must be an object with a url')
              return
            }
            if (!validUrl(source.url)) error(`${spath}.url`, 'invalid_url', `"${String(source.url)}" is not a valid http(s) URL`)
            if (source.type !== undefined && !inList(SOURCE_TYPES, source.type)) {
              error(`${spath}.type`, 'invalid_source_type', `unknown source type "${String(source.type)}"`)
            }
            for (const f of ['publishedOn', 'lastChecked', 'effectiveOn', 'expiresOn'] as const) {
              if (source[f] !== undefined && !validDate(source[f])) error(`${spath}.${f}`, 'invalid_date', `${f} must be YYYY-MM-DD`)
            }
            if (validDate(source.expiresOn) && (source.expiresOn as string) < today) {
              warn(`${spath}.expiresOn`, 'expired_source', 'this source has lapsed')
            }
            if (source.official === true || (source.official === undefined && validUrl(source.url) && isOfficialUrl(source.url as string))) {
              official = true
            }
          })
          if (!official) warn(key('verification.sources'), 'no_official_source', 'none of the sources look official (gov.in / nic.in)')
        }
      }
    }
    if (!validUrl(raw.source_url)) error(key('source_url'), 'invalid_url', 'source_url must be an http(s) URL')
    else if (!isOfficialUrl(raw.source_url as string)) warn(key('source_url'), 'unofficial_source', 'source_url is not a government domain')

    if (raw.prerequisites !== undefined) {
      if (!Array.isArray(raw.prerequisites) || raw.prerequisites.some((p) => !isText(p))) {
        error(key('prerequisites'), 'invalid_prerequisites', 'prerequisites must be an array of scheme ids')
      } else if (new Set(raw.prerequisites).size !== raw.prerequisites.length) {
        warn(key('prerequisites'), 'duplicate_prerequisite', 'a prerequisite is listed more than once')
      }
    }
    if (raw.provides !== undefined) {
      if (!Array.isArray(raw.provides)) error(key('provides'), 'invalid_provides', 'provides must be an array')
      else {
        raw.provides.forEach((f, i) => {
          if (!inList(BOOLEAN_FIELDS, f)) error(`${key('provides')}[${i}]`, 'unknown_field', `unknown profile field "${String(f)}"`)
        })
      }
    }
    if (raw.application !== undefined) {
      if (!isRecord(raw.application)) error(key('application'), 'invalid_application', 'application must be an object')
      else {
        if (raw.application.url !== undefined && !validUrl(raw.application.url)) {
          error(key('application.url'), 'invalid_url', 'application.url is not a valid http(s) URL')
        }
        if (raw.application.steps !== undefined) {
          if (!Array.isArray(raw.application.steps) || !raw.application.steps.every((s) => isValidLocalized(s, true))) {
            error(key('application.steps'), 'invalid_localization', 'application.steps must be localized text with en and hi')
          }
        }
      }
    }
    if (raw.benefits !== undefined) {
      if (!Array.isArray(raw.benefits)) error(key('benefits'), 'invalid_benefits', 'benefits must be an array')
      else {
        raw.benefits.forEach((b, i) => {
          if (!isRecord(b) || !isValidLocalized(b.description, true)) {
            error(`${key('benefits')}[${i}].description`, 'invalid_localization', 'benefit description must have en and hi text')
          }
        })
      }
    }

    if (status === 'DISCONTINUED' && raw.prerequisites && Array.isArray(raw.prerequisites) && raw.prerequisites.length > 0) {
      warn(path, 'discontinued_prerequisite', 'a discontinued scheme is still used as a prerequisite')
    }
  })

  // Dependency checks run on whatever parsed; missing ids and cycles are errors.
  const parsed = rawSchemes.filter(isRecord)
  const dependencyScheme = parsed.map(
    (s) =>
      ({
        id: typeof s.id === 'string' ? s.id : '',
        prerequisites: Array.isArray(s.prerequisites) ? s.prerequisites.filter((p): p is string => typeof p === 'string') : [],
      }) as Scheme,
  )
  for (const depError of buildDependencyGraph(dependencyScheme).errors) {
    errors.push({
      path: depError.path,
      code: depError.code,
      message: depError.message,
      severity: 'error',
      ...(depError.cycle ? { cycle: depError.cycle } : {}),
    })
  }

  if (errors.length > 0) return { ok: false, errors, warnings, schemes: [] }

  const schemes = rawSchemes.map((raw) => normalizeScheme(raw as Record<string, unknown>, checkedOn, today))
  return { ok: true, errors, warnings, schemes }
}

// Fills the derived fields so the rest of the app only ever sees one shape.
function normalizeScheme(raw: Record<string, unknown>, checkedOn: string | undefined, today: string): Scheme {
  const scheme = raw as unknown as Scheme
  const verificationBlock = (raw.verification ?? {}) as Scheme['verification']
  const declared: VerificationStatus =
    verificationBlock.status ??
    (raw.rules_verified === true ? 'VERIFIED' : raw.rules_verified === false ? 'UNVERIFIED' : 'UNKNOWN')
  // Lapsed verification must not keep reading as current.
  const lapsed =
    declared !== 'DISCONTINUED' &&
    typeof verificationBlock.expiresOn === 'string' &&
    validDate(verificationBlock.expiresOn) &&
    verificationBlock.expiresOn < today
  const status: VerificationStatus = lapsed ? 'OUTDATED' : declared
  const givenSources = verificationBlock.sources
  const sources: SchemeSource[] | undefined =
    givenSources && givenSources.length > 0
      ? givenSources.map((s) => ({ ...s, official: s.official ?? isOfficialUrl(s.url) }))
      : undefined
  const derivedSource: SchemeSource | undefined =
    !sources && typeof raw.source_url === 'string'
      ? { url: raw.source_url, official: isOfficialUrl(raw.source_url), ...(checkedOn ? { lastChecked: checkedOn } : {}) }
      : undefined

  return {
    ...scheme,
    geography: scheme.geography ?? { scope: 'central' },
    verification: {
      ...verificationBlock,
      status,
      ...(verificationBlock.checkedOn ?? checkedOn ? { checkedOn: verificationBlock.checkedOn ?? checkedOn } : {}),
      ...(sources ? { sources } : derivedSource ? { sources: [derivedSource] } : {}),
    },
    rules_verified: status === 'VERIFIED',
    aliases: scheme.aliases ?? [],
  } as Scheme
}
