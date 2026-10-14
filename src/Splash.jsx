import { useEffect, useState } from 'react'
import logo from './assets/logo-full.png'

export default function Splash({ onDone }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setOut(true), 1500)
    const b = setTimeout(onDone, 1900)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [onDone])
  return (
    <div className={'splash' + (out ? ' out' : '')} role="status" aria-label="Loading EduPaper AI">
      <div className="sp-center">
        <img className="sp-logo" src={logo} alt="EduPaper AI" />
      </div>
      <div className="sp-bottom">
        <div className="sp-bar"><span /></div>
        <small>Loading…</small>
      </div>
    </div>
  )
}
