// Teacher-format engine (the app's main feature).
//  DOCX: the uploaded file itself is the template. We keep its fonts, margins, header/footer, logo, tables and letterhead,
//        update the fields we can find (exam title, class, subject, time, marks) and replace the question area with the new paper.
//  PDF : we read the letterhead (top of page 1) and reuse it as the paper heading.
// Pure string/regex XML handling, so it runs in the browser, in the Android WebView and in Node tests.
import JSZip from 'jszip'
import { texToText } from './tex.js'

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const PARA = /<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g
const RUN = /<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g

/* ---------- field detectors (group 1 = the value) ---------- */
const GAP = String.raw`(?=\s{2,}|\t|\n|\||(?:max|total)[a-z.\s]*marks|$)`
export const DETECT = {
  marks: /(?:max(?:imum)?\.?\s*|total\s*)marks\s*[:\-–=]\s*(\d+)/id,
  time: new RegExp(String.raw`(?:time(?:\s*allowed)?|duration)\s*[:\-–=]\s*([^\t\n|]*?)` + GAP, 'id'),
  subject: new RegExp(String.raw`subject\s*[:\-–=]\s*([^\t\n|]*?)` + GAP, 'id'),
  cls: /(?:class|std\.?|standard|grade)\s*[:\-–=]\s*(\w+)/id,
  date: new RegExp(String.raw`date\s*[:\-–=]\s*([^\t\n|]*?)` + GAP, 'id')
}
const SCHOOL = /school|vidyalay|vidyamandir|academy|institute|college|kendra|mandir|convent|coaching|classes/i
const TITLE = /exam|test|assessment|term\b|periodic|annual|preliminary|pre-?board|worksheet|evaluation|olympiad/i
const SECTION = /^\s*(section|part)\s*[-:]?\s*[A-Z0-9]\b/i
const QSTART = /^\s*(?:q\.?\s*)?\(?\d{1,3}\)?[.)]\s*\S|^\s*q\.?\s*\d/i
const MARKER = /^\s*\{\{\s*questions\s*\}\}\s*$/i

/* ---------- value edits ---------- */
// Edit the TEXT of a string using detectors; returns [{start,end,value}]
function fieldEdits(text, v) {
  const out = []
  const put = (k, val) => {
    if (val === undefined || val === null || val === '') return
    const m = DETECT[k].exec(text); if (!m || !m.indices || !m.indices[1]) return
    let [s, e] = m.indices[1]; while (e > s && text[e - 1] === ' ') e--
    if (e > s || k === 'time') out.push({ start: s, end: e, value: String(val) })
  }
  put('marks', v.marks); put('time', v.time); put('subject', v.subject); put('cls', v.cls)
  return out
}
const textXml = (t) => t.split(/(\t|\n)/).map((x) => (x === '\t' ? '<w:tab/>' : x === '\n' ? '<w:br/>' : x ? `<w:t xml:space="preserve">${esc(x)}</w:t>` : '')).join('')
const runText = (r) => { let t = ''; r.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g, (m, x) => { t += x !== undefined ? unesc(x) : m === '<w:tab/>' ? '\t' : '\n'; return m }); return t }
const paraText = (p) => [...p.matchAll(RUN)].map((m) => runText(m[0])).join('')

