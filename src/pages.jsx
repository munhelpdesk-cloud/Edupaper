import { useState } from 'react'
import mark from './assets/mark.png'
import { Ic, Modal, Badge, Thumb, M, Empty, Toggle, Seg, today, daysTo, when } from './ui.jsx'
import { BANK, TEMPLATES, TYPES, SUBJECTS, MEDIA, FAQ } from './data.js'
import { PLANS } from './payments.js'

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const PAL = ['#1D6BF3', '#7C3AED', '#F59E0B', '#059669', '#EC4899', '#06B6D4']

/* ---------- Exam planner ---------- */
const fmt12 = (t = '09:00') => { const [h, m] = t.split(':').map(Number); return (h % 12 || 12) + ':' + String(m || 0).padStart(2, '0') + ' ' + (h < 12 ? 'AM' : 'PM') }
const tone = (n) => (n < 0 ? 'past' : n <= 2 ? 'soon' : 'later')

export function ExamCard({ e, onOpen, onEdit, onDel, onPick }) {
  const d = new Date(e.date + 'T00:00:00'), n = daysTo(e.date), acts = onOpen || onEdit || onDel
  return <div className={'card exam ' + tone(n)}>
    <div className="dt"><b>{d.getDate()}</b><span>{d.toLocaleString('en', { month: 'short' })}</span></div>
    <div className="grow ex-main">
      <b className="ex-t">{e.title}</b>
      <small className="ex-m"><span><Ic n="clock" s={13} />{fmt12(e.time)}</span><span>{e.subject} · {e.std}</span></small>
      <div className="bds"><Badge c={n < 0 ? '' : n <= 2 ? 'warn' : 'ai'}>{when(e.date)}</Badge>{e.paper ? <Badge c="bk">Paper linked</Badge> : <Badge>No paper yet</Badge>}</div>
    </div>
    {(acts || onPick) && <div className="exam-a">
      {onPick && <button className="ghost" onClick={onPick}>View day</button>}
      {onOpen && e.paper && <button className="primary" onClick={onOpen}>Open paper</button>}
      <span className="grow" />
      {onEdit && <button className="hbtn" onClick={onEdit} aria-label="Edit exam"><Ic n="edit" s={16} /></button>}
      {onDel && <button className="hbtn dng" onClick={onDel} aria-label="Delete exam"><Ic n="trash" s={16} /></button>}
    </div>}
  </div>
}

