import { useState, useEffect } from 'react'
import { CUR, BANK } from './data.js'
import { Ic, M, Modal, Diagram, Badge } from './ui.jsx'
import { NewQuestion } from './pages.jsx'

// One question per row, one level per screen: Class > Subject > Chapter > Questions.
const num = (s) => +String(s).replace(/\D/g, '') || 0
export const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's')
export const classesOf = () => Object.entries(CUR).map(([b, o]) => [b, Object.keys(o).sort((x, y) => num(x) - num(y))])
export const subjectsOf = (b, s) => Object.keys((CUR[b] || {})[s] || {})
export const chaptersOf = (b, s, sub) => {
  const own = Object.keys((((CUR[b] || {})[s] || {})[sub]) || {})
  return [...new Set([...own, ...BANK.filter((q) => q.sub === sub && q.src === 'My Question' && own.length).map((q) => q.ch)])]
}
export const qCount = (sub, ch) => BANK.filter((q) => (!sub || q.sub === sub) && (!ch || q.ch === ch)).length

export const toneOf = (s) => ({ Mathematics: 3, Science: 2, Physics: 0, Chemistry: 1 }[s] ?? 4)
export const subjIcon = (s) => ({ Mathematics: 'sigma', Science: 'flask', Physics: 'zap', Chemistry: 'flask' }[s] || 'book')
export const Tile = ({ title, sub, on, off, multi, onClick, ic, tone = 0, txt }) => <button type="button" disabled={off} aria-pressed={on === undefined ? undefined : !!on} className={'tile' + (on ? ' on' : '')} onClick={onClick}>
  {(ic || txt) && <span className={'ti2 t' + tone}>{txt || <Ic n={ic} s={20} />}</span>}
  {multi && <span className="bx" aria-hidden="true">{on && <Ic n="check" s={14} />}</span>}
  <span className="tl"><b>{title}</b>{sub && <small>{sub}</small>}</span>{!multi && <Ic n={on ? 'check' : 'right'} s={18} />}</button>

// Step 1: choose the board. Step 2 (ClassPicker): choose a class of that board.
export const BoardPicker = ({ board, pick }) => <div className="tiles">{Object.keys(CUR).map((b, bi) => { const cl = Object.keys(CUR[b] || {}), n = cl.filter((s) => subjectsOf(b, s).length).length
  return <Tile key={b} ic="book" tone={bi} title={b} sub={cl.length ? plural(cl.length, 'class') + (n < cl.length ? ' · some have no subjects yet' : '') : 'No classes yet'} on={board === b} onClick={() => pick(b)} /> })}</div>
export const ClassPicker = ({ board, std, pick }) => { const list = Object.keys((CUR || {})[board] || {}).sort((x, y) => num(x) - num(y))
  if (!list.length) return <div className="card empty"><b>No classes in {board} yet</b><small>Add classes in the admin panel (Classes & Syllabus). They appear here automatically.</small></div>
  return <div className="tiles">{list.map((s, i) => { const n = subjectsOf(board, s).length; return <Tile key={board + s} txt={String(num(s))} tone={i % 5} title={s} sub={n ? plural(n, 'subject') : 'No subjects yet'} on={std === s} onClick={() => pick(board, s)} /> })}</div> }

export const QCard = ({ q, children }) => <div className="qc"><div className="qt"><span className="qx"><M t={q.text} /></span>{q.diagram && <Diagram />}
  <span className="mt"><Badge>{q.type}</Badge><Badge>{q.diff}</Badge><span>{plural(q.marks, 'mark')}</span></span></div><div className="qa">{children}</div></div>

