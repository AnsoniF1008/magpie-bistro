'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { IconAlertCircle } from '@/components/ui/Icons'
import { cartSubtotal, useCart } from '@/lib/cart'
import { computeTotals, formatPrice } from '@/lib/money'
import type { PickupSlot } from '@/lib/time'
import { validateCustomerName, validateEmail, validatePhone } from '@/lib/validation'
import { CartLines, useCartReady } from './Cart'

export type CatalogEntry = { name: string; priceCents: number | null; canOrder: boolean }
export type DayOption = { key: string; label: string; slots: PickupSlot[]; /** dish ids that are not cooked that day */ blocked: string[] }

type Props = {
  days: DayOption[]
  catalog: Record<string, CatalogEntry>
  taxRateBps: number
  demoMode: boolean
  cancelled: boolean
  phone: string
  phoneHref: string
}

const FIELD_IDS: Record<string, string> = {
  customerName: 'co-name',
  phone: 'co-phone',
  email: 'co-email',
  pickupAt: 'co-pickup-group',
  allergyAck: 'co-ack',
}

export function CheckoutForm({ days, catalog, taxRateBps, demoMode, cancelled, phone, phoneHref }: Props) {
  const ready = useCartReady()
  const items = useCart((s) => s.items)
  const reduce = useReducedMotion()
  const [dayKey, setDayKey] = useState<string | null>(null)
  const [slot, setSlot] = useState<string | null>(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(cancelled ? 'Payment was cancelled — your order was not placed. You can try again below.' : null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [removed, setRemoved] = useState<string[]>([])
  const summaryRef = useRef<HTMLDivElement>(null)

  // Bring the saved cart in line with the live menu: drop what can't be ordered, refresh prices.
  useEffect(() => {
    if (!ready) return
    const state = useCart.getState()
    const gone: string[] = []
    const next = state.items.flatMap((i) => {
      const live = catalog[i.dishId]
      if (!live || !live.canOrder || live.priceCents === null) {
        gone.push(i.name)
        return []
      }
      return [{ ...i, name: live.name, unitCents: live.priceCents }]
    })
    if (gone.length || next.some((n, idx) => n.unitCents !== state.items[idx]?.unitCents || n.name !== state.items[idx]?.name)) {
      useCart.setState({ items: next })
    }
    if (gone.length) setRemoved(gone)
  }, [ready, catalog])

  const dayState = useMemo(
    () =>
      days.map((d) => {
        const conflicts = items.filter((i) => d.blocked.includes(i.dishId)).map((i) => i.name)
        return { ...d, conflicts }
      }),
    [days, items],
  )
  const firstOpen = dayState.find((d) => d.conflicts.length === 0)
  const active = dayState.find((d) => d.key === dayKey && d.conflicts.length === 0) ?? firstOpen ?? null

  useEffect(() => {
    if (slot && !active?.slots.some((s) => s.iso === slot)) setSlot(null)
  }, [active, slot])

  const totals = computeTotals(items.map((i) => ({ unitCents: i.unitCents, qty: i.qty })), taxRateBps)

  function setFieldError(key: string, msg: string | null) {
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

  function focusErrorTarget(fieldErrors: Record<string, string>) {
    const keys = Object.keys(fieldErrors)
    if (keys.length > 1) {
      summaryRef.current?.focus()
      return
    }
    const targetId = FIELD_IDS[keys[0] ?? '']
    if (targetId) {
      document.getElementById(targetId)?.focus()
    } else {
      summaryRef.current?.focus()
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const data = new FormData(e.currentTarget)
    const customerName = String(data.get('customerName') ?? '')
    const phoneVal = String(data.get('phone') ?? '')
    const emailVal = String(data.get('email') ?? '')
    const notesVal = String(data.get('notes') ?? '')

    const nextFields: Record<string, string> = {}
    const nameErr = validateCustomerName(customerName)
    const phoneErr = validatePhone(phoneVal)
    const emailErr = validateEmail(emailVal, false)
    if (!slot) nextFields.pickupAt = 'Choose a pickup time.'
    if (nameErr) nextFields.customerName = nameErr
    if (phoneErr) nextFields.phone = phoneErr
    if (emailErr) nextFields.email = emailErr
    if (!ack) nextFields.allergyAck = 'Please confirm you have read the allergy notice.'

    if (Object.keys(nextFields).length > 0) {
      setFields(nextFields)
      setError(Object.values(nextFields)[0] ?? 'Please check the highlighted fields.')
      requestAnimationFrame(() => focusErrorTarget(nextFields))
      return
    }

    setFields({})
    setBusy(true)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          customerName,
          phone: phoneVal,
          email: emailVal,
          notes: notesVal,
          pickupAt: slot,
          allergyAck: ack,
          items: items.map((i) => ({ dishId: i.dishId, qty: i.qty })),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.redirectUrl) {
        const serverFields: Record<string, string> = json.fields ?? {}
        setFields(serverFields)
        setError(json.error ?? 'Something went wrong. Please try again.')
        setBusy(false)
        requestAnimationFrame(() => focusErrorTarget(serverFields))
        return
      }
      window.location.assign(json.redirectUrl)
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === 'AbortError'
      setError(timedOut ? 'The request timed out. Please try again or call the bistro.' : 'We could not reach the bistro. Check your connection and try again.')
      setBusy(false)
    } finally {
      clearTimeout(timer)
    }
  }

  if (!ready) return <p className="empty-state" aria-busy="true">Loading your order…</p>

  if (items.length === 0) {
    return (
      <div className="panel empty-state">
        {removed.length > 0 && <p className="form-error" style={{ textAlign: 'left' }}>{removed.join(', ')} {removed.length === 1 ? 'is' : 'are'} no longer available and {removed.length === 1 ? 'was' : 'were'} removed.</p>}
        <p>Your order is empty.</p>
        <p><Link className="btn btn-gold" href="/menu">See this week’s menu</Link></p>
      </div>
    )
  }

  const fieldEntries = Object.entries(fields)

  return (
    <form className="checkout-grid" onSubmit={submit} noValidate>
      <div className="panel">
        {fieldEntries.length > 1 && (
          <div ref={summaryRef} tabIndex={-1} className="error-summary" role="alert">
            <p className="error-summary-title">
              <IconAlertCircle size={18} />
              <span>Please check {fieldEntries.length} items before continuing:</span>
            </p>
            <ul>
              {fieldEntries.map(([key, msg]) => {
                const target = FIELD_IDS[key]
                return (
                  <li key={key}>
                    {target ? <a href={`#${target}`}>{msg}</a> : msg}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <h2 style={{ fontSize: '1.65rem' }}>1 · When will you pick up?</h2>
        {dayState.length === 0 ? (
          <p className="form-error">There are no pickup times open right now. Please call <a href={phoneHref}>{phone}</a>.</p>
        ) : (
          <div id="co-pickup-group" tabIndex={-1}>
            <div className="day-tabs" role="group" aria-label="Pickup day">
              {dayState.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  className="day-tab"
                  aria-pressed={active?.key === d.key}
                  disabled={d.conflicts.length > 0}
                  title={d.conflicts.length ? `${d.conflicts.join(', ')} not served this day` : undefined}
                  onClick={() => setDayKey(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {dayState.some((d) => d.conflicts.length > 0) && (
              <p className="hint" style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '2px 0 8px' }}>
                Crossed-out days don’t serve a dish of the day that is in your order.
              </p>
            )}
            {active ? (
              <div className="time-grid" role="group" aria-label="Pickup time">
                {active.slots.map((s) => (
                  <button
                    key={s.iso}
                    type="button"
                    className="time-chip"
                    aria-pressed={slot === s.iso}
                    onClick={() => {
                      setSlot(s.iso)
                      setFieldError('pickupAt', null)
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="form-error">The dishes of the day in your order are served on different days. Remove one, or place two orders.</p>
            )}
            {fields.pickupAt && <p className="err" style={{ marginTop: 8 }}>{fields.pickupAt}</p>}
          </div>
        )}

        <h2 style={{ fontSize: '1.65rem', marginTop: 28 }}>2 · Who is it for?</h2>
        <div className="fields">
          <div className="field">
            <label htmlFor="co-name">Name for the order</label>
            <input
              id="co-name"
              name="customerName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              aria-invalid={Boolean(fields.customerName)}
              aria-describedby={fields.customerName ? 'co-name-err' : undefined}
              onBlur={(e) => setFieldError('customerName', validateCustomerName(e.target.value))}
              onChange={(e) => fields.customerName && setFieldError('customerName', validateCustomerName(e.target.value))}
            />
            {fields.customerName && <span id="co-name-err" className="err">{fields.customerName}</span>}
          </div>
          <div className="field">
            <label htmlFor="co-phone">Mobile phone</label>
            <input
              id="co-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              aria-invalid={Boolean(fields.phone)}
              aria-describedby={fields.phone ? 'co-phone-err' : undefined}
              onBlur={(e) => setFieldError('phone', validatePhone(e.target.value))}
              onChange={(e) => fields.phone && setFieldError('phone', validatePhone(e.target.value))}
            />
            {fields.phone && <span id="co-phone-err" className="err">{fields.phone}</span>}
          </div>
          <div className="field full">
            <label htmlFor="co-email">Email for your receipt <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
            <input
              id="co-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(fields.email)}
              aria-describedby={fields.email ? 'co-email-err' : undefined}
              onBlur={(e) => setFieldError('email', validateEmail(e.target.value, false))}
              onChange={(e) => fields.email && setFieldError('email', validateEmail(e.target.value, false))}
            />
            {fields.email && <span id="co-email-err" className="err">{fields.email}</span>}
          </div>
          <div className="field full">
            <label htmlFor="co-notes">Notes for the kitchen <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>(optional)</span></label>
            <textarea id="co-notes" name="notes" maxLength={500} placeholder="Salad dressing, cupcake flavor, anything we should know…" />
          </div>
        </div>

        <div className="check">
          <input
            id="co-ack"
            type="checkbox"
            checked={ack}
            onChange={(e) => {
              setAck(e.target.checked)
              if (e.target.checked) setFieldError('allergyAck', null)
            }}
            aria-invalid={Boolean(fields.allergyAck)}
            aria-describedby={fields.allergyAck ? 'co-ack-err' : undefined}
            required
          />
          <div>
            <label htmlFor="co-ack">
              I understand The Magpie Bistro cannot accommodate allergy-free requests and that cross-contact with allergens may occur in the kitchen. <Link href="/legal/allergy" target="_blank">Read the allergy notice</Link>.
            </label>
            {fields.allergyAck && <div id="co-ack-err" className="err" style={{ marginTop: 6 }}>{fields.allergyAck}</div>}
          </div>
        </div>
      </div>

      <div className="panel checkout-summary">
        <h2 style={{ fontSize: '1.65rem' }}>Your order</h2>
        {removed.length > 0 && <p className="form-error">{removed.join(', ')} {removed.length === 1 ? 'is' : 'are'} no longer available and {removed.length === 1 ? 'was' : 'were'} removed.</p>}
        <CartLines />
        <dl className="totals" style={{ marginTop: 14 }}>
          <div><dt>Subtotal</dt><dd>{formatPrice(totals.subtotalCents)}</dd></div>
          <div><dt>Sales tax</dt><dd>{formatPrice(totals.taxCents)}</dd></div>
          <div className="grand"><dt>Total</dt><dd>{formatPrice(totals.totalCents)}</dd></div>
        </dl>
        {slot && active && (
          <p style={{ margin: '12px 0 0', fontWeight: 600 }}>Pickup: {active.label.replace(/^(Today|Tomorrow) · /, '$1, ')} at {active.slots.find((s) => s.iso === slot)?.label}</p>
        )}
        <AnimatePresence>
          {error && (
            <motion.p
              className="form-error"
              role="alert"
              initial={reduce ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
        <button className="btn btn-gold" type="submit" disabled={busy || !active} style={{ width: '100%', marginTop: 16 }}>
          {busy ? 'Sending order…' : `Pay ${formatPrice(totals.totalCents)}`}
        </button>
        {demoMode ? (
          <p className="demo-note" style={{ marginTop: 12 }}><strong>Demo payments.</strong> Stripe is not connected yet, so the next screen simulates the payment — no card is charged.</p>
        ) : (
          <p style={{ margin: '10px 0 0', fontSize: '0.88rem', color: 'var(--ink-soft)' }}>You’ll pay securely on Stripe. We never see your card number.</p>
        )}
      </div>
    </form>
  )
}

export function ClearCartOnMount() {
  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => useCart.getState().clear())
  }, [])
  return null
}

export function CartPageBody({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const ready = useCartReady()
  const items = useCart((s) => s.items)
  if (!ready) return <p className="empty-state" aria-busy="true">Loading your order…</p>
  if (items.length === 0) {
    return (
      <div className="panel empty-state">
        <p>Your order is empty.</p>
        <p><Link className="btn btn-gold" href="/menu">See this week’s menu</Link></p>
      </div>
    )
  }
  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <CartLines />
      <dl className="totals" style={{ marginTop: 14 }}>
        <div className="grand"><dt>Subtotal</dt><dd>{formatPrice(cartSubtotal(items))}</dd></div>
      </dl>
      <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>Tax is added at checkout. Pickup only.</p>
      <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: 0 }}>
        <Link className="btn btn-gold" href="/order/checkout">Checkout</Link>
        <Link className="btn btn-ghost" href="/menu">Add more</Link>
        <a className="btn btn-ghost" href={phoneHref}>Call {phone}</a>
      </p>
    </div>
  )
}
