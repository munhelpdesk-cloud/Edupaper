import katex from 'katex'

export const I = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13', layout: 'M3 4h18v6H3zM3 14h8v6H3zM15 14h6v6h-6z', file: 'M6 2h8l5 5v15H6zM14 2v5h5',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', user: 'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', sliders: 'M4 6h10M18 6h2M4 12h2M10 12h10M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4', help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
  up: 'M12 19V5M5 12l7-7 7 7', down: 'M12 5v14M19 12l-7 7-7-7', x: 'M18 6L6 18M6 6l12 12', star: 'M12 2l3 7 7 .6-5.3 4.7 1.6 7.2-6.3-3.7-6.3 3.7 1.6-7.2L2 9.6 9 9z',
  check: 'M20 6L9 17l-5-5', menu: 'M3 6h18M3 12h18M3 18h18', plus: 'M12 5v14M5 12h14', upload: 'M12 16V4M6 10l6-6 6 6M4 20h16', sigma: 'M18 5H6l7 7-7 7h12',
  right: 'M9 6l6 6-6 6', back: 'M15 18l-6-6 6-6', grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', chart: 'M3 3v18h18M7 15v3M12 9v9M17 5v13',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  phone: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM11 18h2', trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  card: 'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM1 10h22', lock: 'M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeoff: 'M17.9 17.9A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M1 1l22 22',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4', zap: 'M13 2L3 14h9l-1 8 10-12h-9z', bank: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-7 10 7', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', flask: 'M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3'
}
export const Ic = ({ n, f, s = 18 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill={f ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={I[n]} /></svg>
export const M = ({ t }) => <span dangerouslySetInnerHTML={{ __html: String(t).replace(/\$(.+?)\$/g, (_, m) => katex.renderToString(m, { throwOnError: false })) }} />
export const Diagram = () => <svg viewBox="0 0 200 80" width="200" role="img" aria-label="Dummy diagram"><rect x="1" y="1" width="198" height="78" rx="8" style={{ fill: 'var(--tint)', stroke: 'var(--p)' }} /><circle cx="60" cy="38" r="22" fill="none" style={{ stroke: 'var(--p)' }} /><path d="M90 38h80M160 30l10 8-10 8" stroke="#7C3AED" fill="none" /><text x="100" y="74" fontSize="9" textAnchor="middle" fill="currentColor">Dummy diagram</text></svg>
export const Thumb = ({ s = '' }) => <div className={'thumb ' + s}><b /><u /><u /><u /><u /></div>
export const Modal = ({ title, onClose, children }) => <div className="ov" role="dialog" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="card modal"><div className="row"><h3>{title}</h3><button className="hbtn" onClick={onClose} aria-label="Close"><Ic n="x" /></button></div>{children}</div></div>
export const Badge = ({ c = '', children }) => <i className={'bd ' + c}>{children}</i>
export const Empty = ({ icon = 'file', title, sub, children }) => <div className="card empty"><span className="ci"><Ic n={icon} s={22} /></span><b>{title}</b>{sub && <small>{sub}</small>}{children}</div>
export const Toggle = ({ on, set, label, sub }) => <button type="button" role="switch" aria-checked={on} className="tg" onClick={() => set(!on)}><span><b>{label}</b>{sub && <small>{sub}</small>}</span><i className={'sw' + (on ? ' on' : '')}><u /></i></button>
export const Seg = ({ v, set, items }) => <div className="seg">{items.map(([k, l, ic]) => <button type="button" key={k} className={v === k ? 'on' : ''} onClick={() => set(k)}>{ic && <Ic n={ic} s={16} />}{l}</button>)}</div>
export const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') } // local date (toISOString is UTC and is a day behind in India before 5:30 AM)
export const daysTo = (d) => Math.round((new Date(d) - new Date(today())) / 864e5)
export const when = (d) => { const n = daysTo(d); return n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 1 ? 'In ' + n + ' days' : n === -1 ? 'Yesterday' : Math.abs(n) + ' days ago' }
