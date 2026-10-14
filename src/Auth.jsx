import { useState, useEffect } from 'react'
import logo from './assets/logo-full.png'
import mark from './assets/mark.png'
import { Ic } from './ui.jsx'
import { register, login, resetPassword, isEmail, isPhone, pwScore, pwProblem, AuthError } from './auth.js'

const HASH = { login: 'login', register: 'register', forgot: 'forgot-password' }
const COPY = {
  login: ['Welcome back', 'Sign in to continue to your papers.'],
  register: ['Create your account', 'Free to start. Set your first paper in minutes.'],
  forgot: ['Reset your password', 'Enter your email and choose a new password.']
}
const PERKS = [
  ['sparkles', 'Papers in minutes', 'Pick chapters, add AI questions, export DOCX or PDF.'],
  ['layout', 'Your school’s format', 'Upload it once and reuse it for every paper.'],
  ['shield', 'Saved on your device', 'Your papers, formats and drafts are stored locally.']
]

export const Field = ({ id, label, err, hint, children }) => <div className={'fld' + (err ? ' bad' : '')}>
  <label htmlFor={id}>{label}</label>{children}
  {err ? <small id={id + '-e'} className="fe" role="alert">{err}</small> : hint ? <small id={id + '-h'}>{hint}</small> : null}</div>

export const PwInput = ({ id, value, onChange, auto, err, placeholder }) => {
  const [show, setShow] = useState(false)
  return <div className="pw">
    <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} placeholder={placeholder} aria-invalid={!!err} aria-describedby={err ? id + '-e' : undefined} />
    <button type="button" className="pw-t" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Ic n={show ? 'eyeoff' : 'eye'} s={18} /></button></div>
}

export const Meter = ({ v }) => {
  const s = pwScore(v)
  return v ? <div className="pwm" aria-live="polite"><span aria-hidden="true">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= s ? 's' + s : ''} />)}</span><small>Password strength: {['', 'Weak', 'Fair', 'Good', 'Strong'][s]}</small></div> : null
}

