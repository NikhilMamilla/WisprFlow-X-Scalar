// Rule-based profile extractor. Every field stays null unless the user clearly said it.
// Keywords ending in * are prefix matches (Telugu suffixes); see text.tokenMatches.
import { STATE_KEYWORDS } from './geo'
import { findNumbers, type NumberSpan } from './numbers'
import { BOUNDARY, findAll, phrases, quote, tokenize, type Hit, type Phrase } from './text'
import { emptyProfile, type BooleanField, type ExtractFn, type Occupation, type Profile, type ProfileField } from './types'

// One utterance gave two different values for a field: the field stays null, and the
// dialog can ask the user which one is right.
export interface Conflict {
  field: ProfileField
  values: (string | number | boolean)[]
}

const NEGATION = phrases([
  'nahi', 'nahin', 'nai', 'nhi', 'na', 'mat', 'no', 'not', 'never',
  'नहीं', 'नही', 'ना', 'मत',
  'లేదు', 'లేరు', 'లేదండి',
])
const TAG_BEFORE_NA = phrases(['hai', 'tha', 'है', 'था']) // "hai na?" is a tag question, not a "no"
const CONJUNCTIONS = phrases(['aur', 'और', 'tatha', 'and', 'మరియు'])

const BOOL_KEYWORDS: Record<BooleanField, Phrase[]> = {
  has_bank_account: phrases([
    'bank account', 'bank khata', 'account', 'khata', 'jan dhan', 'jandhan', 'passbook',
    'बैंक खाता', 'बैंक अकाउंट', 'खाता', 'अकाउंट', 'जन धन',
    'బ్యాంక్ అకౌంట్', 'బ్యాంకు ఖాతా', 'బ్యాంకు అకౌంట్', 'అకౌంట్*', 'ఖాతా*',
  ]),
  has_aadhaar: phrases([
    'aadhaar card', 'aadhaar', 'aadhar', 'adhar', 'आधार कार्ड', 'आधार', 'ఆధార్ కార్డు', 'ఆధార్*',
  ]),
  in_epf_esic_nps: phrases([
    'epf', 'pf', 'esic', 'esi', 'nps', 'provident fund', 'पीएफ', 'ईपीएफ', 'पी एफ', 'ईएसआईसी', 'పీఎఫ్*',
  ]),
  pays_income_tax: phrases([
    'income tax', 'tax', 'itr', 'इनकम टैक्स', 'टैक्स', 'आयकर', 'ట్యాక్స్*', 'పన్ను*',
  ]),
}

// "bank account bhai ke naam pe hai": the account exists, but it is not the user's.
const RELATIVES = phrases([
  'bhai', 'bhaiya', 'behen', 'bahan', 'pati', 'patni', 'biwi', 'wife', 'husband', 'papa', 'pitaji',
  'father', 'maa', 'mummy', 'mother', 'beta', 'beti', 'sasur',
  'भाई', 'बहन', 'पति', 'पत्नी', 'बीवी', 'पिता', 'पापा', 'मां', 'माता', 'बेटा', 'बेटी', 'ससुर',
  'అన్న', 'అన్నయ్య', 'తమ్ముడు', 'భర్త', 'భార్య', 'నాన్న',
])
const NAME = phrases(['naam', 'name', 'नाम', 'పేరు*'])
const OWN = phrases(['mera', 'mere', 'meri', 'apna', 'apne', 'apni', 'my', 'मेरा', 'मेरे', 'मेरी', 'अपना', 'अपने', 'अपनी', 'నా'])