// Apply edits that may span several runs, keeping the formatting of the first run touched.
function editPara(p, getEdits) {
  const runs = [...p.matchAll(RUN)]; if (!runs.length) return p
  const texts = runs.map((m) => runText(m[0])), full = texts.join(''), edits = getEdits(full)
  if (!edits.length) return p
  const bounds = []; let o = 0; texts.forEach((t) => { bounds.push([o, o + t.length]); o += t.length })
  const nt = texts.slice(), changed = new Set()
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    let placed = false
    for (let i = 0; i < runs.length; i++) {
      const [s, en] = bounds[i]; if (en <= e.start || s >= e.end) continue
      const a = Math.max(e.start, s) - s, b = Math.min(e.end, en) - s
      nt[i] = nt[i].slice(0, a) + (placed ? '' : e.value) + nt[i].slice(b); placed = true; changed.add(i)
    }
    if (!placed) { // zero-width edit (empty value): insert into the run that contains the position
      for (let i = 0; i < runs.length; i++) { const [s, en] = bounds[i]; if (e.start >= s && e.start <= en) { const a = e.start - s; nt[i] = nt[i].slice(0, a) + e.value + nt[i].slice(a); changed.add(i); break } }
    }
  }
  let i = -1
  return p.replace(RUN, (r) => {
    i++; if (!changed.has(i)) return r
    const open = r.match(/^<w:r(?:\s[^>]*)?>/)[0], rpr = (r.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0]
    const keep = (r.match(/<w:drawing>[\s\S]*?<\/w:drawing>|<w:pict>[\s\S]*?<\/w:pict>|<mc:AlternateContent>[\s\S]*?<\/mc:AlternateContent>/g) || []).join('') // never drop a logo that shares a run with text
    return `${open}${rpr}${keep}${textXml(nt[i])}</w:r>`
  })
}
const mapParas = (xml, fn) => xml.replace(PARA, fn)
const keepCase = (orig, val) => { const L = orig.replace(/[^A-Za-z]/g, ''); return L.length > 3 && L === L.toUpperCase() ? String(val).toUpperCase() : val }

/* ---------- reading a DOCX ---------- */
function splitBody(xml) {
  const open = xml.match(/<w:body(?:\s[^>]*)?>/), start = open.index + open[0].length, end = xml.lastIndexOf('</w:body>')
  const inner = xml.slice(start, end), kids = [], re = /<(\/?)([\w:]+)((?:\s[^>]*?)?)(\/?)>/g
  let depth = 0, from = 0, m
  while ((m = re.exec(inner))) {
    const close = m[1] === '/', self = m[4] === '/'
    if (!close && !self) { if (depth === 0) from = m.index; depth++ } else if (close) { depth--; if (depth === 0) kids.push(inner.slice(from, re.lastIndex)) } else if (depth === 0) kids.push(m[0])
  }
  return { head: xml.slice(0, start), tail: xml.slice(end), kids }
}
const kindOf = (k) => (/^<w:p[\s>]/.test(k) ? 'p' : /^<w:tbl[\s>]/.test(k) ? 'tbl' : /^<w:sectPr[\s>]/.test(k) ? 'sect' : 'other')
const kidText = (k) => (kindOf(k) === 'p' ? paraText(k) : kindOf(k) === 'tbl' ? [...k.matchAll(PARA)].map((m) => paraText(m[0])).join('  ') : '')

// Where do the questions start? Returns {idx, mode}
function findRegion(kids) {
  const mk = kids.findIndex((k) => kindOf(k) === 'p' && MARKER.test(paraText(k)))
  if (mk >= 0) return { idx: mk, mode: 'marker' }
  let inInstr = false
  for (let i = 0; i < kids.length; i++) {
    if (kindOf(kids[i]) !== 'p') continue
    const t = paraText(kids[i]).trim()
    if (!t) { inInstr = false; continue }
    if (SECTION.test(t)) return { idx: i, mode: 'auto' }
    if (/instruction|^note\b/i.test(t)) { inInstr = true; continue }
    if (!inInstr && QSTART.test(t) && t.length > 20) return { idx: i, mode: 'auto' }
  }
  return { idx: kids.length, mode: 'none' }
}

