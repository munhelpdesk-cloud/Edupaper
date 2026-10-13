import { useState, useRef, useEffect } from 'react'
import { Ic, Badge, Seg, Empty, today } from './ui.jsx'
import { Field } from './Auth.jsx'
import { PLANS, CYCLES, BANKS, DEMO, yearlySaving, rupees, breakdown, activePlan, fmtDate, validate, methodLabel, processPayment, brand, fmtCard, fmtExp } from './payments.js'

/* ================= Plans & Payment ================= */
export function PlansPage({ sub, setSub, pays, choose, ask, toast }) {
  const [cycle, setCycle] = useState(sub.cycle || 'yearly')
  const act = activePlan(sub), pro = act === 'pro', renewing = pro && sub.autoRenew
  const cancel = () => ask('Cancel renewal? Pro stays active until ' + fmtDate(sub.renews) + ', then you move to Free.', () => { setSub({ ...sub, autoRenew: false }); toast('Renewal cancelled') })
  return <section><h2>Plans & Payment</h2>
    <div className={'card cur-plan' + (pro ? ' pro' : '')}>
      <span className="ci"><Ic n={pro ? 'zap' : 'sparkles'} s={22} /></span>
      <div className="grow">
        <b>{pro ? 'EduPaper Pro · ' + CYCLES[sub.cycle].label : 'Free plan'}</b>
        <small>{!pro ? 'You’re on the Free plan. Upgrade for unlimited papers.' : renewing ? 'Renews on ' + fmtDate(sub.renews) + ' · ' + rupees(PLANS.pro.price[sub.cycle]) : 'Won’t renew. Active until ' + fmtDate(sub.renews) + '.'}</small></div>
      {pro && (renewing ? <button className="dng" onClick={cancel}>Cancel renewal</button> : <button onClick={() => { setSub({ ...sub, autoRenew: true }); toast('Renewal resumed') }}>Resume renewal</button>)}
    </div>
    <div className="row wrap plan-h"><h3 className="h0">Choose a plan</h3>
      <div className="seg cyc" role="group" aria-label="Billing period">{Object.entries(CYCLES).map(([k, c]) => <button key={k} className={cycle === k ? 'on' : ''} aria-pressed={cycle === k} onClick={() => setCycle(k)}>{c.label}{k === 'yearly' && <Badge c="bk">Save {yearlySaving()}%</Badge>}</button>)}</div></div>
    <div className="grid plans">{[PLANS.free, PLANS.pro].map((p) => {
      const amt = p.price[cycle], isPro = p.id === 'pro'
      return <div key={p.id} className={'card plan' + (isPro ? ' hot' : '') + (act === p.id ? ' cur' : '')}>
        {isPro ? <Badge c="ai">Most popular</Badge> : <Badge>Starter</Badge>}
        <h3 className="h0">{p.name}</h3><small>{p.tag}</small>
        <div className="price"><b>{rupees(amt)}</b><span>{amt ? '/ ' + CYCLES[cycle].per : 'free forever'}</span></div>
        {isPro && cycle === 'yearly' && <small>{rupees(Math.round(amt / 12))} a month, billed yearly</small>}
        <ul className="feat">{p.features.map((x) => <li key={x}><Ic n="check" s={16} />{x}</li>)}</ul>
        {isPro
          ? <button className="primary big" disabled={renewing} onClick={() => choose('pro', cycle)}>{renewing ? 'Current plan' : pro ? 'Renew Pro' : 'Upgrade to Pro'}</button>
          : <button className="big" disabled={!pro || !renewing} onClick={cancel}>{!pro ? 'Current plan' : renewing ? 'Downgrade to Free' : 'Downgrade scheduled'}</button>}
      </div>
    })}</div>
    <small className="gap">Prices include 18% GST. Cancel anytime from this page.</small>
    <h3>Payment history</h3>
    {!pays.length ? <Empty icon="card" title="No payments yet" sub="Your receipts will appear here after your first purchase." />
      : <div className="card list">{pays.map((r) => <div key={r.id} className="li pay">
        <span className="ci sm"><Ic n="file" /></span>
        <span className="grow"><b>EduPaper {PLANS[r.plan].name} · {CYCLES[r.cycle].label}</b><small>{fmtDate(r.date)} · {r.method} · #{r.id}</small></span>
        <span className="pay-a"><b>{rupees(r.amount)}</b><Badge c="bk">{r.status}</Badge></span></div>)}</div>}
  </section>
}

/* ================= Checkout ================= */
const blankF = (user) => ({ upi: '', cname: (user && user.name) || '', cnum: '', exp: '', cvv: '', bank: '' })

