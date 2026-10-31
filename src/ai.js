// Real AI question generation. NEVER put an AI key in the app: call YOUR server, which holds the key and calls the model.
// Set VITE_AI_URL=https://your-server/api/generate-questions when building. Without it the app falls back to the demo text.
// Request : { board, std, medium, subject, chapter, type, marks, diff, count }
// Response: { questions: [{ text, ans, type, marks, diff, subs? }] }   (use $...$ LaTeX for maths and \ce{...} for chemistry)
export const aiEnabled = !!import.meta.env.VITE_AI_URL
export async function aiQuestions(req) {
  if (!aiEnabled) return null
  const r = await fetch(import.meta.env.VITE_AI_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
  if (!r.ok) throw new Error('AI server error ' + r.status)
  const j = await r.json()
  return Array.isArray(j.questions) ? j.questions : []
}
