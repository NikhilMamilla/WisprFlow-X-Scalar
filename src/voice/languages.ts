export interface VoiceLanguage {
  code: 'hi-IN' | 'te-IN' | 'en-IN'
  label: string
  sample: string
}

export const LANGUAGES: VoiceLanguage[] = [
  { code: 'hi-IN', label: 'हिन्दी', sample: 'नमस्ते, मैं हक बोलो से बात कर रहा हूँ।' },
  { code: 'te-IN', label: 'తెలుగు', sample: 'నమస్తే, నేను హక్ బోలో నుండి మాట్లాడుతున్నాను.' },
  { code: 'en-IN', label: 'Hinglish', sample: 'Hello, main Haq Bolo se baat kar raha hoon.' },
]

// Demo story per UI language, used by the "Play sample" button. Each one is written in
// that language and only says things the extractor understands, so sample mode gives
// the same honest starting profile in every language.
export const SAMPLE_STORY: Record<'hi' | 'en' | 'te', string> = {
  hi: 'मैं ठेला लगाता हूँ, तीन बच्चे हैं, किराये के घर में रहता हूँ, बैंक खाता भाई के नाम पर है।',
  te: 'నేను కూరగాయలు అమ్ముతాను, 3 పిల్లలు ఉన్నారు, అద్దె ఇంట్లో ఉంటాను, బ్యాంక్ ఖాతా అన్న పేరు మీద ఉంది.',
  en: 'Main thela lagata hoon, teen bachche hain, kiraye ke ghar mein rehta hoon, bank account bhai ke naam pe hai.',
}

// A second Hinglish sample: a Hyderabad construction worker with 90+ days in the
// year and his own account, so the Telangana registration can be demonstrated.
export const SECOND_SAMPLE_STORY: Record<'hi' | 'en' | 'te', string> = {
  hi: SAMPLE_STORY.hi,
  te: SAMPLE_STORY.te,
  en: 'Main Hyderabad mein construction worker hoon, 32 saal ka hoon, pichhle saal 90 din se zyada kaam kiya, mera apna bank account hai.',
}

export function sampleStoryFor(lang: 'hi' | 'en' | 'te', index = 0): string {
  const stories = [SAMPLE_STORY[lang] ?? SAMPLE_STORY.en, SECOND_SAMPLE_STORY[lang] ?? SECOND_SAMPLE_STORY.en]
  return stories[index % stories.length]
}

// Fixed sentence used by the developer diagnostic page only.
export const FIXED_SAMPLE_SENTENCE = SAMPLE_STORY.en

// Locale handed to Web Speech recognition. Hinglish speech is mostly Hindi words in a
// mixed English sentence, so hi-IN recognises it better than en-IN; the extractor
// understands both Devanagari and Roman output.
export function recognitionLocaleFor(code: 'hi-IN' | 'te-IN' | 'en-IN'): string {
  return code === 'en-IN' ? 'hi-IN' : code
}
