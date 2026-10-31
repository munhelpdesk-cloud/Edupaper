// Keeps the teacher's uploaded school files (DOCX) on the device. localStorage is too small for Word files, so we use IndexedDB.
const open = () => new Promise((res, rej) => { const r = indexedDB.open('edupaper', 1); r.onupgradeneeded = () => r.result.createObjectStore('files'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) })
const run = async (mode, fn) => { const db = await open(); return new Promise((res, rej) => { const t = db.transaction('files', mode), rq = fn(t.objectStore('files')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error) }) }
export const putFile = (id, buf) => run('readwrite', (s) => s.put(buf, id))
export const getFile = (id) => run('readonly', (s) => s.get(id))
export const delFile = (id) => run('readwrite', (s) => s.delete(id))
