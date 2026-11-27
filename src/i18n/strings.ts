// One string per key, in Hindi (hi), Hinglish (en, Roman script) and Telugu (te).
// Telugu entries are marked // NEEDS NATIVE TELUGU REVIEW and kept to what we're
// confident in; a missing Telugu string falls back to Hindi, never to English.
import type { LanguageCode } from '../core/dialog'

export type StringLang = 'hi' | 'en' | 'te'
type Entry = { en: string; hi: string; te?: string }

export const STRINGS: Record<string, Entry> = {
  welcome: {
    en: 'Haq Bolo mein aapka swaagat hai. Apni kahani bataiye: aap kya kaam karte hain, ghar mein kitne log hain. Jab ready ho, mic dabaiye.',
    hi: 'हक़ बोलो में आपका स्वागत है। अपनी कहानी बताइए: आप क्या काम करते हैं, घर में कितने लोग हैं। जब तैयार हों, माइक दबाइए।',
    te: 'హక్ బోలోకి స్వాగతం. మీ గురించి చెప్పండి: మీరు ఏమి పని చేస్తారు, ఇంట్లో ఎంత మంది ఉన్నారు. సిద్ధంగా ఉన్నప్పుడు మైక్ నొక్కండి.', // NEEDS NATIVE TELUGU REVIEW
  },

  readback_age: {
    en: 'Maine suna aapki umar {value} saal hai. Sahi hai?',
    hi: 'मैंने सुना आपकी उम्र {value} साल है। सही है?',
    te: 'మీ వయస్సు {value} సంవత్సరాలు అని విన్నాను. సరైనదా?', // NEEDS NATIVE TELUGU REVIEW
  },
  readback_income: {
    en: 'Maine suna aapki mahine ki income {value} rupaye hai. Sahi hai?',
    hi: 'मैंने सुना आपकी महीने की आय {value} रुपये है। सही है?',
  },
  readback_income_roughly: {
    en: 'Maine suna aapki mahine ki income roughly {value} rupaye hai. Sahi hai?',
    hi: 'मैंने सुना आपकी महीने की आय लगभग {value} रुपये है। सही है?',
  },
  ask_again_age: {
    en: 'Theek hai, dobara bataiye: aapki umar kitne saal hai?',
    hi: 'ठीक है, दोबारा बताइए: आपकी उम्र कितने साल है?',
  },
  ask_again_monthly_income: {
    en: 'Theek hai, dobara bataiye: mahine mein kitna kamate hain?',
    hi: 'ठीक है, दोबारा बताइए: महीने में कितना कमाते हैं?',
  },

  followup_has_bank_account: {
    en: 'Kya aapka apna bank account hai, aapke naam par?',
    hi: 'क्या आपका अपना बैंक खाता है, आपके नाम पर?',
    te: 'మీ పేరు మీద బ్యాంక్ ఖాతా ఉందా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_has_aadhaar: {
    en: 'Kya aapke paas Aadhaar card hai?',
    hi: 'क्या आपके पास आधार कार्ड है?',
    te: 'మీ దగ్గర ఆధార్ కార్డు ఉందా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_in_epf_esic_nps: {
    en: 'Kya aapki tankhwah se koi company PF ya ESIC katti hai?',
    hi: 'क्या आपकी तनख़्वाह से कोई कंपनी पीएफ़ या ईएसआईसी काटती है?',
  },
  followup_pays_income_tax: {
    en: 'Kya aap income tax bharte hain?',
    hi: 'क्या आप इनकम टैक्स भरते हैं?',
  },
  followup_urban_or_rural: {
    en: 'Kya aap shahar mein rehte hain?',
    hi: 'क्या आप शहर में रहते हैं?',
  },
  followup_age: {
    en: 'Aapki umar kitne saal hai?',
    hi: 'आपकी उम्र कितने साल है?',
    te: 'మీ వయస్సు ఎంత?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_monthly_income: {
    en: 'Aap mahine mein kitna kamate hain?',
    hi: 'आप महीने में कितना कमाते हैं?',
    te: 'మీరు నెలకు ఎంత సంపాదిస్తారు?', // NEEDS NATIVE TELUGU REVIEW
  },
  ask_occupation_open: {
    en: 'Aap kya kaam karte hain?',
    hi: 'आप क्या काम करते हैं?',
    te: 'మీరు ఏమి పని చేస్తారు?', // NEEDS NATIVE TELUGU REVIEW
  },

  status_qualifies: { en: 'Aap qualify karte hain', hi: 'आप योग्य हैं', te: 'మీరు అర్హులు', } ,
  status_maybe: { en: 'Shayad, kuch jaankari aur chahiye', hi: 'शायद, कुछ जानकारी और चाहिए' },
  status_do_this_first: { en: 'Pehle yeh kariye', hi: 'पहले यह करिए' },
  status_not_eligible: { en: 'Abhi eligible nahi hain', hi: 'अभी योग्य नहीं हैं' },
  status_not_needed: { en: 'Zaroorat nahi, aapke paas pehle se hai', hi: 'ज़रूरत नहीं, आपके पास पहले से है' },
  status_unlocks_after: { en: 'Baad mein', hi: 'बाद में' },
  results_line: { en: '{scheme}: {status}.', hi: '{scheme}: {status}।' },
  results_summary_header: { en: 'Yeh hai aapka natija:', hi: 'यह है आपका नतीजा:' },
  results_summary: { en: 'Aapka natija taiyaar hai. Neeche dekhiye.', hi: 'आपका नतीजा तैयार है। नीचे देखिए।' },

  results_heading_do_first: { en: 'Pehle yeh kariye', hi: 'पहले यह करिए' },
  results_heading_qualify: { en: 'Aap in sabke liye qualify karte hain', hi: 'आप इन सबके लिए योग्य हैं' },
  results_heading_unlocks_after: { en: 'Yeh iske baad unlock hoga', hi: 'यह इसके बाद अनलॉक होगा' },
  results_heading_maybe: { en: 'Shayad — aur jaankari chahiye', hi: 'शायद — और जानकारी चाहिए' },
  results_heading_not_eligible: { en: 'Abhi eligible nahi', hi: 'अभी योग्य नहीं' },
  needs_prerequisite_reason: {
    en: 'Pehle {scheme} banayein, phir yeh unlock ho jaayega.',
    hi: 'पहले {scheme} बनाएं, फिर यह अनलॉक हो जाएगा।',
  },
  needs_info_reason: { en: 'Abhi pata nahi: {fields}', hi: 'अभी पता नहीं: {fields}' },

  rule_age_min: { en: 'umar {actual} hai, kam se kam {expected} chahiye', hi: 'उम्र {actual} है, कम से कम {expected} चाहिए' },
  rule_age_max: { en: 'umar {actual} hai, zyada se zyada {expected} chahiye', hi: 'उम्र {actual} है, अधिकतम {expected} चाहिए' },
  rule_income_max_monthly: { en: 'mahine ki income {actual} hai, zyada se zyada {expected} honi chahiye', hi: 'महीने की आय {actual} है, अधिकतम {expected} होनी चाहिए' },
  rule_occupation_in: { en: 'yeh kaam is scheme mein nahi aata', hi: 'यह काम इस योजना में नहीं आता' },
  rule_urban_only: { en: 'aap gaon mein rehte hain, yeh scheme shahar ke liye hai', hi: 'आप गांव में रहते हैं, यह योजना शहर के लिए है' },
  rule_not_pays_income_tax: { en: 'aap income tax bharte hain', hi: 'आप इनकम टैक्स भरते हैं' },
  rule_not_in_epf_esic_nps: { en: 'aap PF/ESIC/NPS mein hain', hi: 'आप पीएफ़/ईएसआईसी/एनपीएस में हैं' },
  rule_requires_has_aadhaar: { en: 'Aadhaar card nahi hai', hi: 'आधार कार्ड नहीं है' },
  rule_requires_has_bank_account: { en: 'apna bank account nahi hai', hi: 'अपना बैंक खाता नहीं है' },

  sheet_title: { en: 'Aapki scheme sheet', hi: 'आपकी योजना सूची' },
  sheet_documents_heading: { en: 'Saath le jaayein', hi: 'साथ ले जाएं' },
  sheet_footer: {
    en: 'Haq Bolo dwara taiyaar. Yeh application nahi hai. Ise CSC ya labour office le jaayein.',
    hi: 'हक़ बोलो द्वारा तैयार। यह आवेदन नहीं है। इसे सीएससी या श्रम कार्यालय ले जाएं।',
  },

  about_title: { en: 'Haq Bolo ke baare mein', hi: 'हक़ बोलो के बारे में' },
  about_honesty_schemes: {
    en: 'Yeh list haath se bani hai aur sirf 6 schemes ko dekhti hai. Poori list nahi hai.',
    hi: 'यह सूची हाथ से बनी है और केवल 6 योजनाओं को देखती है। पूरी सूची नहीं है।',
  },
  about_honesty_decision: {
    en: 'Yeh sirf margdarshan hai, sarkar ka faisla nahi. Office jaakar confirm kariye.',
    hi: 'यह केवल मार्गदर्शन है, सरकार का फैसला नहीं। कार्यालय जाकर पुष्टि करें।',
  },
  about_honesty_voice: {
    en: 'Aapki awaaz is phone/browser ke speech service se samjhi jaati hai. Transcript isi browser mein rehta hai, hamare server par nahi jaata.',
    hi: 'आपकी आवाज़ इस फ़ोन/ब्राउज़र की स्पीच सेवा से समझी जाती है। ट्रांसक्रिप्ट इसी ब्राउज़र में रहता है, हमारे सर्वर पर नहीं जाता।',
  },

  label_occupation_street_vendor: { en: 'Thela / Rehdi vendor', hi: 'ठेला / रेहड़ी विक्रेता' },
  label_occupation_construction_worker: { en: 'Construction mazdoor', hi: 'निर्माण मज़दूर' },
  label_occupation_delivery_rider: { en: 'Delivery rider', hi: 'डिलीवरी राइडर' },
  label_occupation_domestic_worker: { en: 'Ghar ka kaam karne waale', hi: 'घर का काम करने वाले' },
  label_occupation_other: { en: 'Doosra kaam', hi: 'दूसरा काम' },
  label_urban: { en: 'Shahar', hi: 'शहर' },
  label_rural: { en: 'Gaon', hi: 'गांव' },

  type_instead_placeholder: { en: 'Yahan type kariye...', hi: 'यहां टाइप करें...' },
  play_sample_label: { en: 'Sample sunayein', hi: 'नमूना सुनाएं' },
  mic_tap_to_speak: { en: 'Bolne ke liye dabaiye', hi: 'बोलने के लिए दबाएं' },
  mic_listening: { en: 'Sun raha hoon...', hi: 'सुन रहा हूं...' },
  no_voice_notice: {
    en: 'Is bhasha ke liye koi awaaz nahi mili. Sab kuch yahan likha hua dikhega.',
    hi: 'इस भाषा के लिए कोई आवाज़ नहीं मिली। सब कुछ यहां लिखा हुआ दिखेगा।',
  },
}

const LANG_FOR: Record<LanguageCode, StringLang> = { 'hi-IN': 'hi', 'te-IN': 'te', 'en-IN': 'en' }

export function stringLangFor(code: LanguageCode): StringLang {
  return LANG_FOR[code]
}

// Resolves a key for a language, falling back Telugu -> Hindi, and interpolates {name} params.
export function t(lang: StringLang, key: string, params?: Record<string, string | number | boolean>): string {
  const entry = STRINGS[key]
  if (!entry) return key
  const text = lang === 'te' ? (entry.te ?? entry.hi) : lang === 'hi' ? entry.hi : entry.en
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''))
}
