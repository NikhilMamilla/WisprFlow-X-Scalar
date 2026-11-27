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

// Fixed sentence for the "Play sample" demo-without-a-mic button: the full demo story.
export const FIXED_SAMPLE_SENTENCE =
  'Main thela lagata hoon, teen bachche hain, kiraye ke ghar mein rehta hoon, bank account bhai ke naam pe hai.'
