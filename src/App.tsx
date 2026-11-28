import { useEffect, useState } from 'react'
import DiagnosticPage from './DiagnosticPage'
import Flow from './Flow'
import Landing from './landing/Landing'

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// Landing is the citizen's entry point. The existing voice journey keeps its
// own screens and stays the only place that collects a profile.
function App() {
  const hash = useHash()
  if (hash === '#/diagnostic') return <DiagnosticPage />
  if (hash.startsWith('#/start')) return <Flow />
  return <Landing />
}

export default App
