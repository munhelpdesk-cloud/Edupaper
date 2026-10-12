import { useEffect, useState } from 'react'
import logo from './assets/logo-full.png'

export default function Splash({ onDone }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setOut(true), 2600)
    const b = setTimeout(onDone, 3200)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [onDone])
  return (
    <div className={'splash' + (out ? ' out' : '')} role="status" aria-label="Loading EduPaper AI">
      <div className="sp-orb sp-o1" /><div className="sp-orb sp-o2" /><div className="sp-orb sp-o3" />
      <div className="sp-center">
        <div className="sp-ring r1" /><div className="sp-ring r2" />
        <img className="sp-logo" src={logo} alt="EduPaper AI" />
      </div>
      <div className="sp-bottom">
        <div className="sp-bar"><span /></div>
        <small>Preparing your workspace…</small>
      </div>
    </div>
  )
}
