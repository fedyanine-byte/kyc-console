import { useEffect, useState } from 'react'
import Home from './pages/Home'
import Join from './pages/Join'
import Team from './pages/Team'
import Presenter from './pages/Presenter'

function useHash() {
  const [h, setH] = useState(window.location.hash || '#/join')
  useEffect(() => {
    const f = () => setH(window.location.hash || '#/join')
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return h
}

export default function App() {
  const h = useHash()
  if (h.startsWith('#/presenter')) return <Presenter />
  if (h.startsWith('#/team')) return <Team />
  if (h.startsWith('#/home')) return <Home />
  return <Join />
}
