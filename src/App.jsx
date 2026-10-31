import { useState, useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/contrib/mhchem'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, BorderStyle, Tab, ImageRun } from 'docx'
import { texToText } from './tex.js'
import { readDocxTemplate, readPdfLetterhead, fillDocxTemplate, applyToLines } from './template.js'
import { putFile, getFile, delFile } from './store.js'
import { loadPdfjs } from './pdfjs.js'
import { aiQuestions, aiEnabled } from './ai.js'
import { cloud, useCloud, imgUrl, syncNow } from './cloud.js'
import logo from './assets/logo-full.png'
import mark from './assets/mark.png'
import Splash from './Splash.jsx'
import NotifDrawer from './NotifDrawer.jsx'
import Auth from './Auth.jsx'
import { PlansPage, CheckoutPage } from './Billing.jsx'
import ProfilePage from './Profile.jsx'
import { currentUser, logout } from './auth.js'
import { activePlan, newSub, startFor } from './payments.js'
import { systemNotify } from './notify.js'
import { Ic, Modal, Badge, Thumb, M, Diagram, today, daysTo, when } from './ui.jsx'
import { Planner, ExamCard, Blueprints, Insights, Favorites, Help, SettingsPage, More, Onboarding, NewQuestion } from './pages.jsx'
import { inScope, PATTERNS, CUR, BANK, TEMPLATES, CATS, MEDIA, TYPES, AI_TXT, FORMATS0, PAPERS0, EXAMS0, BLUEPRINTS0, NOTIFS0 } from './data.js'
let n = 100
const uid = () => 'u' + Date.now().toString(36) + ++n

const STEPS = ['Class', 'Chapters', 'Setup', 'Questions', 'Format', 'Export']
const blank = { board: '', std: '', medium: 'English', subject: '', chapters: [], name: 'Unit Test 1', marks: 25, mins: 60, diff: 'Medium', nq: 8, types: ['MCQ', 'Short', 'Long'], neg: false, instr: 'All questions are compulsory.', source: 'Both', qs: [], pat: '', tpl: 't1', key: true, id: null, status: 'Draft' }
const plain = (t = '') => texToText(t)
const mins = (m) => { const h = Math.floor(m / 60), r = m % 60; return [h && h + (h > 1 ? ' hours' : ' hour'), r && r + ' minutes'].filter(Boolean).join(' ') || '—' }
// Papers are laid out in sections by question type, the same way in the preview and the DOCX.
const sectionsOf = (qs) => { const g = TYPES.map((t) => [t, qs.filter((q) => q.type === t)]).filter((x) => x[1].length), o = qs.filter((q) => !TYPES.includes(q.type)); return o.length ? [...g, ['Other questions', o]] : g }
const instrOf = (p) => [...String(p.instr || '').split(/\n+/).map((x) => x.trim()).filter(Boolean), ...(p.neg ? ['Negative marking applies to wrong answers.'] : [])]
/** Downloads the figures of questions that have an uploaded image, sized for a page. A missing image never blocks the export. */
async function loadImages(qs) {
  const out = {}
  await Promise.all(qs.filter((q) => q.image).map(async (q) => {
    try {
      const r = await fetch(imgUrl(q.image)); if (!r.ok) return
      const blob = await r.blob(), bmp = await createImageBitmap(blob), k = Math.min(1, 380 / bmp.width, 260 / bmp.height)
      const type = blob.type.includes('png') ? 'png' : blob.type.includes('gif') ? 'gif' : 'jpg'
      out[q.id] = { data: new Uint8Array(await blob.arrayBuffer()), type, w: Math.round(bmp.width * k), h: Math.round(bmp.height * k) }
    } catch { /* keep the placeholder line */ }
  }))
  return out
}
const valuesOf = (p, total) => ({ exam: p.name, cls: String(p.std || '').replace(/^(Std|Class)\s*/i, ''), subject: p.subject, time: mins(p.mins), marks: String(total) })
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const saveBlob = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click() }
const fmtD = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })


function Eq({ onApply, onClose }) {
  const [v, setV] = useState('\\frac{a}{b}+\\sqrt{x^2+1}')
  const S = [['Fraction', '\\frac{a}{b}'], ['Root', '\\sqrt{x}'], ['Power', 'x^{2}'], ['Integral', '\\int_0^1 x\\,dx'], ['Matrix', '\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}'], ['Greek', '\\alpha+\\beta'], ['Sci. notation', '3\\times10^{8}'], ['Chem', '\\ce{H2SO4}'], ['Reaction', '\\ce{2H2 + O2 -> 2H2O}']]
  return <Modal title="Equation editor" onClose={onClose}>
    <div className="chips">{S.map(([a, b]) => <button key={a} onClick={() => setV(v + ' ' + b)}>{a}</button>)}</div>
    <textarea aria-label="LaTeX" value={v} onChange={(e) => setV(e.target.value)} />
    <div className="card prev" dangerouslySetInnerHTML={{ __html: katex.renderToString(v, { throwOnError: false, displayMode: true }) }} />
    <button className="primary" onClick={() => onApply('$' + v + '$')}>Insert into question</button></Modal>
}

function QRow({ q, i, last, ch, mv, dup, del, regen, eq }) {
  const [a, setA] = useState(false)
  return <div className="card q">
    <div className="row wrap"><b>Q{i + 1}</b>
      <span className="badges"><Badge>{q.type}</Badge><Badge>{q.diff}</Badge><Badge c={q.src === 'AI Generated' ? 'ai' : 'bk'}>{q.src === 'AI Generated' ? 'AI Generated' : '' + q.src}</Badge>{q.flag && <Badge c="warn">Needs review</Badge>}{!q.ans && <Badge c="warn">No answer</Badge>}</span>
      <label className="mk">Marks <input type="number" min="0" value={q.marks} onChange={(e) => ch({ marks: +e.target.value })} /></label></div>
    <textarea aria-label={'Question ' + (i + 1)} value={q.text} onChange={(e) => ch({ text: e.target.value })} />
    <div className="prev"><M t={q.text} /></div>
    {q.image ? <img className="qimg" src={imgUrl(q.image)} alt={q.imageAlt || 'Figure'} /> : q.diagram && <Diagram />}
    {q.subs && q.subs.map((s, k) => <input key={k} aria-label="Subquestion" value={s} onChange={(e) => ch({ subs: q.subs.map((x, j) => (j === k ? e.target.value : x)) })} />)}
    {a && <div className="ans">Answer: <M t={q.ans || '— not available —'} /></div>}
    <div className="acts">
      <button disabled={!i} onClick={() => mv(-1)} aria-label="Move up"><Ic n="up" s={16} /></button><button disabled={last} onClick={() => mv(1)} aria-label="Move down"><Ic n="down" s={16} /></button>
      <button onClick={dup}>Duplicate</button><button onClick={regen}>Regenerate</button><button onClick={eq}>Equation</button>
      <button onClick={() => ch({ diagram: !q.diagram })}>Diagram</button><button onClick={() => ch({ subs: [...(q.subs || []), '(a) New subquestion'] })}>+ Sub</button>
      <button onClick={() => setA(!a)}>{a ? 'Hide' : 'Show'} answer</button><button className="dng" onClick={del}>Delete</button></div></div>
}

