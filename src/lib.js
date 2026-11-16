import { useEffect, useState } from 'react'
import { ref, onValue, update, set, get, push } from 'firebase/database'
import { db } from './firebase'
import { CASES, QUESTIONS, MUST_INCLUDE } from './data/cases'

export const ROOT = 'games/kyc-console'
export const caseById = (id) => CASES.find((c) => c.id === id)

export function useGame() {
  const demo = typeof window !== 'undefined' ? window.__KYC_DEMO__ : null
  const [game, setGame] = useState(demo || undefined)
  useEffect(() => { if (demo) return; return onValue(ref(db, ROOT), (s) => setGame(s.val() || null)) }, [])
  return game
}

export const RISK_COLOR = { L: 'var(--green)', M: 'var(--amber)', H: 'var(--red)' }
export const RISK_LABEL = { L: 'LOW', M: 'MED', H: 'HIGH' }
export const DEC_LABEL = { OPEN: 'OPEN', EDD: 'OPEN + EDD', DECLINE: 'DECLINE' }
export const DEC_COLOR = { OPEN: 'var(--green)', EDD: 'var(--amber)', DECLINE: 'var(--red)' }

// ---------- scoring ----------
export function riskOk(c, r) {
  return r === c.risk || (c.alsoAccept?.risk || []).includes(r)
}
export function decOk(c, d) {
  return d === c.decision || (c.alsoAccept?.decision || []).includes(d)
}
export function score(team) {
  const c = caseById(team.caseId)
  if (!c) return { total: 0, q: 0, risk: false, dec: false, penalty: 0 }
  const ratings = team.ratings || {}
  let q = 0
  QUESTIONS.forEach((_, i) => { if (ratings[i] === c.answers[i].r) q += 1 })
  const risk = riskOk(c, team.risk)
  const dec = decOk(c, team.decision)
  const penalty = c.trap === 'sanctioned' && team.decision && team.decision !== 'DECLINE' ? -10 : 0
  return { total: q + (risk ? 3 : 0) + (dec ? 5 : 0) + penalty, q, risk, dec, penalty }
}
export const MAX_SCORE = QUESTIONS.length + 3 + 5

// ---------- actions ----------
function shuffle(a) {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

// assign unique cases to all teams; sanctioned + false positive always in play
export async function startGame() {
  const snap = await get(ref(db, ROOT))
  const g = snap.val() || {}
  const teams = g.teams || {}
  const ids = shuffle(Object.keys(teams))
  const others = shuffle(CASES.map((c) => c.id).filter((id) => !MUST_INCLUDE.includes(id)))
  const pool = ids.length >= 2 ? [...shuffle(MUST_INCLUDE), ...others] : [...others, ...MUST_INCLUDE]
  const upd = { phase: 'play', startedAt: Date.now(), round: 1 }
  const used = []
  ids.forEach((tid, i) => { const cid = pool[i % pool.length]; upd[`teams/${tid}/caseId`] = cid; used.push(cid) })
  upd.used = used
  await update(ref(db, ROOT), upd)
}

// next round: same teams, new clients nobody in the room has seen yet (if possible)
export async function nextRound() {
  const snap = await get(ref(db, ROOT))
  const g = snap.val() || {}
  const teams = g.teams || {}
  const ids = shuffle(Object.keys(teams))
  const playedByRoom = new Set([...(g.used || []), ...Object.values(teams).map((t) => t.caseId).filter(Boolean)])
  const all = CASES.map((c) => c.id)
  const fresh = shuffle(all.filter((id) => !playedByRoom.has(id)))
  const upd = { phase: 'play', startedAt: Date.now(), round: (g.round || 1) + 1 }
  const taken = new Set()
  ids.forEach((tid) => {
    const t = teams[tid]
    const s = score(t)
    const hist = [...(t.history || []), ...(t.caseId ? [t.caseId] : [])]
    // 1) a client nobody has seen; 2) else one this team hasn't seen; 3) else any
    let cid = fresh.find((id) => !taken.has(id))
    if (!cid) cid = shuffle(all).find((id) => !taken.has(id) && !hist.includes(id))
    if (!cid) cid = shuffle(all).find((id) => !taken.has(id)) || all[0]
    taken.add(cid)
    upd[`teams/${tid}`] = {
      name: t.name, joinedAt: t.joinedAt || 0, caseId: cid, history: hist,
      totalScore: (t.totalScore || 0) + (t.caseId && t.submitted ? s.total : 0),
    }
  })
  upd.used = [...playedByRoom, ...taken]
  await update(ref(db, ROOT), upd)
}

export async function newSession() {
  await set(ref(db, ROOT), { phase: 'lobby', session: Date.now() })
}

export const setPhase = (phase) => update(ref(db, ROOT), { phase })

export async function joinTeam(name) {
  const snap = await get(ref(db, ROOT))
  const g = snap.val()
  if (!g) throw new Error('No active session yet. Wait for the presenter.')
  if (g.phase === 'reveal') throw new Error('This round is already finished.')
  const teams = g.teams || {}
  if (Object.keys(teams).length >= 20) throw new Error('All 20 slots are taken.')
  const r = push(ref(db, `${ROOT}/teams`))
  const data = { name: name.trim().slice(0, 24), joinedAt: Date.now() }
  if (g.phase !== 'lobby') {
    // late join: take an unused case
    const used = Object.values(teams).map((t) => t.caseId).filter(Boolean)
    const free = shuffle(CASES.map((c) => c.id).filter((id) => !used.includes(id) && id !== 20))
    data.caseId = free[0] || CASES[Math.floor(Math.random() * CASES.length)].id
  }
  await set(r, data)
  try { localStorage.setItem('kyc_team', JSON.stringify({ id: r.key, session: g.session })) } catch (e) {}
  return r.key
}

export function myTeam() {
  try { return JSON.parse(localStorage.getItem('kyc_team') || 'null') } catch (e) { return null }
}

export const teamRef = (tid, path = '') => ref(db, `${ROOT}/teams/${tid}${path ? '/' + path : ''}`)
export const writeTeam = (tid, obj) => update(teamRef(tid), obj)