function detectIn(kids, extraXml = []) {
  const f = {}, paras = []
  kids.forEach((k) => { if (kindOf(k) === 'p') paras.push(paraText(k).trim()); const all = kindOf(k) === 'tbl' ? [...k.matchAll(PARA)].map((m) => paraText(m[0])) : [] ; all.forEach((t) => { for (const key of Object.keys(DETECT)) { const m = DETECT[key].exec(t); if (m && m[1] && !f[key]) f[key] = m[1].trim() } }) })
  extraXml.forEach((x) => [...x.matchAll(PARA)].forEach((m) => paras.push(paraText(m[0]).trim())))
  const lines = paras.filter(Boolean)
  lines.forEach((t) => { for (const key of Object.keys(DETECT)) { const m = DETECT[key].exec(t); if (m && m[1] && !f[key]) f[key] = m[1].trim() } })
  const plain = lines.filter((t) => t.length < 90 && !Object.keys(DETECT).some((k) => DETECT[k].test(t)) && !/instruction|^\{\{/i.test(t))
  f.school = plain.find((t) => SCHOOL.test(t)) || plain[0] || ''
  f.title = plain.find((t) => t !== f.school && TITLE.test(t)) || ''
  return f
}

async function load(buf) {
  const zip = await JSZip.loadAsync(buf), doc = zip.file('word/document.xml')
  if (!doc) throw new Error('This is not a valid Word (.docx) file.')
  const names = Object.keys(zip.files).filter((n) => /^word\/(header|footer)\d*\.xml$/.test(n))
  return { zip, xml: await doc.async('string'), names }
}

// Called on upload: what did we find in the teacher's file?
export async function readDocxTemplate(buf) {
  const { zip, xml, names } = await load(buf), { kids } = splitBody(xml), r = findRegion(kids)
  const headers = await Promise.all(names.filter((n) => /header/.test(n)).map((n) => zip.file(n).async('string')))
  const fields = detectIn(kids.slice(0, r.idx), headers)
  const text = kids.slice(0, r.idx).map(kidText).join(' ')
  const logos = (kids.slice(0, r.idx).join('').match(/<w:drawing>|<w:pict>/g) || []).length + headers.reduce((a, h) => a + (h.match(/<w:drawing>|<w:pict>/g) || []).length, 0)
  return { kind: 'docx', logos, fields, region: r.mode, hasInstructions: /instruction/i.test(text), hasMarker: r.mode === 'marker', questionsFound: kids.length - r.idx }
}

/* ---------- writing the paper into the teacher's DOCX ---------- */
const attr = (x, tag) => (x.match(new RegExp(`<w:${tag}\\b[^>]*?/>`)) || [''])[0]
function styleOf(p) { // fonts / size / alignment of a sample paragraph from the teacher's file
  if (!p) return {}
  const run = (p.match(RUN) || [''])[0], rpr = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0], ppr = (p.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0]
  return { fonts: attr(rpr, 'rFonts'), sz: attr(rpr, 'sz'), szCs: attr(rpr, 'szCs'), style: attr(ppr, 'pStyle'), jc: attr(ppr, 'jc'), bold: /<w:b\/>|<w:b\s/.test(rpr) }
}
function pageWidth(kids) {
  const s = kids.find((k) => kindOf(k) === 'sect') || '', w = +(s.match(/<w:pgSz[^>]*w:w="(\d+)"/) || [])[1] || 11906
  const l = +(s.match(/<w:pgMar[^>]*w:left="(\d+)"/) || [])[1] || 1440, r = +(s.match(/<w:pgMar[^>]*w:right="(\d+)"/) || [])[1] || 1440
  return w - l - r
}
const splitOpts = (t) => { const a = t.split(/\s+(?=\([a-d]\)\s)/); return a.length >= 3 && /^\([aA]\)/.test(a[1]) ? a : [t] }

function buildBody({ paper, groups, st, W, withInstr, instr, plain }) {
  const L = (i) => String.fromCharCode(65 + i), fonts = st.fonts || '', sz = st.sz || '', szCs = st.szCs || ''
  const rpr = (b, i, big) => `<w:rPr>${fonts}${b ? '<w:b/><w:bCs/>' : ''}${i ? '<w:i/><w:iCs/>' : ''}${big ? `<w:sz w:val="${big}"/><w:szCs w:val="${big}"/>` : sz + szCs}</w:rPr>`
  const run = (t, o = {}) => `<w:r>${rpr(o.b, o.i, o.big)}${textXml(t)}</w:r>`
  const P = (runs, o = {}) => `<w:p><w:pPr>${st.style || ''}${o.keep ? '<w:keepNext/>' : ''}${o.brk ? '<w:pageBreakBefore/>' : ''}${o.line ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="000000"/></w:pBdr>' : ''}${o.tab ? `<w:tabs><w:tab w:val="right" w:pos="${W}"/></w:tabs>` : ''}<w:spacing w:before="${o.before || 0}" w:after="${o.after ?? 100}"/>${o.ind || ''}${o.jc ? `<w:jc w:val="${o.jc}"/>` : ''}</w:pPr>${runs}</w:p>`
  const out = []
  if (withInstr && instr.length) { out.push(P(run('General instructions', { b: 1 }), { before: 160, after: 40 })); instr.forEach((x, i) => out.push(P(run(`${i + 1}.\t${x}`), { ind: '<w:ind w:left="360" w:hanging="360"/>', after: 40 }))) }
  let n = 0
  groups.forEach(([ty, qs], gi) => {
    const m = qs.reduce((a, q) => a + q.marks, 0)
    out.push(P(run(`Section ${L(gi)}: ${ty}`, { b: 1 }) + run(`\t${m} ${m === 1 ? 'mark' : 'marks'}`, { b: 1 }), { keep: 1, line: 1, tab: 1, before: 280, after: 120 }))
    qs.forEach((q) => {
      n++; const parts = splitOpts(plain(q.text))
      out.push(P(run(`${n}.\t${parts[0]}`) + run(`\t[${q.marks}]`, { b: 1 }), { tab: 1, ind: '<w:ind w:left="480" w:hanging="480"/>', after: parts.length > 1 ? 40 : 100, keep: parts.length > 1 }))
      parts.slice(1).forEach((o, k) => out.push(P(run(o), { ind: '<w:ind w:left="840"/>', after: k === parts.length - 2 ? 100 : 20 })))
      ;(q.subs || []).forEach((x) => out.push(P(run(plain(x)), { ind: '<w:ind w:left="840"/>', after: 60 })))
      if (q.diagram) out.push(P(run('[Diagram: insert figure here]', { i: 1 }), { ind: '<w:ind w:left="480"/>' }))
    })
  })
  if (paper.key && n) {
    out.push(P(run('Answer key', { b: 1, big: 28 }), { brk: 1, after: 160 })); let k = 0
    groups.forEach(([ty, qs], gi) => {
      out.push(P(run(`Section ${L(gi)}: ${ty}`, { b: 1 }), { keep: 1, before: 160, after: 80 }))
      qs.forEach((q) => { k++; out.push(P(run(`${k}.\t${plain(q.ans || '—')}`), { ind: '<w:ind w:left="480" w:hanging="480"/>', after: 80 })) })
    })
  }
  return out.join('')
}

/**
 * buf    : ArrayBuffer/Uint8Array of the teacher's .docx
 * paper  : the paper (name, std, subject, medium, mins, marks, key, instr...)
 * groups : [[type, questions[]], ...]
 * values : { exam, cls, subject, time, marks }  (strings written into the letterhead)
 * instr  : array of instruction lines (used only if the teacher's file has none)
 */
export async function fillDocxTemplate(buf, { paper, groups, values, instr = [] }) {
  const { zip, xml, names } = await load(buf), plain = (t) => texToText(t)
  const { head, tail, kids } = splitBody(xml), r = findRegion(kids)
  const hdrKids = kids.slice(0, r.idx), removed = kids.slice(r.idx)
  const sampleQ = removed.find((k) => kindOf(k) === 'p' && QSTART.test(paraText(k))), sampleS = removed.find((k) => kindOf(k) === 'p' && SECTION.test(paraText(k)))
  const bodyP = [...hdrKids].reverse().find((k) => kindOf(k) === 'p' && paraText(k).trim().length > 25)
  let st = styleOf(sampleQ || bodyP); if (!st.fonts && sampleS) st = { ...st, ...styleOf(sampleS), bold: false }

  const det = detectIn(hdrKids), fieldOf = { school: det.school, title: det.title }
  const total = groups.reduce((a, [, qs]) => a + qs.reduce((b, q) => b + q.marks, 0), 0)
  const V = { ...values, marks: values.marks || String(total) }
  const hv = (k) => { // header kid -> with detected fields updated
    if (kindOf(k) === 'p') {
      const t = paraText(k).trim()
      if (fieldOf.title && t === fieldOf.title && V.exam) return editPara(k, (full) => { const s = full.length - full.trimStart().length; return [{ start: s, end: s + t.length, value: keepCase(t, V.exam) }] })
      return editPara(k, (full) => fieldEdits(full, V))
    }
    if (kindOf(k) === 'tbl') return mapParas(k, (p) => editPara(p, (full) => fieldEdits(full, V)))
    return k
  }
  const placeholders = (x) => mapParas(x, (p) => editPara(p, (full) => {
    const out = []; const re = /\{\{\s*(\w+)\s*\}\}/g; let m
    const map = { exam: V.exam, title: V.exam, class: V.cls, std: V.cls, subject: V.subject, marks: V.marks, time: V.time, medium: paper.medium, board: paper.board, date: paper.dateText || '' }
    while ((m = re.exec(full))) { const k = m[1].toLowerCase(); if (k in map) out.push({ start: m.index, end: m.index + m[0].length, value: String(map[k] ?? '') }) }
    return out
  }))

  const W = pageWidth(kids), withInstr = !/instruction/i.test(hdrKids.map(kidText).join(' '))
  const gen = buildBody({ paper, groups, st, W, withInstr, instr, plain })
  const after = r.mode === 'marker' ? removed.slice(1) : removed.filter((k) => kindOf(k) === 'sect')
  const sect = kids.find((k) => kindOf(k) === 'sect'), keepAfter = after.filter((k) => kindOf(k) !== 'sect' || k !== sect)
  const body = [...hdrKids.map(hv), gen, ...keepAfter, ...(sect ? [sect] : [])].join('')
  zip.file('word/document.xml', placeholders(head + body + tail))
  for (const n of names) zip.file(n, placeholders(mapParas(await zip.file(n).async('string'), (p) => editPara(p, (full) => fieldEdits(full, V)))))
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

/* ---------- PDF letterhead ---------- */
// pdfjs is passed in (the app lazy-loads it) so this file stays testable in Node.
export async function readPdfLetterhead(buf, pdfjs, makeCanvas) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise, page = await doc.getPage(1)
  const vp = page.getViewport({ scale: 1 }), tc = await page.getTextContent()
  const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str, x: i.transform[4], y: i.transform[5], h: Math.abs(i.transform[3]) || i.height || 10, w: i.width || 0 }))
  items.sort((a, b) => b.y - a.y || a.x - b.x)
  const rows = []
  items.forEach((it) => { const r = rows.find((x) => Math.abs(x.y - it.y) <= 2.5); if (r) r.items.push(it); else rows.push({ y: it.y, items: [it] }) })
  const lines = rows.sort((a, b) => b.y - a.y).map((r) => {
    r.items.sort((a, b) => a.x - b.x); let t = '', prev = null
    r.items.forEach((it) => { if (prev) { const gap = it.x - (prev.x + prev.w); t += gap > it.h * 4 ? '\t' : gap > it.h * 0.2 ? ' ' : '' } t += it.s; prev = it })
    const left = r.items[0].x, right = Math.max(...r.items.map((i) => i.x + i.w)), size = Math.max(...r.items.map((i) => i.h))
    return { y: r.y, text: t.trim(), size, align: Math.abs((left + right) / 2 - vp.width / 2) < vp.width * 0.05 && left > vp.width * 0.1 ? 'center' : 'left' }
  }).filter((l) => l.text)
  let cut = lines.findIndex((l) => SECTION.test(l.text) || /^general instructions|^instructions/i.test(l.text) || (QSTART.test(l.text) && l.text.length > 20))
  if (cut < 0) cut = Math.min(lines.length, 8)
  const head = lines.slice(0, Math.min(cut, 14)), sizes = head.map((l) => l.size).sort((a, b) => a - b), med = sizes[Math.floor(sizes.length / 2)] || 11
  head.forEach((l) => { l.bold = l.size >= med * 1.12 || (/[A-Z]{4}/.test(l.text) && l.text === l.text.toUpperCase()) })
  const f = {}; head.forEach((l) => { for (const k of Object.keys(DETECT)) { const m = DETECT[k].exec(l.text); if (m && m[1] && !f[k]) f[k] = m[1].trim() } })
  const plainL = head.filter((l) => !Object.keys(DETECT).some((k) => DETECT[k].test(l.text)))
  f.school = (plainL.find((l) => SCHOOL.test(l.text)) || plainL[0] || {}).text || ''
  f.title = (plainL.find((l) => l.text !== f.school && TITLE.test(l.text)) || {}).text || ''
  let logos = []
  try { logos = await extractPdfLogos(page, pdfjs, vp, head.length ? vp.height - head[head.length - 1].y : 0, makeCanvas) } catch (e) { logos = [] } // a logo problem must never block the upload
  head.forEach((l) => { delete l.y })
  return { kind: 'pdf', lines: head, fields: f, logos }
}

