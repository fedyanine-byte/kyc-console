import { useEffect, useState } from 'react'
import { QUESTIONS } from '../data/cases'
import {
  useGame, myTeam, caseById, writeTeam, score, MAX_SCORE,
  RISK_LABEL, RISK_COLOR, DEC_LABEL, DEC_COLOR, riskOk, decOk,
} from '../lib'

export default function Team() {
  const game = useGame()
  const me = myTeam()
  const [open, setOpen] = useState(null)

  const team = game && me ? game.teams?.[me.id] : null
  useEffect(() => {
    if (game === undefined) return
    if (!me || !game || game.session !== me.session || !team) window.location.hash = '#/join'
  }, [game])

  if (!team) return <Shell><p className="mono dim blink">Connecting…</p></Shell>

  const phase = game.phase
  const c = caseById(team.caseId)

  if (phase === 'lobby' || !c) {
    return (
      <Shell team={team}>
        <div className="panel card scan" style={{ textAlign: 'center', padding: '40px 18px' }}>
          <div className="mono glow" style={{ fontSize: 13, letterSpacing: '.2em' }}>ACCESS GRANTED</div>
          <p style={{ fontSize: 22, fontWeight: 400, margin: '14px 0 6px' }}>{team.name}</p>
          <p className="dim blink mono" style={{ fontSize: 12 }}>Waiting for a client file to be assigned…</p>
        </div>
      </Shell>
    )
  }

  const ratings = team.ratings || {}
  const rated = QUESTIONS.filter((_, i) => ratings[i]).length
  const allRated = rated === QUESTIONS.length
  const locked = team.submitted || phase === 'locked' || phase === 'reveal'

  const rate = (i, v) => {
    if (locked) return
    writeTeam(me.id, { [`ratings/${i}`]: v })
    const next = QUESTIONS.findIndex((_, j) => j > i && !ratings[j])
    setOpen(next >= 0 ? next : null)
  }
  const toggle = (i) => {
    setOpen(open === i ? null : i)
    if (!team.opened?.[i]) writeTeam(me.id, { [`opened/${i}`]: true })
  }

  // ---------- reveal ----------
  if (phase === 'reveal') {
    const s = score(team)
    return (
      <Shell team={team}>
        <ClientCard c={c} />
        <div className="panel card" style={{ textAlign: 'center' }}>
          <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.2em' }}>YOUR SCORE</div>
          <div className="glow mono" style={{ fontSize: 46, fontWeight: 200 }}>{s.total}<span className="dim" style={{ fontSize: 20 }}> / {MAX_SCORE}</span></div>
          <div className="mono dim" style={{ fontSize: 12 }}>answers {s.q}/{QUESTIONS.length} · risk {s.risk ? '+3' : '0'} · decision {s.dec ? '+5' : '0'}{s.penalty ? ` · sanctions breach ${s.penalty}` : ''}</div>
        </div>
        <Verdict label="Overall risk" mine={team.risk && RISK_LABEL[team.risk]} correct={RISK_LABEL[c.risk]} ok={riskOk(c, team.risk)} color={RISK_COLOR[c.risk]} />
        <Verdict label="Decision" mine={team.decision && DEC_LABEL[team.decision]} correct={DEC_LABEL[c.decision]} ok={decOk(c, team.decision)} color={DEC_COLOR[c.decision]} />
        <div className="panel card" style={{ borderColor: 'rgba(45,226,255,.35)' }}>
          <div className="mono glow" style={{ fontSize: 11, letterSpacing: '.2em', marginBottom: 8 }}>EXPLANATION</div>
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: 0 }}>{c.explanation}</p>
        </div>
        {QUESTIONS.map((q, i) => {
          const a = c.answers[i]; const mine = ratings[i]; const ok = mine === a.r
          return (
            <div key={i} className="q">
              <div className="q-head">
                <span className="dim">{q.id}</span><span style={{ flex: 1 }}>{q.text}</span>
                <span style={{ color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? '✓' : '✗'}</span>
              </div>
              <div className="dim" style={{ fontSize: 13, margin: '6px 0' }}>{a.a}</div>
              <div className="mono" style={{ fontSize: 12 }}>
                you: <b style={{ color: RISK_COLOR[mine] || 'var(--dim)' }}>{RISK_LABEL[mine] || '—'}</b> · correct: <b style={{ color: RISK_COLOR[a.r] }}>{RISK_LABEL[a.r]}</b>
              </div>
              {a.n && <div style={{ fontSize: 13, marginTop: 6, color: 'var(--cyan)' }}>↳ {a.n}</div>}
            </div>
          )
        })}
      </Shell>
    )
  }

  // ---------- play ----------
  return (
    <Shell team={team}>
      <ClientCard c={c} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 2px 8px' }}>
        <span className="mono dim" style={{ fontSize: 11, letterSpacing: '.16em' }}>KYC QUESTIONNAIRE</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--cyan)' }}>{rated}/{QUESTIONS.length} rated</span>
      </div>
      <div className="bar" style={{ marginBottom: 12 }}><div style={{ width: `${(rated / QUESTIONS.length) * 100}%` }} /></div>

      {QUESTIONS.map((q, i) => {
        const r = ratings[i]
        const isSys = i === QUESTIONS.length - 1
        return (
          <div key={i} className={`q ${r ? 'done' : ''}`}>
            <div className="q-head" onClick={() => toggle(i)} style={{ cursor: 'pointer' }}>
              <span className={`dot ${r || ''}`} />
              <span className="dim">{q.id}</span>
              <span style={{ flex: 1, color: '#fff' }}>{isSys ? '🔍 ' : ''}{q.text}</span>
              <span className="dim">{open === i ? '▾' : '▸'}</span>
            </div>
            {open === i && (
              <>
                <div className="q-ans" style={isSys ? { borderLeftColor: 'var(--violet)', fontFamily: 'var(--mono)', fontSize: 13 } : null}>
                  {isSys ? '' : '“'}{c.answers[i].a}{isSys ? '' : '”'}
                </div>
                <div className="rate">
                  {['L', 'M', 'H'].map((v) => (
                    <button key={v} className={`${v} ${r === v ? 'on' : ''}`} onClick={() => rate(i, v)} disabled={locked}>{RISK_LABEL[v]}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })}

      <div className="panel card" style={{ marginTop: 16, opacity: allRated ? 1 : 0.45 }}>
        <div className="mono glow" style={{ fontSize: 11, letterSpacing: '.2em', marginBottom: 10 }}>FINAL ASSESSMENT</div>
        <div className="mono dim" style={{ fontSize: 11, marginBottom: 6 }}>OVERALL CLIENT RISK</div>
        <div className="rate" style={{ marginBottom: 14 }}>
          {['L', 'M', 'H'].map((v) => (
            <button key={v} className={`${v} ${team.risk === v ? 'on' : ''}`} disabled={!allRated || locked} onClick={() => writeTeam(me.id, { risk: v })}>{RISK_LABEL[v]}</button>
          ))}
        </div>
        <div className="mono dim" style={{ fontSize: 11, marginBottom: 6 }}>DECISION</div>
        <div className="rate" style={{ flexDirection: 'column' }}>
          {[['OPEN', 'L'], ['EDD', 'M'], ['DECLINE', 'H']].map(([d, cls]) => (
            <button key={d} className={`${cls} ${team.decision === d ? 'on' : ''}`} disabled={!allRated || locked} onClick={() => writeTeam(me.id, { decision: d })}>{DEC_LABEL[d]}</button>
          ))}
        </div>
        {!team.submitted && (
          <button className="btn solid" style={{ width: '100%', marginTop: 16, padding: 14 }}
            disabled={!allRated || !team.risk || !team.decision || locked}
            onClick={() => { if (confirm('Submit final decision? You cannot change it afterwards.')) writeTeam(me.id, { submitted: true, submittedAt: Date.now() }) }}>
            Submit decision
          </button>
        )}
        {team.submitted && <p className="mono glow" style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>✓ SUBMITTED — wait for the reveal</p>}
        {!team.submitted && phase === 'locked' && <p className="mono" style={{ color: 'var(--amber)', textAlign: 'center', marginTop: 16, fontSize: 13 }}>Time is up — answers locked</p>}
      </div>
    </Shell>
  )
}

function Shell({ team, children }) {
  return (
    <div className="phone">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div className="brand" style={{ fontSize: 12 }}>KYC/<b>KYB</b> CONSOLE</div>
        {team && <span className="chip">{team.name}</span>}
      </div>
      {children}
    </div>
  )
}

function ClientCard({ c }) {
  return (
    <div className="panel card scan">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="mono dim" style={{ fontSize: 11, letterSpacing: '.18em' }}>CLIENT FILE #{String(c.id).padStart(3, '0')}</span>
        <span className="chip" style={{ color: 'var(--violet)', borderColor: 'rgba(139,123,255,.5)' }}>{c.type === 'Company' ? 'KYB · COMPANY' : 'KYC · PERSON'}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: '#fff', margin: '10px 0 2px' }}>{c.name}</div>
      <div className="glow" style={{ fontSize: 14 }}>{c.oneLiner}</div>
      <div className="dim" style={{ fontSize: 14, marginTop: 8, lineHeight: 1.45 }}>{c.profile}</div>
    </div>
  )
}

function Verdict({ label, mine, correct, ok, color }) {
  return (
    <div className="panel card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div className="mono dim" style={{ fontSize: 11, letterSpacing: '.16em' }}>{label.toUpperCase()}</div>
        <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>you: {mine || '—'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 15, color, fontWeight: 600 }}>{correct}</div>
        <div className="mono" style={{ fontSize: 12, color: ok ? 'var(--green)' : 'var(--red)' }}>{ok ? '✓ correct' : '✗ incorrect'}</div>
      </div>
    </div>
  )
}
