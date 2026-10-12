import { useEffect, useRef, useState } from 'react'
import { Ic } from './ui.jsx'

const ICONS = { draft: 'file', exam: 'calendar', template: 'layout', tip: 'sparkles' }
// notifications saved before `type` existed fall back to a keyword match
const iconFor = (n) => ICONS[n.type] || (/exam|schedul/i.test(n.title) ? 'calendar' : /draft/i.test(n.title) ? 'file' : /template/i.test(n.title) ? 'layout' : /tip|review/i.test(n.title) ? 'sparkles' : 'bell')
const FOCUSABLE = 'button:not(:disabled),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'

export default function NotifDrawer({ open, onClose, notifs, setNotifs, ask, blocked }) {
  const [shown, setShown] = useState(open), [tab, setTab] = useState('all'), [gone, setGone] = useState([])
  const panel = useRef(null), opener = useRef(null), t0 = useRef(null)
  const unread = notifs.filter((n) => !n.read).length
  const list = notifs.filter((n) => tab === 'all' || !n.read)

  // keep the panel mounted while it slides out
  useEffect(() => {
    if (open) { setShown(true); return }
    const t = setTimeout(() => setShown(false), 300)
    return () => clearTimeout(t)
  }, [open])

  // scroll lock (without layout shift), initial focus, focus restore
  useEffect(() => {
    if (!open) return
    opener.current = document.activeElement
    const b = document.body, sw = window.innerWidth - document.documentElement.clientWidth, prev = [b.style.overflow, b.style.paddingRight]
    b.style.overflow = 'hidden'; if (sw > 0) b.style.paddingRight = sw + 'px'
    const f = requestAnimationFrame(() => panel.current && panel.current.querySelector('[data-autofocus]') && panel.current.querySelector('[data-autofocus]').focus({ preventScroll: true }))
    return () => { cancelAnimationFrame(f); b.style.overflow = prev[0]; b.style.paddingRight = prev[1]; if (opener.current && opener.current.focus) opener.current.focus({ preventScroll: true }) }
  }, [open])

  // Escape to close + Tab focus trap (ignored while the confirm dialog is on top)
  useEffect(() => {
    if (!open) return
    const k = (e) => {
      if (blocked || !panel.current) return
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key !== 'Tab') return
      const f = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!f.length) return
      const first = f[0], last = f[f.length - 1], a = document.activeElement
      if (!panel.current.contains(a)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && a === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, blocked, onClose])

  if (!open && !shown) return null

  const mark = (id) => setNotifs((l) => l.map((x) => (x.id === id && !x.read ? { ...x, read: true } : x)))
  const markAll = () => setNotifs((l) => l.map((x) => (x.read ? x : { ...x, read: true })))
  const del = (id) => {
    setGone((g) => [...g, id])
    setTimeout(() => { setNotifs((l) => l.filter((x) => x.id !== id)); setGone((g) => g.filter((x) => x !== id)) }, 220)
  }
  const swipe = (e) => {
    if (!t0.current) return
    const t = e.changedTouches[0], dx = t.clientX - t0.current[0], dy = Math.abs(t.clientY - t0.current[1])
    t0.current = null
    if (dx > 90 && dx > dy * 1.6) onClose()
  }

  return <div className={'nd' + (open ? '' : ' out')}>
    <div className="nd-scrim" onClick={onClose} />
    <div ref={panel} className="nd-panel" role="dialog" aria-modal="true" aria-labelledby="nd-title"
      onTouchStart={(e) => { const t = e.touches[0]; t0.current = [t.clientX, t.clientY] }} onTouchEnd={swipe}>
      <div className="nd-head">
        <h3 id="nd-title">Notifications</h3>
        {unread > 0 && <span className="nd-pill" key={unread}>{unread} new</span>}
        <button className="hbtn nd-x" onClick={onClose} aria-label="Close notifications" data-autofocus><Ic n="x" /></button>
      </div>
      <div className="nd-bar">
        <div className="seg" role="tablist" aria-label="Filter">
          <button role="tab" aria-selected={tab === 'all'} className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>All</button>
          <button role="tab" aria-selected={tab === 'unread'} className={tab === 'unread' ? 'on' : ''} onClick={() => setTab('unread')}>Unread{unread > 0 ? ' (' + unread + ')' : ''}</button>
        </div>
        <div className="nd-tools">
          <button className="ghost" disabled={!unread} onClick={markAll}><Ic n="check" s={15} /> Mark all read</button>
          <button className="ghost dng" disabled={!notifs.length} onClick={() => ask('Clear all notifications?', () => setNotifs([]))}><Ic n="trash" s={15} /> Clear all</button>
        </div>
      </div>
      {list.length ? <ul className="nd-list">{list.map((n, i) => <li key={n.id} style={{ '--i': Math.min(i, 8) }} className={'nd-item' + (n.read ? '' : ' unread') + (gone.includes(n.id) ? ' leaving' : '')}>
        <button className="nd-main" onClick={() => mark(n.id)} aria-label={(n.read ? '' : 'Unread. ') + n.title + '. ' + n.body + ' ' + n.time}>
          <span className="nd-ic"><Ic n={iconFor(n)} s={18} /></span>
          <span className="nd-tx"><b>{n.title}</b><small className="nd-body">{n.body}</small><small className="nd-time"><Ic n="clock" s={12} />{n.time}</small></span>
          {!n.read && <i className="nd-dot" aria-hidden="true" />}
        </button>
        <div className="nd-ax">
          {!n.read && <button className="nd-ib ok" onClick={() => mark(n.id)} aria-label="Mark as read" title="Mark as read"><Ic n="check" s={16} /></button>}
          <button className="nd-ib dng" onClick={() => del(n.id)} aria-label={'Delete ' + n.title} title="Delete"><Ic n="trash" s={16} /></button>
        </div></li>)}</ul>
        : <div className="nd-empty"><span className="ci"><Ic n="bell" s={22} /></span><b>{notifs.length ? 'No unread notifications' : "You're all caught up"}</b><small>{notifs.length ? 'Everything has been read.' : 'New alerts will appear here.'}</small></div>}
    </div>
  </div>
}
