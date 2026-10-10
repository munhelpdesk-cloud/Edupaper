import { useState } from 'react'
import katex from 'katex'
import 'katex/contrib/mhchem'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { CUR, BANK, TEMPLATES, CATS, MEDIA, TYPES, AI_TXT, FORMATS0, PAPERS0 } from './data.js'

const NAV = [['Dashboard', '🏠'], ['Generate Paper', '✨'], ['Question Bank', '📚'], ['Templates & My Formats', '🗂'], ['My Papers', '📄'], ['Subjects & Chapters', '📖'], ['Profile', '👤'], ['Settings', '⚙️']]
const STEPS = ['Board', 'Standard', 'Subject', 'Chapters', 'Details', 'Source', 'Questions', 'Format', 'Preview', 'Export']
const today = () => new Date().toISOString().slice(0, 10)
let n = 100
const uid = () => 'u' + ++n
const blank = { board: '', std: '', medium: 'English', subject: '', chapters: [], name: 'Unit Test 1', marks: 25, mins: 60, diff: 'Medium', nq: 8, types: ['MCQ', 'Short', 'Long'], neg: false, instr: 'All questions are compulsory.', source: 'Both', qs: [], tpl: 't1', key: true, id: null, status: 'Draft' }
const plain = (t = '') => t.replace(/\$/g, '').replace(/\\ce\{([^}]*)\}/g, '$1')

const M = ({ t }) => <span dangerouslySetInnerHTML={{ __html: String(t).replace(/\$(.+?)\$/g, (_, m) => katex.renderToString(m, { throwOnError: false })) }} />
const Diagram = () => <svg viewBox="0 0 200 80" width="200" role="img" aria-label="Dummy diagram"><rect x="1" y="1" width="198" height="78" rx="8" fill="#EEF0FF" stroke="#4F46E5" /><circle cx="60" cy="38" r="22" fill="none" stroke="#4F46E5" /><path d="M90 38h80M160 30l10 8-10 8" stroke="#7C3AED" fill="none" /><text x="100" y="74" fontSize="9" textAnchor="middle">Dummy diagram</text></svg>
const Thumb = ({ s = '' }) => <div className={'thumb ' + s}><b /><u /><u /><u /><u /></div>
const Modal = ({ title, onClose, children }) => <div className="ov" role="dialog" aria-label={title}><div className="card modal"><div className="row"><h3>{title}</h3><button onClick={onClose} aria-label="Close">✕</button></div>{children}</div></div>
const Badge = ({ c = '', children }) => <i className={'bd ' + c}>{children}</i>

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
      <span className="badges"><Badge>{q.type}</Badge><Badge>{q.diff}</Badge><Badge c={q.src === 'AI Generated' ? 'ai' : 'bk'}>{q.src === 'AI Generated' ? '✨ AI Generated' : '📚 ' + q.src}</Badge>{q.flag && <Badge c="warn">⚠ Needs review</Badge>}{!q.ans && <Badge c="warn">⚠ No answer</Badge>}</span>
      <label className="mk">Marks <input type="number" min="0" value={q.marks} onChange={(e) => ch({ marks: +e.target.value })} /></label></div>
    <textarea aria-label={'Question ' + (i + 1)} value={q.text} onChange={(e) => ch({ text: e.target.value })} />
    <div className="prev"><M t={q.text} /></div>
    {q.diagram && <Diagram />}
    {q.subs && q.subs.map((s, k) => <input key={k} aria-label="Subquestion" value={s} onChange={(e) => ch({ subs: q.subs.map((x, j) => (j === k ? e.target.value : x)) })} />)}
    {a && <div className="ans">Answer: <M t={q.ans || '— not available —'} /></div>}
    <div className="acts">
      <button disabled={!i} onClick={() => mv(-1)} aria-label="Move up">↑</button><button disabled={last} onClick={() => mv(1)} aria-label="Move down">↓</button>
      <button onClick={dup}>Duplicate</button><button onClick={regen}>✨ Regenerate</button><button onClick={eq}>∑ Equation</button>
      <button onClick={() => ch({ diagram: !q.diagram })}>🖼 Diagram</button><button onClick={() => ch({ subs: [...(q.subs || []), '(a) New subquestion'] })}>+ Sub</button>
      <button onClick={() => setA(!a)}>{a ? 'Hide' : 'Show'} answer</button><button className="dng" onClick={del}>Delete</button></div></div>
}

