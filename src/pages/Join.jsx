import { useEffect, useState } from 'react'
import { useGame, joinTeam, myTeam } from '../lib'

export default function Join() {
  const game = useGame()
  const [name, setName] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const me = myTeam()
    if (game && me && game.session === me.session && game.teams?.[me.id]) window.location.hash = '#/team'
  }, [game])

  const go = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true); setErr('')
    try { await joinTeam(name); window.location.hash = '#/team' }
    catch (x) { setErr(x.message); setBusy(false) }
  }

  return (
    <div className="phone" style={{ paddingTop: '12vh' }}>
      <div className="brand" style={{ textAlign: 'center' }}>KYC/<b>KYB</b> CONSOLE</div>
      <p className="dim mono" style={{ textAlign: 'center', fontSize: 11, letterSpacing: '.22em', marginTop: 8 }}>COMPLIANCE ANALYST LOGIN</p>
      <form onSubmit={go} className="panel card scan" style={{ marginTop: 34, padding: 22 }}>
        <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.18em', marginBottom: 10 }}>TEAM NAME</div>
        <input className="big-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} placeholder="e.g. Team Riga" autoFocus />
        <button className="btn solid" style={{ width: '100%', marginTop: 16, padding: 14 }} disabled={busy || !name.trim() || game === null}>
          {busy ? 'Connecting…' : 'Enter console'}
        </button>
        {game === null && <p className="mono blink" style={{ color: 'var(--amber)', fontSize: 12, marginTop: 14 }}>Waiting for the presenter to open a session…</p>}
        {err && <p className="mono" style={{ color: 'var(--red)', fontSize: 12, marginTop: 14 }}>{err}</p>}
      </form>
      <p className="dim" style={{ fontSize: 13, lineHeight: 1.5, marginTop: 18 }}>
        You are the bank's compliance team. You will receive one client application. Review 14 KYC/KYB answers, rate each one's risk,
        then classify the client and decide whether to open the account.
      </p>
    </div>
  )
}