function Paper({ p, formats }) {
  const f = formats.find((x) => x.id === p.tpl), school = f ? f.school : ''
  const t = TEMPLATES.find((x) => x.id === p.tpl)
  const total = p.qs.reduce((a, q) => a + q.marks, 0), groups = sectionsOf(p.qs), starts = []
  const lh = f && f.kind === 'pdf' ? applyToLines(f.lines, f.fields, valuesOf(p, total)) : null
  groups.reduce((c, g) => { starts.push(c); return c + g[1].length }, 0)
  const L = (i) => String.fromCharCode(65 + i)
  return <div className={'card paper ' + (t && t.id === 't2' ? 'compact' : '')}>
    {lh ? <div className="ph" style={{ display: 'block' }}>{f.logos && f.logos.length > 0 && <div style={{ display: 'flex', justifyContent: f.logos.length === 1 ? ({ left: 'flex-start', center: 'center', right: 'flex-end' })[f.logos[0].align] : 'space-between', alignItems: 'center', marginBottom: 6 }}>{f.logos.map((l, i) => <img key={i} src={l.src} alt="School logo" style={{ height: l.h, maxWidth: '30%', objectFit: 'contain' }} />)}</div>}{lh.map((l, i) => <div key={i} style={{ textAlign: l.align, fontWeight: l.bold ? 700 : 400, fontSize: Math.min(Math.max(l.size, 10), 22), whiteSpace: 'pre-wrap' }}>{l.text.replace(/\t/g, '      ')}</div>)}</div>
      : <><div className="ph">{school && <h2>{school}</h2>}<h3>{p.name}</h3><small>{p.board} · {p.std} · {p.subject}{p.medium ? ' · ' + p.medium + ' medium' : ''}</small></div>
        <div className="meta"><span>Time: {mins(p.mins)}</span><span>Maximum marks: {total}</span></div></>}
    <div className="gen"><b>General instructions</b><ol>{instrOf(p).map((x, i) => <li key={i}>{x}</li>)}</ol></div>
    {!p.qs.length && <p><i>No questions added yet. Add questions in the Questions step.</i></p>}
    {groups.map(([ty, qs], gi) => <div key={ty}>
      <div className="sec"><span>Section {L(gi)}: {ty}</span><small>{qs.length} question{qs.length > 1 ? 's' : ''} · {qs.reduce((a, q) => a + q.marks, 0)} {qs.reduce((a, q) => a + q.marks, 0) === 1 ? 'mark' : 'marks'}</small></div>
      {qs.map((q, i) => <div key={q.uid} className="pq"><span className="qn">{starts[gi] + i + 1}.</span><span><M t={q.text} />{q.image ? <div><img className="qimg" src={imgUrl(q.image)} alt={q.imageAlt || 'Figure'} /></div> : q.diagram && <div><Diagram /></div>}{q.subs && q.subs.map((x, j) => <div key={j} className="sub">{x}</div>)}</span><b>[{q.marks}]</b></div>)}</div>)}
    {p.key && !!p.qs.length && <div className="key"><h3>Answer key</h3>{groups.map(([ty, qs], gi) => <div key={ty}><b>Section {L(gi)}: {ty}</b>{qs.map((q, i) => <div key={q.uid} className="pq"><span className="qn">{starts[gi] + i + 1}.</span><span><M t={q.ans || '—'} /></span><span /></div>)}</div>)}</div>}
    <div className="foot">End of question paper</div></div>
}

const Pick = ({ items, v, f, sub }) => <div className="grid">{items.map((i) => <button key={i} className={'card pick' + (v === i ? ' on' : '')} onClick={() => f(i)}>{i}{sub && <small>{sub}</small>}</button>)}</div>

/** Browse every question of the chosen chapters. One checkbox per question, grouped by type (all MCQ together, then Short, Long ...). */
function QPick({ p, set, mk }) {
  const [ty, setTy] = useState(''), [ch, setCh] = useState(''), [q, setQ] = useState('')
  const base = BANK.filter((x) => p.chapters.includes(x.ch) && inScope(x, p.board, p.std, p.subject) && (!ch || x.ch === ch))
  const pool = base.filter((x) => !q || plain(x.text).toLowerCase().includes(q.toLowerCase()))
  const present = [...TYPES.filter((t) => pool.some((x) => x.type === t)), ...(pool.some((x) => !TYPES.includes(x.type)) ? ['Other'] : [])]
  const list = pool.filter((x) => !ty || (ty === 'Other' ? !TYPES.includes(x.type) : x.type === ty))
  const groups = present.filter((t) => !ty || t === ty).map((t) => [t, list.filter((x) => (t === 'Other' ? !TYPES.includes(x.type) : x.type === t))]).filter((g) => g[1].length)
  const has = (x) => p.qs.some((y) => y.id && y.id === x.id)
  const toggle = (x) => set({ qs: has(x) ? p.qs.filter((y) => !(y.id && y.id === x.id)) : [...p.qs, mk(x)] })
  const toggleAll = (xs) => { const on = xs.every(has); set({ qs: on ? p.qs.filter((y) => !xs.some((x) => y.id && y.id === x.id)) : [...p.qs, ...xs.filter((x) => !has(x)).map(mk)] }) }
  const n = (t) => pool.filter((x) => (t === 'Other' ? !TYPES.includes(x.type) : x.type === t)).length
  return <div className="qp">
    <input type="search" placeholder="Search questions" aria-label="Search questions" value={q} onChange={(e) => setQ(e.target.value)} />
    {p.chapters.length > 1 && <div className="qchips" role="group" aria-label="Chapter">{['', ...p.chapters].map((c) => <button key={c || 'all'} type="button" className={ch === c ? 'on' : ''} aria-pressed={ch === c} onClick={() => setCh(c)}>{c || 'All chapters'}</button>)}</div>}
    <div className="qchips" role="group" aria-label="Question type">{['', ...present].map((t) => <button key={t || 'all'} type="button" className={ty === t ? 'on' : ''} aria-pressed={ty === t} onClick={() => setTy(t)}>{t || 'All'} <em>{t ? n(t) : pool.length}</em></button>)}</div>
    {!groups.length && <div className="card empty"><b>No saved questions here</b><small>{base.length ? 'Nothing matches your search or filter.' : 'This chapter has no saved questions yet. Use “+ AI question” or Auto-fill.'}</small></div>}
    {groups.map(([t, xs]) => <div key={t} className="qg">
      <div className="qg-h"><label className="chip"><input type="checkbox" checked={xs.every(has)} onChange={() => toggleAll(xs)} aria-label={'Select all ' + t} /><b>{t}</b></label><small>{xs.filter(has).length} of {xs.length} added</small></div>
      <div className="qlist">{xs.map((x) => <label key={x.id} className={'qx' + (has(x) ? ' on' : '')}><input type="checkbox" checked={has(x)} onChange={() => toggle(x)} />
        <span className="qt"><span><M t={x.text} /></span><small>{p.chapters.length > 1 && !ch ? x.ch + ' · ' : ''}{x.diff} · {x.marks} {x.marks > 1 ? 'marks' : 'mark'}</small></span></label>)}</div></div>)}
  </div>
}

