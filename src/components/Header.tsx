import Waveform from './Waveform'

export default function Header() {
  return (
    <header className="app-header">
      <Waveform bars={4} />
      <span>Haq Bolo</span>
    </header>
  )
}
