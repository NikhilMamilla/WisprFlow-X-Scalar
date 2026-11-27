// Small cream "hello" bubbles that gently float, one per language, on the Language screen.
const GREETINGS = [
  { word: 'नमस्ते', label: 'Hindi' },
  { word: 'నమస్కారం', label: 'Telugu' },
  { word: 'Namaste', label: 'Hinglish' },
]

export default function HelloBubbles() {
  return (
    <div className="hello-bubbles" aria-hidden="true">
      {GREETINGS.map((g, i) => (
        <span key={g.label} className="hello-bubble" style={{ animationDelay: `${i * 0.6}s` }}>
          <span className="word">{g.word}</span>
          <span className="label">{g.label}</span>
        </span>
      ))}
    </div>
  )
}