const OCCUPATION_KEYWORDS: [Occupation, Phrase[]][] = [
  ['street_vendor', phrases([
    'thela', 'thele', 'thelewala', 'thela wala', 'rehdi', 'rehri', 'redi', 'rehadi', 'patri', 'patri wala',
    'sabzi wala', 'sabziwala', 'sabji wala', 'sabzi bechta', 'sabzi bechti', 'sabji bechta',
    'phal wala', 'phalwala', 'pheriwala', 'pheri wala', 'hawker', 'vendor', 'street vendor',
    'ठेला', 'ठेले', 'ठेलेवाला', 'रेहड़ी', 'पटरी', 'सब्ज़ी वाला', 'सब्जीवाला', 'सब्ज़ी बेचता', 'सब्ज़ी बेचती',
    'फल वाला', 'फेरीवाला',
    'కూరగాయలు అమ్ము*', 'పండ్లు అమ్ము*',
  ])],
  ['construction_worker', phrases([
    'mason', 'mistri', 'mistry', 'raj mistri', 'rajmistri', 'mazdoor', 'mazdur', 'majdoor', 'majdur',
    'mazdoori', 'majdoori', 'labour', 'labor', 'construction', 'beldar', 'coolie', 'kuli', 'kooli',
    'मज़दूर', 'मज़दूरी', 'मिस्त्री', 'राजमिस्त्री', 'कुली', 'बेलदार', 'लेबर',
    'కూలి*', 'కూలీ*', 'మేస్త్రి*',
  ])],
  ['delivery_rider', phrases([
    'delivery', 'delivery boy', 'zomato', 'swiggy', 'zepto', 'blinkit', 'dunzo', 'rider', 'parcel',
    'डिलीवरी', 'डिलिवरी', 'ज़ोमैटो', 'स्विगी',
    'డెలివరీ*',
  ])],
  ['domestic_worker', phrases([
    'ghar ka kaam', 'gharon mein kaam', 'gharon me kaam', 'gharon ka kaam', 'jhadu', 'jhaadu', 'pocha',
    'pochha', 'bartan', 'safai', 'safaai', 'maid', 'kaamwali', 'kamwali',
    'घर का काम', 'घरों में काम', 'घरों का काम', 'झाड़ू', 'पोछा', 'पोंछा', 'बर्तन', 'सफ़ाई', 'कामवाली',
    'పని మనిషి*', 'ఇంటి పని*',
  ])],
  ['other', phrases([
    'rickshaw', 'riksha', 'rikshaw', 'auto', 'driver', 'रिक्शा', 'ऑटो', 'ड्राइवर', 'ఆటో*', 'డ్రైవర్*',
  ])],
]

const URBAN = phrases(['shahar', 'shehar', 'sheher', 'shaher', 'city', 'town', 'शहर', 'పట్నం*', 'నగరం*'])
const RURAL = phrases(['gaon', 'gaanv', 'gaav', 'village', 'dehat', 'गांव', 'गाँव', 'गाव', 'देहात', 'పల్లె*', 'గ్రామ*'])

// The state/UT table lives in geo.ts: one source of truth, shared with the
// follow-up answers and the geography evaluator.
const STATES: [string, Phrase[]][] = STATE_KEYWORDS.map(([name, list]) => [name, phrases(list)])

const CHILD = phrases([
  'bachche', 'bacche', 'bachhe', 'bache', 'bachcha', 'baccha', 'bachchi', 'beta', 'bete', 'beti',
  'betiyan', 'betiya', 'kids', 'children', 'child',
  'बच्चे', 'बच्चा', 'बच्ची', 'बेटा', 'बेटे', 'बेटी', 'बेटियां',
  'పిల్ల*',
])

const AGE_AFTER = phrases(['saal', 'varsh', 'baras', 'year', 'years', 'yrs', 'yr', 'साल', 'वर्ष', 'बरस', 'సంవత్సర*', 'ఏళ్ళు', 'ఏళ్లు'])
const AGE_BEFORE = phrases(['umar', 'umr', 'umra', 'umer', 'age', 'उम्र', 'उमर', 'आयु', 'వయస్సు*', 'వయసు*'])
// "das saal se thela" = for ten years: a duration, not an age.
const DURATION_AFTER = phrases(['se', 'से', 'pehle', 'पहले', 'ho', 'हो', 'hue', 'हुए', 'from', 'since', 'ago', 'నుండి*', 'నుంచి*'])
// A self-closing clause ("35 ka hoon", "battis saal ki hoon") beats a bare "N saal" fragment,
// which can describe someone else ("ek 12 saal ka aur ek 8 saal ka, main 35 ka hoon").
const KA_KI = phrases(['ka', 'ki', 'ke', 'का', 'की', 'के'])
const SELF_COPULA = phrases(['hoon', 'hu', 'hun', 'ho', 'hain', 'हूँ', 'हूं', 'हू', 'हो', 'हैं'])

