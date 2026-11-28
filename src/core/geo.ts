// One source of truth for Indian states and union territories: canonical names,
// codes and the spellings people actually say or type (Roman, Devanagari, Telugu).
//
// Telugu spellings are standard names but still need native review, like the rest
// of the Telugu content in this project.
//
// District names are NOT listed here: there is no verified district table in this
// repository, and inventing one would let a scheme reject a real user. Districts are
// normalised as text and matched against what a scheme declares (see geography.ts).
export type RegionType = 'state' | 'union_territory'

export interface Region {
  name: string // canonical English name, exactly as a scheme should declare it
  code: string // ISO 3166-2:IN subdivision code without the "IN-" prefix
  type: RegionType
  aliases: string[] // extra spellings; the name and code are matched automatically
}

// NEEDS NATIVE TELUGU REVIEW for the Telugu aliases.
export const REGIONS: Region[] = [
  { name: 'Andhra Pradesh', code: 'AP', type: 'state', aliases: ['andhra', 'आंध्र प्रदेश', 'ఆంధ్రప్రదేశ్', 'ఆంధ్ర'] },
  { name: 'Arunachal Pradesh', code: 'AR', type: 'state', aliases: ['arunachal', 'अरुणाचल प्रदेश', 'అరుణాచల్ ప్రదేశ్'] },
  { name: 'Assam', code: 'AS', type: 'state', aliases: ['असम', 'అస్సాం'] },
  { name: 'Bihar', code: 'BR', type: 'state', aliases: ['बिहार', 'బీహార్'] },
  { name: 'Chhattisgarh', code: 'CT', type: 'state', aliases: ['chattisgarh', 'छत्तीसगढ़', 'ఛత్తీస్‌గఢ్'] },
  { name: 'Goa', code: 'GA', type: 'state', aliases: ['गोवा', 'గోవా'] },
  { name: 'Gujarat', code: 'GJ', type: 'state', aliases: ['गुजरात', 'గుజరాత్'] },
  { name: 'Haryana', code: 'HR', type: 'state', aliases: ['हरियाणा', 'హర్యానా'] },
  { name: 'Himachal Pradesh', code: 'HP', type: 'state', aliases: ['himachal', 'हिमाचल प्रदेश', 'హిమాచల్ ప్రదేశ్'] },
  { name: 'Jharkhand', code: 'JH', type: 'state', aliases: ['झारखंड', 'జార్ఖండ్'] },
  { name: 'Karnataka', code: 'KA', type: 'state', aliases: ['कर्नाटक', 'కర్ణాటక'] },
  { name: 'Kerala', code: 'KL', type: 'state', aliases: ['केरल', 'కేరళ'] },
  { name: 'Madhya Pradesh', code: 'MP', type: 'state', aliases: ['मध्य प्रदेश', 'మధ్య ప్రదేశ్'] },
  { name: 'Maharashtra', code: 'MH', type: 'state', aliases: ['महाराष्ट्र', 'మహారాష్ట్ర'] },
  { name: 'Manipur', code: 'MN', type: 'state', aliases: ['मणिपुर', 'మణిపూర్'] },
  { name: 'Meghalaya', code: 'ML', type: 'state', aliases: ['मेघालय', 'మేఘాలయ'] },
  { name: 'Mizoram', code: 'MZ', type: 'state', aliases: ['मिज़ोरम', 'మిజోరం'] },
  { name: 'Nagaland', code: 'NL', type: 'state', aliases: ['नागालैंड', 'నాగాలాండ్'] },
  { name: 'Odisha', code: 'OD', type: 'state', aliases: ['orissa', 'ओडिशा', 'उड़ीसा', 'ఒడిశా'] },
  { name: 'Punjab', code: 'PB', type: 'state', aliases: ['पंजाब', 'పంజాబ్'] },
  { name: 'Rajasthan', code: 'RJ', type: 'state', aliases: ['राजस्थान', 'రాజస్థాన్'] },
  { name: 'Sikkim', code: 'SK', type: 'state', aliases: ['सिक्किम', 'సిక్కిం'] },
  { name: 'Tamil Nadu', code: 'TN', type: 'state', aliases: ['tamilnadu', 'तमिलनाडु', 'तमिल नाडु', 'తమిళనాడు'] },
  { name: 'Telangana', code: 'TS', type: 'state', aliases: ['tg', 'तेलंगाना', 'తెలంగాణ'] },
  { name: 'Tripura', code: 'TR', type: 'state', aliases: ['त्रिपुरा', 'త్రిపుర'] },
  { name: 'Uttar Pradesh', code: 'UP', type: 'state', aliases: ['उत्तर प्रदेश', 'ఉత్తర ప్రదేశ్'] },
  { name: 'Uttarakhand', code: 'UK', type: 'state', aliases: ['uttaranchal', 'उत्तराखंड', 'ఉత్తరాఖండ్'] },
  { name: 'West Bengal', code: 'WB', type: 'state', aliases: ['bengal', 'bangal', 'पश्चिम बंगाल', 'बंगाल', 'పశ్చిమ బెంగాల్', 'బెంగాల్'] },
  {
    name: 'Andaman and Nicobar Islands',
    code: 'AN',
    type: 'union_territory',
    aliases: ['andaman nicobar', 'andaman', 'अंडमान और निकोबार', 'अंडमान निकोबार', 'అండమాన్ నికోబార్'],
  },
  { name: 'Chandigarh', code: 'CH', type: 'union_territory', aliases: ['चंडीगढ़', 'చండీగఢ్'] },
  {
    name: 'Dadra and Nagar Haveli and Daman and Diu',
    code: 'DN',
    type: 'union_territory',
    aliases: ['dadra and nagar haveli', 'daman and diu', 'दादरा और नगर हवेली', 'दमन और दीव', 'దాద్రా నగర్ హవేలీ', 'దమన్ మరియు దీవ్'],
  },
  { name: 'Delhi', code: 'DL', type: 'union_territory', aliases: ['nct of delhi', 'new delhi', 'dilli', 'दिल्ली', 'ఢిల్లీ'] },
  { name: 'Jammu and Kashmir', code: 'JK', type: 'union_territory', aliases: ['jammu kashmir', 'kashmir', 'जम्मू कश्मीर', 'कश्मीर', 'జమ్మూ కాశ్మీర్'] },
  { name: 'Ladakh', code: 'LA', type: 'union_territory', aliases: ['लद्दाख', 'లడఖ్'] },
  { name: 'Lakshadweep', code: 'LD', type: 'union_territory', aliases: ['लक्षद्वीप', 'లక్షద్వీప్'] },
  { name: 'Puducherry', code: 'PY', type: 'union_territory', aliases: ['pondicherry', 'पुदुचेरी', 'पॉंडिचेरी', 'పుదుచ్చేరి', 'పాండిచేరి'] },
]