function Paper({ p, formats, key: k }) {
  const f = formats.find((x) => x.id === p.tpl), school = f ? f.school : 'Your School Name'
  const t = TEMPLATES.find((x) => x.id === p.tpl)
  const total = p.qs.reduce((a, q) => a + q.marks, 0)
  return <div className={'card paper ' + (t && t.id === 't2' ? 'compact' : '')}>
    <div className="ph"><div className="logo">LOGO</div><div><h2>{school}</h2><h3>{p.name}</h3></div></div>
    <div className="row"><span>{p.board} · {p.std} · {p.subject}</span><span>Time: {p.mins} min · Marks: {total}</span></div><hr />
    <p><i>Instructions: {p.instr}{p.neg ? ' Negative marking applies.' : ''}</i></p>
    {p.qs.map((q, i) => <div key={q.uid} className="pq"><span>{i + 1}. <M t={q.text} /></span><b>[{q.marks}]</b>
      {q.diagram && <div><Diagram /></div>}{q.subs && q.subs.map((s, j) => <div key={j} className="sub">{s}</div>)}</div>)}
    {p.key && <><hr /><h3>Answer Key</h3>{p.qs.map((q, i) => <div key={q.uid}>{i + 1}. <M t={q.ans || '—'} /></div>)}</>}
    <div className="foot">Page 1 of 1</div></div>
}