function Wizard({ p, setP, step, setStep, formats, saveP, toast }) {
  const [q, setQ] = useState(''), [eqFor, setEqFor] = useState(null), [ft, setFt] = useState('b'), [done, setDone] = useState(false), [qv, setQv] = useState('add')
  const set = (o) => setP({ ...p, ...o })
  const stds = p.board ? Object.keys(CUR[p.board] || {}) : []
  const subs = p.std ? Object.keys((CUR[p.board] || {})[p.std] || {}) : []
  const chs = p.subject ? (((CUR[p.board] || {})[p.std] || {})[p.subject] || {}) : {}
  const total = p.qs.reduce((a, x) => a + x.marks, 0)
  const chq = (u, o) => set({ qs: p.qs.map((x) => (x.uid === u ? { ...x, ...o } : x)) })
  const ai = () => { const c = p.chapters[Math.floor(Math.random() * p.chapters.length)]; return { id: 0, uid: uid(), ch: c, type: 'Short', marks: 2, diff: p.diff, text: AI_TXT[Math.floor(Math.random() * AI_TXT.length)], ans: '', flag: true, src: 'AI Generated' } }
  const [busy, setBusy] = useState(false)
  const mk = (x) => ({ ...x, uid: uid() })
  const fromBank = (n) => { // spread questions across the chosen chapters, only the chosen types
    const per = p.chapters.map((c) => BANK.filter((x) => x.ch === c && inScope(x, p.board, p.std, p.subject) && (!p.types.length || p.types.includes(x.type))))
    const out = []; for (let i = 0; out.length < n && per.some((a) => i < a.length); i++) per.forEach((a) => { if (out.length < n && a[i]) out.push(mk(a[i])) })
    return out
  }
  const gen = async () => {
    let out = []; setBusy(true)
    try {
      if (p.source !== 'AI') out = fromBank(p.source === 'Both' ? Math.max(p.nq - 2, 1) : p.nq)
      const na = p.source === 'AI' ? p.nq : p.source === 'Both' ? Math.min(2, p.nq) : 0
      if (na) {
        let made = null
        try { made = await aiQuestions({ board: p.board, std: p.std, medium: p.medium, subject: p.subject, chapter: p.chapters, type: p.types, diff: p.diff, count: na }) } catch (e) { toast('AI server not reachable - showing demo questions') }
        if (made && made.length) made.forEach((x) => out.push({ id: 0, uid: uid(), ch: x.ch || p.chapters[0], type: x.type || 'Short', marks: x.marks || 2, diff: x.diff || p.diff, text: x.text, ans: x.ans || '', subs: x.subs, flag: true, src: 'AI Generated' }))
        else for (let i = 0; i < na; i++) out.push(ai())
      }
      set({ qs: out }); toast(aiEnabled || p.source === 'Bank' ? 'Questions generated' : 'Questions generated (AI is in demo mode)')
    } finally { setBusy(false) }
  }
  const docx = async () => {
    const f = formats.find((x) => x.id === p.tpl), school = f ? f.school : '', groups = sectionsOf(p.qs)
    const fname = (p.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'question-paper') + '.docx', tot = p.qs.reduce((a, q) => a + q.marks, 0)
    if (f && f.kind === 'docx') { // same file, same layout: the school's own Word document is the template
      try {
        const buf = await getFile(f.id)
        if (buf) { const out = await fillDocxTemplate(buf, { paper: p, groups, values: valuesOf(p, tot), instr: instrOf(p) }); saveBlob(new Blob([out], { type: DOCX_MIME }), fname); saveP('Completed'); setDone(true); return }
        toast('Your original file is missing on this device. Upload it again. Using the standard layout for now.')
      } catch (e) { toast('Could not use your Word format (' + (e.message || 'error') + '). Using the standard layout.') }
    }
    const imgs = await loadImages(p.qs)
    const lh = f && f.kind === 'pdf' ? applyToLines(f.lines, f.fields, valuesOf(p, tot)) : null
    const R = [{ type: TabStopType.RIGHT, position: 9000 }], line = { style: BorderStyle.SINGLE, size: 8, color: '000000', space: 4 }, L = (i) => String.fromCharCode(65 + i)
    const mid = (text, size, bold = true) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text, bold, size })] })
    const kids = []
    if (lh) {
      if (f.logos && f.logos.length) {
        const by = (a) => f.logos.filter((l) => l.align === a), pic = (l) => new ImageRun({ data: Uint8Array.from(atob(l.src.split(',')[1]), (c) => c.charCodeAt(0)), transformation: { width: Math.round(l.w * 1.333), height: Math.round(l.h * 1.333) }, type: 'png' })
        const Lg = by('left'), Cg = by('center'), Rg = by('right'), ch = [...Lg.map(pic)]
        if (Cg.length || Rg.length) ch.push(new TextRun({ children: [new Tab()] }), ...Cg.map(pic)); if (Rg.length) ch.push(new TextRun({ children: [new Tab()] }), ...Rg.map(pic))
        kids.push(new Paragraph({ tabStops: [{ type: TabStopType.CENTER, position: 4500 }, { type: TabStopType.RIGHT, position: 9000 }], spacing: { after: 80 }, children: ch }))
      }
      lh.forEach((l) => kids.push(new Paragraph({ alignment: l.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT, tabStops: R, spacing: { after: 60 }, children: l.text.split('\t').map((x, k) => new TextRun({ children: k ? [new Tab(), x] : [x], bold: l.bold, size: Math.round(Math.min(Math.max(l.size, 10), 22) * 2) })) })))
      kids.push(new Paragraph({ border: { bottom: line }, spacing: { after: 120 }, children: [] }))
    } else {
    if (school) kids.push(mid(school.toUpperCase(), 30))
    kids.push(mid(p.name, 26), mid(`${p.board} · ${p.std} · ${p.subject}${p.medium ? ' · ' + p.medium + ' medium' : ''}`, 21, false))
    kids.push(new Paragraph({ tabStops: R, border: { top: line, bottom: line }, spacing: { before: 160, after: 160 }, children: [new TextRun({ text: 'Time: ' + mins(p.mins), bold: true }), new TextRun({ text: '\tMaximum marks: ' + total, bold: true })] }))
    }
    kids.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: 'General instructions', bold: true })] }))
    instrOf(p).forEach((x, i) => kids.push(new Paragraph({ indent: { left: 360, hanging: 360 }, children: [new TextRun(`${i + 1}.\t${x}`)] })))
    let n = 0
    groups.forEach(([ty, qs], gi) => {
      kids.push(new Paragraph({ tabStops: R, border: { bottom: line }, keepNext: true, spacing: { before: 300, after: 120 }, children: [new TextRun({ text: `Section ${L(gi)}: ${ty}`, bold: true }), new TextRun({ text: `\t${qs.reduce((a, q) => a + q.marks, 0)} marks`, bold: true })] }))
      qs.forEach((q) => {
        n++
        kids.push(new Paragraph({ tabStops: R, indent: { left: 480, hanging: 480 }, spacing: { after: 120 }, children: [new TextRun(`${n}.\t${plain(q.text)}`), new TextRun({ text: `\t[${q.marks}]`, bold: true })] }))
        ;(q.subs || []).forEach((x) => kids.push(new Paragraph({ indent: { left: 840 }, spacing: { after: 60 }, children: [new TextRun(plain(x))] })))
        if (imgs[q.id]) kids.push(new Paragraph({ indent: { left: 480 }, spacing: { after: 120 }, children: [new ImageRun({ data: imgs[q.id].data, type: imgs[q.id].type, transformation: { width: imgs[q.id].w, height: imgs[q.id].h } })] }))
        else if (q.diagram) kids.push(new Paragraph({ indent: { left: 480 }, spacing: { after: 120 }, children: [new TextRun({ text: '[Diagram: insert figure here]', italics: true })] }))
      })
    })
    if (p.key) {
      kids.push(new Paragraph({ pageBreakBefore: true, spacing: { after: 160 }, children: [new TextRun({ text: 'Answer key', bold: true, size: 28 })] })); n = 0
      groups.forEach(([ty, qs], gi) => {
        kids.push(new Paragraph({ keepNext: true, spacing: { before: 160, after: 80 }, children: [new TextRun({ text: `Section ${L(gi)}: ${ty}`, bold: true })] }))
        qs.forEach((q) => { n++; kids.push(new Paragraph({ indent: { left: 480, hanging: 480 }, spacing: { after: 80 }, children: [new TextRun(`${n}.\t${plain(q.ans || '—')}`)] })) })
      })
    }
    const d = new Document({ styles: { default: { document: { run: { font: 'Cambria', size: 22 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } }, children: kids }] })
    saveBlob(await Packer.toBlob(d), fname)
    saveP('Completed'); setDone(true)
  }
  const valid = [p.board && p.std && p.subject, p.chapters.length, p.name && p.marks > 0, p.qs.length, 1, 1][step]
  const patterns = PATTERNS.filter((x) => (!x.board || x.board === p.board) && (!x.std || x.std === p.std) && (!x.sub || x.sub === p.subject))
  const scope = [p.board, p.std, p.subject, p.medium].filter(Boolean).join(' · ')
  const V = [
    /* 1. Class: board, standard, medium and subject on one screen, asked once */
    <>
      <h4>Board</h4><Pick items={Object.keys(CUR)} v={p.board} f={(b) => set({ board: b, std: '', subject: '', chapters: [], qs: [] })} sub={cloud.liveSyllabus ? 'Live syllabus' : 'Demo content'} />
      {p.board && <><h4>Standard</h4><Pick items={stds} v={p.std} f={(x) => set({ std: x, subject: '', chapters: [], qs: [] })} /></>}
      {p.std && <><h4>Subject</h4>{subs.length ? <Pick items={subs} v={p.subject} f={(x) => set({ subject: x, chapters: [], qs: [] })} /> : <div className="card">This class is not configured yet for {p.board} (demo). Choose another standard.</div>}</>}
      {p.subject && <><h4>Medium</h4><div className="qchips" role="group" aria-label="Medium">{MEDIA.map((m) => <button key={m} type="button" className={p.medium === m ? 'on' : ''} aria-pressed={p.medium === m} onClick={() => set({ medium: m })}>{m}</button>)}</div></>}
    </>,
    /* 2. Chapters */
    <>
      <p className="ctx">{scope}</p>
      <div className="row"><input placeholder="Search chapters…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chapters" />
        <button onClick={() => set({ chapters: p.chapters.length === Object.keys(chs).length ? [] : Object.keys(chs) })}>{p.chapters.length === Object.keys(chs).length ? 'Clear all' : 'Select all'}</button></div>
      {Object.keys(chs).filter((c) => c.toLowerCase().includes(q.toLowerCase())).map((c) => <details key={c} className="card"><summary><label><input type="checkbox" checked={p.chapters.includes(c)} onChange={() => set({ chapters: p.chapters.includes(c) ? p.chapters.filter((x) => x !== c) : [...p.chapters, c], qs: p.qs.filter((x) => x.ch !== c || p.chapters.includes(c) === false) })} /> {c}</label><small> {BANK.filter((x) => x.ch === c && inScope(x, p.board, p.std, p.subject)).length} questions</small></summary>{chs[c].map((t) => <div key={t} className="sub">• {t}</div>)}</details>)}
      <p><b>{p.chapters.length}</b> selected{p.chapters.length ? ': ' + p.chapters.join(', ') : ''}</p></>,
    /* 3. Setup: only patterns that fit the chosen board, standard and subject */
    <>
      <p className="ctx">{scope}</p>
      {patterns.length > 0 && <><h4>Start from a pattern</h4><p><small>Fills marks, time and question types. You can change every value afterwards.</small></p>
        <div className="pat">{patterns.map((x) => <button key={x.id} className={'card pick' + (p.pat === x.id ? ' on' : '')} aria-pressed={p.pat === x.id} onClick={() => set({ pat: x.id, marks: x.marks, mins: x.mins, nq: x.nq || p.nq, types: x.types })}>{x.label}<small>{x.note}</small></button>)}</div></>}
      <div className="card form">
        <label>Examination name<input value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <div className="grid"><label>Total marks<input type="number" value={p.marks} onChange={(e) => set({ marks: +e.target.value })} /></label><label>Duration (min)<input type="number" value={p.mins} onChange={(e) => set({ mins: +e.target.value })} /></label>
          <label>No. of questions<input type="number" value={p.nq} onChange={(e) => set({ nq: +e.target.value })} /></label>
          <label>Difficulty<select value={p.diff} onChange={(e) => set({ diff: e.target.value })}>{['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => <option key={d}>{d}</option>)}</select></label></div>
        <h4>Question types</h4><div className="chips">{TYPES.map((t) => <label key={t} className="chip"><input type="checkbox" checked={p.types.includes(t)} onChange={() => set({ types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t] })} />{t}</label>)}</div>
        <label className="chip"><input type="checkbox" checked={p.neg} onChange={() => set({ neg: !p.neg })} />Negative marking</label>
        <label>Additional instructions<textarea value={p.instr} onChange={(e) => set({ instr: e.target.value })} /></label></div></>,
    /* 4. Questions: tick questions from the bank (grouped by type) or auto-fill */
    <>
      <div className="card sum qsum"><div><b>{p.qs.length}</b> questions · <b>{total}</b> / {p.marks} marks {total !== p.marks && p.qs.length > 0 && <Badge c="warn">{total > p.marks ? 'Over target' : 'Under target'}</Badge>}</div>
        <div className="bar" aria-hidden="true"><div style={{ width: Math.min(100, p.marks ? total / p.marks * 100 : 0) + '%' }} /></div></div>
      <div className="seg qseg" role="tablist"><button type="button" role="tab" aria-selected={qv === 'add'} className={qv === 'add' ? 'on' : ''} onClick={() => setQv('add')}>Choose questions</button><button type="button" role="tab" aria-selected={qv === 'mine'} className={qv === 'mine' ? 'on' : ''} onClick={() => setQv('mine')}>My paper ({p.qs.length})</button></div>
      {qv === 'add' ? <>
        <div className="acts qacts"><select aria-label="Auto-fill from" value={p.source} onChange={(e) => set({ source: e.target.value })}><option value="Bank">Auto-fill: Question bank</option><option value="AI">Auto-fill: AI</option><option value="Both">Auto-fill: Bank + AI</option></select>
          <button className="primary" disabled={busy} onClick={gen}>{busy ? 'Working…' : p.qs.length ? 'Refill' : 'Auto-fill'}</button>
          <button onClick={() => set({ qs: [...p.qs, ai()] })}>+ AI question</button></div>
        <QPick p={p} set={set} mk={mk} /></> : <>
        {!p.qs.length && <div className="card empty"><b>Nothing added yet</b><small>Tick questions under “Choose questions”, or use Auto-fill.</small><button onClick={() => setQv('add')}>Choose questions</button></div>}
        {p.qs.map((x, i) => <QRow key={x.uid} q={x} i={i} last={i === p.qs.length - 1} ch={(o) => chq(x.uid, o)} eq={() => setEqFor(x.uid)}
          mv={(d) => { const a = [...p.qs];[a[i], a[i + d]] = [a[i + d], a[i]]; set({ qs: a }) }}
          dup={() => { const a = [...p.qs]; a.splice(i + 1, 0, { ...x, uid: uid() }); set({ qs: a }) }}
          del={() => set({ qs: p.qs.filter((y) => y.uid !== x.uid) })}
          regen={() => { chq(x.uid, { text: AI_TXT[Math.floor(Math.random() * AI_TXT.length)], src: 'AI Generated', flag: true, ans: '' }); toast('Question regenerated (dummy AI)') }} />)}</>}
      {eqFor && <Eq onClose={() => setEqFor(null)} onApply={(s) => { const x = p.qs.find((y) => y.uid === eqFor); chq(eqFor, { text: x.text + ' ' + s }); setEqFor(null) }} />}</>,
    /* 5. Format */
    <>
      <div className="tabs"><button className={ft === 'b' ? 'on' : ''} onClick={() => setFt('b')}>Built-in templates</button><button className={ft === 'm' ? 'on' : ''} onClick={() => setFt('m')}>My uploaded formats</button></div>
      <div className="grid">{(ft === 'b' ? TEMPLATES : formats).map((t) => <button key={t.id} className={'card pick' + (p.tpl === t.id ? ' on' : '')} onClick={() => set({ tpl: t.id })}><Thumb s={t.id === 't2' ? 'c' : ''} />{t.name}<small>{t.school || t.cat}{t.kind ? ' · ' + t.kind.toUpperCase() + ' format' : ''}</small></button>)}</div>
      {ft === 'm' && !formats.length && <div className="card">No uploaded formats yet. Upload your school's DOCX or PDF in Templates & My Formats.</div>}</>,
    /* 6. Export: download first, preview below */
    <>
      <div className="card">
        <label className="chip"><input type="checkbox" checked={p.key} onChange={() => set({ key: !p.key })} />Include answer key</label>
        <div className="acts"><button className="primary" onClick={docx}>Download DOCX</button><button onClick={() => { window.print(); saveP('Completed'); setDone(true) }}>Download PDF (print)</button></div>
        {done && <div className="ok">Export generated successfully. Saved in My Papers.</div>}</div>
      <p><small>This is how the paper will print. Questions are grouped into sections by type. {(() => { const f = formats.find((x) => x.id === p.tpl); return f && f.kind === 'docx' ? 'The Word download is built inside your own school file (same letterhead, fonts, header and footer); this preview is a simplified view.' : 'The DOCX export follows the same layout.' })()} {total !== p.marks && <Badge c="warn">Questions add up to {total} of {p.marks} marks</Badge>}</small></p><Paper p={p} formats={formats} /></>
  ][step]
  return <section>
    <ol className="steps">{STEPS.map((t, i) => <li key={t}><button disabled={i > step && !valid} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)}>{i < step ? <Ic n="check" s={14} /> : i + 1} {t}</button></li>)}</ol>
    <div className="wz-prog"><b>Step {step + 1} of {STEPS.length}</b> · {STEPS[step]}<div className="bar"><div style={{ width: ((step + 1) / STEPS.length * 100) + '%' }} /></div></div>
    <div className="wz-h"><h2>{STEPS[step]}</h2><small>Step {step + 1} of {STEPS.length}</small></div>{V}
    <footer><button disabled={!step} onClick={() => setStep(step - 1)}>← Back</button><button className="ghost" onClick={() => saveP('Draft')}>Save draft</button>
      <button className="primary" disabled={!valid || step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Continue →</button></footer>
    {!valid && <p className="err">Please complete this step to continue.</p>}</section>
}

