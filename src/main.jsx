import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import 'katex/dist/katex.min.css'
import './styles.css'
import App from './App.jsx'
import { loadCachedSyllabus, loadCachedBank, syncNow, syncIfStale } from './cloud.js'

loadCachedSyllabus()                                   // live syllabus from the last sync, available instantly and offline
createRoot(document.getElementById('root')).render(<App />)
loadCachedBank().finally(() => syncNow())              // then questions from the device, then ask the server for updates
window.addEventListener('online', () => syncNow())
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncIfStale() })
