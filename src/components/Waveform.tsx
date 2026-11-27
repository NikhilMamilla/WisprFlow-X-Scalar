// Bars-only waveform glyph. Used small in the header (static) and larger while listening (animated).
export default function Waveform({ active = false, bars = 5 }: { active?: boolean; bars?: number }) {
  return (
    <span className={active ? 'waveform active' : 'waveform'} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span className="bar" key={i} />
      ))}
    </span>
  )
}