const Sel = ({ k, o, l, f, setF }) => <select aria-label={l} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{l}</option>{o.map((x) => <option key={x}>{x}</option>)}</select>

function QBank({ init, favs, tf, add, mine }) {
  const [mkq, setMkq] = useState(false), [s, setS] = useState(init || ''), [f, setF] = useState({}), [fv, setFv] = useState(false), [sel, setSel] = useState([]), [pv, setPv] = useState(null)
  const L = BANK.filter((q) => (!s || (q.text + q.ch + q.sub).toLowerCase().includes(s.toLowerCase())) && (!f.ty || q.type === f.ty) && (!f.df || q.diff === f.df) && (!f.mk || q.marks === +f.mk) && (!f.sb || q.sub === f.sb) && (!fv || favs.includes(q.id)))
  return <section><div className="pg-h"><h2>Question Bank</h2><small>{BANK.length} questions · {[...new Set(BANK.map((q) => q.board).filter(Boolean))].join(', ') || 'sample content'}{cloud.liveQuestions ? ' · live' : ''}</small></div>
    <div className="toolbar"><input type="search" placeholder="Search by question, chapter or subject" value={s} onChange={(e) => setS(e.target.value)} aria-label="Search" />
      <Sel f={f} setF={setF} k="sb" l="Subject" o={['Mathematics', 'Science', 'Physics', 'Chemistry']} /><Sel f={f} setF={setF} k="ty" l="Type" o={TYPES} /><Sel f={f} setF={setF} k="df" l="Difficulty" o={['Easy', 'Medium', 'Hard']} /><Sel f={f} setF={setF} k="mk" l="Marks" o={['1', '2', '3', '4']} />
      <label className="chip"><input type="checkbox" checked={fv} onChange={() => setFv(!fv)} />Favorites</label>
      <button className="primary" onClick={() => setMkq(true)}><Ic n="plus" s={16} /> New question</button><button disabled={!sel.length} onClick={() => { sel.forEach((id) => add(BANK.find((b) => b.id === id))); setSel([]) }}>Add selected ({sel.length})</button></div>
    {!L.length && <div className="card empty"><b>No questions match these filters</b><small>Clear a filter or search with fewer words.</small></div>}
    <div className="qlist">{L.map((q) => <div key={q.id} className="qrow"><div className="qt"><label><input type="checkbox" aria-label="Select" checked={sel.includes(q.id)} onChange={() => setSel(sel.includes(q.id) ? sel.filter((x) => x !== q.id) : [...sel, q.id])} /> <span><M t={q.text} /></span></label>
      <small>{q.sub} › {q.ch} · {q.type} · {q.diff} · {q.marks} {q.marks > 1 ? 'marks' : 'mark'}</small></div>
      <span className="acts"><button onClick={() => tf(q.id)} aria-label="Favorite"><Ic n="star" f={favs.includes(q.id)} /></button><button onClick={() => setPv(q)}>Preview</button><button onClick={() => add(q, true)}>Customize</button><button className="primary" onClick={() => add(q)}>Add to paper</button></span></div>)}</div>
    {mkq && <NewQuestion onClose={() => setMkq(false)} onSave={(q) => { mine(q); setMkq(false) }} />}
    {pv && <Modal title="Question preview" onClose={() => setPv(null)}><p><M t={pv.text} /></p>{pv.image ? <img className="qimg" src={imgUrl(pv.image)} alt={pv.imageAlt || 'Figure'} /> : pv.diagram && <Diagram />}<p>Answer: <M t={pv.ans} /></p></Modal>}</section>
}

