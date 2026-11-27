// A field of small, slowly twinkling dots for the night-themed screens.
const DOTS = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: `${(i % 7) * 0.9}s`,
}))

export default function DotField() {
  return (
    <div className="dot-field" aria-hidden="true">
      {DOTS.map((d, i) => (
        <span key={i} className="dot" style={{ left: d.left, top: d.top, animationDelay: d.delay }} />
      ))}
    </div>
  )
}