export function QBank({ init, favs, tf, add, mine, inner }) {
  const [s, setS] = useState(init || ''), [sel, setSel] = useState({}), [ty, setTy] = useState(''), [mk, setMk] = useState(false), [pv, setPv] = useState(null)
  const { board, std, sub, ch } = sel, term = s.trim().toLowerCase()
  const lvl = !board ? 0 : !std ? 1 : !sub ? 2 : !ch ? 3 : 4
  const nav = (o) => { setSel(o); setTy('') }
  const back = () => nav(lvl === 4 ? { board, std, sub } : lvl === 3 ? { board, std } : lvl === 2 ? { board } : {})
  useEffect(() => { // lets the phone Back button step up one level here instead of leaving the page
    if (!inner) return
    inner.current = pv ? () => setPv(null) : mk ? () => setMk(false) : term ? () => setS('') : lvl > 0 ? back : null
    return () => { inner.current = null }
  })
  const all = term ? BANK.filter((q) => (q.text + q.ch + q.sub).toLowerCase().includes(term)) : lvl === 4 ? BANK.filter((q) => q.sub === sub && q.ch === ch) : []
  const types = [...new Set(all.map((q) => q.type))], L = all.filter((q) => !ty || q.type === ty)
  const rows = (list) => <div className="qlist">{list.map((q) => <QCard key={q.id} q={q}>
    <button onClick={() => tf(q.id)} aria-label={favs.includes(q.id) ? 'Remove from favorites' : 'Add to favorites'}><Ic n="star" f={favs.includes(q.id)} /></button>
    <button onClick={() => setPv(q)}>Preview</button><button onClick={() => add(q, true)}>Customize</button><button className="primary" onClick={() => add(q)}>Add to paper</button></QCard>)}</div>
  return <section><div className="pg-h"><div><h2>Question Bank</h2><small>{plural(BANK.length, 'question')} · GSEB and CBSE</small></div>
    <button className="primary" onClick={() => setMk(true)}><Ic n="plus" s={16} /> New question</button></div>
    <input type="search" className="bsearch" placeholder="Search all questions" aria-label="Search all questions" value={s} onChange={(e) => setS(e.target.value)} />
    {term ? <><h3 className="h0">{plural(all.length, 'result')}</h3>{all.length ? rows(all) : <div className="card empty"><b>No questions match</b><small>Try fewer words, or clear the search to browse by board.</small></div>}</>
      : <>
        {lvl > 0 && <div className="nav2"><button className="bk" onClick={back} aria-label="Back"><Ic n="back" s={18} /></button><span>{[board, std, sub, ch].filter(Boolean).join(' › ')}</span></div>}
        {lvl === 0 && <><h3 className="h0">Choose a board</h3><BoardPicker pick={(b) => nav({ board: b })} /></>}
        {lvl === 1 && <><h3 className="h0">Choose a class</h3><ClassPicker board={board} pick={(b, c) => nav({ board: b, std: c })} /></>}
        {lvl === 2 && <><h3 className="h0">Choose a subject</h3>{!subjectsOf(board, std).length && <div className="card empty"><b>No subjects in {std} yet</b><small>Add subjects in the admin panel (Classes & Syllabus).</small></div>}<div className="tiles">{subjectsOf(board, std).map((x) => <Tile key={x} ic={subjIcon(x)} tone={toneOf(x)} title={x} sub={plural(chaptersOf(board, std, x).length, 'chapter') + ' · ' + plural(qCount(x), 'question')} onClick={() => nav({ board, std, sub: x })} />)}</div></>}
        {lvl === 3 && <><h3 className="h0">Choose a chapter</h3><div className="tiles">{chaptersOf(board, std, sub).map((x, i) => <Tile key={x} txt={String(i + 1)} tone={2} title={x} sub={plural(qCount(sub, x), 'question')} onClick={() => nav({ board, std, sub, ch: x })} />)}</div></>}
        {lvl === 4 && <><h3 className="h0">{ch}</h3>
          {types.length > 1 && <div className="chips fl">{['', ...types].map((t) => <button key={t || 'all'} type="button" className={'chip' + (ty === t ? ' on' : '')} onClick={() => setTy(t)}>{t || 'All types'}</button>)}</div>}
          {L.length ? rows(L) : <div className="card empty"><b>No questions in this chapter yet</b><small>Use New question to add your own.</small></div>}</>}
      </>}
    {mk && <NewQuestion onClose={() => setMk(false)} onSave={(q) => { mine(q); setMk(false) }} />}
    {pv && <Modal title="Question preview" onClose={() => setPv(null)}><p><M t={pv.text} /></p>{pv.diagram && <Diagram />}<p>Answer: <M t={pv.ans} /></p></Modal>}</section>
}
