// EduPaper AI — account layer.
// PROTOTYPE: accounts live in this device's localStorage (passwords are salted + PBKDF2-hashed, never stored in plain text).
// To go live, keep these function signatures and swap the bodies for your server / Supabase auth calls.
const K_USERS = 'ep_users', K_SESSION = 'ep_session', K_TRIES = 'ep_login_tries'

const rd = (store, k, d) => { try { const v = store.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
const wr = (store, k, v) => { try { store.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }
const users = () => rd(localStorage, K_USERS, [])
const saveUsers = (u) => wr(localStorage, K_USERS, u)

export const normEmail = (e = '') => e.trim().toLowerCase()
export const isEmail = (e = '') => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim())
export const isPhone = (p = '') => /^[6-9]\d{9}$/.test(p.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
export const cleanPhone = (p = '') => p.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, '')

/** 0 (empty) .. 4 (strong) */
export const pwScore = (p = '') => {
  if (!p) return 0
  let s = 0
  if (p.length >= 8) s++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++
  if (/\d/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) s++
  return Math.max(1, s)
}
/** returns an error string, or '' when the password is acceptable */
export const pwProblem = (p = '') => p.length < 8 ? 'Use at least 8 characters.' : !/[A-Za-z]/.test(p) || !/\d/.test(p) ? 'Include at least one letter and one number.' : ''

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const salt = () => { const a = new Uint8Array(16); (globalThis.crypto || window.crypto).getRandomValues(a); return hex(a) }
async function hash(pw, s) {
  const sub = globalThis.crypto && globalThis.crypto.subtle
  if (!sub) { // very old WebView without WebCrypto: weak fallback so the app still works
    let h = 5381; const t = s + pw; for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0
    return 'f' + h.toString(16)
  }
  const key = await sub.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits'])
  return hex(await sub.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(s), iterations: 100000, hash: 'SHA-256' }, key, 256))
}

const pub = (u) => u && ({ id: u.id, name: u.name, email: u.email, phone: u.phone || '', school: u.school || '', profile: u.profile || {}, created: u.created })
export class AuthError extends Error { constructor(m, field) { super(m); this.field = field } }

export function currentUser() {
  const id = rd(localStorage, K_SESSION, null) || rd(sessionStorage, K_SESSION, null)
  return pub(users().find((u) => u.id === id)) || null
}
const startSession = (id, remember) => {
  try { localStorage.removeItem(K_SESSION); sessionStorage.removeItem(K_SESSION) } catch { /* ignore */ }
  wr(remember ? localStorage : sessionStorage, K_SESSION, id)
}
export function logout() { try { localStorage.removeItem(K_SESSION); sessionStorage.removeItem(K_SESSION) } catch { /* ignore */ } }

export async function register({ name, email, phone, school, password, remember = true }) {
  const e = normEmail(email), all = users()
  if (all.some((u) => u.email === e)) throw new AuthError('An account with this email already exists. Try signing in.', 'email')
  const s = salt()
  const u = { id: 'usr_' + Date.now().toString(36) + salt().slice(0, 6), name: name.trim(), email: e, phone: cleanPhone(phone || ''), school: (school || '').trim(), salt: s, hash: await hash(password, s), created: new Date().toISOString(), profile: {} }
  saveUsers([...all, u]); startSession(u.id, remember)
  return pub(u)
}

// simple client-side throttle: 5 wrong passwords -> 30 s pause (a server must enforce this for real)
const throttle = () => { const t = rd(localStorage, K_TRIES, { n: 0, until: 0 }); return t }
export async function login({ email, password, remember = true }) {
  const t = throttle(), now = Date.now()
  if (t.until > now) throw new AuthError('Too many attempts. Please wait ' + Math.ceil((t.until - now) / 1000) + ' seconds and try again.')
  const u = users().find((x) => x.email === normEmail(email))
  const ok = u && (await hash(password, u.salt)) === u.hash
  if (!ok) {
    const n = (t.until && t.until <= now ? 0 : t.n) + 1
    wr(localStorage, K_TRIES, n >= 5 ? { n: 0, until: now + 30000 } : { n, until: 0 })
    throw new AuthError('Incorrect email or password.') // same message for both cases, so emails can’t be probed
  }
  wr(localStorage, K_TRIES, { n: 0, until: 0 }); startSession(u.id, remember)
  return pub(u)
}

/** Demo reset: with no email service on a local-only prototype, we let the owner of the device set a new password. */
export async function resetPassword({ email, password }) {
  const all = users(), i = all.findIndex((u) => u.email === normEmail(email))
  if (i < 0) throw new AuthError('No account found with this email.', 'email')
  const s = salt(); all[i] = { ...all[i], salt: s, hash: await hash(password, s) }; saveUsers(all)
  wr(localStorage, K_TRIES, { n: 0, until: 0 })
}

export async function changePassword(id, { current, next }) {
  const all = users(), i = all.findIndex((u) => u.id === id)
  if (i < 0) throw new AuthError('Please sign in again.')
  if ((await hash(current, all[i].salt)) !== all[i].hash) throw new AuthError('Current password is incorrect.', 'current')
  const s = salt(); all[i] = { ...all[i], salt: s, hash: await hash(next, s) }; saveUsers(all)
}

export function updateProfile(id, patch) {
  const all = users(), i = all.findIndex((u) => u.id === id)
  if (i < 0) throw new AuthError('Please sign in again.')
  const { name, phone, school, profile } = patch
  all[i] = { ...all[i], ...(name !== undefined && { name: name.trim() }), ...(phone !== undefined && { phone: cleanPhone(phone) }), ...(school !== undefined && { school: school.trim() }), ...(profile && { profile: { ...all[i].profile, ...profile } }) }
  saveUsers(all)
  return pub(all[i])
}
