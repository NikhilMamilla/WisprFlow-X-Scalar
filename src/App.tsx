import { useEffect, useState } from 'react'
import DiagnosticPage from './DiagnosticPage'
import Flow from './Flow'

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function App() {
  const hash = useHash()
  return hash === '#/diagnostic' ? <DiagnosticPage /> : <Flow />
}

export default App
