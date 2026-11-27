// One string per key, in Hindi (hi), Hinglish (en, Roman script) and Telugu (te).
// Every user-facing string lives here: screens must not hardcode their own text.
// Telugu entries are marked // NEEDS NATIVE TELUGU REVIEW and are written to be
// simple and conversational; a missing Telugu string falls back to Hindi, never
// to English.
import type { LanguageCode } from '../core/dialog'

export type StringLang = 'hi' | 'en' | 'te'
type Entry = { en: string; hi: string; te?: string }

export const STRINGS: Record<string, Entry> = {
  welcome: {
    en: 'Haq Bolo mein aapka swaagat hai. Apni kahani bataiye: aap kya kaam karte hain, ghar mein kitne log hain. Jab ready ho, mic dabaiye.',
    hi: 'हक़ बोलो में आपका स्वागत है। अपनी कहानी बताइए: आप क्या काम करते हैं, घर में कितने लोग हैं। जब तैयार हों, माइक दबाइए।',
    te: 'హక్ బోలోకి స్వాగతం. మీ గురించి చెప్పండి: మీరు ఏమి పని చేస్తారు, ఇంట్లో ఎంత మంది ఉన్నారు. సిద్ధంగా ఉన్నప్పుడు మైక్ నొక్కండి.', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- story screen ---
  eyebrow_story: { en: 'Your story', hi: 'आपकी कहानी', te: 'మీ కథ' }, // NEEDS NATIVE TELUGU REVIEW
  story_prompt: {
    en: 'Apni kahani bataiye — aap kya kaam karte hain, ghar mein kitne log hain.',
    hi: 'अपनी कहानी बताइए — आप क्या काम करते हैं, घर में कितने लोग हैं।',
    te: 'మీ కథ చెప్పండి — మీరు ఏమి పని చేస్తారు, ఇంట్లో ఎంత మంది ఉన్నారు.', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- numbers read back before use ---
  readback_age: {
    en: 'Maine suna aapki umar {value} saal hai. Sahi hai?',
    hi: 'मैंने सुना आपकी उम्र {value} साल है। सही है?',
    te: 'మీ వయస్సు {value} సంవత్సరాలు అని విన్నాను. సరైనదా?', // NEEDS NATIVE TELUGU REVIEW
  },
  readback_income: {
    en: 'Maine suna aapki mahine ki income {value} rupaye hai. Sahi hai?',
    hi: 'मैंने सुना आपकी महीने की आय {value} रुपये है। सही है?',
    te: 'మీ నెల ఆదాయం {value} రూపాయలు అని విన్నాను. సరైనదా?', // NEEDS NATIVE TELUGU REVIEW
  },
  readback_income_roughly: {
    en: 'Maine suna aapki mahine ki income roughly {value} rupaye hai. Sahi hai?',
    hi: 'मैंने सुना आपकी महीने की आय लगभग {value} रुपये है। सही है?',
    te: 'మీ నెల ఆదాయం సుమారు {value} రూపాయలు అని విన్నాను. సరైనదా?', // NEEDS NATIVE TELUGU REVIEW
  },
  ask_again_age: {
    en: 'Theek hai, dobara bataiye: aapki umar kitne saal hai?',
    hi: 'ठीक है, दोबारा बताइए: आपकी उम्र कितने साल है?',
    te: 'సరే, మళ్ళీ చెప్పండి: మీ వయస్సు ఎంత?', // NEEDS NATIVE TELUGU REVIEW
  },
  ask_again_monthly_income: {
    en: 'Theek hai, dobara bataiye: mahine mein kitna kamate hain?',
    hi: 'ठीक है, दोबारा बताइए: महीने में कितना कमाते हैं?',
    te: 'సరే, మళ్ళీ చెప్పండి: నెలకు ఎంత సంపాదిస్తారు?', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- follow-up questions ---
  followup_has_bank_account: {
    en: 'Kya aapka apna bank account hai, aapke naam par?',
    hi: 'क्या आपका अपना बैंक खाता है, आपके नाम पर?',
    te: 'మీ పేరు మీద మీ సొంత బ్యాంక్ ఖాతా ఉందా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_has_aadhaar: {
    en: 'Kya aapke paas Aadhaar card hai?',
    hi: 'क्या आपके पास आधार कार्ड है?',
    te: 'మీ దగ్గర ఆధార్ కార్డు ఉందా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_in_epf_esic_nps: {
    en: 'Kya aapki tankhwah se koi company PF ya ESIC katti hai?',
    hi: 'क्या आपकी तनख़्वाह से कोई कंपनी पीएफ़ या ईएसआईसी काटती है?',
    te: 'మీ జీతం నుండి కంపెనీ పీఎఫ్ లేదా ఈఎస్ఐసీ కడుతుందా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_pays_income_tax: {
    en: 'Kya aap income tax bharte hain?',
    hi: 'क्या आप इनकम टैक्स भरते हैं?',
    te: 'మీరు ఇన్‌కమ్ ట్యాక్స్ కడతారా?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_urban_or_rural: {
    en: 'Kya aap shahar mein rehte hain?',
    hi: 'क्या आप शहर में रहते हैं?',
    te: 'మీరు పట్నంలో నివసిస్తారా?', // NEEDS NATIVE TELUGU REVIEW
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
  followup_state: {
    en: 'Aap kis state mein rehte hain?',
    hi: 'आप किस राज्य में रहते हैं?',
    te: 'మీరు ఏ రాష్ట్రంలో నివసిస్తున్నారు?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_district: {
    en: 'Aap kis district mein rehte hain?',
    hi: 'आप किस ज़िले में रहते हैं?',
    te: 'మీరు ఏ జిల్లాలో నివసిస్తున్నారు?', // NEEDS NATIVE TELUGU REVIEW
  },
  followup_occupation: {
    en: 'Aap kaun sa kaam karte hain?',
    hi: 'आप कौन सा काम करते हैं?',
    te: 'మీరు ఏ పని చేస్తారు?', // NEEDS NATIVE TELUGU REVIEW
  },
  ask_occupation_open: {
    en: 'Aap kya kaam karte hain?',
    hi: 'आप क्या काम करते हैं?',
    te: 'మీరు ఏమి పని చేస్తారు?', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- result statuses ---
  // Unverified rules must never read as a guarantee: see status_possible_confirm.
  status_qualifies: { en: 'Aap qualify karte hain', hi: 'आप योग्य हैं', te: 'మీరు అర్హులు' }, // NEEDS NATIVE TELUGU REVIEW
  status_possible_confirm: {
    en: 'Ho sakta hai — office mein confirm kariye',
    hi: 'हो सकता है — कार्यालय में पुष्टि करें',
    te: 'అవకాశం ఉంది — కార్యాలయంలో నిర్ధారించండి', // NEEDS NATIVE TELUGU REVIEW
  },
  status_maybe: {
    en: 'Shayad, kuch jaankari aur chahiye',
    hi: 'शायद, कुछ जानकारी और चाहिए',
    te: 'బహుశా, మరికొంత సమాచారం కావాలి', // NEEDS NATIVE TELUGU REVIEW
  },
  status_do_this_first: {
    en: 'Pehle yeh kariye',
    hi: 'पहले यह करिए',
    te: 'మొదట ఇది చేయండి', // NEEDS NATIVE TELUGU REVIEW
  },
  status_not_eligible: {
    en: 'Aapke jawab ke hisaab se abhi eligible nahi',
    hi: 'आपके जवाब के हिसाब से अभी योग्य नहीं',
    te: 'మీ జవాబుల ప్రకారం ఇప్పుడు అర్హులు కాదు', // NEEDS NATIVE TELUGU REVIEW
  },
  status_not_needed: {
    en: 'Zaroorat nahi, aapke paas pehle se hai',
    hi: 'ज़रूरत नहीं, आपके पास पहले से है',
    te: 'అవసరం లేదు, మీకు ఇప్పటికే ఉంది', // NEEDS NATIVE TELUGU REVIEW
  },
  status_unlocks_after: { en: 'Baad mein', hi: 'बाद में', te: 'తర్వాత' }, // NEEDS NATIVE TELUGU REVIEW
  status_not_applicable: {
    en: 'Aapke liye lagu nahi',
    hi: 'आपके लिए लागू नहीं',
    te: 'మీకు వర్తించదు', // NEEDS NATIVE TELUGU REVIEW
  },
  results_line: { en: '{scheme}: {status}.', hi: '{scheme}: {status}।', te: '{scheme}: {status}.' },
  results_summary_header: {
    en: 'Yeh hai aapka natija:',
    hi: 'यह है आपका नतीजा:',
    te: 'ఇది మీ ఫలితం:', // NEEDS NATIVE TELUGU REVIEW
  },
  results_summary: {
    en: 'Aapka natija taiyaar hai. Neeche dekhiye.',
    hi: 'आपका नतीजा तैयार है। नीचे देखिए।',
    te: 'మీ ఫలితం సిద్ధంగా ఉంది. కింద చూడండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  results_trust_note: {
    en: 'Yeh shuruaati jaankari hai, sarkar ka faisla nahi. Har scheme office mein confirm kariye.',
    hi: 'यह शुरुआती जानकारी है, सरकार का फैसला नहीं। हर योजना कार्यालय में पुष्टि करें।',
    te: 'ఇది ప్రాథమిక సమాచారం, ప్రభుత్వ నిర్ణయం కాదు. ప్రతి పథకాన్ని కార్యాలయంలో నిర్ధారించుకోండి.', // NEEDS NATIVE TELUGU REVIEW
  },

  results_heading_do_first: {
    en: 'Pehle yeh kariye',
    hi: 'पहले यह करिए',
    te: 'మొదట ఇది చేయండి', // NEEDS NATIVE TELUGU REVIEW
  },
  results_heading_qualify: {
    en: 'In schemes ke liye aap aa sakte hain',
    hi: 'इन योजनाओं के लिए आप आ सकते हैं',
    te: 'ఈ పథకాలకు మీరు అర్హులు కావచ్చు', // NEEDS NATIVE TELUGU REVIEW
  },
  results_heading_unlocks_after: {
    en: 'Yeh iske baad unlock hoga',
    hi: 'यह इसके बाद अनलॉक होगा',
    te: 'ఇది తర్వాత అందుబాటులోకి వస్తుంది', // NEEDS NATIVE TELUGU REVIEW
  },
  results_heading_maybe: {
    en: 'Shayad — aur jaankari chahiye',
    hi: 'शायद — और जानकारी चाहिए',
    te: 'బహుశా — మరికొంత సమాచారం కావాలి', // NEEDS NATIVE TELUGU REVIEW
  },
  results_heading_not_eligible: {
    en: 'Aapke jawab ke hisaab se abhi eligible nahi',
    hi: 'आपके जवाब के हिसाब से अभी योग्य नहीं',
    te: 'మీ జవాబుల ప్రకారం ఇప్పుడు అర్హులు కాదు', // NEEDS NATIVE TELUGU REVIEW
  },
  results_cta_sheet: {
    en: 'Sheet dekhiye',
    hi: 'सूची देखिए',
    te: 'షీట్ చూడండి', // NEEDS NATIVE TELUGU REVIEW
  },
  needs_prerequisite_reason: {
    en: 'Pehle {scheme} banayein, phir yeh unlock ho jaayega.',
    hi: 'पहले {scheme} बनाएं, फिर यह अनलॉक हो जाएगा।',
    te: 'మొదట {scheme} చేయండి, తర్వాత ఇది అందుబాటులోకి వస్తుంది.', // NEEDS NATIVE TELUGU REVIEW
  },
  needs_info_reason: { en: 'Abhi pata nahi: {fields}', hi: 'अभी पता नहीं: {fields}', te: 'ఇంకా తెలియదు: {fields}' }, // NEEDS NATIVE TELUGU REVIEW

  // Names for the profile fields a result can still be missing.
  field_age: { en: 'age', hi: 'उम्र', te: 'వయస్సు' }, // NEEDS NATIVE TELUGU REVIEW
  field_monthly_income: { en: 'monthly income', hi: 'महीने की आय', te: 'నెల ఆదాయం' }, // NEEDS NATIVE TELUGU REVIEW
  field_occupation: { en: 'work', hi: 'काम', te: 'పని' }, // NEEDS NATIVE TELUGU REVIEW
  field_urban_or_rural: { en: 'city or village', hi: 'शहर या गांव', te: 'పట్నం లేదా గ్రామం' }, // NEEDS NATIVE TELUGU REVIEW
  field_has_bank_account: { en: 'bank account', hi: 'बैंक खाता', te: 'బ్యాంక్ ఖాతా' }, // NEEDS NATIVE TELUGU REVIEW
  field_has_aadhaar: { en: 'Aadhaar card', hi: 'आधार कार्ड', te: 'ఆధార్ కార్డు' }, // NEEDS NATIVE TELUGU REVIEW
  field_in_epf_esic_nps: { en: 'PF/ESIC/NPS', hi: 'पीएफ़/ईएसआईसी/एनपीएस', te: 'పీఎఫ్/ఈఎస్ఐసీ/ఎన్‌పీఎస్' }, // NEEDS NATIVE TELUGU REVIEW
  field_pays_income_tax: { en: 'income tax', hi: 'इनकम टैक्स', te: 'ఇన్‌కమ్ ట్యాక్స్' }, // NEEDS NATIVE TELUGU REVIEW
  field_state: { en: 'state', hi: 'राज्य', te: 'రాష్ట్రం' }, // NEEDS NATIVE TELUGU REVIEW
  field_district: { en: 'district', hi: 'ज़िला', te: 'జిల్లా' }, // NEEDS NATIVE TELUGU REVIEW
  link_source: { en: 'Source', hi: 'स्रोत', te: 'మూలం' }, // NEEDS NATIVE TELUGU REVIEW
  badge_unverified: {
    en: 'Rules not fully verified — confirm at the office',
    hi: 'नियम पूरी तरह सत्यापित नहीं हैं — कार्यालय में पुष्टि करें',
    te: 'నియమాలు పూర్తిగా ధృవీకరించబడలేదు — కార్యాలయంలో నిర్ధారించండి', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- rule failure reasons ---
  rule_age_min: {
    en: 'umar {actual} hai, kam se kam {expected} chahiye',
    hi: 'उम्र {actual} है, कम से कम {expected} चाहिए',
    te: 'వయస్సు {actual}, కనీసం {expected} ఉండాలి', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_age_max: {
    en: 'umar {actual} hai, zyada se zyada {expected} chahiye',
    hi: 'उम्र {actual} है, अधिकतम {expected} चाहिए',
    te: 'వయస్సు {actual}, గరిష్ఠంగా {expected} ఉండాలి', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_income_max_monthly: {
    en: 'mahine ki income {actual} hai, zyada se zyada {expected} honi chahiye',
    hi: 'महीने की आय {actual} है, अधिकतम {expected} होनी चाहिए',
    te: 'నెల ఆదాయం {actual}, గరిష్ఠంగా {expected} ఉండాలి', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_occupation_in: {
    en: 'yeh kaam is scheme mein nahi aata',
    hi: 'यह काम इस योजना में नहीं आता',
    te: 'మీ పని ఈ పథకంలో రాదు', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_urban_only: {
    en: 'aap gaon mein rehte hain, yeh scheme shahar ke liye hai',
    hi: 'आप गांव में रहते हैं, यह योजना शहर के लिए है',
    te: 'మీరు గ్రామంలో ఉంటారు, ఈ పథకం పట్నం వారికి', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_not_pays_income_tax: {
    en: 'aap income tax bharte hain',
    hi: 'आप इनकम टैक्स भरते हैं',
    te: 'మీరు ఇన్‌కమ్ ట్యాక్స్ కడతారు', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_not_in_epf_esic_nps: {
    en: 'aap PF/ESIC/NPS mein hain',
    hi: 'आप पीएफ़/ईएसआईसी/एनपीएस में हैं',
    te: 'మీరు పీఎఫ్/ఈఎస్ఐసీ/ఎన్‌పీఎస్‌లో ఉన్నారు', // NEEDS NATIVE TELUGU REVIEW
  },
  rule_requires_has_aadhaar: { en: 'Aadhaar card nahi hai', hi: 'आधार कार्ड नहीं है', te: 'ఆధార్ కార్డు లేదు' }, // NEEDS NATIVE TELUGU REVIEW
  rule_requires_has_bank_account: {
    en: 'apna bank account nahi hai',
    hi: 'अपना बैंक खाता नहीं है',
    te: 'మీ పేరు మీద బ్యాంక్ ఖాతా లేదు', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- printed sheet ---
  eyebrow_sheet: { en: 'Your sheet', hi: 'आपकी सूची', te: 'మీ షీట్' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_title: { en: 'Aapki scheme sheet', hi: 'आपकी योजना सूची', te: 'మీ పథకాల షీట్' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_documents_heading: { en: 'Saath le jaayein', hi: 'साथ ले जाएं', te: 'వెంట తీసుకెళ్లండి' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_age_label: { en: 'Age', hi: 'उम्र', te: 'వయస్సు' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_occupation_label: { en: 'Occupation', hi: 'काम', te: 'పని' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_location_label: { en: 'Place', hi: 'जगह', te: 'ప్రాంతం' }, // NEEDS NATIVE TELUGU REVIEW
  sheet_note_unverified: {
    en: 'Kuch schemes ke niyam abhi poore verify nahi hue. Wahan confirm kariye.',
    hi: 'कुछ योजनाओं के नियम अभी पूरे सत्यापित नहीं हुए। वहां पुष्टि करें।',
    te: 'కొన్ని పథకాల నియమాలు ఇంకా పూర్తిగా ధృవీకరించబడలేదు. అక్కడ నిర్ధారించుకోండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  sheet_footer: {
    en: 'Haq Bolo dwara taiyaar. Yeh application nahi hai. Ise CSC ya labour office le jaayein.',
    hi: 'हक़ बोलो द्वारा तैयार। यह आवेदन नहीं है। इसे सीएससी या श्रम कार्यालय ले जाएं।',
    te: 'హక్ బోలో ద్వారా తయారు చేయబడింది. ఇది దరఖాస్తు కాదు. దీన్ని సీఎస్సీ లేదా కార్మిక కార్యాలయానికి తీసుకెళ్లండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  print_label: { en: 'Print', hi: 'प्रिंट करें', te: 'ప్రింట్ చేయండి' }, // NEEDS NATIVE TELUGU REVIEW

  // --- about ---
  app_about_link: { en: 'About', hi: 'जानकारी', te: 'గురించి' }, // NEEDS NATIVE TELUGU REVIEW
  eyebrow_about: { en: 'About', hi: 'जानकारी', te: 'గురించి' }, // NEEDS NATIVE TELUGU REVIEW
  about_title: { en: 'Haq Bolo ke baare mein', hi: 'हक़ बोलो के बारे में', te: 'హక్ బోలో గురించి' }, // NEEDS NATIVE TELUGU REVIEW
  about_honesty_schemes: {
    en: 'Yeh list haath se bani hai aur sirf 6 schemes ko dekhti hai. Poori list nahi hai.',
    hi: 'यह सूची हाथ से बनी है और केवल 6 योजनाओं को देखती है। पूरी सूची नहीं है।',
    te: 'ఈ జాబితా చేతితో తయారు చేసినది, 6 పథకాలను మాత్రమే చూస్తుంది. పూర్తి జాబితా కాదు.', // NEEDS NATIVE TELUGU REVIEW
  },
  about_honesty_decision: {
    en: 'Yeh sirf margdarshan hai, sarkar ka faisla nahi. Office jaakar confirm kariye.',
    hi: 'यह केवल मार्गदर्शन है, सरकार का फैसला नहीं। कार्यालय जाकर पुष्टि करें।',
    te: 'ఇది కేవలం మార్గదర్శనం, ప్రభుత్వ నిర్ణయం కాదు. కార్యాలయంలో నిర్ధారించుకోండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  about_honesty_voice: {
    en: 'Aapki awaaz is phone/browser ke speech service se samjhi jaati hai. Transcript isi browser mein rehta hai, hamare server par nahi jaata.',
    hi: 'आपकी आवाज़ इस फ़ोन/ब्राउज़र की स्पीच सेवा से समझी जाती है। ट्रांसक्रिप्ट इसी ब्राउज़र में रहता है, हमारे सर्वर पर नहीं जाता।',
    te: 'మీ మాటను ఈ ఫోన్/బ్రౌజర్ స్పీచ్ సేవ అర్థం చేసుకుంటుంది. ట్రాన్స్క్రిప్ట్ ఈ బ్రౌజర్‌లోనే ఉంటుంది, మా సర్వర్‌కు వెళ్లదు.', // NEEDS NATIVE TELUGU REVIEW
  },
  back_label: { en: 'Back', hi: 'वापस', te: 'వెనుకకు' }, // NEEDS NATIVE TELUGU REVIEW

  // --- labels for profile values ---
  label_occupation_street_vendor: {
    en: 'Thela / Rehdi vendor',
    hi: 'ठेला / रेहड़ी विक्रेता',
    te: 'తోపుడు బండి / వీధి వ్యాపారి', // NEEDS NATIVE TELUGU REVIEW
  },
  label_occupation_construction_worker: {
    en: 'Construction mazdoor',
    hi: 'निर्माण मज़दूर',
    te: 'నిర్మాణ కార్మికుడు', // NEEDS NATIVE TELUGU REVIEW
  },
  label_occupation_delivery_rider: {
    en: 'Delivery rider',
    hi: 'डिलीवरी राइडर',
    te: 'డెలివరీ రైడర్', // NEEDS NATIVE TELUGU REVIEW
  },
  label_occupation_domestic_worker: {
    en: 'Ghar ka kaam karne waale',
    hi: 'घर का काम करने वाले',
    te: 'ఇంటి పని చేసేవారు', // NEEDS NATIVE TELUGU REVIEW
  },
  label_occupation_other: { en: 'Doosra kaam', hi: 'दूसरा काम', te: 'ఇతర పని' }, // NEEDS NATIVE TELUGU REVIEW
  label_urban: { en: 'Shahar', hi: 'शहर', te: 'పట్నం' }, // NEEDS NATIVE TELUGU REVIEW
  label_rural: { en: 'Gaon', hi: 'गांव', te: 'గ్రామం' }, // NEEDS NATIVE TELUGU REVIEW
  label_yes: { en: 'Haan', hi: 'हां', te: 'అవును' }, // NEEDS NATIVE TELUGU REVIEW
  label_no: { en: 'Nahi', hi: 'नहीं', te: 'కాదు' }, // NEEDS NATIVE TELUGU REVIEW

  quick_vendor: { en: 'Thela / Rehdi', hi: 'ठेला / रेहड़ी', te: 'తోపుడు బండి' }, // NEEDS NATIVE TELUGU REVIEW
  quick_construction: { en: 'Construction', hi: 'निर्माण', te: 'నిర్మాణం' }, // NEEDS NATIVE TELUGU REVIEW
  quick_delivery: { en: 'Delivery', hi: 'डिलीवरी', te: 'డెలివరీ' }, // NEEDS NATIVE TELUGU REVIEW
  quick_other: { en: 'Doosra', hi: 'दूसरा', te: 'ఇతర' }, // NEEDS NATIVE TELUGU REVIEW

  chip_age: { en: 'Umar', hi: 'उम्र', te: 'వయస్సు' }, // NEEDS NATIVE TELUGU REVIEW
  chip_income: { en: 'Aamdani', hi: 'आमदनी', te: 'ఆదాయం' }, // NEEDS NATIVE TELUGU REVIEW
  chip_month_suffix: { en: '/mahina', hi: '/महीना', te: '/నెల' }, // NEEDS NATIVE TELUGU REVIEW
  chip_dependants: { en: 'Parivar', hi: 'परिवार', te: 'కుటుంబం' }, // NEEDS NATIVE TELUGU REVIEW
  chip_state: { en: 'Rajya', hi: 'राज्य', te: 'రాష్ట్రం' }, // NEEDS NATIVE TELUGU REVIEW
  chip_district: { en: 'Zila', hi: 'ज़िला', te: 'జిల్లా' }, // NEEDS NATIVE TELUGU REVIEW
  location_unknown: {
    en: 'Yeh jagah samajh nahi aayi. Rajya ya zile ka naam phir se boliye, ya neeche type kariye.',
    hi: 'यह जगह समझ नहीं आई। राज्य या ज़िले का नाम फिर से बोलिए, या नीचे टाइप करें।',
    te: 'ఈ ప్రాంతం అర్థం కాలేదు. రాష్ట్రం లేదా జిల్లా పేరు మళ్ళీ చెప్పండి, లేదా కింద టైప్ చేయండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  results_change_location: {
    en: 'Jagah badlein',
    hi: 'जगह बदलें',
    te: 'ప్రాంతం మార్చండి', // NEEDS NATIVE TELUGU REVIEW
  },

  // --- voice controls and fallbacks ---
  eyebrow_question: { en: 'Question', hi: 'सवाल', te: 'ప్రశ్న' }, // NEEDS NATIVE TELUGU REVIEW
  eyebrow_conflict: { en: 'Which one?', hi: 'कौन सा?', te: 'ఏది?' }, // NEEDS NATIVE TELUGU REVIEW
  eyebrow_results: { en: 'Results', hi: 'नतीजे', te: 'ఫలితాలు' }, // NEEDS NATIVE TELUGU REVIEW
  type_instead_placeholder: {
    en: 'Yahan type kariye...',
    hi: 'यहां टाइप करें...',
    te: 'ఇక్కడ టైప్ చేయండి...', // NEEDS NATIVE TELUGU REVIEW
  },
  submit_label: { en: 'Submit', hi: 'भेजें', te: 'సమర్పించండి' }, // NEEDS NATIVE TELUGU REVIEW
  play_sample_label: { en: 'Sample sunayein', hi: 'नमूना सुनाएं', te: 'నమూనా వినండి' }, // NEEDS NATIVE TELUGU REVIEW
  mic_start: { en: 'Boliye', hi: 'बोलिए', te: 'చెప్పండి' }, // NEEDS NATIVE TELUGU REVIEW
  mic_stop: { en: 'Rukiye', hi: 'रुकिए', te: 'ఆపండి' }, // NEEDS NATIVE TELUGU REVIEW
  mic_tap_to_speak: {
    en: 'Bolne ke liye dabaiye',
    hi: 'बोलने के लिए दबाएं',
    te: 'మాట్లాడటానికి నొక్కండి', // NEEDS NATIVE TELUGU REVIEW
  },
  mic_listening: { en: 'Sun raha hoon...', hi: 'सुन रहा हूं...', te: 'వింటున్నాను...' }, // NEEDS NATIVE TELUGU REVIEW
  listening_speak_now: { en: 'Boliye, main sun raha hoon.', hi: 'बोलिए, मैं सुन रहा हूं।', te: 'చెప్పండి, నేను వింటున్నాను.' }, // NEEDS NATIVE TELUGU REVIEW
  no_voice_notice: {
    en: 'Is bhasha ke liye koi awaaz nahi mili. Sab kuch yahan likha hua dikhega.',
    hi: 'इस भाषा के लिए कोई आवाज़ नहीं मिली। सब कुछ यहां लिखा हुआ दिखेगा।',
    te: 'ఈ భాషకు వాయిస్ దొరకలేదు. అన్నీ ఇక్కడ రాతపూర్వకంగా కనిపిస్తాయి.', // NEEDS NATIVE TELUGU REVIEW
  },

  low_confidence: {
    en: 'Awaaz saaf nahi aayi, phone paas rakhiye aur dobara boliye.',
    hi: 'आवाज़ साफ़ नहीं आई, फ़ोन पास रखिए और दोबारा बोलिए।',
    te: 'మీ వాయిస్ స్పష్టంగా వినబడలేదు, ఫోన్ దగ్గరగా పట్టుకొని మళ్ళీ చెప్పండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  silence_nudge: {
    en: 'Boliye, main sun raha hoon.',
    hi: 'बोलिए, मैं सुन रहा हूं।',
    te: 'చెప్పండి, నేను వింటున్నాను.', // NEEDS NATIVE TELUGU REVIEW
  },
  off_topic_hint: {
    en: 'Samajh nahi aaya. Sawaal phir se suniye aur Haan, Nahi ya number mein jawab dijiye.',
    hi: 'समझ नहीं आया। सवाल फिर से सुनिए और हां, नहीं या नंबर में जवाब दीजिए।',
    te: 'అర్థం కాలేదు. ప్రశ్న మళ్ళీ వినండి, అవును, కాదు లేదా సంఖ్యలో జవాబు ఇవ్వండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  conflict_age: {
    en: 'Aapne do umar bataayi: {a} aur {b}. Kaun si sahi hai?',
    hi: 'आपने दो उम्र बताई: {a} और {b}। कौन सी सही है?',
    te: 'మీరు రెండు వయస్సులు చెప్పారు: {a} మరియు {b}. ఏది సరైనది?', // NEEDS NATIVE TELUGU REVIEW
  },
  conflict_generic: {
    en: 'Aapne do alag jawab diye: {a} aur {b}. Kaun sa sahi hai?',
    hi: 'आपने दो अलग जवाब दिए: {a} और {b}। कौन सा सही है?',
    te: 'మీరు రెండు వేరే జవాబులు చెప్పారు: {a} మరియు {b}. ఏది సరైనది?', // NEEDS NATIVE TELUGU REVIEW
  },
  skip_label: { en: 'Skip kariye', hi: 'छोड़ दें', te: 'దాటవేయండి' }, // NEEDS NATIVE TELUGU REVIEW
  mic_denied_message: {
    en: 'Mic ki permission nahi mili. Neeche type kariye ya sample sunayein.',
    hi: 'माइक की अनुमति नहीं मिली। नीचे टाइप करें या नमूना सुनें।',
    te: 'మైక్ అనుమతి రాలేదు. కింద టైప్ చేయండి లేదా నమూనా వినండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  recognition_unsupported_message: {
    en: 'Is browser mein awaaz pehchaanna kaam nahi karta. Neeche type kariye ya sample sunayein.',
    hi: 'इस ब्राउज़र में आवाज़ पहचानना काम नहीं करता। नीचे टाइप करें या नमूना सुनें।',
    te: 'ఈ బ్రౌజర్‌లో వాయిస్ గుర్తింపు పని చేయదు. కింద టైప్ చేయండి లేదా నమూనా వినండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  language_unsupported_message: {
    en: 'Is browser mein is bhasha ki awaaz pehchaan nahi paate. Neeche type kariye ya sample sunayein.',
    hi: 'इस ब्राउज़र में इस भाषा की आवाज़ नहीं पहचान पाते। नीचे टाइप करें या नमूना सुनें।',
    te: 'ఈ బ్రౌజర్‌లో ఈ భాష వాయిస్ గుర్తించలేము. కింద టైప్ చేయండి లేదా నమూనా వినండి.', // NEEDS NATIVE TELUGU REVIEW
  },
  what_i_understood: { en: 'What I understood', hi: 'मैंने यह समझा', te: 'నేను ఇది అర్థం చేసుకున్నాను' }, // NEEDS NATIVE TELUGU REVIEW
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