function Tpls({ favT, tfT, formats, setFormats, use, toast, ask }) {
  const [q, setQ] = useState(''), [c, setC] = useState('All'), [pv, setPv] = useState(null), [up, setUp] = useState(null)
  const onFile = async (f) => {
    if (!f) return
    if (!/\.(docx|pdf)$/i.test(f.name)) return toast('Unsupported file. Please upload a DOCX or PDF (old .doc files: save as DOCX first).')
    setUp({ name: f.name, pct: 40 })
    try {
      const buf = await f.arrayBuffer(), isDocx = /\.docx$/i.test(f.name)
      const info = isDocx ? await readDocxTemplate(buf) : await readPdfLetterhead(buf, await loadPdfjs())
      if (!isDocx && !info.lines.length) throw new Error('This PDF has no readable text (it looks scanned). Upload the DOCX, or a PDF saved from Word.')
      const g = info.fields
      setUp({ name: f.name, pct: 100, done: true, buf, info, F: { school: g.school || '', title: g.title || '', cls: g.cls || '', subject: g.subject || '', duration: g.time || '', marks: g.marks || '' } })
    } catch (e) { setUp(null); toast(e.message || 'Could not read this file.') }
  }
  const saveFormat = async () => {
    const id = uid(), { info, F, buf, name } = up
    try {
      if (info.kind === 'docx') await putFile(id, buf)
      setFormats([{ id, name: name.replace(/\.\w+$/, ''), school: F.school, last: today(), kind: info.kind, fields: info.fields, lines: info.lines, logos: info.kind === 'pdf' ? info.logos : [], logoCount: info.kind === 'docx' ? info.logos : (info.logos || []).length }, ...formats]); setUp(null); toast('Format saved. Papers will now follow this layout.')
    } catch (e) { toast('Could not store the file on this device (storage full?).') }
  }
  const T = TEMPLATES.filter((t) => (c === 'All' || t.cat === c) && t.name.toLowerCase().includes(q.toLowerCase()))
  return <section><h2>Templates & My Formats</h2>
    <div className="card drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
      <p><b>Upload My Format</b> — drag and drop a DOCX or PDF here</p><label className="btn">Browse files<input hidden type="file" accept=".docx,.pdf" onChange={(e) => onFile(e.target.files[0])} /></label>
      {up && !up.done && <div className="bar"><div style={{ width: up.pct + '%' }} /></div>}
      {up && up.done && <div className="form"><p>Read <b>{up.name}</b>. {up.info.kind === 'docx' ? (up.info.hasMarker ? 'Found your {{questions}} marker: new questions go exactly there.' : up.info.questionsFound ? `The ${up.info.questionsFound} old sample lines after the letterhead will be replaced by the new questions.` : 'No sample questions found: new questions are added below your letterhead.') : 'The top of page 1 is used as the paper heading.'}</p>
        <p>School logo: {(info => (info.kind === 'docx' ? info.logos : (info.logos || []).length))(up.info) ? <Badge c="bk">Found, will be kept{up.info.kind === 'pdf' ? ' (' + up.info.logos.length + ')' : ''}</Badge> : <Badge c="warn">Not found in this file</Badge>} {up.info.kind === 'pdf' && up.info.logos.map((l, i) => <img key={i} src={l.src} alt="Logo" style={{ height: 36, verticalAlign: 'middle', marginLeft: 8 }} />)}</p>
        <p><small>These values are found automatically and are replaced for every new paper. Anything not found stays exactly as in your file.</small></p>
        {Object.entries({ school: 'School name', title: 'Exam title', cls: 'Class', subject: 'Subject', duration: 'Time', marks: 'Total marks' }).map(([k, l]) => <label key={k}>{l} <Badge c={up.F[k] ? 'bk' : 'warn'}>{up.F[k] ? 'Detected' : 'Not found'}</Badge>{k === 'school' ? <input value={up.F[k]} onChange={(e) => setUp({ ...up, F: { ...up.F, [k]: e.target.value } })} /> : <input readOnly value={up.F[k] || '—'} />}</label>)}
        <p><small>Tip: in Word you can type <b>{'{{exam}} {{class}} {{subject}} {{time}} {{marks}}'}</b> in your file and put <b>{'{{questions}}'}</b> on its own line where the questions should start.</small></p>
        <button className="primary" onClick={saveFormat}>Save format</button><button onClick={() => setUp(null)}>Cancel</button></div>}</div>
    <h3>My Formats</h3>{!formats.length && <div className="card">No formats yet. Upload one above.</div>}
    <div className="grid">{formats.map((f) => <div key={f.id} className="card"><Thumb /><b>{f.name}</b><small>{f.school} · {f.kind ? f.kind.toUpperCase() + ' format' : 'sample'} · last used {f.last}</small>
      <div className="acts"><button onClick={() => setPv(f)}>Details</button>
        <button onClick={() => { const nm = window.prompt('Rename format', f.name); if (nm) setFormats(formats.map((x) => (x.id === f.id ? { ...x, name: nm } : x))) }}>Rename</button>
        <button onClick={async () => { const id = uid(); try { if (f.kind === 'docx') { const b = await getFile(f.id); if (b) await putFile(id, b) } setFormats([...formats, { ...f, id, name: f.name + ' (copy)' }]) } catch (e) { toast('Could not copy this format') } }}>Duplicate</button>
        <button className="dng" onClick={() => ask('Delete this format?', () => { if (f.kind === 'docx') delFile(f.id).catch(() => {}); setFormats(formats.filter((x) => x.id !== f.id)) })}>Delete</button>
        <button className="primary" onClick={() => use(f.id)}>Use this format</button></div></div>)}</div>
    <h3>Built-in templates</h3><div className="row wrap"><input placeholder="Search templates…" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Category" value={c} onChange={(e) => setC(e.target.value)}>{CATS.map((x) => <option key={x}>{x}</option>)}</select></div>
    {c === 'My Uploaded Formats' ? <p>See “My Formats” above.</p> : <div className="grid">{T.map((t) => <div key={t.id} className="card"><Thumb s={t.id === 't2' ? 'c' : ''} /><b>{t.name}</b><small>{t.cat} · Built-in</small>
      <div className="acts"><button onClick={() => tfT(t.id)} aria-label="Favorite"><Ic n="star" f={favT.includes(t.id)} /></button><button onClick={() => setPv(t)}>Preview</button><button className="primary" onClick={() => use(t.id)}>Use template</button></div></div>)}</div>}
    {pv && <Modal title={pv.name} onClose={() => setPv(null)}>{pv.fields ? <div><p><b>{pv.fields.school || pv.school}</b></p>{pv.fields.title && <p>{pv.fields.title}</p>}<p><small>Class {pv.fields.cls || '—'} · {pv.fields.subject || '—'} · {pv.fields.time || '—'} · {pv.fields.marks || '—'} marks (values found in your file)</small></p>{pv.logos && pv.logos.length > 0 && <p>{pv.logos.map((l, i) => <img key={i} src={l.src} alt="Logo" style={{ height: 40, marginRight: 8 }} />)}</p>}{pv.kind === 'docx' && <p><small>Logo: {pv.logoCount ? 'kept from your file' : 'none found'}</small></p>}<p><small>{pv.kind === 'docx' ? 'Word papers are built inside your original file, so fonts, logo, header and footer stay identical.' : 'The heading of your PDF is reused for every paper.'}</small></p></div> : <><Thumb s="big" /><p>Preview (dummy thumbnail)</p></>}</Modal>}</section>
}