const MONTH = phrases([
  'mahina', 'mahine', 'mahinay', 'month', 'monthly', 'महीना', 'महीने', 'महिना', 'माह', 'నెల*',
  'salary', 'tankhwah', 'tankha', 'pagaar', 'pagar', 'vetanam', 'सैलरी', 'तनख्वाह', 'तनख़ा', 'तनखा', 'पगार',
])
const DAY = phrases(['roz', 'roj', 'rozana', 'rojana', 'daily', 'din', 'dihadi', 'dihari', 'day', 'रोज़', 'रोज़ाना', 'दिन', 'दिहाड़ी', 'రోజు*', 'రోజూ'])
const WORKING_DAYS_PER_MONTH = 26

const AGE_RANGE: [number, number] = [10, 100]
const MAX_DEPENDANTS = 10 // also rejects "bara beta" (elder son) read as barah = 12

function matchesAt(norm: string[], i: number, list: Phrase[]): boolean {
  return i >= 0 && i < norm.length && findAll([norm[i]], list.filter((p) => p.length === 1)).length > 0
}

function hitsIn(norm: string[], lo: number, hi: number, list: Phrase[]): Hit[] {
  const from = Math.max(0, lo)
  return findAll(norm.slice(from, Math.min(norm.length, hi + 1)), list).map((h) => ({
    start: h.start + from,
    end: h.end + from,
  }))
}

// Tokens around a hit, cut at punctuation, at "aur", and at other fields' keywords.
function windowAround(norm: string[], hit: Hit, before: number, after: number, stops: Set<number>): [number, number] {
  const blocked = (i: number) => norm[i] === BOUNDARY || stops.has(i)
  let lo = hit.start
  while (lo > 0 && hit.start - lo < before && !blocked(lo - 1)) lo--
  let hi = hit.end
  while (hi < norm.length - 1 && hi - hit.end < after && !blocked(hi + 1)) hi++
  return [lo, hi]
}

function negated(norm: string[], hit: Hit, lo: number, hi: number): boolean {
  return hitsIn(norm, lo, hi, NEGATION).some((n) => {
    if (n.start >= hit.start && n.end <= hit.end) return false
    return !((norm[n.start] === 'na' || norm[n.start] === 'ना') && matchesAt(norm, n.start - 1, TAG_BEFORE_NA))
  })
}

const CLAUSE_VERB = phrases(['hai', 'hain', 'है', 'हैं', 'ఉన్నారు'])

// "beti ki umar 12 saal" is the daughter's age; "bachche hain, umar 32" is not.
function childContextBefore(norm: string[], start: number): boolean {
  for (let i = start - 1; i >= Math.max(0, start - 3); i--) {
    if (norm[i] === BOUNDARY || matchesAt(norm, i, CLAUSE_VERB)) return false
    if (matchesAt(norm, i, CHILD)) return true
  }
  return false
}

function indexSet(hits: Hit[]): Set<number> {
  const s = new Set<number>()
  for (const h of hits) for (let i = h.start; i <= h.end; i++) s.add(i)
  return s
}

// Resolves to the one distinct value said, or null when nothing (or more than one) was.
function resolve<T extends string | number | boolean>(
  values: T[],
  field: ProfileField,
  conflicts: Conflict[],
): T | null {
  const unique = [...new Set(values)]
  if (unique.length > 1) conflicts.push({ field, values: unique })
  return unique.length === 1 ? unique[0] : null
}

