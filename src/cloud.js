// Live content from the EduPaper admin panel (Supabase). Offline-first:
//   1. On start the last successful copy is applied immediately (syllabus from localStorage, questions from IndexedDB).
//   2. In the background the app asks Supabase for fresh data and swaps it in.
//   3. If Supabase is not configured or unreachable the app keeps working with what it has (or the built-in demo content).
// Only two public functions are called, both with the public anon key:  public_curriculum()  and  public_questions().
import { useSyncExternalStore } from 'react'
import { CUR, BANK } from './data.js'
import { getFile, putFile } from './store.js'

let URL_ = '', KEY = ''
try { URL_ = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, ''); KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '') } catch { /* not running under Vite (tests): cloud stays off */ }
export const cloudEnabled = !!(URL_ && KEY)

export const cloud = { enabled: cloudEnabled, status: cloudEnabled ? 'idle' : 'off', syncedAt: 0, boards: 0, chapters: 0, questions: 0, error: '', qNote: '', version: 0, liveSyllabus: false, liveQuestions: false }
const subs = new Set()
const emit = () => { cloud.version++; subs.forEach((f) => f()) }
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
/** React hook: re-renders the component whenever content changed or sync status changed. */
export const useCloud = () => { useSyncExternalStore(subscribe, () => cloud.version); return cloud }

export const imgUrl = (path) => (path && URL_ ? `${URL_}/storage/v1/object/public/question-images/${path}` : '')

/* ---------- conversion (pure, tested in Node) ---------- */
/** public_curriculum() -> the app's CUR shape: { board: { class: { subject: { chapter: [topics] } } } } */
export function curFromCloud(rows) {
  const out = {}
  for (const b of rows || []) {
    out[b.name] = {}
    for (const c of b.classes || []) {
      out[b.name][c.name] = {}
      for (const s of c.subjects || []) {
        out[b.name][c.name][s.name] = {}
        for (const ch of s.chapters || []) out[b.name][c.name][s.name][ch.name] = ch.topics || []
      }
    }
  }
  return out
}
const countCur = (cur) => { let boards = 0, chapters = 0; for (const b of Object.keys(cur)) { boards++; for (const c of Object.values(cur[b])) for (const s of Object.values(c)) chapters += Object.keys(s).length } return { boards, chapters } }

const roman = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
const idMap = new Map()    // uuid -> stable numeric id (the app uses numeric ids in selects and favourites)
const numericId = (uuid) => {
  if (idMap.has(uuid)) return idMap.get(uuid)
  const used = new Set(idMap.values()); let n = (parseInt(uuid.replace(/-/g, '').slice(0, 8), 16) % 2000000000) + 1000000
  while (used.has(n)) n++
  idMap.set(uuid, n); return n
}
/** public_questions() -> the app's BANK shape. A case study / passage becomes ONE question: passage, instruction and its sub-questions. */
export function questionsFromCloud(rows) {
  const list = Array.isArray(rows) ? rows : [], kids = new Map()
  for (const r of list) if (r.parent_id) { if (!kids.has(r.parent_id)) kids.set(r.parent_id, []); kids.get(r.parent_id).push(r) }
  const out = []
  for (const r of list) {
    if (r.parent_id) continue
    let text = r.text, ans = r.ans || ''
    const ch = kids.get(r.id)
    if (ch && ch.length) {
      text = [r.passage, r.text, ...ch.map((c, i) => `(${roman[i] || i + 1}) ${c.text}`)].filter(Boolean).join('\n')
      ans = ch.map((c, i) => `(${roman[i] || i + 1}) ${c.ans || '—'}`).join('  ')
    } else if (r.passage) text = `${r.passage}\n${r.text}`
    out.push({ id: numericId(r.id), cid: r.id, sub: r.sub, ch: r.ch, board: r.board, std: r.std, type: r.type, marks: Number(r.marks), diff: r.diff, text, ans, diagram: !!r.diagram || !!r.image, image: r.image || null, imageAlt: r.image_alt || '', lang: r.language, topic: r.topic || '', src: 'Question Bank' })
  }
  return out
}

/* ---------- applying ---------- */
export function applyCur(cur) { Object.keys(CUR).forEach((k) => delete CUR[k]); Object.assign(CUR, cur); const c = countCur(cur); cloud.boards = c.boards; cloud.chapters = c.chapters; cloud.liveSyllabus = true }
export function applyBank(list) {
  const mine = BANK.filter((q) => q.src === 'My Question')       // the teacher's own questions are never replaced
  BANK.splice(0, BANK.length, ...list, ...mine); cloud.questions = list.length; cloud.liveQuestions = list.length > 0
}

/* ---------- network ---------- */
async function rpc(name, ms = 20000) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms)
  try {
    const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, { method: 'POST', signal: ctl.signal, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: '{}' })
    if (!res.ok) throw new Error(res.status === 404 ? `The server has no ${name}() function. Run the admin database setup.` : `Server answered ${res.status}`)
    return await res.json()
  } catch (e) { throw new Error(e.name === 'AbortError' ? 'The server took too long to answer.' : e.message || 'No connection.') } finally { clearTimeout(t) }
}

const CUR_KEY = 'ep_cloud_cur', BANK_KEY = 'cloud:bank'
/** Call once before the first render: applies the syllabus saved on this device, so the app starts with live content even offline. */
export function loadCachedSyllabus() {
  if (!cloudEnabled) return false
  try { const c = JSON.parse(localStorage.getItem(CUR_KEY) || 'null'); if (c && c.cur && Object.keys(c.cur).length) { applyCur(c.cur); cloud.syncedAt = c.at; cloud.status = 'cached'; return true } } catch { /* ignore */ }
  return false
}
export async function loadCachedBank() {
  if (!cloudEnabled) return
  try { const raw = await getFile(BANK_KEY); const c = raw && JSON.parse(raw); if (c && c.list && c.list.length) { c.list.forEach((q) => idMap.set(q.cid, q.id)); applyBank(c.list); emit() } } catch { /* ignore */ }
}

let running = null
/** Fetch fresh syllabus + questions. Never throws; the result is in `cloud.status` / `cloud.error`. */
export function syncNow() {
  if (!cloudEnabled) return Promise.resolve(cloud)
  if (running) return running
  cloud.status = 'syncing'; cloud.error = ''; emit()
  running = (async () => {
    try {
      const cur = curFromCloud(await rpc('public_curriculum'))
      if (!Object.keys(cur).length) throw new Error('The server has no active boards yet, so this device kept its current content.')
      applyCur(cur); cloud.syncedAt = Date.now()
      try { localStorage.setItem(CUR_KEY, JSON.stringify({ at: cloud.syncedAt, cur })) } catch { /* storage full: still works this session */ }
      try {
        const qs = questionsFromCloud(await rpc('public_questions'))
        if (qs.length) { applyBank(qs); cloud.qNote = ''; try { await putFile(BANK_KEY, JSON.stringify({ at: cloud.syncedAt, list: qs })) } catch { /* ignore */ } }
        else cloud.qNote = 'No published questions are shared with the app yet, so the built-in sample questions are shown.'
      } catch (e) { cloud.qNote = `Questions could not be updated: ${e.message}` }
      cloud.status = 'ok'
    } catch (e) { cloud.status = cloud.liveSyllabus ? 'cached' : 'error'; cloud.error = e.message }
    running = null; emit(); return cloud
  })()
  return running
}
export const syncIfStale = (maxAgeMs = 15 * 60 * 1000) => (Date.now() - cloud.syncedAt > maxAgeMs ? syncNow() : Promise.resolve(cloud))