const stCls = (x) => (x === 'Completed' ? 'bk' : x === 'Draft' ? 'warn' : '')
function PapersTable({ rows, open, extra }) {
  return <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Paper</th><th>Board · Class · Subject</th><th>Last edited</th><th>Status</th><th><span className="sr">Actions</span></th></tr></thead><tbody>
    {rows.map((p) => <tr key={p.id}><td><span className="nm">{p.name}</span>{!!(p.chapters && p.chapters.length) && <small>{p.chapters.join(', ')}</small>}</td>
      <td data-l="Class">{p.board} · {p.std} · {p.subject}</td><td data-l="Edited">{fmtD(p.date)}</td><td><Badge c={stCls(p.status)}>{p.status}</Badge></td>
      <td className="ta"><button className={p.status === 'Draft' ? 'primary' : ''} onClick={() => open(p)}>{p.status === 'Draft' ? 'Resume' : 'Open'}</button>{extra && extra(p)}</td></tr>)}</tbody></table></div>
}

function Papers({ papers, setPapers, open, ask, toast }) {
  const [tab, setTab] = useState('All'), [q, setQ] = useState('')
  const L = papers.filter((p) => (tab === 'All' ? p.status !== 'Archived' : tab === 'Recent' ? p.date >= '2026-10-01' : p.status === tab.replace(/s$/, '')) && p.name.toLowerCase().includes(q.toLowerCase()))
  return <section><div className="pg-h"><h2>My Papers</h2></div>
    <div className="tabs" role="tablist">{['All', 'Recent', 'Drafts', 'Completed', 'Archived'].map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <div className="toolbar"><input type="search" placeholder="Search papers by name" aria-label="Search papers" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {!L.length ? <div className="card empty"><b>{q ? 'No papers match your search' : 'No papers in ' + tab.toLowerCase()}</b><small>{q ? 'Try a different name.' : 'Papers you create or save as draft will be listed here.'}</small></div>
      : <PapersTable rows={L} open={open} extra={(p) => <>
        <button onClick={() => setPapers([{ ...p, id: uid(), name: p.name + ' (copy)', status: 'Draft' }, ...papers])}>Duplicate</button>
        {p.status !== 'Archived' && <button onClick={() => setPapers(papers.map((x) => (x.id === p.id ? { ...x, status: 'Archived' } : x)))}>Archive</button>}
        <button className="dng" onClick={() => ask('Delete this paper permanently?', () => setPapers(papers.filter((x) => x.id !== p.id)))}>Delete</button></>} />}</section>
}

const PC = ({ x, open }) => <button className="card pick" onClick={() => open(x)}><Thumb /><b>{x.name}</b><small>{x.subject} · {x.std} · {x.date} · {x.status}</small></button>

function Subj() {
  useCloud()
  const [b0, setB] = useState(''), [s0, setS] = useState(''), [sb, setSb] = useState(null), [q, setQ] = useState('')
  const b = CUR[b0] ? b0 : Object.keys(CUR)[0] || '', s = (CUR[b] || {})[s0] ? s0 : Object.keys(CUR[b] || {})[0] || ''   // fall back if the saved choice no longer exists in the live syllabus
  const D = (CUR[b] || {})[s] || {}
  return <section><h2>Subjects & Chapters</h2><div className="row wrap">
    <select aria-label="Board" value={b} onChange={(e) => { setB(e.target.value); setS(Object.keys(CUR[e.target.value] || {})[0] || ''); setSb(null) }}>{Object.keys(CUR).map((x) => <option key={x}>{x}</option>)}</select>
    <select aria-label="Standard" value={s} onChange={(e) => { setS(e.target.value); setSb(null) }}>{Object.keys(CUR[b] || {}).map((x) => <option key={x}>{x}</option>)}</select>
    <input placeholder="Search chapters…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {!Object.keys(D).length && <div className="card">Content for {b} {s} is not configured yet{cloud.liveSyllabus ? '' : ' (demo)'}.</div>}
    <div className="grid">{Object.keys(D).map((x) => <button key={x} className={'card pick' + (sb === x ? ' on' : '')} onClick={() => setSb(x)}>{x}</button>)}</div>
    {sb && Object.keys(D[sb]).filter((c) => c.toLowerCase().includes(q.toLowerCase())).map((c) => <details key={c} className="card"><summary>{c} <small>{BANK.filter((x) => x.ch === c && inScope(x, b, s, sb)).length} questions</small></summary>{D[sb][c].map((t) => <div key={t} className="sub">• {t}</div>)}</details>)}</section>
}

const GuestCard = ({ title, sub, openAuth }) => <section><h2>{title}</h2>
  <div className="card empty"><span className="ci"><Ic n="user" s={22} /></span><b>You’re browsing as a guest</b><small>{sub}</small>
    <div className="acts c"><button className="primary" onClick={() => openAuth('login')}>Sign in</button><button onClick={() => openAuth('register')}>Create account</button></div></div></section>
const AUTH_HASH = { login: 'login', register: 'register', forgot: 'forgot-password' }
const GATE = { 'Generate Paper': 'Sign in or create a free account to create question papers.', Checkout: 'Sign in or create an account to subscribe to a plan.' }

const NAV = [
  ['Create', [['Dashboard', 'home'], ['Generate Paper', 'sparkles'], ['Question Bank', 'book'], ['Templates & My Formats', 'layout']]],
  ['Manage', [['My Papers', 'file'], ['Exam Planner', 'calendar'], ['Blueprints', 'target'], ['Insights', 'chart']]],
  ['Library', [['Subjects & Chapters', 'list'], ['Favorites', 'star']]],
  ['Account', [['Profile', 'user'], ['Plans & Payment', 'card'], ['Notifications', 'bell'], ['Settings', 'sliders'], ['Help & Support', 'help']]]
]
const TABS = [['Dashboard', 'home', 'Home'], ['Question Bank', 'book', 'Bank'], ['Generate Paper', 'sparkles', 'Create'], ['My Papers', 'file', 'Papers'], ['More', 'grid', 'More']]
const TABP = TABS.map((t) => t[0])
// Notifications is a drawer (not a route); every other nav item is a page with its own URL hash.
const PAGES = [...NAV.flatMap(([, items]) => items.map(([t]) => t)).filter((t) => t !== 'Notifications'), 'More', 'Checkout']
const slug = (t) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const BY_SLUG = Object.fromEntries(PAGES.map((t) => [slug(t), t]))
const fromHash = () => BY_SLUG[window.location.hash.replace(/^#\/?/, '')] || 'Dashboard'
const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d } catch { return d } }
function usePersist(k, d) {
  const [v, setV] = useState(() => read(k, d))
  useEffect(() => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }, [k, v])
  return [v, setV]
}