export function Planner({ exams, setExams, papers, openPaper, ask, toast }) {
  const now = new Date()
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() }), [sel, setSel] = useState(today()), [form, setForm] = useState(null)
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7, dim = new Date(ym.y, ym.m + 1, 0).getDate()
  const ds = (d) => `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const cells = [...Array(lead).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)]
  const shift = (k) => { const d = new Date(ym.y, ym.m + k, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }) }
  const goTo = (date) => { const d = new Date(date + 'T00:00:00'); setYm({ y: d.getFullYear(), m: d.getMonth() }); setSel(date) }
  const by = (a, b) => (a.date + a.time).localeCompare(b.date + b.time)
  const dayEx = exams.filter((e) => e.date === sel).sort(by)
  const upcoming = exams.filter((e) => daysTo(e.date) >= 0).sort(by)
  const week = upcoming.filter((e) => daysTo(e.date) <= 7).length, next = upcoming[0]
  const selD = new Date(sel + 'T00:00:00'), isToday = sel === today()
  const blank = (date) => ({ id: '', title: '', subject: 'Mathematics', std: 'Std 10', date, time: '09:00', paper: '' })
  const set = (o) => setForm({ ...form, ...o })
  const save = () => {
    if (!form.title.trim()) return toast('Please enter an exam title')
    if (!form.date) return toast('Please choose a date')
    const e = { ...form, title: form.title.trim() }
    setExams(form.id ? exams.map((x) => (x.id === form.id ? e : x)) : [...exams, { ...e, id: 'e' + Date.now() }])
    goTo(form.date); toast(form.id ? 'Exam updated' : 'Exam scheduled'); setForm(null)
  }
  const card = (e, pick) => <ExamCard key={e.id} e={e} onPick={pick ? () => goTo(e.date) : undefined} onOpen={() => { const p = papers.find((x) => x.id === e.paper); p ? openPaper(p) : toast('Linked paper not found') }} onEdit={() => setForm({ ...blank(e.date), ...e })} onDel={() => ask('Delete this exam?', () => setExams(exams.filter((x) => x.id !== e.id)))} />
  return <section>
    <div className="row wrap"><h2>Exam Planner</h2><button className="primary" onClick={() => setForm(blank(sel))}><Ic n="plus" /> Schedule exam</button></div>
    <div className="sumline"><span><b>{upcoming.length}</b>upcoming</span><span><b>{week}</b>in the next 7 days</span>{next && <span>Next: {next.title}, {when(next.date).toLowerCase()} at {fmt12(next.time)}</span>}</div>
    <div className="pl">
      <div className="card cal">
        <div className="cal-h">
          <button className="hbtn" onClick={() => shift(-1)} aria-label="Previous month"><Ic n="back" /></button>
          <b>{MON[ym.m]} {ym.y}</b>
          <button className="hbtn" onClick={() => shift(1)} aria-label="Next month"><Ic n="right" /></button>
        </div>
        <div className="cal-g">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((w) => <span key={w} className="cal-w">{w}</span>)}
          {cells.map((d, i) => { const k = d && exams.filter((e) => e.date === ds(d)).length
            return d ? <button key={i} className={'cal-d' + (ds(d) === today() ? ' today' : '') + (ds(d) === sel ? ' sel' : '') + (k ? ' has' : '')} onClick={() => setSel(ds(d))} aria-label={ds(d) + (k ? ', ' + k + ' exam' + (k > 1 ? 's' : '') : '')} aria-pressed={ds(d) === sel}>{d}{k > 0 && <i className="cdots">{Array.from({ length: Math.min(k, 3) }, (_, j) => <u key={j} />)}</i>}</button> : <span key={i} />
          })}</div>
        <div className="cal-f"><span className="lgd"><span><u className="lg-ex" />Exam day</span><span><u className="lg-td" />Today</span></span><button className="ghost" onClick={() => goTo(today())}>Today</button></div>
      </div>
      <div className="pl-side">
        <div className="pl-h"><div><h3 className="h0">{isToday ? 'Today' : selD.toLocaleDateString('en', { weekday: 'long' })}</h3><small>{selD.toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
          <button onClick={() => setForm(blank(sel))}><Ic n="plus" s={16} /> Add exam</button></div>
        {dayEx.length ? dayEx.map((e) => card(e)) : <div className="card pl-none"><span className="ci sm"><Ic n="calendar" /></span><span className="grow"><b>No exams on this day</b><small>Pick a date with a dot, or add an exam here.</small></span></div>}
        <h3>Coming up</h3>
        {upcoming.length ? upcoming.slice(0, 5).map((e) => card(e, e.date !== sel)) : <Empty icon="calendar" title="Nothing scheduled" sub="Your upcoming exams will show here."><button className="primary gap" onClick={() => setForm(blank(sel))}>Schedule your first exam</button></Empty>}
      </div>
    </div>
    {form && <Modal title={form.id ? 'Edit exam' : 'Schedule exam'} onClose={() => setForm(null)}>
      <label>Exam title<input value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Unit Test 2 - Science" autoFocus /></label>
      <div className="fgrid">
        <label>Subject<select value={form.subject} onChange={(e) => set({ subject: e.target.value })}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Class<select value={form.std} onChange={(e) => set({ std: e.target.value })}>{['Std 9', 'Std 10', 'Std 11', 'Std 12', 'Class 9', 'Class 10'].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Date<input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} /></label>
        <label>Time<input type="time" value={form.time} onChange={(e) => set({ time: e.target.value })} /></label>
      </div>
      <label>Link a paper (optional)<select value={form.paper} onChange={(e) => set({ paper: e.target.value })}><option value="">— None —</option>{papers.filter((p) => p.status !== 'Archived').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button className="primary" onClick={save}>{form.id ? 'Save changes' : 'Save exam'}</button>
    </Modal>}
  </section>
}

/* ---------- Blueprints ---------- */
const tot = (b) => b.rows.reduce((a, r) => a + r.n * r.m, 0), cnt = (b) => b.rows.reduce((a, r) => a + r.n, 0)
function Stack({ b }) {
  const t = tot(b) || 1
  return <><div className="stk">{b.rows.map((r, i) => <i key={i} style={{ width: (r.n * r.m / t * 100) + '%', background: PAL[i % PAL.length] }} />)}</div>
    <div className="lgd">{b.rows.map((r, i) => <span key={i}><u style={{ background: PAL[i % PAL.length] }} />{r.n} × {r.type} ({r.m}m)</span>)}</div></>
}
export function Blueprints({ bps, setBps, use, ask, toast }) {
  const [ed, setEd] = useState(null)
  const setRow = (i, o) => setEd({ ...ed, rows: ed.rows.map((r, j) => (j === i ? { ...r, ...o } : r)) })
  const dsum = ed ? Object.values(ed.diff).reduce((a, b) => a + b, 0) : 0
  const save = () => {
    if (!ed.name.trim()) return toast('Please name the blueprint')
    if (!ed.rows.length) return toast('Add at least one question type')
    if (dsum !== 100) return toast('Difficulty split must total 100%')
    setBps(ed.id ? bps.map((b) => (b.id === ed.id ? ed : b)) : [{ ...ed, id: 'b' + Date.now() }, ...bps]); setEd(null); toast('Blueprint saved')
  }
  const fresh = () => setEd({ id: '', name: 'New blueprint', board: '', std: '', subject: '', rows: [{ type: 'MCQ', n: 10, m: 1 }], diff: { Easy: 40, Medium: 40, Hard: 20 } })
  return <section>
    <div className="row wrap"><h2>Blueprints</h2><button className="primary" onClick={fresh}><Ic n="plus" /> New blueprint</button></div>
    <p className="lead">Save your marks distribution once, then start any new paper from it.</p>
    {!bps.length && <Empty icon="target" title="No blueprints yet" sub="Create one to reuse your marks scheme." />}
    <div className="grid g2">{bps.map((b) => <div key={b.id} className="card">
      <div className="row"><b>{b.name}</b></div>
      <small>{tot(b)} marks · {cnt(b)} questions{b.subject ? ' · ' + b.subject : ''}</small>
      <Stack b={b} />
      <div className="bds"><Badge c="bk">Easy {b.diff.Easy}%</Badge><Badge c="warn">Medium {b.diff.Medium}%</Badge><Badge c="ai">Hard {b.diff.Hard}%</Badge></div>
      <div className="acts"><button className="primary" onClick={() => use(b)}>Use in new paper</button><button onClick={() => setEd(JSON.parse(JSON.stringify(b)))}>Edit</button>
        <button onClick={() => setBps([{ ...b, id: 'b' + Date.now(), name: b.name + ' (copy)' }, ...bps])}>Duplicate</button>
        <button className="dng" onClick={() => ask('Delete this blueprint?', () => setBps(bps.filter((x) => x.id !== b.id)))}>Delete</button></div></div>)}</div>
    {ed && <Modal title={ed.id ? 'Edit blueprint' : 'New blueprint'} onClose={() => setEd(null)}>
      <label>Name<input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} /></label>
      <h4>Question types</h4>
      <div className="bprow bph"><small>Type</small><small>Qty</small><small>Marks</small><span /></div>
      {ed.rows.map((r, i) => <div key={i} className="bprow">
        <select value={r.type} onChange={(e) => setRow(i, { type: e.target.value })} aria-label="Type">{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
        <input type="number" min="1" value={r.n} onChange={(e) => setRow(i, { n: Math.max(0, +e.target.value) })} aria-label="Quantity" />
        <input type="number" min="1" value={r.m} onChange={(e) => setRow(i, { m: Math.max(0, +e.target.value) })} aria-label="Marks each" />
        <button className="hbtn dng" onClick={() => setEd({ ...ed, rows: ed.rows.filter((_, j) => j !== i) })} aria-label="Remove"><Ic n="trash" s={16} /></button></div>)}
      <button onClick={() => setEd({ ...ed, rows: [...ed.rows, { type: 'Short', n: 4, m: 2 }] })}><Ic n="plus" s={16} /> Add question type</button>
      <div className="card sum tot"><b>{tot(ed)}</b> total marks · <b>{cnt(ed)}</b> questions</div>
      <Stack b={ed} />
      <h4>Difficulty split</h4>
      {['Easy', 'Medium', 'Hard'].map((k) => <label key={k} className="rg"><span>{k}</span><input type="range" min="0" max="100" step="5" value={ed.diff[k]} onChange={(e) => setEd({ ...ed, diff: { ...ed.diff, [k]: +e.target.value } })} /><b>{ed.diff[k]}%</b></label>)}
      {dsum !== 100 && <p className="err">Difficulty split totals {dsum}% — it must be 100%.</p>}
      <button className="primary" onClick={save}>Save blueprint</button>
    </Modal>}
  </section>
}

/* ---------- Insights ---------- */
const Bars = ({ items }) => { const mx = Math.max(1, ...items.map((i) => i[1])); return <div className="bars">{items.map(([l, v]) => <div key={l}><span>{l}</span><div className="bt"><i style={{ width: (v / mx * 100) + '%' }} /></div><b>{v}</b></div>)}</div> }
export function Insights({ papers }) {
  const live = papers.filter((p) => p.status !== 'Archived'), done = papers.filter((p) => p.status === 'Completed').length
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return [d.toLocaleString('en', { month: 'short' }), d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')] })
  const subj = [...new Set(live.map((p) => p.subject))].map((s) => [s, live.filter((p) => p.subject === s).length])
  const types = TYPES.map((t) => [t, BANK.filter((q) => q.type === t).length]).filter((x) => x[1])
  const dif = ['Easy', 'Medium', 'Hard'].map((d) => [d, BANK.filter((q) => q.diff === d).length])
  return <section><h2>Insights</h2>
    <div className="grid">{[['Papers created', papers.length], ['Completed', done], ['In draft', papers.filter((p) => p.status === 'Draft').length], ['Hours saved', (done * 0.75).toFixed(1)]].map(([l, v]) => <div key={l} className="card stat"><b>{v}</b><small>{l}</small></div>)}</div>
    <div className="grid g2 sp">
      <div className="card"><h3 className="h0">Papers by month</h3><Bars items={months.map(([l, k]) => [l, papers.filter((p) => p.date.startsWith(k)).length])} /></div>
      <div className="card"><h3 className="h0">Papers by subject</h3>{subj.length ? <Bars items={subj} /> : <small>No papers yet.</small>}</div>
      <div className="card"><h3 className="h0">Question bank by type</h3><Bars items={types} /></div>
      <div className="card"><h3 className="h0">Question bank by difficulty</h3><Bars items={dif} /><small>{BANK.length} questions in total</small></div>
    </div></section>
}

/* ---------- Favorites ---------- */
export function Favorites({ favQ, tfQ, favT, tfT, addQ, useT, go }) {
  const [tab, setTab] = useState('q')
  const qs = BANK.filter((q) => favQ.includes(q.id)), ts = TEMPLATES.filter((t) => favT.includes(t.id))
  return <section><h2>Favorites</h2>
    <Seg v={tab} set={setTab} items={[['q', `Questions (${qs.length})`], ['t', `Templates (${ts.length})`]]} /><div className="sp" />
    {tab === 'q' ? (qs.length ? qs.map((q) => <div key={q.id} className="card"><M t={q.text} /><small>{q.sub} › {q.ch} · {q.type} · {q.diff} · {q.marks}m</small>
      <div className="acts"><button className="primary" onClick={() => addQ(q)}>Add to paper</button><button onClick={() => tfQ(q.id)}><Ic n="star" f s={16} /> Remove</button></div></div>)
      : <Empty icon="star" title="No favorite questions" sub="Tap the star on any question in the Question Bank."><div className="acts c"><button className="primary" onClick={() => go('Question Bank')}>Open Question Bank</button></div></Empty>)
      : (ts.length ? <div className="grid">{ts.map((t) => <div key={t.id} className="card"><Thumb /><b>{t.name}</b><small>{t.cat}</small><div className="acts"><button className="primary" onClick={() => useT(t.id)}>Use template</button><button onClick={() => tfT(t.id)} aria-label="Remove favorite"><Ic n="star" f s={16} /></button></div></div>)}</div>
        : <Empty icon="star" title="No favorite templates" sub="Star a template in Templates & My Formats."><div className="acts c"><button className="primary" onClick={() => go('Templates & My Formats')}>Browse templates</button></div></Empty>)}
  </section>
}

/* ---------- Help ---------- */
export function Help({ toast }) {
  const [msg, setMsg] = useState('')
  return <section><h2>Help & Support</h2>
    <h4>Frequently asked</h4>
    {FAQ.map(([q, a]) => <details key={q} className="card"><summary><b>{q}</b><Ic n="down" s={16} /></summary><p className="lead">{a}</p></details>)}
    <h4>Send feedback</h4>
    <div className="card"><label>Tell us what to improve<textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Describe your idea or problem…" /></label>
      <button className="primary" disabled={!msg.trim()} onClick={() => { setMsg(''); toast('Thanks! Feedback sent (demo)') }}>Send feedback</button></div>
    <small className="ctr">EduPaper AI · Version 1.0.0</small></section>
}

/* ---------- Settings ---------- */
export function SettingsPage({ theme, setTheme, prefs, setPrefs, toast, sendTest }) {
  const up = (o) => { setPrefs({ ...prefs, ...o }); toast('Saved') }
  const [tb, setTb] = useState(false), [tr, setTr] = useState('')
  const test = async () => { if (tb) return; setTb(true); setTr(''); setTr(await sendTest()); setTb(false) }
  return <section><h2>Settings</h2>
    <h4>Appearance</h4>
    <div className="card"><Seg v={theme} set={setTheme} items={[['system', 'System', 'phone'], ['light', 'Light', 'sun'], ['dark', 'Dark', 'moon']]} />
      <small className="gap">{theme === 'system' ? 'Follows your phone’s light or dark mode automatically.' : 'Always use the ' + theme + ' theme.'}</small></div>
    <h4>Paper defaults</h4>
    <div className="card"><Toggle on={prefs.key} set={(v) => up({ key: v })} label="Include answer key" sub="Added to every new paper by default" />
      <label className="gap">Default question language<select value={prefs.medium} onChange={(e) => up({ medium: e.target.value })}>{MEDIA.map((m) => <option key={m}>{m}</option>)}</select></label></div>
    <h4>Notifications</h4>
    <div className="card"><Toggle on={prefs.notif} set={(v) => up({ notif: v })} label="Reminders" sub="Exam reminders and unfinished drafts" />
      <hr /><div className="row wrap tn"><span className="grow"><b>Test notifications</b><small>Sends one test alert to the bell and to your device.</small></span>
        <button className="primary" onClick={test} disabled={tb}><Ic n="bell" s={16} />{tb ? 'Sending…' : 'Send test notification'}</button></div>
      {tr === 'sent' && <div className="ok" role="status">Sent. Check your notification shade and the bell icon.</div>}
      {tr === 'denied' && <div className="fa" role="status">Notifications are blocked for this app. The test still reached the bell; allow notifications in your phone settings to see system alerts.</div>}
      {tr === 'unsupported' && <div className="fa" role="status">The test reached the bell. System alerts aren’t available on this browser or device.</div>}</div>
  </section>
}

/* ---------- More (mobile hub) ---------- */
export function More({ go, nav, skip, unread, signOut, user, plan, signIn }) {
  const nm = user ? user.name : 'Guest'
  return <section>
    <button className="card prof" onClick={() => (user ? go('Profile') : signIn())}><span className="av">{nm.trim().charAt(0).toUpperCase()}</span><span className="grow"><b>{nm}</b><small>{user ? user.email : 'Sign in to create papers'}</small></span>{plan !== 'free' && <Badge c="ai">{PLANS[plan].name}</Badge>}<Ic n="right" /></button>
    {nav.map(([g, items]) => { const it = items.filter(([t]) => !skip.includes(t)); return it.length ? <div key={g}><h4>{g}</h4><div className="card list">{it.map(([t, ic]) => <button key={t} className="li" onClick={() => go(t)}><span className="ci sm"><Ic n={ic} /></span><span className="grow">{t}</span>{t === 'Notifications' && unread > 0 && <Badge c="warn">{unread}</Badge>}<Ic n="right" s={16} /></button>)}</div></div> : null })}
    <div className="card list">{user
      ? <button className="li dng" onClick={signOut}><span className="ci sm"><Ic n="logout" /></span><span className="grow">Sign out</span></button>
      : <button className="li" onClick={signIn}><span className="ci sm"><Ic n="user" /></span><span className="grow">Sign in or create account</span></button>}</div>
  </section>
}

/* ---------- Onboarding ---------- */
const SL = [
  { ic: 'sparkles', t: 'Build papers in minutes', d: 'Pick board, class and chapters. Get a balanced question paper from the bank and AI.' },
  { ic: 'layout', t: 'Your school’s format', d: 'Upload your own DOCX or PDF format, or choose from ready-made templates.' },
  { ic: 'file', t: 'Print-ready in one tap', d: 'Export clean DOCX or PDF with maths, chemistry equations and an answer key.' }
]
export function Onboarding({ onDone }) {
  const [i, setI] = useState(0), s = SL[i], last = i === SL.length - 1
  return <div className="onb">
    <div className="row onb-top"><span className="onb-step">{i + 1} of {SL.length}</span><button className="ghost" onClick={onDone}>Skip</button></div>
    <div className="onb-art" key={i}><div className="onb-orb"><Ic n={s.ic} s={64} /></div></div>
    <div className="onb-txt" key={'t' + i}><h1>{s.t}</h1><p>{s.d}</p></div>
    <div className="dots">{SL.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
    <button className="primary big" onClick={() => (last ? onDone() : setI(i + 1))}>{last ? 'Get started' : 'Next'}</button>
  </div>
}

/* ---------- New custom question ---------- */
export function NewQuestion({ onSave, onClose }) {
  const [f, setF] = useState({ sub: 'Mathematics', ch: '', type: 'Short', marks: 2, diff: 'Medium', text: '', ans: '' })
  const set = (o) => setF({ ...f, ...o })
  const chs = [...new Set(BANK.map((q) => q.ch))]
  return <Modal title="New question" onClose={onClose}>
    <div className="fgrid">
      <label>Subject<select value={f.sub} onChange={(e) => set({ sub: e.target.value })}>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Chapter<input list="chs" value={f.ch} onChange={(e) => set({ ch: e.target.value })} placeholder="e.g. Real Numbers" /><datalist id="chs">{chs.map((c) => <option key={c} value={c} />)}</datalist></label>
      <label>Type<select value={f.type} onChange={(e) => set({ type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
      <label>Marks<input type="number" min="1" value={f.marks} onChange={(e) => set({ marks: e.target.value })} /></label>
      <label>Difficulty<select value={f.diff} onChange={(e) => set({ diff: e.target.value })}>{['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}</select></label>
    </div>
    <label>Question <small>Use $…$ for maths, e.g. $x^2+1$</small><textarea value={f.text} onChange={(e) => set({ text: e.target.value })} /></label>
    <div className="prev"><M t={f.text || 'Live preview appears here'} /></div>
    <label>Answer<textarea value={f.ans} onChange={(e) => set({ ans: e.target.value })} /></label>
    <button className="primary" disabled={!f.text.trim() || !f.ch.trim()} onClick={() => onSave({ ...f, marks: +f.marks || 1 })}>Save to my bank</button>
  </Modal>
}
