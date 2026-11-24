'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import React, { useMemo, useState } from 'react'

import { IconCheck, IconMinus, IconPlus } from '@/components/ui/Icons'
import type { CampaignView } from '@/lib/data'
import { formatPrice } from '@/lib/money'
import { CAKE_TYPES } from '@/lib/request-rules'
import { validateCustomerName, validateEmail, validateHttpUrl, validatePhone, validateRequiredText } from '@/lib/validation'

type Result = { code: string; statusUrl: string }

async function submitRequest(body: unknown): Promise<{ ok: true; result: Result } | { ok: false; error: string; fields: Record<string, string> }> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15_000)
  try {
    const res = await fetch('/api/cakes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json.code) return { ok: false, error: json.error ?? 'Something went wrong. Please try again.', fields: json.fields ?? {} }
    return { ok: true, result: json }
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError'
    return {
      ok: false,
      error: timedOut ? 'The request timed out. Please try again or call the bistro.' : 'We could not reach the bistro. Check your connection and try again.',
      fields: {},
    }
  } finally {
    clearTimeout(timer)
  }
}

function Sent({ result, what }: { result: Result; what: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="panel"
      style={{ marginTop: 22, textAlign: 'center' }}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
      role="status"
    >
      <h3>Request sent — thank you!</h3>
      <p className="order-code">{result.code}</p>
      <p className="section-intro" style={{ margin: '0 auto 14px' }}>Nothing has been charged. We’ll review your {what} and email you a confirmation with a payment link.</p>
      <Link className="btn btn-gold" href={result.statusUrl}>Check your request</Link>
    </motion.div>
  )
}

