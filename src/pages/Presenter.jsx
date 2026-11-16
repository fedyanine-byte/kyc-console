import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QUESTIONS } from '../data/cases'
import {
  useGame, caseById, startGame, nextRound, newSession, setPhase, score, MAX_SCORE,
  RISK_LABEL, RISK_COLOR, DEC_LABEL, DEC_COLOR, riskOk, decOk,
} from '../lib'

const ROWS = 20

function useClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return t
}

export default function Presenter() {
  const game = useGame()
  const clock = useClock()
  const [qr, setQr] = useState('')
  const [modal, setModal] = useState(null)
  const joinUrl = `${window.location.origin}${window.location.pathname}#/join`

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 1, width: 360, color: { dark: '#2de2ff', light: '#04060c' } }).then(setQr)
  }, [joinUrl])

  if (game === undefined) return <div className="pres mono dim blink">Connecting…</div>

  const phase = game?.phase || 'none'
  const teams = Object.entries(game?.teams || {}).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0))
  const submitted = teams.filter(([, t]) => t.submitted).length
  const reveal = phase === 'reveal'
  const rows = phase === 'lobby' ? teams : [...teams, ...Array(Math.max(0, ROWS - teams.length)).fill(null)]

  const elapsed = game?.startedAt && phase !== 'lobby' ? Math.floor((Date.now() - game.startedAt) / 1000) : 0
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

  return (
    <div className="pres">
      <div className="pres-head">
        <div>
          <div className="brand" style={{ fontSize: 20 }}>KYC/<b>KYB</b> CONSOLE</div>
          <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.24em', marginTop: 4 }}>CLIENT ONBOARDING · RISK DESK</div>
        </div>
        <div style={{ flex: 1 }} />
        <div className="stat">STATUS <b className="glow" style={{ marginLeft: 6 }}>{phase.toUpperCase()}</b></div>
        {game?.round > 0 && phase !== 'lobby' && <div className="stat">ROUND <b className="glow">{game.round}</b></div>}
        <div className="stat">TEAMS <b>{teams.length}</b></div>
        <div className="stat">SUBMITTED <b style={{ color: 'var(--green)' }}>{submitted}</b>/{teams.length}</div>
        {phase !== 'lobby' && phase !== 'none' && <div className="stat">ELAPSED <b>{mmss}</b></div>}
        <div className="stat"><b style={{ fontWeight: 200 }}>{clock.toLocaleTimeString('en-GB')}</b></div>
        <div style={{ display: 'flex', gap: 8 }}>
          {phase === 'reveal' && teams.length > 0 && (
            <button className="btn solid" onClick={() => { if (confirm('Start the next round with the same teams and new clients?')) nextRound() }}>Next round · same teams</button>
          )}
          {phase === 'reveal' && <button className="btn red" onClick={() => { if (confirm('New session? All teams must join again.')) newSession() }}>New session</button>}
          {phase === 'none' && <button className="btn solid" onClick={() => newSession()}>New session</button>}
          {phase === 'lobby' && <button className="btn solid" disabled={!teams.length} onClick={startGame}>Assign clients · Start</button>}
          {phase === 'play' && <button className="btn" onClick={() => setPhase('locked')}>Lock answers</button>}
          {(phase === 'play' || phase === 'locked') && <button className="btn green" onClick={() => setPhase('reveal')}>Reveal</button>}
          {phase !== 'none' && phase !== 'reveal' && (
            <button className="btn red" onClick={() => { if (confirm('Reset session? All teams and answers will be deleted.')) newSession() }}>Reset</button>
          )}
        </div>
      </div>

      {phase === 'none' && (
        <div className="panel scan" style={{ padding: 60, textAlign: 'center', marginTop: 60 }}>
          <div className="glow mono" style={{ fontSize: 14, letterSpacing: '.3em' }}>NO ACTIVE SESSION</div>
          <p className="dim">Press <b>New session</b> to open the console for teams.</p>
        </div>
      )}

      {phase === 'lobby' && (
        <div className="panel scan" style={{ display: 'flex', gap: 40, alignItems: 'center', padding: '24px 34px', marginBottom: 14 }}>
          {qr && <img src={qr} alt="Join QR" style={{ width: 210, height: 210, border: '1px solid rgba(45,226,255,.4)', borderRadius: 8 }} />}
          <div>
            <div className="mono dim" style={{ fontSize: 12, letterSpacing: '.24em' }}>SCAN TO JOIN</div>
            <div className="glow mono" style={{ fontSize: 22, fontWeight: 300, margin: '8px 0 14px', wordBreak: 'break-all' }}>{joinUrl.replace(/^https?:\/\//, '')}</div>
            <p style={{ fontSize: 17, lineHeight: 1.5, maxWidth: 760, margin: 0 }}>
              Form teams of 3–4. You are a bank's compliance desk. Each team receives a <span className="glow">unique client</span>.
              Rate the risk of 14 KYC/KYB answers, classify the client, and decide: <b style={{ color: 'var(--green)' }}>OPEN</b>,{' '}
              <b style={{ color: 'var(--amber)' }}>OPEN + EDD</b> or <b style={{ color: 'var(--red)' }}>DECLINE</b>.
            </p>
          </div>
        </div>
      )}

      {phase !== 'none' && (
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 28 }}>#</th>
              <th className="l" style={{ width: 150 }}>TEAM</th>
              <th className="l" style={{ width: reveal ? 230 : 290 }}>APPLICANT</th>
              {QUESTIONS.map((q) => <th key={q.id} title={q.text}>{q.id}<br /><span style={{ fontSize: 9 }}>{q.short}</span></th>)}
              <th style={{ width: 80 }}>RISK</th>
              <th style={{ width: 110 }}>DECISION</th>
              {reveal && <th className="sys-h" colSpan={2}>◆ SYSTEM VERDICT</th>}
              {reveal && <th style={{ width: 60 }}>SCORE</th>}
              {reveal && game?.round > 1 && <th style={{ width: 60 }}>TOTAL</th>}
              {reveal && <th style={{ width: 150 }} />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              if (!row) return (
                <tr key={`e${idx}`} className="empty">
                  <td className="dim">{idx + 1}</td><td className="l dim">—</td><td className="l" />
                  {QUESTIONS.map((q) => <td key={q.id}><div className="cell" style={{ opacity: .35 }} /></td>)}
                  <td /><td />{reveal && <><td className="sys" /><td className="sys" /></>}{reveal && <td />}{reveal && game?.round > 1 && <td />}{reveal && <td />}
                </tr>
              )
              const [tid, t] = row
              const c = caseById(t.caseId)
              const s = reveal ? score(t) : null
              return (
                <tr key={tid}>
                  <td className="dim">{idx + 1}</td>
                  <td className="l"><span className="team-name">{t.name}</span>{t.submitted && !reveal && <span style={{ color: 'var(--green)', marginLeft: 6 }}>●</span>}</td>
                  <td className="l applicant">{c ? <><b>{c.name}</b><br />{c.oneLiner}</> : <span className="blink">awaiting file…</span>}</td>
                  {QUESTIONS.map((q, i) => {
                    const r = t.ratings?.[i]
                    const ok = reveal && c && r === c.answers[i].r
                    return (
                      <td key={q.id}>
                        <div className={`cell ${r || (t.opened?.[i] ? 'open' : '')}`}>
                          {r ? r : ''}
                          {reveal && <span className={`mk ${ok ? 'ok' : 'no'}`}>{ok ? '✓' : '✗'}</span>}
                        </div>
                      </td>
                    )
                  })}
                  <td>
                    {t.risk ? <span className="tag" style={{ color: RISK_COLOR[t.risk], borderColor: RISK_COLOR[t.risk], boxShadow: `0 0 10px ${RISK_COLOR[t.risk]}55` }}>{RISK_LABEL[t.risk]}{reveal && c ? (riskOk(c, t.risk) ? ' ✓' : ' ✗') : ''}</span> : <span className="dim">·</span>}
                  </td>
                  <td>
                    {t.decision && t.submitted
                      ? <span className="tag" style={{ color: DEC_COLOR[t.decision], borderColor: DEC_COLOR[t.decision], boxShadow: `0 0 10px ${DEC_COLOR[t.decision]}55`, minWidth: 96 }}>{DEC_LABEL[t.decision]}{reveal && c ? (decOk(c, t.decision) ? ' ✓' : ' ✗') : ''}</span>
                      : <span className="dim">{t.decision ? '…' : '·'}</span>}
                  </td>
                  {reveal && (
                    <td className="sys">
                      {c && <span className="tag" style={{ color: '#000', background: RISK_COLOR[c.risk], borderColor: RISK_COLOR[c.risk] }}>{RISK_LABEL[c.risk]}</span>}
                    </td>
                  )}
                  {reveal && (
                    <td className="sys">
                      {c && <span className="tag" style={{ color: '#000', background: DEC_COLOR[c.decision], borderColor: DEC_COLOR[c.decision], minWidth: 96 }}>{DEC_LABEL[c.decision]}</span>}
                    </td>
                  )}
                  {reveal && <td className="score">{s.total}</td>}
                  {reveal && game?.round > 1 && <td className="score" style={{ color: '#fff', fontWeight: 600 }}>{(t.totalScore || 0) + (t.submitted ? s.total : 0)}</td>}
                  {reveal && <td><button className="btn" style={{ padding: '6px 10px', fontSize: 11, whiteSpace: 'nowrap' }} onClick={() => setModal(tid)} disabled={!c}>Explanation ▸</button></td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {modal && game.teams?.[modal] && <Explain team={game.teams[modal]} onClose={() => setModal(null)} />}
    </div>
  )
}

function Explain({ team, onClose }) {
  const c = caseById(team.caseId)
  const s = score(team)
  useEffect(() => {
    const f = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [onClose])
  const accent = c.trap === 'sanctioned' ? 'var(--red)' : c.trap === 'falsePositive' ? 'var(--amber)' : 'var(--cyan)'
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="panel modal" onClick={(e) => e.stopPropagation()} style={{ borderColor: accent }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="mono dim" style={{ fontSize: 12, letterSpacing: '.2em' }}>
              CLIENT FILE #{String(c.id).padStart(3, '0')} · {c.type === 'Company' ? 'KYB' : 'KYC'} · TEAM {team.name.toUpperCase()}
            </div>
            <h2>{c.name}</h2>
            <div className="glow" style={{ fontSize: 16 }}>{c.oneLiner}</div>
            {c.trap === 'sanctioned' && <div className="mono" style={{ color: 'var(--red)', marginTop: 8, letterSpacing: '.18em' }}>⛔ SANCTIONED PERSON — CLEAR NO-GO</div>}
            {c.trap === 'falsePositive' && <div className="mono" style={{ color: 'var(--amber)', marginTop: 8, letterSpacing: '.18em' }}>⚠ FALSE POSITIVE — NAME MATCH, DIFFERENT PERSON</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="glow mono" style={{ fontSize: 44, fontWeight: 200, lineHeight: 1 }}>{s.total}<span className="dim" style={{ fontSize: 18 }}>/{MAX_SCORE}</span></div>
            <button className="btn" style={{ marginTop: 12 }} onClick={onClose}>Close ✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, margin: '18px 0' }}>
          <Box label="CORRECT RISK" val={RISK_LABEL[c.risk]} color={RISK_COLOR[c.risk]} team={RISK_LABEL[team.risk]} ok={riskOk(c, team.risk)} />
          <Box label="CORRECT DECISION" val={DEC_LABEL[c.decision]} color={DEC_COLOR[c.decision]} team={DEC_LABEL[team.decision]} ok={decOk(c, team.decision)} />
          <div className="panel" style={{ flex: 2.2, padding: '14px 18px', borderColor: accent }}>
            <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.2em', marginBottom: 6 }}>WHY</div>
            <div style={{ fontSize: 16, lineHeight: 1.5 }}>{c.explanation}</div>
          </div>
        </div>

        <div className="qa mono dim" style={{ fontSize: 11, letterSpacing: '.14em' }}><span>Q</span><span>QUESTION</span><span>ANSWER · WHY IT MATTERS</span><span>TEAM</span><span>CORRECT</span></div>
        {QUESTIONS.map((q, i) => {
          const a = c.answers[i]; const mine = team.ratings?.[i]; const ok = mine === a.r
          return (
            <div key={i} className="qa" style={a.r !== 'L' ? { background: 'rgba(45,226,255,.03)' } : null}>
              <span className="n">{q.id}</span>
              <span>{q.text}</span>
              <span>
                <span style={{ color: '#fff' }}>{a.a}</span>
                {a.n && <div style={{ color: 'var(--cyan)', marginTop: 3, fontSize: 13 }}>↳ {a.n}</div>}
              </span>
              <span className="mono" style={{ color: RISK_COLOR[mine] || 'var(--dim)' }}>{RISK_LABEL[mine] || '—'} {ok ? '✓' : '✗'}</span>
              <span className="mono" style={{ color: RISK_COLOR[a.r], fontWeight: 600 }}>{RISK_LABEL[a.r]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Box({ label, val, color, team, ok }) {
  return (
    <div className="panel" style={{ flex: 1, padding: '14px 18px', borderColor: color }}>
      <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.2em' }}>{label}</div>
      <div className="mono" style={{ fontSize: 24, color, fontWeight: 600, margin: '6px 0', textShadow: `0 0 12px ${color}` }}>{val}</div>
      <div className="mono" style={{ fontSize: 13 }}>team: {team || '—'} <span style={{ color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? '✓' : '✗'}</span></div>
    </div>
  )
}