export default function Auth({ onAuthed, onClose, reason = '', start = 'login' }) {
  const [mode, setMode] = useState(start)
  const [f, setF] = useState({ name: '', email: '', phone: '', school: '', password: '', confirm: '', remember: true, terms: false })
  const [err, setErr] = useState({}), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [note, setNote] = useState('')
  const set = (o) => { setF((x) => ({ ...x, ...o })); setErr((x) => ({ ...x, [Object.keys(o)[0]]: '' })); setMsg('') }
  useEffect(() => { try { history.replaceState(history.state, '', '#/' + HASH[mode]) } catch { /* ignore */ } }, [mode])
  const to = (m) => { setMode(m); setErr({}); setMsg(''); setNote(''); setF((x) => ({ ...x, password: '', confirm: '' })) }
  const focus = (k) => setTimeout(() => { const el = document.getElementById('a-' + k); if (el) el.focus() }, 0)

  const submit = async (e) => {
    e.preventDefault(); if (busy) return
    const er = {}
    if (mode === 'register' && f.name.trim().length < 2) er.name = 'Enter your full name.'
    if (!f.email.trim()) er.email = 'Enter your email.'; else if (!isEmail(f.email)) er.email = 'Enter a valid email, like name@school.in'
    if (mode === 'register' && f.phone.trim() && !isPhone(f.phone)) er.phone = 'Enter a 10-digit mobile number.'
    if (mode === 'login') { if (!f.password) er.password = 'Enter your password.' }
    else { const pr = pwProblem(f.password); if (pr) er.password = pr; else if (f.confirm !== f.password) er.confirm = 'Passwords don’t match.' }
    if (mode === 'register' && !f.terms) er.terms = 'Please accept the terms to continue.'
    setErr(er); setMsg(''); setNote('')
    const first = Object.keys(er)[0]
    if (first) return focus(first)
    setBusy(true)
    try {
      if (mode === 'login') return onAuthed(await login(f), 'login')
      if (mode === 'register') return onAuthed(await register(f), 'register')
      await resetPassword(f)
      setBusy(false); setMode('login'); setErr({}); setF((x) => ({ ...x, password: '', confirm: '' })); setNote('Password updated. Sign in with your new password.')
    } catch (x) {
      setBusy(false)
      if (x instanceof AuthError && x.field) { setErr({ [x.field]: x.message }); focus(x.field) } else setMsg(x.message || 'Something went wrong. Please try again.')
    }
  }
  const e = (k) => err[k], inv = (k) => ({ 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? 'a-' + k + '-e' : undefined })
  const [title, sub] = COPY[mode]

  return <div className="auth">
    <div className="auth-art">
      <img className="lg auth-logo" src={logo} alt="EduPaper AI" />
      <h2>The faster way to set a question paper.</h2>
      <ul>{PERKS.map(([ic, t, d]) => <li key={t}><span className="ci sm"><Ic n={ic} /></span><span><b>{t}</b><small>{d}</small></span></li>)}</ul>
    </div>
    <div className="auth-pane" role="main">
      <div className="auth-card">
        {onClose && <button type="button" className="ghost auth-x" onClick={onClose}><Ic n="back" s={16} />Continue as guest</button>}
        <img className="lg auth-mark" src={mark} alt="EduPaper AI" />
        <h1>{title}</h1><p className="lead">{sub}</p>
        {reason && mode !== 'forgot' && !note && <div className="ok" role="status">{reason}</div>}
        {note && <div className="ok" role="status">{note}</div>}
        {msg && <div className="fa" role="alert">{msg}</div>}
        <form onSubmit={submit} noValidate>
          {mode === 'register' && <Field id="a-name" label="Full name" err={e('name')}><input id="a-name" value={f.name} onChange={(x) => set({ name: x.target.value })} autoComplete="name" placeholder="e.g. Anita Sharma" {...inv('name')} /></Field>}
          <Field id="a-email" label="Email" err={e('email')}><input id="a-email" type="email" inputMode="email" value={f.email} onChange={(x) => set({ email: x.target.value })} autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="name@school.in" {...inv('email')} /></Field>
          {mode === 'register' && <div className="f2">
            <Field id="a-phone" label="Mobile (optional)" err={e('phone')}><input id="a-phone" type="tel" inputMode="tel" value={f.phone} onChange={(x) => set({ phone: x.target.value })} autoComplete="tel" placeholder="10-digit number" {...inv('phone')} /></Field>
            <Field id="a-school" label="School (optional)"><input id="a-school" value={f.school} onChange={(x) => set({ school: x.target.value })} autoComplete="organization" placeholder="School or institute" /></Field></div>}
          <Field id="a-password" label={mode === 'forgot' ? 'New password' : 'Password'} err={e('password')} hint={mode !== 'login' ? 'At least 8 characters, with a letter and a number.' : ''}>
            <PwInput id="a-password" value={f.password} onChange={(v) => set({ password: v })} auto={mode === 'login' ? 'current-password' : 'new-password'} err={e('password')} /></Field>
          {mode !== 'login' && <Meter v={f.password} />}
          {mode !== 'login' && <Field id="a-confirm" label="Confirm password" err={e('confirm')}><PwInput id="a-confirm" value={f.confirm} onChange={(v) => set({ confirm: v })} auto="new-password" err={e('confirm')} /></Field>}
          {mode === 'login' && <div className="row wrap auth-opt">
            <label className="tm"><input type="checkbox" checked={f.remember} onChange={(x) => set({ remember: x.target.checked })} />Keep me signed in</label>
            <button type="button" className="ghost" onClick={() => to('forgot')}>Forgot password?</button></div>}
          {mode === 'register' && <div className={'fld' + (e('terms') ? ' bad' : '')}><label className="tm"><input id="a-terms" type="checkbox" checked={f.terms} onChange={(x) => set({ terms: x.target.checked })} {...inv('terms')} />I agree to the Terms of Use and Privacy Policy</label>{e('terms') && <small id="a-terms-e" className="fe" role="alert">{e('terms')}</small>}</div>}
          {mode === 'forgot' && <small className="gap">EduPaper accounts are stored on this device, so you can set a new password directly. Once accounts move to a server, this becomes an emailed reset link.</small>}
          <button className="primary big gap" type="submit" disabled={busy}>{busy ? <><span className="spin" aria-hidden="true" />Please wait…</> : mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Update password'}</button>
        </form>
        <p className="auth-sw">{mode === 'login' ? <>New to EduPaper? <button type="button" className="ghost" onClick={() => to('register')}>Create an account</button></>
          : mode === 'register' ? <>Already have an account? <button type="button" className="ghost" onClick={() => to('login')}>Sign in</button></>
            : <button type="button" className="ghost" onClick={() => to('login')}>← Back to sign in</button>}</p>
      </div>
    </div>
  </div>
}