// District names that also identify their state, so a story that says only
// "Hyderabad" still lands in Telangana. These are spellings only, not a district
// table: DISTRICTS_BY_STATE below stays empty for the same reason.
export interface DistrictAlias {
  state: string // canonical state name, as in REGIONS
  district: string // display form
  aliases: string[]
}

export const DISTRICT_ALIASES: DistrictAlias[] = [
  { state: 'Telangana', district: 'Hyderabad', aliases: ['हैदराबाद', 'హైదరాబాద్'] },
]

const SCRIPT = /[\u0900-\u097F]|[\u0C00-\u0C7F]/
const TRAILING_WORDS = new Set([
  'state',
  'rajya',
  'pradesh', // only stripped for district/region lookups, see stripTrailing
  'राज्य',
  'राज्‍य',
  'రాష్ట్రం',
  'రాష్ట్ర',
  'district',
  'zila',
  'zilla',
  'जिला',
  'ज़िला',
  'జిల్లా',
])

// Case-, spacing- and punctuation-insensitive form used for every comparison.
export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’'`".,()[\]{}/\\|_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// "Telangana state" and "Hyderabad district" are the same place as the bare name.
// "Pradesh" is never stripped from a region name (Uttar Pradesh), only handled by
// exact matching below, so it is not in the trailing set for states.
function stripTrailing(value: string, words: Set<string> = TRAILING_WORDS): string {
  const tokens = value.split(' ').filter(Boolean)
  while (tokens.length > 1 && words.has(tokens[tokens.length - 1])) tokens.pop()
  return tokens.join(' ')
}

const REGION_INDEX = new Map<string, Region>()
for (const region of REGIONS) {
  for (const label of [region.name, region.code, ...region.aliases]) {
    REGION_INDEX.set(normalizeText(label), region)
    const stripped = stripTrailing(normalizeText(label))
    if (stripped && !REGION_INDEX.has(stripped)) REGION_INDEX.set(stripped, region)
  }
}

