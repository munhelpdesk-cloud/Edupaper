// EduPaper AI — plans + checkout logic.
// PROTOTYPE: prices below are placeholders and processPayment() is a SIMULATION (no money moves).
// To go live, replace processPayment() with your gateway (e.g. Razorpay Checkout / Stripe): create the order on your server,
// open the gateway's hosted checkout, and verify the payment on the server before activating the plan.
// Never send or store full card numbers / CVV yourself — the gateway's hosted fields keep you out of PCI scope.
import { today } from './ui.jsx'

export const GST = 0.18 // prices are GST-inclusive
export const PLANS = {
  free: { id: 'free', name: 'Free', tag: 'For trying EduPaper', price: { monthly: 0, yearly: 0 },
    features: ['5 question papers per month', 'Full question bank', 'Built-in templates', 'DOCX and PDF export'] },
  pro: { id: 'pro', name: 'Pro', tag: 'For teachers who set papers every week', price: { monthly: 199, yearly: 1499 },
    features: ['Unlimited question papers', 'AI-generated questions', 'Upload and reuse your school formats', 'Blueprints and Exam Planner', 'Priority support'] }
}
export const CYCLES = { monthly: { label: 'Monthly', per: 'month', months: 1 }, yearly: { label: 'Yearly', per: 'year', months: 12 } }
export const yearlySaving = (p = PLANS.pro) => Math.round((1 - p.price.yearly / (p.price.monthly * 12)) * 100)

export const rupees = (n) => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: Number.isInteger(n) ? 0 : 2 })
export const breakdown = (total) => { const base = Math.round((total / (1 + GST)) * 100) / 100; return { base, gst: Math.round((total - base) * 100) / 100, total } }

const addMonths = (iso, m) => { const d = new Date(iso + 'T00:00:00'); const day = d.getDate(); d.setMonth(d.getMonth() + m); if (d.getDate() !== day) d.setDate(0); return d.toISOString().slice(0, 10) }
export const newSub = (plan, cycle, start = today()) => ({ plan, cycle, start, renews: addMonths(start, CYCLES[cycle].months), autoRenew: true })
/** the plan the teacher actually has right now (a cancelled plan keeps working until its end date) */
export const activePlan = (sub) => (!sub || !sub.plan || sub.plan === 'free' || (!sub.autoRenew && sub.renews < today()) ? 'free' : sub.plan)

// ---------- validation ----------
export const digits = (s = '') => s.replace(/\D/g, '')
export const luhn = (num) => { const d = digits(num); if (d.length < 13) return false; let s = 0; for (let i = 0; i < d.length; i++) { let n = +d[d.length - 1 - i]; if (i % 2) { n *= 2; if (n > 9) n -= 9 } s += n } return s % 10 === 0 }
export const brand = (num) => { const d = digits(num); return /^4/.test(d) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^3[47]/.test(d) ? 'Amex' : /^(60|65|81|82|508)/.test(d) ? 'RuPay' : '' }
export const fmtCard = (v) => { const d = digits(v).slice(0, brand(v) === 'Amex' ? 15 : 19); return brand(v) === 'Amex' ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : d.replace(/(\d{4})(?=\d)/g, '$1 ') }
export const fmtExp = (v, prev = '') => { let d = digits(v).slice(0, 4); if (d.length === 1 && +d > 1) d = '0' + d; return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d.length === 2 && v.length >= prev.length ? d + '/' : d }
export const expOk = (v) => { const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m || +m[1] < 1 || +m[1] > 12) return false; const now = new Date(); return new Date(2000 + +m[2], +m[1], 1) > new Date(now.getFullYear(), now.getMonth(), 1) }
export const upiOk = (v = '') => /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(v.trim())
export const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda']

/** returns { field: message } — empty object means valid */
export function validate(method, f) {
  const e = {}
  if (method === 'upi') { if (!f.upi.trim()) e.upi = 'Enter your UPI ID.'; else if (!upiOk(f.upi)) e.upi = 'That doesn’t look like a UPI ID. Example: name@okicici' }
  if (method === 'card') {
    if (f.cname.trim().length < 2) e.cname = 'Enter the name on the card.'
    if (!digits(f.cnum)) e.cnum = 'Enter your card number.'; else if (!luhn(f.cnum)) e.cnum = 'This card number isn’t valid. Please check it.'
    if (!f.exp) e.exp = 'Enter expiry.'; else if (!expOk(f.exp)) e.exp = 'Expiry is invalid or in the past.'
    const need = brand(f.cnum) === 'Amex' ? 4 : 3
    if (!f.cvv) e.cvv = 'Enter CVV.'; else if (digits(f.cvv).length !== need) e.cvv = need + ' digits.'
  }
  if (method === 'nb' && !f.bank) e.bank = 'Choose your bank.'
  return e
}

export const methodLabel = (method, f) => method === 'upi' ? 'UPI · ' + f.upi.trim() : method === 'card' ? (brand(f.cnum) || 'Card') + ' •••• ' + digits(f.cnum).slice(-4) : 'Net banking · ' + f.bank

/** SIMULATED gateway. Test cards: 4242 4242 4242 4242 succeeds, 4000 0000 0000 0002 is declined. UPI ids ending "@fail" are declined. */
export function processPayment({ amount, method, f }) {
  return new Promise((resolve) => setTimeout(() => {
    if (method === 'card' && digits(f.cnum) === '4000000000000002') return resolve({ ok: false, error: 'Your card was declined by the bank. Try another card or payment method.' })
    if (method === 'upi' && /@fail$/i.test(f.upi.trim())) return resolve({ ok: false, error: 'The UPI request was not approved. Please try again.' })
    resolve({ ok: true, ref: 'EP' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10), amount })
  }, 1800))
}

export const DEMO = true // shows the "demo mode" notice on checkout; set to false once a real gateway is connected
export const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
/** start date for a new purchase: a cancelled-but-still-active Pro plan renews from its end date, otherwise from today */
export const startFor = (sub) => (sub && sub.plan === 'pro' && !sub.autoRenew && sub.renews >= today() ? sub.renews : today())
