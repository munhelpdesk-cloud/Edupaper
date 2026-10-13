import { useState } from 'react'
import { Ic, Badge } from './ui.jsx'
import { Field, PwInput, Meter } from './Auth.jsx'
import { updateProfile, changePassword, isPhone, pwProblem, AuthError } from './auth.js'
import { CUR, MEDIA } from './data.js'

export default function ProfilePage({ user, setUser, plan, go, signOut, toast }) {
  const pr = user.profile || {}
  const [f, setF] = useState({ name: user.name, phone: user.phone, school: user.school, board: pr.board || 'GSEB', std: pr.std || 'Std 10', lang: pr.lang || 'English' })
  const [err, setErr] = useState({}), [pw, setPw] = useState({ current: '', next: '', confirm: '' }), [pe, setPe] = useState({}), [busy, setBusy] = useState(false)
  const set = (o) => { setF((x) => ({ ...x, ...o })); setErr({}) }
  const stds = Object.keys(CUR[f.board] || {})
  const dirty = f.name !== user.name || f.phone !== user.phone || f.school !== user.school || f.board !== (pr.board || 'GSEB') || f.std !== (pr.std || 'Std 10') || f.lang !== (pr.lang || 'English')

  const save = (e) => {
    e.preventDefault()
    const er = {}
    if (f.name.trim().length < 2) er.name = 'Enter your full name.'
    if (f.phone.trim() && !isPhone(f.phone)) er.phone = 'Enter a 10-digit mobile number.'
    setErr(er); if (Object.keys(er).length) return
    try { setUser(updateProfile(user.id, { name: f.name, phone: f.phone, school: f.school, profile: { board: f.board, std: f.std, lang: f.lang } })); toast('Profile saved') } catch (x) { toast(x.message) }
  }
  const savePw = async (e) => {
    e.preventDefault(); if (busy) return
    const er = {}
    if (!pw.current) er.current = 'Enter your current password.'
    const p = pwProblem(pw.next); if (p) er.next = p; else if (pw.next === pw.current) er.next = 'Choose a password you haven’t used here.'
    else if (pw.confirm !== pw.next) er.confirm = 'Passwords don’t match.'
    setPe(er); if (Object.keys(er).length) return
    setBusy(true)
    try { await changePassword(user.id, pw); setPw({ current: '', next: '', confirm: '' }); toast('Password changed') } catch (x) { setPe(x instanceof AuthError && x.field ? { [x.field]: x.message } : { current: x.message }) }
    setBusy(false)
  }
  return <section><h2>Profile</h2>
    <div className="card prof-h">
      <span className="av">{user.name.trim().charAt(0).toUpperCase()}</span>
      <div className="grow"><b>{user.name}</b><small>{user.email}</small></div>
      <Badge c={plan === 'pro' ? 'ai' : ''}>{plan === 'pro' ? 'Pro' : 'Free plan'}</Badge>
      <button onClick={() => go('Plans & Payment')}><Ic n="card" s={16} />Plans</button>
    </div>
    <form className="card form" onSubmit={save} noValidate>
      <Field id="pf-name" label="Name" err={err.name}><input id="pf-name" value={f.name} onChange={(e) => set({ name: e.target.value })} autoComplete="name" aria-invalid={!!err.name} /></Field>
      <Field id="pf-email" label="Email" hint="This is your sign-in ID."><input id="pf-email" value={user.email} readOnly /></Field>
      <div className="f2">
        <Field id="pf-phone" label="Mobile" err={err.phone}><input id="pf-phone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} autoComplete="tel" aria-invalid={!!err.phone} /></Field>
        <Field id="pf-school" label="School / institute"><input id="pf-school" value={f.school} onChange={(e) => set({ school: e.target.value })} autoComplete="organization" /></Field></div>
      <div className="f3">
        <Field id="pf-board" label="Default board"><select id="pf-board" value={f.board} onChange={(e) => set({ board: e.target.value, std: Object.keys(CUR[e.target.value])[0] })}>{Object.keys(CUR).map((b) => <option key={b}>{b}</option>)}</select></Field>
        <Field id="pf-std" label="Default standard"><select id="pf-std" value={f.std} onChange={(e) => set({ std: e.target.value })}>{stds.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field id="pf-lang" label="Preferred language"><select id="pf-lang" value={f.lang} onChange={(e) => set({ lang: e.target.value })}>{MEDIA.map((m) => <option key={m}>{m}</option>)}</select></Field></div>
      <button className="primary" type="submit" disabled={!dirty}>Save changes</button>
    </form>
    <h4>Change password</h4>
    <form className="card form" onSubmit={savePw} noValidate>
      <Field id="pw-cur" label="Current password" err={pe.current}><PwInput id="pw-cur" value={pw.current} onChange={(v) => { setPw({ ...pw, current: v }); setPe({}) }} auto="current-password" err={pe.current} /></Field>
      <Field id="pw-new" label="New password" err={pe.next} hint="At least 8 characters, with a letter and a number."><PwInput id="pw-new" value={pw.next} onChange={(v) => { setPw({ ...pw, next: v }); setPe({}) }} auto="new-password" err={pe.next} /></Field>
      <Meter v={pw.next} />
      <Field id="pw-conf" label="Confirm new password" err={pe.confirm}><PwInput id="pw-conf" value={pw.confirm} onChange={(v) => { setPw({ ...pw, confirm: v }); setPe({}) }} auto="new-password" err={pe.confirm} /></Field>
      <button type="submit" className="primary" disabled={busy || !pw.current || !pw.next}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
    <div className="card list"><button className="li dng" onClick={signOut}><span className="ci sm"><Ic n="logout" /></span><span className="grow">Sign out</span></button></div>
  </section>
}