function extractCore(transcript: string): { profile: Profile; conflicts: Conflict[] } {
  const conflicts: Conflict[] = []
  const { raw, norm } = tokenize(transcript)
  const profile = emptyProfile()
  const numbers = findNumbers(norm)
  const used = new Set<NumberSpan>()
  const conj = findAll(norm, CONJUNCTIONS)

  const boolHits = Object.fromEntries(
    (Object.keys(BOOL_KEYWORDS) as BooleanField[]).map((f) => [f, findAll(norm, BOOL_KEYWORDS[f])]),
  ) as Record<BooleanField, Hit[]>
  const occHits = OCCUPATION_KEYWORDS.map(([occ, list]) => [occ, findAll(norm, list)] as const)
  const allKeywordHits = [...Object.values(boolHits).flat(), ...occHits.flatMap(([, h]) => h)]

  function stopsFor(own: Hit[]): Set<number> {
    const mine = indexSet(own)
    const s = indexSet([...conj, ...allKeywordHits])
    for (const i of mine) s.delete(i)
    return s
  }

  // --- yes/no fields ---
  for (const field of Object.keys(BOOL_KEYWORDS) as BooleanField[]) {
    const hits = boolHits[field]
    const stops = stopsFor(hits)
    const values: boolean[] = []
    let evidence = ''
    for (const hit of hits) {
      const [lo, hi] = windowAround(norm, hit, 2, 3, stops)
      let value = !negated(norm, hit, lo, hi)
      let [qlo, qhi] = [lo, hi]
      if (value && field === 'has_bank_account') {
        const [olo, ohi] = windowAround(norm, hit, 3, 5, stops)
        const relative = hitsIn(norm, olo, ohi, RELATIVES).length > 0
        const named = hitsIn(norm, olo, ohi, NAME).length > 0
        const own = hitsIn(norm, olo, ohi, OWN).length > 0
        if (relative || (named && !own)) {
          value = false
          ;[qlo, qhi] = [olo, ohi]
        }
      }
      values.push(value)
      evidence ||= quote(raw, qlo, qhi)
    }
    const v = resolve(values, field, conflicts)
    if (v !== null) {
      profile[field] = v
      profile.evidence[field] = evidence
    }
  }

  // --- occupation: one specific category, or "other" if that is all we heard ---
  const occFound: { occ: Occupation; lo: number; hi: number }[] = []
  for (const [occ, hits] of occHits) {
    const stops = stopsFor(hits)
    for (const hit of hits) {
      const [lo, hi] = windowAround(norm, hit, 2, 3, stops)
      if (!negated(norm, hit, lo, hi)) occFound.push({ occ, lo, hi })
    }
  }
  const specific = occFound.filter((o) => o.occ !== 'other')
  const occPool = specific.length > 0 ? specific : occFound
  const occ = resolve(occPool.map((o) => o.occ), 'occupation', conflicts)
  if (occ !== null) {
    profile.occupation = occ
    profile.evidence.occupation = quote(raw, occPool[0].lo, occPool[0].hi)
  }

  // --- urban / rural ---
  const place = (list: Phrase[]) =>
    findAll(norm, list).filter((hit) => {
      const [lo, hi] = windowAround(norm, hit, 2, 3, new Set())
      return !negated(norm, hit, lo, hi)
    })
  const urban = place(URBAN)
  const rural = place(RURAL)
  if (urban.length > 0 && rural.length > 0) {
    conflicts.push({ field: 'urban_or_rural', values: ['urban', 'rural'] })
  } else if (urban.length > 0 !== rural.length > 0) {
    const hit = (urban[0] ?? rural[0])!
    profile.urban_or_rural = urban.length > 0 ? 'urban' : 'rural'
    profile.evidence.urban_or_rural = quote(raw, hit.start, hit.end)
  }

  // --- state ---
  const states = STATES.flatMap(([name, list]) => findAll(norm, list).map((hit) => ({ name, hit })))
  const state = resolve(states.map((s) => s.name), 'state', conflicts)
  if (state !== null) {
    profile.state = state
    profile.evidence.state = quote(raw, states[0].hit.start, states[0].hit.end)
  }

  // --- age ---
  const strongAges: { span: NumberSpan; lo: number; hi: number }[] = []
  const weakAges: { span: NumberSpan; lo: number; hi: number }[] = []
  for (const span of numbers) {
    if (span.value < AGE_RANGE[0] || span.value > AGE_RANGE[1]) continue
    if (childContextBefore(norm, span.start)) continue

    let selfIdx = span.end + 1
    if (matchesAt(norm, selfIdx, AGE_AFTER)) selfIdx++
    if (matchesAt(norm, selfIdx, KA_KI) && matchesAt(norm, selfIdx + 1, SELF_COPULA)) {
      strongAges.push({ span, lo: span.start, hi: selfIdx + 1 })
      continue
    }

    const after = span.end + 1
    if (matchesAt(norm, after, AGE_AFTER)) {
      const next = after + 1
      const isDuration = matchesAt(norm, next, DURATION_AFTER) || norm[after].endsWith('గా')
      const childsAge = hitsIn(norm, next, next + 1, CHILD).length > 0 // "das saal ka beta"
      if (!isDuration && !childsAge) weakAges.push({ span, lo: span.start, hi: after })
      continue
    }
    const before = hitsIn(norm, span.start - 2, span.start - 1, AGE_BEFORE)
    if (before.length > 0 && !norm.slice(before[0].start, span.start).includes(BOUNDARY)) {
      weakAges.push({ span, lo: before[0].start, hi: span.end })
    }
  }
  const ages = strongAges.length > 0 ? strongAges : weakAges
  const age = resolve(ages.map((a) => a.span.value), 'age', conflicts)
  if (age !== null) {
    const a = ages[0]
    profile.age = age
    profile.evidence.age = quote(raw, a.lo, a.hi)
    ages.forEach((x) => used.add(x.span))
  }

  // --- dependants (children counted only) ---
  const kids: { value: number; lo: number; hi: number }[] = []
  for (const hit of findAll(norm, CHILD)) {
    const attached = numbers.find(
      (s) => !used.has(s) && ((s.end >= hit.start - 2 && s.end < hit.start) || s.start === hit.end + 1),
    )
    if (attached && attached.value <= MAX_DEPENDANTS) {
      used.add(attached)
      kids.push({ value: attached.value, lo: Math.min(attached.start, hit.start), hi: Math.max(attached.end, hit.end) })
      continue
    }
    const [lo, hi] = windowAround(norm, hit, 2, 2, new Set())
    if (!attached && negated(norm, hit, lo, hi)) kids.push({ value: 0, lo, hi })
  }
  const dependants = resolve(kids.map((k) => k.value), 'dependants', conflicts)
  if (dependants !== null) {
    profile.dependants = dependants
    profile.evidence.dependants = quote(raw, kids[0].lo, kids[0].hi)
  }

  // --- monthly income (daily wage x 26 is marked as estimated) ---
  const monthly: { value: number; lo: number; hi: number }[] = []
  const daily: { value: number; lo: number; hi: number }[] = []
  for (const span of numbers) {
    if (used.has(span) || span.value < 100) continue
    const [lo, hi] = windowAround(norm, { start: span.start, end: span.end }, 3, 3, new Set())
    const dist = (h: Hit) => (h.end < span.start ? span.start - h.end : h.start - span.end)
    const nearest = (list: Phrase[]) => Math.min(...hitsIn(norm, lo, hi, list).map(dist), Infinity)
    const m = nearest(MONTH)
    const d = nearest(DAY)
    if (m === Infinity && d === Infinity) continue
    const period = hitsIn(norm, lo, hi, m <= d ? MONTH : DAY).sort((a, b) => dist(a) - dist(b))[0]
    const entry = { value: span.value, lo: Math.min(period.start, span.start), hi: Math.max(period.end, span.end) }
    ;(m <= d ? monthly : daily).push(entry)
  }
  const pool = monthly.length > 0 ? monthly : daily
  const income = resolve(pool.map((e) => e.value), 'monthly_income', conflicts)
  if (income !== null) {
    const estimated = pool === daily
    profile.monthly_income = estimated ? income * WORKING_DAYS_PER_MONTH : income
    profile.income_estimated = estimated
    profile.evidence.monthly_income = quote(raw, pool[0].lo, pool[0].hi)
  }

  return { profile, conflicts }
}

export function extractProfile(transcript: string): Profile {
  return extractCore(transcript).profile
}

// Same extraction pass, also exposing which fields got two different values in one utterance.
export function extractWithConflicts(transcript: string): { profile: Profile; conflicts: Conflict[] } {
  return extractCore(transcript)
}

export const extract: ExtractFn = async (transcript) => extractProfile(transcript)