// Resolves a spoken or typed state/UT to its canonical record. Returns null when the
// text is not a recognised state: the caller must treat that as "not known yet",
// never as "somewhere else".
export function findRegion(input: string): Region | null {
  const normalized = normalizeText(input)
  if (!normalized) return null
  return REGION_INDEX.get(normalized) ?? REGION_INDEX.get(stripTrailing(normalized)) ?? null
}

export function regionName(input: string): string | null {
  return findRegion(input)?.name ?? null
}

// Two states or UTs are the same place even when one is a code or a different
// spelling. Unrecognised values fall back to a plain normalised comparison.
export function sameRegion(a: string, b: string): boolean {
  const ra = findRegion(a)
  const rb = findRegion(b)
  if (ra && rb) return ra.name === rb.name
  return normalizeText(a) === normalizeText(b)
}

// State aliases for the story extractor, as [canonical name, keywords].
// Telugu keywords are also matched as prefixes because Telugu attaches case
// suffixes (తెలంగాణలో = "in Telangana").
// Codes (KA, UP, TS) are deliberately NOT keywords: "ka" is an ordinary Hindi word
// ("35 ka hoon"), so a code there would invent a state. Codes still work for a
// typed or spoken location answer through findRegion.
export const STATE_KEYWORDS: [string, string[]][] = REGIONS.map((r) => [
  r.name,
  [r.name, ...r.aliases].flatMap((alias) =>
    SCRIPT.test(alias) && alias.length > 3 ? [alias, `${alias}*`] : [alias],
  ),
])

// District aliases for the story extractor, as [district record, keywords].
// Telugu keywords are matched as prefixes too (హైదరాబాద్‌లో = "in Hyderabad").
export const DISTRICT_KEYWORDS: [DistrictAlias, string[]][] = DISTRICT_ALIASES.map((d) => [
  d,
  [d.district, ...d.aliases].flatMap((alias) =>
    SCRIPT.test(alias) && alias.length > 3 ? [alias, `${alias}*`] : [alias],
  ),
])

export interface DistrictName {
  value: string // display form, e.g. "Hyderabad"
  normalized: string
  script: 'latin' | 'indic'
}

// Districts are normalised as text only. Keeping the user's own spelling means the
// app never pretends to know a district it has no list for.
export function normalizeDistrict(input: string): DistrictName | null {
  const cleaned = normalizeText(input)
  if (!cleaned) return null
  const withoutSuffix = stripTrailing(cleaned)
  // "district" on its own carries no place name.
  if (TRAILING_WORDS.has(withoutSuffix)) return null
  if (withoutSuffix.length < 2 || /^\d+$/.test(withoutSuffix)) return null
  return {
    value: titleCase(withoutSuffix),
    normalized: withoutSuffix,
    script: SCRIPT.test(withoutSuffix) ? 'indic' : 'latin',
  }
}

// A Latin-script district can be compared with a scheme's declared district. An
// Indic-script answer cannot be transliterated here, so it stays unverified.
export function sameDistrict(a: string, b: string): boolean | null {
  if (SCRIPT.test(a) || SCRIPT.test(b)) return null
  return normalizeText(a) === normalizeText(b)
}

function titleCase(value: string): string {
  if (SCRIPT.test(value)) return value // scripts have no letter case to restore
  return value.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

// ---------------------------------------------------------------------------
// District table extension point.
//
// This is deliberately EMPTY. The repository has no verified official district
// list, and a guessed one would let a district-restricted scheme reject a real
// user. When a researcher supplies a state's districts from an official source,
// add them here (canonical state name -> district names) and record the source
// in docs/ARCHITECTURE.md. Nothing else in the code has to change.
// ---------------------------------------------------------------------------
export type DistrictTable = Readonly<Record<string, readonly string[]>>

export const DISTRICTS_BY_STATE: DistrictTable = Object.freeze({})

export type DistrictLookup = 'match' | 'no_match' | 'unknown_state' | 'no_table'

// `table` is a parameter so tests (and a future imported table) can pass their
// own without mutating the production constant.
export function lookupDistrict(table: DistrictTable, state: string, district: string): DistrictLookup {
  const region = findRegion(state)
  if (!region) return 'unknown_state'
  const names = table[region.name] ?? table[region.code]
  if (!names || names.length === 0) return 'no_table'
  const parsed = normalizeDistrict(district)
  if (!parsed) return 'no_match'
  return names.some((name) => sameDistrict(name, parsed.value) === true) ? 'match' : 'no_match'
}