function Wizard({ p, setP, step, setStep, formats, saveP, toast }) {
  const [q, setQ] = useState(''), [eqFor, setEqFor] = useState(null), [ft, setFt] = useState('b'), [done, setDone] = useState(false)
  const set = (o) => setP({ ...p, ...o })
  const stds = p.board ? Object.keys(CUR[p.board]) : []
  const subs = p.std ? Object.keys(CUR[p.board][p.std]) : []
  const chs = p.subject ? CUR[p.board][p.std][p.subject] : {}
  const total = p.qs.reduce((a, x) => a + x.marks, 0)
  const pool = BANK.filter((x) => Object.keys(chs).includes(x.ch))
  const chq = (u, o) => set({ qs: p.qs.map((x) => (x.uid === u ? { ...x, ...o } : x)) })
  const ai = () => { const c = p.chapters[Math.floor(Math.random() * p.chapters.length)]; return { id: 0, uid: uid(), ch: c, type: 'Short', marks: 2, diff: p.diff, text: AI_TXT[Math.floor(Math.random() * AI_TXT.length)], ans: '', flag: true, src: 'AI Generated' } }
  const gen = () => {
    let out = []
    if (p.source !== 'AI') out = BANK.filter((x) => p.chapters.includes(x.ch)).slice(0, p.nq).map((x) => ({ ...x, uid: uid() }))
    const na = p.source === 'AI' ? p.nq : p.source === 'Both' ? 2 : 0
    for (let i = 0; i < na; i++) out.push(ai())
    set({ qs: out }); toast('Questions generated (dummy)')
  }
  const docx = async () => {
    const d = new Document({ sections: [{ children: [new Paragraph({ children: [new TextRun({ text: p.name, bold: true, size: 32 })] }), new Paragraph(`${p.board} | ${p.std} | ${p.subject} | ${p.mins} min | ${total} marks`),
      ...p.qs.map((x, i) => new Paragraph(`Q${i + 1}. ${plain(x.text)} [${x.marks}]`)),
      ...(p.key ? [new Paragraph({ children: [new TextRun({ text: 'Answer Key', bold: true })] }), ...p.qs.map((x, i) => new Paragraph(`${i + 1}. ${plain(x.ans)}`))] : [])] }] })
    const a = document.createElement('a'); a.href = URL.createObjectURL(await Packer.toBlob(d)); a.download = p.name + '.docx'; a.click()
    saveP('Completed'); setDone(true)
  }
  const valid = [p.board, p.std, p.subject, p.chapters.length, p.name && p.marks > 0, 1, p.qs.length, 1, 1, 1][step]
  const Pick = ({ items, v, f, sub }) => <div className="grid">{items.map((i) => <button key={i} className={'card pick' + (v === i ? ' on' : '')} onClick={() => f(i)}>{i}{sub && <small>{sub}</small>}</button>)}</div>
  const V = [
    <Pick items={Object.keys(CUR)} v={p.board} f={(b) => set({ board: b, std: '', subject: '', chapters: [], qs: [] })} sub="Demo content" />,
    stds.length ? <><Pick items={stds} v={p.std} f={(s) => set({ std: s, subject: '', chapters: [], qs: [] })} /><h4>Medium</h4><Pick items={MEDIA} v={p.medium} f={(m) => set({ medium: m })} /></> : <p>Select a board first.</p>,
    subs.length ? <Pick items={subs} v={p.subject} f={(s) => set({ subject: s, chapters: [], qs: [] })} /> : <div className="card">⚠ This class is not configured yet for {p.board} (demo). Choose another class.</div>,
    <>
      <div className="row"><input placeholder="Search chapters…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search chapters" />
        <button onClick={() => set({ chapters: p.chapters.length === Object.keys(chs).length ? [] : Object.keys(chs) })}>Select all</button></div>
      {Object.keys(chs).filter((c) => c.toLowerCase().includes(q.toLowerCase())).map((c) => <details key={c} className="card"><summary><label><input type="checkbox" checked={p.chapters.includes(c)} onChange={() => set({ chapters: p.chapters.includes(c) ? p.chapters.filter((x) => x !== c) : [...p.chapters, c] })} /> {c}</label><small> {BANK.filter((x) => x.ch === c).length} questions</small></summary>{chs[c].map((t) => <div key={t} className="sub">• {t}</div>)}</details>)}
      <p><b>{p.chapters.length}</b> selected: {p.chapters.join(', ') || '—'}</p></>,
    <div className="card form">
      <label>Examination name<input value={p.name} onChange={(e) => set({ name: e.target.value })} /></label>
      <div className="grid"><label>Total marks<input type="number" value={p.marks} onChange={(e) => set({ marks: +e.target.value })} /></label><label>Duration (min)<input type="number" value={p.mins} onChange={(e) => set({ mins: +e.target.value })} /></label>
        <label>No. of questions<input type="number" value={p.nq} onChange={(e) => set({ nq: +e.target.value })} /></label>
        <label>Difficulty<select value={p.diff} onChange={(e) => set({ diff: e.target.value })}>{['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => <option key={d}>{d}</option>)}</select></label></div>
      <h4>Question types</h4><div className="chips">{TYPES.map((t) => <label key={t} className="chip"><input type="checkbox" checked={p.types.includes(t)} onChange={() => set({ types: p.types.includes(t) ? p.types.filter((x) => x !== t) : [...p.types, t] })} />{t}</label>)}</div>
      <p>Chapter-wise split (auto): {p.chapters.map((c) => `${c} ≈ ${Math.round(p.marks / p.chapters.length)}m`).join(' · ')}</p>
      <label className="chip"><input type="checkbox" checked={p.neg} onChange={() => set({ neg: !p.neg })} />Negative marking</label>
      <label>Additional instructions<textarea value={p.instr} onChange={(e) => set({ instr: e.target.value })} /></label></div>,
    <div className="grid">{[['Bank', '📚 Existing Question Bank'], ['AI', '✨ AI-Generated Questions'], ['Both', '🔀 Both Bank and AI']].map(([k, l]) => <button key={k} className={'card pick' + (p.source === k ? ' on' : '')} onClick={() => set({ source: k })}>{l}</button>)}</div>,
    <>
      <div className="card sum"><b>{p.qs.length}</b> questions · <b>{total}</b> / {p.marks} marks {total !== p.marks && p.qs.length > 0 && <Badge c="warn">⚠ Marks differ from target</Badge>} · {[...new Set(p.qs.map((x) => x.ch))].map((c) => c + ': ' + p.qs.filter((x) => x.ch === c).length).join(' · ')}</div>
      <div className="acts"><button className="primary" onClick={gen}>{p.qs.length ? '↻ Regenerate all' : '✨ Generate questions'}</button>
        <button onClick={() => set({ qs: [...p.qs, ai()] })}>+ Add AI question</button>
        <select aria-label="Add from bank" value="" onChange={(e) => { const x = BANK.find((b) => b.id === +e.target.value); if (x) set({ qs: [...p.qs, { ...x, uid: uid() }] }) }}><option value="">+ Add from bank…</option>{pool.map((x) => <option key={x.id} value={x.id}>{plain(x.text).slice(0, 50)}</option>)}</select></div>
      {!p.qs.length && <div className="card">No questions yet. Click “Generate questions”.</div>}
      {p.qs.map((x, i) => <QRow key={x.uid} q={x} i={i} last={i === p.qs.length - 1} ch={(o) => chq(x.uid, o)} eq={() => setEqFor(x.uid)}
        mv={(d) => { const a = [...p.qs];[a[i], a[i + d]] = [a[i + d], a[i]]; set({ qs: a }) }}
        dup={() => { const a = [...p.qs]; a.splice(i + 1, 0, { ...x, uid: uid() }); set({ qs: a }) }}
        del={() => set({ qs: p.qs.filter((y) => y.uid !== x.uid) })}
        regen={() => { chq(x.uid, { text: AI_TXT[Math.floor(Math.random() * AI_TXT.length)], src: 'AI Generated', flag: true, ans: '' }); toast('Question regenerated (dummy AI)') }} />)}
      {eqFor && <Eq onClose={() => setEqFor(null)} onApply={(s) => { const x = p.qs.find((y) => y.uid === eqFor); chq(eqFor, { text: x.text + ' ' + s }); setEqFor(null) }} />}</>,
    <>
      <div className="tabs"><button className={ft === 'b' ? 'on' : ''} onClick={() => setFt('b')}>Built-in templates</button><button className={ft === 'm' ? 'on' : ''} onClick={() => setFt('m')}>My uploaded formats</button></div>
      <div className="grid">{(ft === 'b' ? TEMPLATES : formats).map((t) => <button key={t.id} className={'card pick' + (p.tpl === t.id ? ' on' : '')} onClick={() => set({ tpl: t.id })}><Thumb s={t.id === 't2' ? 'c' : ''} />{t.name}<small>{t.school || t.cat}</small></button>)}</div></>,
    <Paper p={p} formats={formats} />,
    <div className="card">
      <label className="chip"><input type="checkbox" checked={p.key} onChange={() => set({ key: !p.key })} />Include answer key</label>
      <div className="acts"><button className="primary" onClick={docx}>⬇ Download DOCX</button><button onClick={() => { window.print(); saveP('Completed'); setDone(true) }}>🖨 Download PDF (print)</button></div>
      {done && <div className="ok">✅ Export generated successfully. Saved in My Papers.</div>}</div>
  ][step]
  return <section>
    <ol className="steps">{STEPS.map((t, i) => <li key={t}><button disabled={i > step && !valid} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)}>{i < step ? '✓' : i + 1} {t}</button></li>)}</ol>
    <h2>{STEPS[step]}</h2>{V}
    <footer><button disabled={!step} onClick={() => setStep(step - 1)}>← Back</button><button onClick={() => saveP('Draft')}>💾 Save draft</button>
      <button className="primary" disabled={!valid || step === 9} onClick={() => setStep(step + 1)}>Continue →</button></footer>
    {!valid && <p className="err">⚠ Please complete this step to continue.</p>}</section>
}

