// Spoken numbers -> digits. Conservative: anything unclear returns null.
import { normalizeToken, tokenMatches } from './text'

// Hindi 0-99 (Roman spellings + Devanagari). Index = value.
const HINDI: string[][] = [
  ['shunya', 'sunya', 'शून्य'],
  ['ek', 'एक'],
  ['do', 'दो'],
  ['teen', 'तीन'],
  ['char', 'chaar', 'चार'],
  ['paanch', 'panch', 'पांच', 'पाँच'],
  ['chhe', 'chhah', 'chah', 'che', 'छह', 'छः', 'छे'],
  ['saat', 'सात'],
  ['aath', 'आठ'],
  ['nau', 'नौ'],
  ['das', 'दस'],
  ['gyarah', 'gyara', 'ग्यारह'],
  ['barah', 'बारह'],
  ['terah', 'तेरह'],
  ['chaudah', 'चौदह'],
  ['pandrah', 'pandra', 'पंद्रह', 'पन्द्रह'],
  ['solah', 'सोलह'],
  ['satrah', 'सत्रह'],
  ['atharah', 'athara', 'अठारह'],
  ['unnis', 'unnees', 'उन्नीस'],
  ['bees', 'bis', 'बीस'],
  ['ikkis', 'ikkees', 'इक्कीस'],
  ['bais', 'baees', 'बाईस'],
  ['teis', 'teyis', 'तेईस'],
  ['chaubis', 'chaubees', 'चौबीस'],
  ['pachchis', 'pachis', 'pachees', 'पच्चीस'],
  ['chhabbis', 'chhabbees', 'छब्बीस'],
  ['sattais', 'sattaees', 'सत्ताईस'],
  ['atthais', 'athais', 'अट्ठाईस'],
  ['untis', 'unatees', 'उनतीस'],
  ['tees', 'तीस'],
  ['ikattis', 'iktees', 'ikatees', 'इकतीस'],
  ['battis', 'battees', 'बत्तीस'],
  ['taintis', 'taintees', 'tetees', 'तैंतीस'],
  ['chautis', 'chauntees', 'chautees', 'चौंतीस'],
  ['paintis', 'paintees', 'पैंतीस'],
  ['chhattis', 'chhattees', 'छत्तीस'],
  ['saintis', 'saintees', 'सैंतीस'],
  ['artis', 'adtees', 'artees', 'अड़तीस'],
  ['untalis', 'untalees', 'unchalees', 'उनतालीस'],
  ['chalis', 'chaalees', 'chalees', 'चालीस'],
  ['iktalis', 'iktalees', 'इकतालीस'],
  ['bayalis', 'bayalees', 'बयालीस'],
  ['taintalis', 'taintalees', 'tetalis', 'तैंतालीस'],
  ['chavalis', 'chauvalees', 'chawalis', 'चवालीस', 'चौवालीस'],
  ['paintalis', 'paintalees', 'पैंतालीस'],
  ['chhiyalis', 'chhiyalees', 'छियालीस'],
  ['saintalis', 'saintalees', 'सैंतालीस'],
  ['artalis', 'adtalees', 'artalees', 'अड़तालीस'],
  ['unchas', 'unchaas', 'उनचास'],
  ['pachas', 'pachaas', 'पचास'],
  ['ikyavan', 'ikyawan', 'इक्यावन'],
  ['bavan', 'baavan', 'बावन'],
  ['tirpan', 'तिरपन'],
  ['chauvan', 'chauwan', 'चौवन'],
  ['pachpan', 'पचपन'],
  ['chhappan', 'छप्पन'],
  ['sattavan', 'sattawan', 'सत्तावन'],
  ['atthavan', 'atthawan', 'अट्ठावन'],
  ['unsath', 'unsaath', 'उनसठ'],
  ['saath', 'साठ'],
  ['iksath', 'iksaath', 'इकसठ'],
  ['basath', 'baasath', 'बासठ'],
  ['tirsath', 'tiresath', 'तिरसठ'],
  ['chausath', 'chaunsath', 'चौंसठ'],
  ['painsath', 'पैंसठ'],
  ['chhiyasath', 'छियासठ'],
  ['sadsath', 'sarsath', 'सड़सठ'],
  ['adsath', 'arsath', 'अड़सठ'],
  ['unhattar', 'उनहत्तर'],
  ['sattar', 'सत्तर'],
  ['ikhattar', 'इकहत्तर'],
  ['bahattar', 'बहत्तर'],
  ['tihattar', 'तिहत्तर'],
  ['chauhattar', 'चौहत्तर'],
  ['pachhattar', 'पचहत्तर'],
  ['chhihattar', 'छिहत्तर'],
  ['sathattar', 'सतहत्तर'],
  ['athhattar', 'अठहत्तर'],
  ['unasi', 'unnasi', 'उन्यासी', 'उनासी'],
  ['assi', 'अस्सी'],
  ['ikyasi', 'इक्यासी'],
  ['bayasi', 'बयासी'],
  ['tirasi', 'तिरासी'],
  ['chaurasi', 'चौरासी'],
  ['pachasi', 'पचासी'],
  ['chhiyasi', 'छियासी'],
  ['sattasi', 'सतासी'],
  ['athasi', 'अठासी'],
  ['navasi', 'नवासी'],
  ['nabbe', 'नब्बे'],
  ['ikyanve', 'इक्यानवे'],
  ['banve', 'बानवे'],
  ['tiranve', 'तिरानवे'],
  ['chauranve', 'चौरानवे'],
  ['pachanve', 'पचानवे'],
  ['chhiyanve', 'छियानवे'],
  ['sattanve', 'सत्तानवे'],
  ['atthanve', 'अट्ठानवे'],
  ['ninyanve', 'निन्यानवे'],
]