const mul = (a, b) => [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3], a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5]]
const browserCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
// Finds images (logos) in the letterhead area of page 1 and crops them out of a rendering of the page.
// Returns [{ src: PNG data URL, w, h (points, scaled for the paper), align: 'left'|'center'|'right' }]
export async function extractPdfLogos(page, pdfjs, vp, bottom, makeCanvas = browserCanvas) {
  const { OPS } = pdfjs, ol = await page.getOperatorList(), found = []
  let ctm = [1, 0, 0, 1, 0, 0]; const stack = []
  ol.fnArray.forEach((fn, i) => {
    const a = ol.argsArray[i]
    if (fn === OPS.save) stack.push(ctm)
    else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0]
    else if (fn === OPS.transform) ctm = mul(a, ctm)
    else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
      const xs = [ctm[4], ctm[0] + ctm[4], ctm[2] + ctm[4], ctm[0] + ctm[2] + ctm[4]], ys = [ctm[5], ctm[1] + ctm[5], ctm[3] + ctm[5], ctm[1] + ctm[3] + ctm[5]]
      const [x0, y0, x1, y1] = vp.convertToViewportRectangle([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)])
      found.push({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) })
    }
  })
  const keep = found.filter((r) => r.w >= 15 && r.h >= 15 && r.w <= vp.width * 0.4 && r.h <= vp.height * 0.2 && r.y < Math.max(bottom, vp.height * 0.08) + 6).sort((a, b) => a.x - b.x).slice(0, 3)
  if (!keep.length) return []
  const S = 2, v2 = page.getViewport({ scale: S }), cv = makeCanvas(Math.ceil(v2.width), Math.ceil(v2.height)), ctx = cv.getContext('2d')
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height)
  await page.render({ canvasContext: ctx, canvas: cv, viewport: v2 }).promise
  return keep.map((r) => {
    const c = makeCanvas(Math.round(r.w * S), Math.round(r.h * S)); c.getContext('2d').drawImage(cv, Math.round(r.x * S), Math.round(r.y * S), c.width, c.height, 0, 0, c.width, c.height)
    const cx = r.x + r.w / 2, k = Math.min(1, 64 / r.h) // paper logos are at most ~64pt tall
    return { src: c.toDataURL('image/png'), w: Math.round(r.w * k), h: Math.round(r.h * k), align: cx < vp.width * 0.35 ? 'left' : cx > vp.width * 0.65 ? 'right' : 'center' }
  })
}

// Same field replacement, applied to the plain letterhead lines of a PDF-based format.
export function applyToLines(lines, fields, V) {
  return lines.map((l) => {
    let text = l.text
    if (fields.title && text === fields.title && V.exam) return { ...l, text: keepCase(text, V.exam) }
    const ed = fieldEdits(text, V).sort((a, b) => b.start - a.start)
    ed.forEach((e) => { text = text.slice(0, e.start) + e.value + text.slice(e.end) })
    return { ...l, text }
  })
}