function QBank({ init, favs, tf, add }) {
  const [s, setS] = useState(init || ''), [f, setF] = useState({}), [fv, setFv] = useState(false), [sel, setSel] = useState([]), [pv, setPv] = useState(null)
  const L = BANK.filter((q) => (!s || (q.text + q.ch + q.sub).toLowerCase().includes(s.toLowerCase())) && (!f.ty || q.type === f.ty) && (!f.df || q.diff === f.df) && (!f.mk || q.marks === +f.mk) && (!f.sb || q.sub === f.sb) && (!fv || favs.includes(q.id)))
  const Sel = ({ k, o, l }) => <select aria-label={l} value={f[k] || ''} onChange={(e) => setF({ ...f, [k]: e.target.value })}><option value="">{l}</option>{o.map((x) => <option key={x}>{x}</option>)}</select>
  return <section><h2>Question Bank <small>(dummy content)</small></h2>
    <div className="row wrap"><input placeholder="Search questions…" value={s} onChange={(e) => setS(e.target.value)} aria-label="Search" />
      <Sel k="sb" l="Subject" o={['Mathematics', 'Science', 'Physics', 'Chemistry']} /><Sel k="ty" l="Type" o={TYPES} /><Sel k="df" l="Difficulty" o={['Easy', 'Medium', 'Hard']} /><Sel k="mk" l="Marks" o={['1', '2', '3', '4']} />
      <label className="chip"><input type="checkbox" checked={fv} onChange={() => setFv(!fv)} />Favorites</label>
      <button disabled={!sel.length} onClick={() => { sel.forEach((id) => add(BANK.find((b) => b.id === id))); setSel([]) }}>Add selected ({sel.length})</button></div>
    {!L.length && <div className="card">No questions match. Try clearing filters.</div>}
    {L.map((q) => <div key={q.id} className="card"><div className="row wrap"><label><input type="checkbox" aria-label="Select" checked={sel.includes(q.id)} onChange={() => setSel(sel.includes(q.id) ? sel.filter((x) => x !== q.id) : [...sel, q.id])} /> <M t={q.text} /></label>
      <span className="acts"><button onClick={() => tf(q.id)} aria-label="Favorite">{favs.includes(q.id) ? '★' : '☆'}</button><button onClick={() => setPv(q)}>Preview</button><button onClick={() => add(q, true)}>Customize</button><button className="primary" onClick={() => add(q)}>Add to paper</button></span></div>
      <small>{q.sub} › {q.ch} · {q.type} · {q.diff} · {q.marks}m · 📚 Question Bank</small></div>)}
    {pv && <Modal title="Question preview" onClose={() => setPv(null)}><p><M t={pv.text} /></p>{pv.diagram && <Diagram />}<p>Answer: <M t={pv.ans} /></p></Modal>}</section>
}