// NEEDS NATIVE TELUGU REVIEW: kept to common forms only.
const TELUGU: [string, number][] = [
  ['సున్నా', 0], ['ఒకటి', 1], ['ఒక', 1], ['రెండు', 2], ['మూడు', 3], ['నాలుగు', 4],
  ['ఐదు', 5], ['అయిదు', 5], ['ఆరు', 6], ['ఏడు', 7], ['ఎనిమిది', 8], ['తొమ్మిది', 9], ['పది', 10],
  ['పదకొండు', 11], ['పన్నెండు', 12], ['పదమూడు', 13], ['పద్నాలుగు', 14], ['పదిహేను', 15],
  ['పదహారు', 16], ['పదిహేడు', 17], ['పద్దెనిమిది', 18], ['పంతొమ్మిది', 19],
  ['ఇరవై', 20], ['ముప్పై', 30], ['ముప్ఫై', 30], ['నలభై', 40], ['యాభై', 50],
  ['అరవై', 60], ['డెబ్బై', 70], ['ఎనభై', 80], ['తొంభై', 90],
  // counting people: "ముగ్గురు పిల్లలు" = three children
  ['ఒకరు', 1], ['ఇద్దరు', 2], ['ముగ్గురు', 3], ['నలుగురు', 4],
]

const ENGLISH = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const ENGLISH_TENS = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

const WORDS = new Map<string, number>()
HINDI.forEach((forms, value) => forms.forEach((f) => WORDS.set(normalizeToken(f), value)))
TELUGU.forEach(([f, value]) => WORDS.set(normalizeToken(f), value))
ENGLISH.forEach((f, value) => WORDS.set(normalizeToken(f), value))
ENGLISH_TENS.forEach((f, i) => WORDS.set(normalizeToken(f), (i + 2) * 10))

// Only Telugu and English build 21-99 as tens + unit ("ముప్పై రెండు", "thirty two").
// Hindi has a word per number, so "saath teen" is "with three", not 63.
const COMPOSABLE_TENS = new Set(
  [...ENGLISH_TENS, ...TELUGU.filter(([, v]) => v >= 20 && v % 10 === 0).map(([f]) => f)].map(normalizeToken),
)

// Hindi words that are also common non-number words: "saath" = "with".
const WORD_LIKE = new Set(['saath', 'साठ'].map(normalizeToken))

const MULTIPLIERS: [string, number][] = [
  ['sau', 100], ['सौ', 100], ['hundred', 100], ['వంద*', 100],
  ['hazaar', 1000], ['hazar', 1000], ['hajar', 1000], ['हजार', 1000], ['thousand', 1000],
  ['వెయ్యి', 1000], ['వేల*', 1000],
  ['lakh', 100000], ['lac', 100000], ['लाख', 100000], ['లక్ష*', 100000],
].map(([w, v]) => [normalizeToken(w as string), v as number])

function multiplierOf(token: string): number | null {
  const hit = MULTIPLIERS.find(([w]) => tokenMatches(token, w))
  return hit ? hit[1] : null
}

function valueOf(token: string): number | null {
  if (/^\d+$/.test(token)) return Number(token)
  return WORDS.get(token) ?? null
}

export function isNumberToken(token: string): boolean {
  return valueOf(token) !== null || multiplierOf(token) !== null
}

// Tokens must already be normalised (see text.normalizeToken).
export function parseNumberTokens(tokens: string[]): number | null {
  if (tokens.length === 0) return null
  let total = 0
  let current = 0
  let prev = ''
  for (const t of tokens) {
    const tensBefore = COMPOSABLE_TENS.has(prev)
    prev = t
    const mult = multiplierOf(t)
    if (mult === 100) {
      if (current >= 100) return null
      current = (current || 1) * 100
      continue
    }
    if (mult !== null) {
      total += (current || 1) * mult
      current = 0
      continue
    }
    const v = valueOf(t)
    if (v === null) return null
    if (current === 0) current = v
    else if (current >= 100 && current % 100 === 0 && v < 100) current += v // "paanch sau pachas"
    else if (tensBefore && current < 100 && v > 0 && v < 10) current += v
    else return null // two numbers side by side ("do teen") is a range or a mistake: don't guess
  }
  return total + current
}

export interface NumberSpan {
  start: number
  end: number // inclusive
  value: number
}

// Maximal runs of number tokens. Runs that don't parse cleanly are dropped.
export function findNumbers(norm: string[]): NumberSpan[] {
  const spans: NumberSpan[] = []
  for (let i = 0; i < norm.length; i++) {
    if (!isNumberToken(norm[i])) continue
    let j = i
    while (j + 1 < norm.length && isNumberToken(norm[j + 1])) j++
    const value = parseNumberTokens(norm.slice(i, j + 1))
    if (value === null && WORD_LIKE.has(norm[i])) continue // retry the run without it
    if (value !== null) spans.push({ start: i, end: j, value })
    i = j
  }
  return spans
}

export function parseSpokenNumber(text: string): number | null {
  const tokens = text.split(/\s+/).filter(Boolean).map(normalizeToken)
  return parseNumberTokens(tokens)
}