export default function App() {
  useCloud()   // re-render everything when the syllabus / questions are updated from the admin panel
  const [page, setPage] = useState(fromHash), [nd, setNd] = useState(false), [col, setCol] = useState(false), [step, setStep] = useState(0), [p, setP] = useState(blank)
  const [papers, setPapers] = usePersist('ep_papers', PAPERS0), [formats, setFormats] = usePersist('ep_formats', FORMATS0)
  const [favT, setFavT] = usePersist('ep_favT', ['t1', 't6']), [favQ, setFavQ] = usePersist('ep_favQ', [])
  const [exams, setExams] = usePersist('ep_exams', EXAMS0), [bps, setBps] = usePersist('ep_bps', BLUEPRINTS0), [notifs, setNotifs] = usePersist('ep_notifs', NOTIFS0)
  const [prefs, setPrefs] = usePersist('ep_prefs', { key: true, notif: true, medium: 'English' }), [theme, setTheme] = usePersist('ep_theme', 'system'), [seen, setSeen] = usePersist('ep_onb', false)
  const [custom, setCustom] = useState(() => { const c = read('ep_custom', []); c.forEach((q) => { if (!BANK.some((b) => b.id === q.id)) BANK.push(q) }); return c })
  const [authFor, setAuthFor] = useState(null), [splash, setSplash] = useState(true), [tm, setTm] = useState(''), [dlg, setDlg] = useState(null), [gq, setGq] = useState('')
  const [user, setUser] = useState(currentUser), [bill, setBill] = usePersist('ep_sub', { plan: 'free' }), [pays, setPays] = usePersist('ep_pays', []), [order, setOrder] = useState(null)

  const authRef = useRef(false), pendRef = useRef(null), afterRef = useRef(null), userRef = useRef(user)
  userRef.current = user

  // theme: follow the phone unless the teacher forces light/dark
  useEffect(() => {
    const r = document.documentElement, mq = window.matchMedia('(prefers-color-scheme: dark)')
    theme === 'system' ? r.removeAttribute('data-theme') : r.setAttribute('data-theme', theme)
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches), c = dark ? '#0B1020' : '#F5F6FA'
      const meta = document.querySelector('meta[name=theme-color]'); if (meta) meta.setAttribute('content', c)
      if (Capacitor.isNativePlatform()) { StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light }).catch(() => {}); StatusBar.setBackgroundColor({ color: c }).catch(() => {}) }
    }
    apply(); mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => { window.scrollTo({ top: 0 }) }, [page])
  useEffect(() => { if (!user && GATE[page]) go('Dashboard', true) }, [user, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const toast = (m) => { setTm(m); setTimeout(() => setTm(''), 2600) }
  const ask = (msg, ok) => setDlg({ msg, ok })
  // ---- navigation: one history entry per page visit, kept in sync with the URL hash ----
  const pageRef = useRef(page), ndRef = useRef(false)
  useEffect(() => {
    const st = history.state || {}
    history.scrollRestoration = 'manual'
    history.replaceState({ idx: st.idx || 0 }, '', '#/' + slug(pageRef.current)) // drop any stale drawer flag after a reload
    const onPop = () => {
      const s = history.state || {}
      if (s.auth && !authRef.current) { history.back(); return } // Forward onto a dead sign-in entry: skip it
      const pg = fromHash()
      pageRef.current = pg; ndRef.current = !!s.drawer
      setPage(pg); setNd(!!s.drawer)
      if (!s.auth) {
        if (authRef.current) { authRef.current = false; pendRef.current = null } // Back closes the sign-in screen
        setAuthFor(null)
        if (afterRef.current) { const f = afterRef.current; afterRef.current = null; setTimeout(f, 0) }
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const openNd = () => {
    if (ndRef.current) return
    const st = history.state || {}
    history.pushState({ ...st, idx: (st.idx || 0) + 1, drawer: true }, '', window.location.href)
    ndRef.current = true; setNd(true)
  }
  const closeNd = () => {
    if (!ndRef.current) return
    ndRef.current = false
    if ((history.state || {}).drawer) history.back() // popstate then closes it, so Back never leaves a dead entry
    else setNd(false)
  }
  const openAuth = (mode = 'login', then = null, reason = '') => {
    if (authRef.current) return
    const st = history.state || {}
    history.pushState({ idx: (st.idx || 0) + 1, auth: true }, '', '#/' + AUTH_HASH[mode])
    authRef.current = true; pendRef.current = then; setAuthFor({ mode, reason })
  }
  const closeAuth = (after) => {
    if (!authRef.current) return after && after()
    authRef.current = false; afterRef.current = after || null
    if ((history.state || {}).auth) history.back() // popstate closes it, so Back never leaves a dead entry
    else { setAuthFor(null); if (after) after() }
  }
  const go = (pg, replace = false) => {
    if (pg === 'Notifications') return openNd()
    if (!userRef.current && GATE[pg]) return openAuth('login', pg, GATE[pg]) // guests can look around; creating a paper or paying needs an account
    if (pg === pageRef.current) return // never stack duplicate entries for the same page
    const st = history.state || {}
    history[replace ? 'replaceState' : 'pushState']({ idx: (st.idx || 0) + (replace ? 0 : 1) }, '', '#/' + slug(pg))
    pageRef.current = pg; setPage(pg)
  }
  // in-app back arrows: return to the real previous page when there is one, else fall back
  const goBack = (fallback) => { const st = history.state || {}; if ((st.idx || 0) > 0 && !st.drawer) history.back(); else go(fallback, true) }
  const start = (o = {}, st = 0) => { setP({ ...blank, key: prefs.key, medium: prefs.medium, ...o }); setStep(st); go('Generate Paper') }
  const saveP = (status) => { const id = p.id || uid(), np = { ...p, id, status, date: today() }; setP(np); setPapers((ps) => [np, ...ps.filter((x) => x.id !== id)]); toast(status === 'Draft' ? 'Draft saved' : 'Saved to My Papers') }
  const openP = (x) => { setP({ ...blank, ...x }); setStep(3); go('Generate Paper') }
  const addQ = (q, c) => { setP((x) => ({ ...x, qs: [...x.qs, { ...q, uid: uid(), src: c ? 'Bank (customized)' : q.src || 'Question Bank' }] })); toast('Added to current paper') }
  const addCustom = (q) => { const x = { ...q, id: Date.now(), src: 'My Question' }; BANK.push(x); const c = [...custom, x]; setCustom(c); try { localStorage.setItem('ep_custom', JSON.stringify(c)) } catch { /* ignore */ } toast('Question saved to your bank') }
  const tf = (a, s, v) => s(a.includes(v) ? a.filter((x) => x !== v) : [...a, v])
  const useT = (id) => { setP({ ...p, tpl: id }); setStep(4); go('Generate Paper'); toast('Template selected') }
  const useBp = (b) => { const full = b.board && b.std && b.subject; start({ name: b.name, marks: b.rows.reduce((a, r) => a + r.n * r.m, 0), nq: b.rows.reduce((a, r) => a + r.n, 0), types: [...new Set(b.rows.map((r) => r.type))], board: b.board, std: b.std, subject: b.subject, diff: 'Mixed' }, full ? 1 : 0); toast('Blueprint applied') }
  const first = (user && user.name ? user.name.trim().split(/\s+/)[0] : '') || 'Teacher'
  const onAuthed = (u, kind) => {
    userRef.current = u; setUser(u); toast(kind === 'register' ? 'Welcome to EduPaper AI, ' + u.name.trim().split(/\s+/)[0] : 'Welcome back, ' + u.name.trim().split(/\s+/)[0])
    closeAuth(() => { const t = pendRef.current; pendRef.current = null; if (t) go(t) }) // carry on with what they were trying to do
  }
  const signOut = () => ask('Sign out of EduPaper AI?', () => {
    logout(); userRef.current = null; setUser(null); setNd(false); ndRef.current = false; setOrder(null); setP(blank); setStep(0)
    pageRef.current = 'Dashboard'; setPage('Dashboard')
    try { history.replaceState({ idx: (history.state || {}).idx || 0 }, '', '#/dashboard') } catch { /* ignore */ }
  })
  const sendTest = async () => {
    const t = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    setNotifs((l) => [{ id: 'n' + Date.now(), title: 'Test notification', body: 'If you can see this, notifications are working.', time: 'Today, ' + t, type: 'tip', read: false }, ...l])
    const r = await systemNotify('EduPaper AI', 'Test notification: notifications are working.')
    toast(r === 'sent' ? 'Test notification sent' : 'Test added to the bell')
    return r
  }
  const choose = (plan, cycle) => { setOrder({ plan, cycle }); go('Checkout') }
  const onPaid = (rec) => { // called once a payment succeeds; returns the new subscription for the receipt screen
    const ns = newSub(rec.plan, rec.cycle, startFor(bill, rec.plan))
    setBill(ns); setPays((x) => [rec, ...x]); setOrder(null); return ns
  }
  const plan = activePlan(bill)
  const drafts = papers.filter((x) => x.status === 'Draft'), unread = notifs.filter((x) => !x.read).length
  const upcoming = exams.filter((e) => e.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 3)
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'
  const flow = page === 'Generate Paper', sub = !TABP.includes(page)

  // first launch: splash -> onboarding -> the app itself (as a guest). Sign in is asked for only when creating a paper or paying.
  if (!user && !seen) return <>
    {splash && <Splash onDone={() => setSplash(false)} />}
    {!splash && <Onboarding onDone={() => setSeen(true)} />}
  </>

  return <div className={'app' + (flow ? ' flow' : '')}>
    {splash && <Splash onDone={() => setSplash(false)} />}
    <aside className={col ? 'col' : ''}>
      <div className="brand"><img className="lg full" src={logo} alt="EduPaper AI" /><img className="lg mk" src={mark} alt="EduPaper AI" /></div>
      {NAV.map(([g, items]) => <div key={g} className="ng"><small className="ng-l">{g}</small>
        {items.map(([t, ic]) => <button key={t} className={'nav' + (page === t || (t === 'Plans & Payment' && page === 'Checkout') ? ' on' : '')} onClick={() => go(t)} title={t} {...(t === 'Notifications' ? { 'aria-haspopup': 'dialog', 'aria-expanded': nd } : {})}><Ic n={ic} /><span>{t}</span>{t === 'Notifications' && unread > 0 && <em className="nb">{unread}</em>}</button>)}</div>)}
      <button className="nav collapse" onClick={() => setCol(!col)}><Ic n={col ? 'right' : 'back'} /><span>Collapse</span></button>
    </aside>
    <main>
      <header>
        {flow ? <button className="mob hbtn" onClick={() => goBack('Dashboard')} aria-label="Close"><Ic n="x" /></button>
          : sub ? <button className="mob hbtn" onClick={() => goBack(page === 'Checkout' ? 'Plans & Payment' : 'More')} aria-label="Back"><Ic n="back" /></button>
            : <img className="mob hlogo lg" src={mark} alt="" />}
        <b className="mob htitle">{flow ? 'New Paper' : page === 'Dashboard' ? 'EduPaper AI' : page}</b>
        <small className="desk crumb">Home / {page}</small>
        <input className="desk" placeholder="Search the question bank" aria-label="Search the question bank" value={gq} onChange={(e) => setGq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go('Question Bank')} />
        {!user && <button className="primary gst" onClick={() => openAuth('login')}>Sign in</button>}
        <button className="hbtn bell" aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')} aria-haspopup="dialog" aria-expanded={nd} onClick={() => (nd ? closeNd() : openNd())}><Ic n="bell" />{unread > 0 && <i key={unread} className="cnt" aria-hidden="true">{unread > 9 ? '9+' : unread}</i>}</button>
        <button className="hbtn desk" aria-label="Help" onClick={() => go('Help & Support')}><Ic n="help" /></button>
        {user && <button className="hbtn desk" aria-label="Profile" onClick={() => go('Profile')}><Ic n="user" /></button>}
        <button className="primary desk" onClick={() => start()}><Ic n="plus" /> New paper</button>
      </header>
      <div key={page} className="page">
        {page === 'Dashboard' && <section>
          <div className="pg-h"><div><h2>{greet}{user ? ', ' + first : ''}</h2><small>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</small></div></div>
          {!user && <div className="card guest-b"><span className="ci sm"><Ic n="user" /></span><div className="grow"><b>You’re browsing as a guest</b><small>Look around freely. You only need an account to create a paper.</small></div><div className="acts"><button className="primary" onClick={() => openAuth('login')}>Sign in</button><button onClick={() => openAuth('register')}>Create account</button></div></div>}
          <div className="sumline"><span><b>{papers.filter((x) => x.status !== 'Archived').length}</b>papers</span><span><b>{papers.filter((x) => x.status === 'Draft').length}</b>drafts</span><span><b>{exams.filter((e) => daysTo(e.date) >= 0).length}</b>upcoming exams</span><span><b>{formats.length}</b>school formats</span></div>
          <div className="dash"><div>
            <div className="sec-h"><h3>Drafts to finish</h3></div>
            {papers.some((x) => x.status === 'Draft') ? <PapersTable rows={papers.filter((x) => x.status === 'Draft').slice(0, 4)} open={openP} />
              : <div className="card empty"><b>No unfinished papers</b><small>Papers you save as draft will appear here.</small></div>}
            <div className="sec-h"><h3>Recent papers</h3><button className="ghost" onClick={() => go('My Papers')}>View all</button></div>
            {papers.some((x) => x.status !== 'Archived') ? <PapersTable rows={papers.filter((x) => x.status !== 'Archived').slice(0, 4)} open={openP} /> : <div className="card empty"><b>No papers yet</b><small>Create your first question paper to see it here.</small></div>}
          </div>
          <div className="dash-side">
            <div className="panel"><div className="sec-h"><h3>Upcoming exams</h3><button className="ghost" onClick={() => go('Exam Planner')}>Open planner</button></div>
              {exams.filter((e) => daysTo(e.date) >= 0).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3).map((e) => { const d = new Date(e.date + 'T00:00:00'); return <div className="rowl" key={e.id}>
                <div className={'dtc' + (daysTo(e.date) <= 2 ? ' soon' : '')}><b>{d.getDate()}</b><span>{d.toLocaleString('en', { month: 'short' })}</span></div>
                <span className="grow"><b>{e.title}</b><small>{e.subject} · {e.std}</small></span><span className="when">{when(e.date)}</span></div> })}
              {!exams.some((e) => daysTo(e.date) >= 0) && <p><small>No exams scheduled. Add one in the planner.</small></p>}</div>
            <div className="panel"><div className="sec-h"><h3>Shortcuts</h3></div>
              <button className="rowl" onClick={() => go('Question Bank')}><span className="grow"><b>Question Bank</b><small>Browse, filter and add your own questions</small></span><Ic n="right" s={16} /></button>
              <button className="rowl" onClick={() => go('Templates & My Formats')}><span className="grow"><b>School formats</b><small>Upload a DOCX or PDF to reuse your paper layout</small></span><Ic n="right" s={16} /></button>
              <button className="rowl" onClick={() => go('Blueprints')}><span className="grow"><b>Blueprints</b><small>Set chapter-wise marks distribution</small></span><Ic n="right" s={16} /></button></div>
          </div></div></section>}
        {page === 'Generate Paper' && <Wizard p={p} setP={setP} step={step} setStep={setStep} formats={formats} saveP={saveP} toast={toast} />}
        {page === 'Question Bank' && <QBank key={gq + custom.length} init={gq} favs={favQ} tf={(id) => tf(favQ, setFavQ, id)} add={addQ} mine={addCustom} />}
        {page === 'Templates & My Formats' && <Tpls favT={favT} tfT={(id) => tf(favT, setFavT, id)} formats={formats} setFormats={setFormats} use={useT} toast={toast} ask={ask} />}
        {page === 'My Papers' && <Papers papers={papers} setPapers={setPapers} open={openP} ask={ask} toast={toast} />}
        {page === 'Exam Planner' && <Planner exams={exams} setExams={setExams} papers={papers} openPaper={openP} ask={ask} toast={toast} />}
        {page === 'Blueprints' && <Blueprints bps={bps} setBps={setBps} use={useBp} ask={ask} toast={toast} />}
        {page === 'Insights' && <Insights papers={papers} />}
        {page === 'Subjects & Chapters' && <Subj />}
        {page === 'Favorites' && <Favorites favQ={favQ} tfQ={(id) => tf(favQ, setFavQ, id)} favT={favT} tfT={(id) => tf(favT, setFavT, id)} addQ={addQ} useT={useT} go={go} />}
        {page === 'Profile' && !user && <GuestCard title="Profile" sub="Sign in to manage your profile, plan and saved details." openAuth={openAuth} />}
        {page === 'Profile' && user && <ProfilePage key={user.id} user={user} setUser={setUser} plan={plan} go={go} ask={ask} signOut={signOut} toast={toast} />}
        {page === 'Plans & Payment' && <PlansPage sub={bill} setSub={setBill} pays={pays} choose={choose} ask={ask} toast={toast} />}
        {page === 'Checkout' && <CheckoutPage order={order} user={user} onPaid={onPaid} go={go} />}
        {page === 'Settings' && <SettingsPage theme={theme} setTheme={setTheme} prefs={prefs} setPrefs={setPrefs} toast={toast} sendTest={sendTest} />}
        {page === 'Help & Support' && <Help toast={toast} />}
        {page === 'More' && <More go={go} nav={NAV} skip={['Dashboard', 'Generate Paper', 'Question Bank', 'My Papers']} unread={unread} signOut={signOut} user={user} plan={plan} signIn={() => openAuth('login')} />}
      </div>
    </main>
    <nav className="tabbar" aria-label="Primary">{TABS.map(([pg, ic, l]) => <button key={pg} className={(pg === 'More' ? sub || page === 'More' : page === pg) ? 'on ' + (pg === 'Generate Paper' ? 'mid' : '') : pg === 'Generate Paper' ? 'mid' : ''} onClick={() => (pg === 'Generate Paper' ? start() : go(pg))} aria-label={l}><span className="ti"><Ic n={ic} s={pg === 'Generate Paper' ? 24 : 22} /></span><em>{l}</em></button>)}</nav>
    {authFor && <Auth key={authFor.mode} start={authFor.mode} reason={authFor.reason} onAuthed={onAuthed} onClose={() => closeAuth(() => { pendRef.current = null })} />}
    <NotifDrawer open={nd} onClose={closeNd} notifs={notifs} setNotifs={setNotifs} ask={ask} blocked={!!dlg} />
    {tm && <div className="toast" role="status">{tm}</div>}
    {dlg && <Modal title="Please confirm" onClose={() => setDlg(null)}><p>{dlg.msg}</p><div className="acts"><button onClick={() => setDlg(null)}>Cancel</button><button className="dng" onClick={() => { dlg.ok(); setDlg(null) }}>Yes, continue</button></div></Modal>}
  </div>
}