function ContactFields({
  id,
  fields,
  onValidate,
}: {
  id: string
  fields: Record<string, string>
  onValidate: (key: string, msg: string | null) => void
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${id}-name`}>Your name</label>
        <input
          id={`${id}-name`}
          name="customerName"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          aria-invalid={Boolean(fields.customerName)}
          aria-describedby={fields.customerName ? `${id}-name-err` : undefined}
          onBlur={(e) => onValidate('customerName', validateCustomerName(e.target.value))}
          onChange={(e) => fields.customerName && onValidate('customerName', validateCustomerName(e.target.value))}
        />
        {fields.customerName && <span id={`${id}-name-err`} className="err">{fields.customerName}</span>}
      </div>
      <div className="field">
        <label htmlFor={`${id}-phone`}>Phone</label>
        <input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          required
          aria-invalid={Boolean(fields.phone)}
          aria-describedby={fields.phone ? `${id}-phone-err` : undefined}
          onBlur={(e) => onValidate('phone', validatePhone(e.target.value))}
          onChange={(e) => fields.phone && onValidate('phone', validatePhone(e.target.value))}
        />
        {fields.phone && <span id={`${id}-phone-err`} className="err">{fields.phone}</span>}
      </div>
      <div className="field full">
        <label htmlFor={`${id}-email`}>Email</label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(fields.email)}
          aria-describedby={`${id}-email-hint${fields.email ? ` ${id}-email-err` : ''}`}
          onBlur={(e) => onValidate('email', validateEmail(e.target.value, true))}
          onChange={(e) => fields.email && onValidate('email', validateEmail(e.target.value, true))}
        />
        <span id={`${id}-email-hint`} className="hint">We send your confirmation and payment link here.</span>
        {fields.email && <span id={`${id}-email-err`} className="err">{fields.email}</span>}
      </div>
    </>
  )
}

const STEPS = ['What you’d like', 'Flavor & design', 'Your details']

const WIZARD_FIELD_IDS: Record<string, string> = {
  size: 'cw-size',
  desiredDate: 'cw-date',
  flavor: 'cw-flavor',
  referenceUrl: 'cw-ref',
  customerName: 'cw-name',
  phone: 'cw-phone',
  email: 'cw-email',
}

/** Three short steps instead of one long form. Values live in state so nothing is lost moving back and forth. */
export function CakeWizard({ minDate, leadDays, phone, phoneHref }: { minDate: string; leadDays: number; phone: string; phoneHref: string }) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [v, setV] = useState({ productType: CAKE_TYPES[0] as string, size: '', desiredDate: '', flavor: '', decoration: '', message: '', referenceUrl: '', customerName: '', phone: '', email: '', notes: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Result | null>(null)

  const setFieldError = (key: string, msg: string | null) => {
    setFields((prev) => {
      if (msg === null) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: msg }
    })
  }

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const val = e.target.value
    setV((s) => ({ ...s, [k]: val }))
    if (fields[k]) {
      if (k === 'size') setFieldError('size', validateRequiredText(val, 'Tell us how many or what size.', 80))
      else if (k === 'desiredDate') setFieldError('desiredDate', val ? null : 'Choose the date you need it.')
      else if (k === 'flavor') setFieldError('flavor', validateRequiredText(val, 'Tell us the flavor you have in mind.', 160))
      else if (k === 'referenceUrl') setFieldError('referenceUrl', validateHttpUrl(val))
      else if (k === 'customerName') setFieldError('customerName', validateCustomerName(val))
      else if (k === 'phone') setFieldError('phone', validatePhone(val))
      else if (k === 'email') setFieldError('email', validateEmail(val, true))
    }
  }

  if (result) return <Sent result={result} what="custom order" />

  const go = (to: number, nextError: string | null = null) => {
    setDir(to > step ? 1 : -1)
    setStep(to)
    setError(nextError)
  }

  function validateStep(currentStep: number): Record<string, string> {
    const next: Record<string, string> = {}
    if (currentStep === 0) {
      const sizeErr = validateRequiredText(v.size, 'Tell us how many or what size.', 80)
      if (sizeErr) next.size = sizeErr
      if (!v.desiredDate) next.desiredDate = 'Choose the date you need it.'
    } else if (currentStep === 1) {
      const flavorErr = validateRequiredText(v.flavor, 'Tell us the flavor you have in mind.', 160)
      if (flavorErr) next.flavor = flavorErr
      const refErr = validateHttpUrl(v.referenceUrl)
      if (refErr) next.referenceUrl = refErr
    } else if (currentStep === 2) {
      const nameErr = validateCustomerName(v.customerName)
      const phoneErr = validatePhone(v.phone)
      const emailErr = validateEmail(v.email, true)
      if (nameErr) next.customerName = nameErr
      if (phoneErr) next.phone = phoneErr
      if (emailErr) next.email = emailErr
    }
    return next
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setFields((prev) => ({ ...prev, ...stepErrors }))
      setError(Object.values(stepErrors)[0] ?? 'Please check the highlighted fields.')
      const firstId = WIZARD_FIELD_IDS[Object.keys(stepErrors)[0] ?? '']
      if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus())
      return
    }

    if (step < STEPS.length - 1) return go(step + 1)

    setBusy(true)
    setError(null)
    const r = await submitRequest({ kind: 'CUSTOM', ...v })
    setBusy(false)
    if (r.ok) return setResult(r.result)
    setFields(r.fields)
    const first = Object.keys(r.fields)[0]
    if (['productType', 'size', 'desiredDate'].includes(first)) go(0, r.error)
    else if (['flavor', 'decoration', 'message', 'referenceUrl'].includes(first)) go(1, r.error)
    else setError(r.error)
    const firstId = WIZARD_FIELD_IDS[first ?? '']
    if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus())
  }

  return (
    <form className="order" id="custom-order" onSubmit={onSubmit} noValidate>
      <h3>Custom order request</h3>
      <p className="form-note">
        Tell us what you’re dreaming of. We’ll review it and email you a price and a payment link — nothing is charged now.
        {leadDays > 0 && <> Custom orders need at least {leadDays} day{leadDays === 1 ? '' : 's'} of notice; for something sooner call <a href={phoneHref}>{phone}</a>.</>}
      </p>
      <ol className="steps" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className={i === step ? 'current' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}>
            <button type="button" onClick={() => i < step && go(i)} disabled={i > step} aria-label={`Step ${i + 1}: ${label}`}>
              <span className="n">{i < step ? <IconCheck size={14} /> : i + 1}</span>
              <span className="t">{label}</span>
            </button>
          </li>
        ))}
      </ol>
      <div style={{ overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={step}
            className="fields"
            custom={dir}
            initial={reduce ? false : { opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -32 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
          >
            {step === 0 && (
              <>
                <div className="field">
                  <label htmlFor="cw-type">What would you like?</label>
                  <select id="cw-type" value={v.productType} onChange={set('productType')}>
                    {CAKE_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cw-size">How many / what size?</label>
                  <input
                    id="cw-size"
                    type="text"
                    value={v.size}
                    onChange={set('size')}
                    onBlur={(e) => setFieldError('size', validateRequiredText(e.target.value, 'Tell us how many or what size.', 80))}
                    required
                    maxLength={80}
                    placeholder="e.g. 2 dozen, or serves 20"
                    aria-invalid={Boolean(fields.size)}
                    aria-describedby={fields.size ? 'cw-size-err' : undefined}
                  />
                  {fields.size && <span id="cw-size-err" className="err">{fields.size}</span>}
                </div>
                <div className="field full">
                  <label htmlFor="cw-date">Date needed</label>
                  <input
                    id="cw-date"
                    type="date"
                    value={v.desiredDate}
                    onChange={set('desiredDate')}
                    onBlur={(e) => setFieldError('desiredDate', e.target.value ? null : 'Choose the date you need it.')}
                    required
                    min={minDate}
                    aria-invalid={Boolean(fields.desiredDate)}
                    aria-describedby={fields.desiredDate ? 'cw-date-err' : undefined}
                  />
                  {fields.desiredDate && <span id="cw-date-err" className="err">{fields.desiredDate}</span>}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <div className="field full">
                  <label htmlFor="cw-flavor">Flavor</label>
                  <input
                    id="cw-flavor"
                    type="text"
                    value={v.flavor}
                    onChange={set('flavor')}
                    onBlur={(e) => setFieldError('flavor', validateRequiredText(e.target.value, 'Tell us the flavor you have in mind.', 160))}
                    required
                    maxLength={160}
                    placeholder="e.g. Sunshine Cake, or half vanilla / half chocolate"
                    aria-invalid={Boolean(fields.flavor)}
                    aria-describedby={fields.flavor ? 'cw-flavor-err' : undefined}
                  />
                  {fields.flavor && <span id="cw-flavor-err" className="err">{fields.flavor}</span>}
                </div>
                <div className="field full">
                  <label htmlFor="cw-deco">Decoration &amp; colors <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
                  <textarea id="cw-deco" value={v.decoration} onChange={set('decoration')} maxLength={1000} placeholder="Theme, colors, anything you’d like on it…" />
                </div>
                <div className="field">
                  <label htmlFor="cw-msg">Message on the cake <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
                  <input id="cw-msg" type="text" value={v.message} onChange={set('message')} maxLength={120} placeholder="Happy Birthday, Mia!" />
                </div>
                <div className="field">
                  <label htmlFor="cw-ref">Link to a photo you like <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
                  <input
                    id="cw-ref"
                    type="url"
                    value={v.referenceUrl}
                    onChange={set('referenceUrl')}
                    onBlur={(e) => setFieldError('referenceUrl', validateHttpUrl(e.target.value))}
                    placeholder="https://…"
                    aria-invalid={Boolean(fields.referenceUrl)}
                    aria-describedby={fields.referenceUrl ? 'cw-ref-err' : undefined}
                  />
                  {fields.referenceUrl && <span id="cw-ref-err" className="err">{fields.referenceUrl}</span>}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="field">
                  <label htmlFor="cw-name">Your name</label>
                  <input
                    id="cw-name"
                    type="text"
                    autoComplete="name"
                    value={v.customerName}
                    onChange={set('customerName')}
                    onBlur={(e) => setFieldError('customerName', validateCustomerName(e.target.value))}
                    required
                    minLength={2}
                    maxLength={80}
                    aria-invalid={Boolean(fields.customerName)}
                    aria-describedby={fields.customerName ? 'cw-name-err' : undefined}
                  />
                  {fields.customerName && <span id="cw-name-err" className="err">{fields.customerName}</span>}
                </div>
                <div className="field">
                  <label htmlFor="cw-phone">Phone</label>
                  <input
                    id="cw-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={v.phone}
                    onChange={set('phone')}
                    onBlur={(e) => setFieldError('phone', validatePhone(e.target.value))}
                    required
                    aria-invalid={Boolean(fields.phone)}
                    aria-describedby={fields.phone ? 'cw-phone-err' : undefined}
                  />
                  {fields.phone && <span id="cw-phone-err" className="err">{fields.phone}</span>}
                </div>
                <div className="field full">
                  <label htmlFor="cw-email">Email</label>
                  <input
                    id="cw-email"
                    type="email"
                    autoComplete="email"
                    value={v.email}
                    onChange={set('email')}
                    onBlur={(e) => setFieldError('email', validateEmail(e.target.value, true))}
                    required
                    aria-invalid={Boolean(fields.email)}
                    aria-describedby={`cw-email-hint${fields.email ? ' cw-email-err' : ''}`}
                  />
                  <span id="cw-email-hint" className="hint">We send your price and payment link here.</span>
                  {fields.email && <span id="cw-email-err" className="err">{fields.email}</span>}
                </div>
                <div className="field full">
                  <label htmlFor="cw-notes">Anything else? <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
                  <textarea id="cw-notes" value={v.notes} onChange={set('notes')} maxLength={800} />
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {step > 0 && <button className="btn btn-ghost" type="button" onClick={() => go(step - 1)}>Back</button>}
        <button className="btn btn-gold" type="submit" disabled={busy}>{step < STEPS.length - 1 ? 'Continue' : busy ? 'Sending…' : 'Send request'}</button>
      </p>
    </form>
  )
}

export function HolidayOrderForm({ campaigns, phone, phoneHref }: { campaigns: CampaignView[]; phone: string; phoneHref: string }) {
  const open = campaigns.filter((c) => c.isOpen)
  const [campaignId, setCampaignId] = useState(open[0]?.id ?? '')
  const [qty, setQty] = useState<Record<number, number>>({})
  const [option, setOption] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [result, setResult] = useState<Result | null>(null)
  const campaign = open.find((c) => c.id === campaignId) ?? open[0]

  const total = useMemo(() => (campaign ? campaign.items.reduce((sum, item, i) => sum + item.priceCents * (qty[i] ?? 0), 0) : 0), [campaign, qty])
  const deposit = campaign ? Math.floor((total * Math.round(campaign.depositPercent) + 50) / 100) : 0

  const setFieldError = (key: string, msg: string | null) => {
    setFields((prev) => {
      if (msg === null) {
        if (!(key in prev)) return prev
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: msg }
    })
  }

  if (result) return <Sent result={result} what="holiday order" />
  if (!campaign) {
    return <p className="supplies" style={{ display: 'block' }}>Holiday ordering is closed right now. Call <a href={phoneHref}>{phone}</a> and we’ll see what we can do.</p>
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const items = campaign.items.flatMap((item, i) => ((qty[i] ?? 0) > 0 ? [{ index: i, qty: qty[i], option: item.options.length ? option[i] || '' : undefined }] : []))
    if (items.length === 0) return setError('Choose at least one item.')
    const missing = items.find((i) => i.option === '')
    if (missing) {
      setError(`Choose a flavor for ${campaign.items[missing.index].name}.`)
      requestAnimationFrame(() => document.getElementById(`ho-opt-${missing.index}`)?.focus())
      return
    }
    const data = new FormData(e.currentTarget)
    const customerName = String(data.get('customerName') ?? '')
    const phoneVal = String(data.get('phone') ?? '')
    const emailVal = String(data.get('email') ?? '')

    const nextFields: Record<string, string> = {}
    const nameErr = validateCustomerName(customerName)
    const phoneErr = validatePhone(phoneVal)
    const emailErr = validateEmail(emailVal, true)
    if (nameErr) nextFields.customerName = nameErr
    if (phoneErr) nextFields.phone = phoneErr
    if (emailErr) nextFields.email = emailErr

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields)
      setError(Object.values(nextFields)[0] ?? 'Please check your contact details.')
      const idMap: Record<string, string> = { customerName: 'ho-name', phone: 'ho-phone', email: 'ho-email' }
      const firstId = idMap[Object.keys(nextFields)[0] ?? '']
      if (firstId) requestAnimationFrame(() => document.getElementById(firstId)?.focus())
      return
    }

    setFields({})
    setBusy(true)
    const r = await submitRequest({ kind: 'HOLIDAY', campaignId: campaign.id, items, customerName, phone: phoneVal, email: emailVal, notes: data.get('notes') || '' })
    setBusy(false)
    if (r.ok) return setResult(r.result)
    setFields(r.fields)
    setError(r.error)
  }

  const bump = (i: number, by: number) => setQty((q) => ({ ...q, [i]: Math.max(0, Math.min(50, (q[i] ?? 0) + by)) }))

  return (
    <form className="order" id="holiday-order" onSubmit={onSubmit} noValidate>
      <h3>Holiday order form</h3>
      <p className="form-note">Choose your items and send the request. We’ll confirm by email with a link to pay the {campaign.depositPercent}% deposit — nothing is charged now.</p>

      {open.length > 1 && (
        <div className="day-tabs" role="group" aria-label="Which holiday" style={{ marginTop: 14 }}>
          {open.map((c) => (
            <button key={c.id} type="button" className="day-tab" aria-pressed={c.id === campaign.id} onClick={() => { setCampaignId(c.id); setQty({}); setOption({}) }}>
              {c.title}
            </button>
          ))}
        </div>
      )}

      <ul className="dish-list" style={{ marginTop: 8 }}>
        {campaign.items.map((item, i) => (
          <li key={item.name} className="dish-row" style={{ flexWrap: 'wrap' }}>
            <span>
              <strong>{item.name}</strong> — {formatPrice(item.priceCents)}
              {item.detail && <span className="dish-desc">{item.detail}</span>}
              {item.options.length > 0 && (qty[i] ?? 0) > 0 && (
                <span style={{ display: 'block', marginTop: 8 }}>
                  <label htmlFor={`ho-opt-${i}`} style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, marginBottom: 4 }}>
                    Flavor for {item.name}
                  </label>
                  <select
                    id={`ho-opt-${i}`}
                    value={option[i] ?? ''}
                    onChange={(e) => setOption((o) => ({ ...o, [i]: e.target.value }))}
                    style={{ minHeight: 44, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', font: 'inherit', padding: '6px 10px', maxWidth: '100%' }}
                  >
                    <option value="">Choose a flavor…</option>
                    {item.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </span>
              )}
            </span>
            <span className="qty">
              <button type="button" onClick={() => bump(i, -1)} aria-label={`One less ${item.name}`}>
                <IconMinus size={15} />
              </button>
              <span aria-live="polite">{qty[i] ?? 0}</span>
              <button type="button" onClick={() => bump(i, 1)} aria-label={`One more ${item.name}`}>
                <IconPlus size={15} />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <dl className="totals" style={{ margin: '14px 0 4px' }}>
        <div><dt>Order total</dt><dd>{formatPrice(total)}</dd></div>
        <div className="grand"><dt>{campaign.depositPercent}% deposit to confirm</dt><dd>{formatPrice(deposit)}</dd></div>
      </dl>

      <div className="fields">
        <ContactFields id="ho" fields={fields} onValidate={setFieldError} />
        <div className="field full">
          <label htmlFor="ho-notes">Anything else? <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
          <textarea id="ho-notes" name="notes" maxLength={800} placeholder="Questions, best time to reach you…" />
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <p style={{ marginTop: 16 }}>
        <button className="btn btn-gold" type="submit" disabled={busy}>{busy ? 'Sending…' : `Send ${campaign.title} order`}</button>
      </p>
    </form>
  )
}