export function CheckoutPage({ order, user, onPaid, go }) {
  const [method, setMethod] = useState('upi'), [f, setF] = useState(() => blankF(user))
  const [err, setErr] = useState({}), [busy, setBusy] = useState(false), [fail, setFail] = useState(''), [done, setDone] = useState(null)
  const alive = useRef(true), lock = useRef(false)
  useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
  const set = (o) => { setF((x) => ({ ...x, ...o })); setErr((x) => ({ ...x, [Object.keys(o)[0]]: '' })); setFail('') }
  const inv = (k) => ({ 'aria-invalid': !!err[k], 'aria-describedby': err[k] ? 'p-' + k + '-e' : undefined })

  if (done) return <section className="paid"><div className="card paid-c">
    <span className="tick"><Ic n="check" s={34} /></span>
    <h2>Payment successful</h2>
    <p className="lead">Welcome to EduPaper {PLANS[done.rec.plan].name}. Your plan is active until <b>{fmtDate(done.sub.renews)}</b>.</p>
    <dl className="rcpt">{[['Receipt no.', done.rec.id], ['Date', fmtDate(done.rec.date)], ['Plan', 'EduPaper ' + PLANS[done.rec.plan].name + ' · ' + CYCLES[done.rec.cycle].label], ['Paid with', done.rec.method], ['Amount paid', rupees(done.rec.amount)]].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <div className="acts c"><button className="primary" onClick={() => go('Dashboard')}>Start creating papers</button><button onClick={() => go('Plans & Payment', true)}>View billing</button></div></div></section>

  if (!order) return <section><Empty icon="card" title="No plan selected" sub="Choose a plan to continue to checkout."><button className="primary gap" onClick={() => go('Plans & Payment', true)}>View plans</button></Empty></section>

  const plan = PLANS[order.plan], total = plan.price[order.cycle], b = breakdown(total)
  const pay = async (ev) => {
    ev.preventDefault(); if (lock.current) return
    const er = validate(method, f); setErr(er); setFail('')
    const first = Object.keys(er)[0]
    if (first) return void setTimeout(() => { const el = document.getElementById('p-' + first); if (el) el.focus() }, 0)
    lock.current = true; setBusy(true)
    const r = await processPayment({ amount: total, method, f })
    lock.current = false
    if (!r.ok) { if (alive.current) { setBusy(false); setFail(r.error) } return }
    // record the purchase even if the teacher navigated away while it was processing
    const rec = { id: r.ref, date: today(), plan: order.plan, cycle: order.cycle, amount: total, method: methodLabel(method, f), status: 'Paid' }
    const sub = onPaid(rec)
    if (alive.current) { setBusy(false); setDone({ rec, sub }) }
  }

  return <section><h2>Checkout</h2>
    <div className="co">
      <form className="co-main" onSubmit={pay} noValidate>
        {DEMO && <div className="demo"><Ic n="shield" s={18} /><span><b>Demo mode — no real money is charged.</b> Test card <code>4242 4242 4242 4242</code> succeeds; <code>4000 0000 0000 0002</code> is declined. Any future expiry and CVV. UPI IDs ending <code>@fail</code> are declined.</span></div>}
        <h3 className="h0">Payment method</h3>
        <Seg v={method} set={(m) => { setMethod(m); setErr({}); setFail('') }} items={[['upi', 'UPI', 'phone'], ['card', 'Card', 'card'], ['nb', 'Netbanking', 'bank']]} />
        <div className="co-m" key={method}>
          {method === 'upi' && <Field id="p-upi" label="UPI ID" err={err.upi} hint="You’ll get a request in your UPI app to approve."><input id="p-upi" value={f.upi} onChange={(x) => set({ upi: x.target.value })} inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="name@okicici" {...inv('upi')} /></Field>}
          {method === 'card' && <>
            <Field id="p-cname" label="Name on card" err={err.cname}><input id="p-cname" value={f.cname} onChange={(x) => set({ cname: x.target.value })} autoComplete="cc-name" {...inv('cname')} /></Field>
            <Field id="p-cnum" label="Card number" err={err.cnum}><div className="pw"><input id="p-cnum" value={f.cnum} onChange={(x) => set({ cnum: fmtCard(x.target.value) })} inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" {...inv('cnum')} />{brand(f.cnum) && <i className="cbrand">{brand(f.cnum)}</i>}</div></Field>
            <div className="f2">
              <Field id="p-exp" label="Expiry (MM/YY)" err={err.exp}><input id="p-exp" value={f.exp} onChange={(x) => set({ exp: fmtExp(x.target.value, f.exp) })} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" maxLength={5} {...inv('exp')} /></Field>
              <Field id="p-cvv" label="CVV" err={err.cvv}><input id="p-cvv" type="password" value={f.cvv} onChange={(x) => set({ cvv: x.target.value.replace(/\D/g, '').slice(0, 4) })} inputMode="numeric" autoComplete="cc-csc" placeholder="•••" {...inv('cvv')} /></Field></div></>}
          {method === 'nb' && <div className="fld"><label id="p-bank-l">Choose your bank</label>
            <div className="grid banks" role="group" aria-labelledby="p-bank-l">{BANKS.map((x, i) => <button type="button" key={x} id={i ? undefined : 'p-bank'} className={'card pick' + (f.bank === x ? ' on' : '')} aria-pressed={f.bank === x} onClick={() => set({ bank: x })}><Ic n="bank" s={18} />{x}</button>)}</div>
            {err.bank && <small id="p-bank-e" className="fe" role="alert">{err.bank}</small>}</div>}
        </div>
        {fail && <div className="fa" role="alert">{fail}</div>}
        <button className="primary big gap" type="submit" disabled={busy}>{busy ? <><span className="spin" aria-hidden="true" />Processing payment…</> : <><Ic n="lock" s={18} />Pay {rupees(total)}</>}</button>
      </form>
      <div className="co-side card">
        <h3 className="h0">Order summary</h3>
        <div className="sr"><b>EduPaper {plan.name}</b><span>{CYCLES[order.cycle].label}</span></div>
        <div className="sr"><span>Price</span><span>{rupees(b.base)}</span></div>
        <div className="sr"><span>GST (18%)</span><span>{rupees(b.gst)}</span></div>
        <hr /><div className="sr tot"><b>Total today</b><b>{rupees(total)}</b></div>
        <small>Renews every {CYCLES[order.cycle].per} until you cancel. Your receipt is saved under Payment history.</small>
        <button type="button" className="ghost" onClick={() => go('Plans & Payment', true)}>← Change plan</button>
      </div>
    </div></section>
}