function Tpls({ favT, tfT, formats, setFormats, use, toast, ask }) {
  const [q, setQ] = useState(''), [c, setC] = useState('All'), [pv, setPv] = useState(null), [up, setUp] = useState(null)
  const onFile = (f) => {
    if (!f) return
    if (!/\.(docx|pdf)$/i.test(f.name)) return toast('❌ Unsupported file. Please upload a DOCX or PDF.')
    setUp({ name: f.name, pct: 0 }); let v = 0
    const t = setInterval(() => { v += 25; setUp((u) => ({ ...u, pct: v })); if (v >= 100) { clearInterval(t); setUp((u) => ({ ...u, done: true, F: { school: 'Sunrise Public School', title: 'Annual Examination', year: '2026-27', duration: '3 Hours', marks: '80' } })) } }, 400)
  }
  const T = TEMPLATES.filter((t) => (c === 'All' || t.cat === c) && t.name.toLowerCase().includes(q.toLowerCase()))
  return <section><h2>Templates & My Formats</h2>
    <div className="card drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]) }}>
      <p><b>Upload My Format</b> — drag and drop a DOCX or PDF here</p><label className="btn">Browse files<input hidden type="file" accept=".docx,.pdf" onChange={(e) => onFile(e.target.files[0])} /></label>
      {up && !up.done && <div className="bar"><div style={{ width: up.pct + '%' }} /></div>}
      {up && up.done && <div className="form"><p>✅ Processed <b>{up.name}</b> (demo detection). <Badge c="warn">⚠ 1 unsupported element: watermark</Badge></p>
        {Object.entries({ school: 'School name', title: 'Exam title', year: 'Academic year', duration: 'Duration', marks: 'Total marks' }).map(([k, l]) => <label key={k}>{l} <Badge c={k === 'year' ? 'warn' : 'bk'}>{k === 'year' ? 'Please confirm' : 'Detected'}</Badge><input value={up.F[k]} onChange={(e) => setUp({ ...up, F: { ...up.F, [k]: e.target.value } })} /></label>)}
        <button className="primary" onClick={() => { setFormats([{ id: uid(), name: up.name.replace(/\.\w+$/, ''), school: up.F.school, last: today() }, ...formats]); setUp(null); toast('Format saved') }}>Save format</button></div>}</div>
    <h3>My Formats</h3>{!formats.length && <div className="card">No formats yet. Upload one above.</div>}
    <div className="grid">{formats.map((f) => <div key={f.id} className="card"><Thumb /><b>{f.name}</b><small>{f.school} · last used {f.last}</small>
      <div className="acts"><button onClick={() => setPv(f)}>Preview</button><button onClick={() => toast('Mapping editor (dummy)')}>Edit mapping</button>
        <button onClick={() => { const nm = window.prompt('Rename format', f.name); if (nm) setFormats(formats.map((x) => (x.id === f.id ? { ...x, name: nm } : x))) }}>Rename</button>
        <button onClick={() => setFormats([...formats, { ...f, id: uid(), name: f.name + ' (copy)' }])}>Duplicate</button>
        <button className="dng" onClick={() => ask('Delete this format?', () => setFormats(formats.filter((x) => x.id !== f.id)))}>Delete</button>
        <button className="primary" onClick={() => use(f.id)}>Use this format</button></div></div>)}</div>
    <h3>Built-in templates</h3><div className="row wrap"><input placeholder="Search templates…" aria-label="Search templates" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Category" value={c} onChange={(e) => setC(e.target.value)}>{CATS.map((x) => <option key={x}>{x}</option>)}</select></div>
    {c === 'My Uploaded Formats' ? <p>See “My Formats” above.</p> : <div className="grid">{T.map((t) => <div key={t.id} className="card"><Thumb s={t.id === 't2' ? 'c' : ''} /><b>{t.name}</b><small>{t.cat} · Built-in</small>
      <div className="acts"><button onClick={() => tfT(t.id)} aria-label="Favorite">{favT.includes(t.id) ? '★' : '☆'}</button><button onClick={() => setPv(t)}>Preview</button><button className="primary" onClick={() => use(t.id)}>Use template</button></div></div>)}</div>}
    {pv && <Modal title={pv.name} onClose={() => setPv(null)}><Thumb s="big" /><p>Preview (dummy thumbnail)</p></Modal>}</section>
}

