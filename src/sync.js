// EduPaper AI — syllabus sync with the Admin Panel (Supabase).
// The admin panel writes boards / classes / subjects / chapters / topics to Supabase. This file reads them back
// through the public_curriculum() function (supabase/migrations/0003_teacher_sync.sql) and updates CUR and SUBJECTS
// in place, so every screen that already reads CUR shows the admin's changes with no other code change.
// Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY when building (anon key only, never the service-role key).
// Without them the app keeps using the demo data in data.js.
import { CUR, SUBJECTS } from './data.js'

const URL_ = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, ''), KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const CACHE = 'ep_cur_cache'
export const syncEnabled = !!(URL_ && KEY)

const listeners = new Set()
export const onCurriculum = (f) => { listeners.add(f); return () => listeners.delete(f) }

const arr = (x) => (Array.isArray(x) ? x : [])
/** [{name, classes:[{name, subjects:[{name, chapters:[{name, topics:[]}]}]}]}]  ->  { Board: { Class: { Subject: { Chapter: [topics] } } } } (keeps admin order) */
export function toCur(tree) {
  const out = {}
  for (const b of arr(tree)) {
    if (!b || !b.name) continue
    const classes = (out[b.name] = {})
    for (const c of arr(b.classes)) {
      const subjects = (classes[c.name] = {})
      for (const s of arr(c.subjects)) {
        const chapters = (subjects[s.name] = {})
        for (const h of arr(s.chapters)) chapters[h.name] = arr(h.topics).map(String)
      }
    }
  }
  return out
}

function apply(tree) {
  const next = toCur(tree)
  if (!Object.keys(next).length) return false // never leave the app with no boards at all
  Object.keys(CUR).forEach((k) => delete CUR[k])
  Object.assign(CUR, next)
  const subs = []
  Object.values(CUR).forEach((cls) => Object.values(cls).forEach((sj) => Object.keys(sj).forEach((n) => { if (!subs.includes(n)) subs.push(n) })))
  SUBJECTS.length = 0; SUBJECTS.push(...subs)
  listeners.forEach((f) => f())
  return true
}

/** Show the last synced syllabus instantly (works offline). Call once before the first render. */
export function loadCachedCurriculum() {
  if (!syncEnabled) return
  try { const t = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (t) apply(t) } catch { /* ignore a bad cache */ }
}

export const syncStatus = { enabled: syncEnabled, ok: null, at: 0, error: '' }
const headers = () => { const h = { apikey: KEY, 'Content-Type': 'application/json' }; if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY; return h } // new sb_publishable_ keys are not JWTs: apikey header only
let busy = false
export async function refreshCurriculum() {
  if (!syncEnabled || busy) return false
  busy = true
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000)
  try {
    const r = await fetch(URL_ + '/rest/v1/rpc/public_curriculum', { method: 'POST', signal: ctl.signal, headers: headers(), body: '{}' })
    if (!r.ok) {
      let m = ''; try { m = (await r.json()).message || '' } catch { /* not json */ }
      syncStatus.ok = false; syncStatus.error = r.status === 404 ? 'Run 0003_teacher_sync.sql in Supabase (function public_curriculum not found).' : r.status === 401 || r.status === 403 ? 'Supabase rejected the key. Check VITE_SUPABASE_ANON_KEY.' : 'Server error ' + r.status + (m ? ': ' + m : '')
      return false
    }
    const tree = await r.json()
    if (!apply(tree)) { syncStatus.ok = false; syncStatus.error = 'Connected, but no active boards found. Add a board in the admin panel and make sure it is not archived.'; return false }
    syncStatus.ok = true; syncStatus.error = ''; syncStatus.at = Date.now()
    try { localStorage.setItem(CACHE, JSON.stringify(tree)) } catch { /* storage full or unavailable */ }
    return true
  } catch { syncStatus.ok = false; syncStatus.error = 'Could not reach Supabase (offline or wrong URL).'; return false } finally { clearTimeout(timer); busy = false }
}

/** Refresh now, when the app comes back to the foreground, when the network returns, and every 2 minutes. */
export function startCurriculumSync() {
  if (!syncEnabled) return () => {}
  refreshCurriculum()
  const vis = () => { if (document.visibilityState === 'visible') refreshCurriculum() }
  document.addEventListener('visibilitychange', vis); window.addEventListener('online', refreshCurriculum)
  const t = setInterval(vis, 120000)
  return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('online', refreshCurriculum); clearInterval(t) }
}