function Papers({ papers, setPapers, open, ask, toast }) {
  const [tab, setTab] = useState('All'), [q, setQ] = useState('')
  const L = papers.filter((p) => (tab === 'All' ? p.status !== 'Archived' : tab === 'Recent' ? p.date >= '2026-10-01' : p.status === tab.replace(/s$/, '')) && p.name.toLowerCase().includes(q.toLowerCase()))
  return <section><h2>My Papers</h2>
    <div className="tabs">{['All', 'Recent', 'Drafts', 'Completed', 'Archived'].map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
    <input placeholder="Search papers…" aria-label="Search papers" value={q} onChange={(e) => setQ(e.target.value)} />
    {!L.length && <div className="card">📄 No papers here yet.</div>}
    <div className="grid">{L.map((p) => <div key={p.id} className="card"><Thumb /><b>{p.name}</b><small>{p.subject} · {p.std} · {p.date}</small><Badge c={p.status === 'Draft' ? 'warn' : 'bk'}>{p.status}</Badge>
      <div className="acts"><button className="primary" onClick={() => open(p)}>{p.status === 'Draft' ? 'Resume' : 'Open'}</button>
        <button onClick={() => setPapers([{ ...p, id: uid(), name: p.name + ' (copy)', status: 'Draft' }, ...papers])}>Duplicate</button><button onClick={() => toast('Download started (dummy)')}>Download</button>
        <button onClick={() => setPapers(papers.map((x) => (x.id === p.id ? { ...x, status: 'Archived' } : x)))}>Archive</button>
        <button className="dng" onClick={() => ask('Delete this paper permanently?', () => setPapers(papers.filter((x) => x.id !== p.id)))}>Delete</button></div></div>)}</div></section>
}

function Subj() {
  const [b, setB] = useState('GSEB'), [s, setS] = useState('Std 10'), [sb, setSb] = useState(null), [q, setQ] = useState('')
  const D = (CUR[b] || {})[s] || {}
  return <section><h2>Subjects & Chapters</h2><div className="row wrap">
    <select aria-label="Board" value={b} onChange={(e) => { setB(e.target.value); setS(Object.keys(CUR[e.target.value])[0]); setSb(null) }}>{Object.keys(CUR).map((x) => <option key={x}>{x}</option>)}</select>
    <select aria-label="Standard" value={s} onChange={(e) => { setS(e.target.value); setSb(null) }}>{Object.keys(CUR[b]).map((x) => <option key={x}>{x}</option>)}</select>
    <input placeholder="Search chapters…" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {!Object.keys(D).length && <div className="card">⚠ Content for {b} {s} is not configured yet (demo).</div>}
    <div className="grid">{Object.keys(D).map((x) => <button key={x} className={'card pick' + (sb === x ? ' on' : '')} onClick={() => setSb(x)}>{x}</button>)}</div>
    {sb && Object.keys(D[sb]).filter((c) => c.toLowerCase().includes(q.toLowerCase())).map((c) => <details key={c} className="card"><summary>{c} <small>{BANK.filter((x) => x.ch === c).length} questions</small></summary>{D[sb][c].map((t) => <div key={t} className="sub">• {t}</div>)}</details>)}</section>
}

function Form({ title, fields, toast }) {
  return <section><h2>{title}</h2><div className="card form">{fields.map(([l, v, t]) => <label key={l} className={t === 'cb' ? 'chip' : ''}>{t === 'cb' ? <><input type="checkbox" defaultChecked={v} />{l}</> : <>{l}<input defaultValue={v} /></>}</label>)}
    <button className="primary" onClick={() => toast('✅ Saved')}>Save changes</button></div></section>
}

export default function App() {
  const [page, setPage] = useState('Dashboard'), [nav, setNav] = useState(false), [col, setCol] = useState(false), [step, setStep] = useState(0), [p, setP] = useState(blank)
  const [papers, setPapers] = useState(PAPERS0), [formats, setFormats] = useState(FORMATS0), [favT, setFavT] = useState(['t1', 't6']), [favQ, setFavQ] = useState([])
  const [tm, setTm] = useState(''), [dlg, setDlg] = useState(null), [info, setInfo] = useState(null), [gq, setGq] = useState('')
  const toast = (m) => { setTm(m); setTimeout(() => setTm(''), 2600) }
  const ask = (msg, ok) => setDlg({ msg, ok })
  const go = (pg) => { setPage(pg); setNav(false) }
  const start = (o = {}) => { setP({ ...blank, ...o }); setStep(0); go('Generate Paper') }
  const saveP = (status) => { const id = p.id || uid(), np = { ...p, id, status, date: today() }; setP(np); setPapers((ps) => [np, ...ps.filter((x) => x.id !== id)]); toast(status === 'Draft' ? '💾 Draft saved' : '✅ Saved to My Papers') }
  const openP = (x) => { setP({ ...blank, ...x }); setStep(6); go('Generate Paper') }
  const addQ = (q, c) => { setP((x) => ({ ...x, qs: [...x.qs, { ...q, uid: uid(), src: c ? 'Bank (customized)' : 'Question Bank' }] })); toast('Added to current paper') }
  const tf = (a, s, v) => s(a.includes(v) ? a.filter((x) => x !== v) : [...a, v])
  const useT = (id) => { setP({ ...p, tpl: id }); setStep(7); go('Generate Paper'); toast('Template selected') }
  const drafts = papers.filter((x) => x.status === 'Draft')
  const PC = ({ x }) => <button className="card pick" onClick={() => openP(x)}><Thumb /><b>{x.name}</b><small>{x.subject} · {x.std} · {x.date} · {x.status}</small></button>

  return <div className="app">
    <aside className={(nav ? 'open ' : '') + (col ? 'col' : '')}><h1>{col ? 'E' : 'EduPaper AI'}</h1>
      {NAV.map(([t, ic]) => <button key={t} className={'nav' + (page === t ? ' on' : '')} onClick={() => go(t)} title={t}>{ic} {!col && t}</button>)}
      <button className="nav" onClick={() => setCol(!col)}>{col ? '»' : '« Collapse'}</button></aside>
    <main>
      <header><button className="menu" onClick={() => setNav(!nav)} aria-label="Menu">☰</button><small className="crumb">Home / {page}</small>
        <input placeholder="Search questions…" aria-label="Global search" value={gq} onChange={(e) => setGq(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go('Question Bank')} />
        <button aria-label="Notifications" onClick={() => setInfo('n')}>🔔</button><button aria-label="Help" onClick={() => setInfo('h')}>❓</button><button aria-label="Profile" onClick={() => go('Profile')}>🧑‍🏫</button>
        <button className="primary" onClick={() => start()}>+ Create Paper</button></header>
      {page === 'Dashboard' && <section><h2>Good morning! Ready to create your next question paper?</h2><p>Pick a board, choose chapters and export a print-ready paper in minutes.</p>
        <button className="primary big" onClick={() => start()}>Generate New Paper</button>
        <div className="grid sp"><button className="card pick" onClick={() => start()}>✨ Generate New Paper<small>AI + question bank</small></button><button className="card pick" onClick={() => go('Templates & My Formats')}>⬆ Upload My Format<small>Reuse your school format</small></button>
          <button className="card pick" onClick={() => start({ board: 'GSEB', std: 'Std 10', subject: 'Mathematics' })}>∑ Create Maths & Science Paper<small>Equations, formulas, diagrams</small></button></div>
        <div className="grid sp">{[['Total papers', papers.length], ['Saved drafts', drafts.length], ['Recent papers', papers.filter((x) => x.date >= '2026-10-01').length], ['Favorite templates', favT.length]].map(([l, v]) => <div key={l} className="card stat"><b>{v}</b><small>{l}</small></div>)}</div>
        <h3>Continue working</h3>{drafts.length ? <div className="grid">{drafts.map((x) => <PC key={x.id} x={x} />)}</div> : <div className="card">No drafts. Start a new paper!</div>}
        <h3>Recent papers</h3><div className="grid">{papers.slice(0, 3).map((x) => <PC key={x.id} x={x} />)}</div>
        <h3>My formats</h3><div className="grid">{formats.map((f) => <button key={f.id} className="card pick" onClick={() => useT(f.id)}><Thumb /><b>{f.name}</b><small>{f.school}</small></button>)}</div>
        <h3>Favorite templates</h3><div className="grid">{TEMPLATES.filter((t) => favT.includes(t.id)).map((t) => <div key={t.id} className="card"><Thumb /><b>{t.name}</b></div>)}</div>
        <div className="grid"><div className="card"><h3>Recent activity</h3><ul><li>Today — Edited “Unit Test 1 - Maths”</li><li>Oct 5 — Exported “Mid-term Science”</li><li>Oct 2 — Used format “DPS Annual Exam”</li></ul></div>
          <div className="card"><h3>Getting started</h3><ol><li>Pick board, class, subject</li><li>Select chapters</li><li>Generate and edit questions</li><li>Choose format and export</li></ol></div></div></section>}
      {page === 'Generate Paper' && <Wizard p={p} setP={setP} step={step} setStep={setStep} formats={formats} saveP={saveP} toast={toast} />}
      {page === 'Question Bank' && <QBank key={gq} init={gq} favs={favQ} tf={(id) => tf(favQ, setFavQ, id)} add={addQ} />}
      {page === 'Templates & My Formats' && <Tpls favT={favT} tfT={(id) => tf(favT, setFavT, id)} formats={formats} setFormats={setFormats} use={useT} toast={toast} ask={ask} />}
      {page === 'My Papers' && <Papers papers={papers} setPapers={setPapers} open={openP} ask={ask} toast={toast} />}
      {page === 'Subjects & Chapters' && <Subj />}
      {page === 'Profile' && <Form title="Profile" toast={toast} fields={[['Name', 'Teacher Name'], ['Email', 'teacher@school.in'], ['School / institute', 'Demo Public School'], ['Default board', 'GSEB'], ['Default standard', 'Std 10'], ['Preferred language', 'English']]} />}
      {page === 'Settings' && <Form title="Settings" toast={toast} fields={[['Default paper format', 'Classic School Exam'], ['Default question language', 'English'], ['Include answer key by default', true, 'cb'], ['Email notifications', true, 'cb'], ['Export as DOCX by default', false, 'cb']]} />}
    </main>
    {tm && <div className="toast" role="status">{tm}</div>}
    {dlg && <Modal title="Please confirm" onClose={() => setDlg(null)}><p>{dlg.msg}</p><div className="acts"><button onClick={() => setDlg(null)}>Cancel</button><button className="dng" onClick={() => { dlg.ok(); setDlg(null) }}>Yes, continue</button></div></Modal>}
    {info && <Modal title={info === 'n' ? 'Notifications' : 'Help & support'} onClose={() => setInfo(null)}>{info === 'n' ? <ul><li>Your draft “Unit Test 1 - Maths” is waiting.</li><li>New demo templates added.</li></ul> : <p>This is a dummy prototype. Contact support@edupaper.example (placeholder).</p>}</Modal>}
  </div>
}
