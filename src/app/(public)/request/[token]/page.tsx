import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { SuccessMark } from '@/components/motion/SuccessMark'
import { getSettings } from '@/lib/data'
import { formatPrice } from '@/lib/money'
import { describeRequest, findRequestByToken, longDate, markRequestPaid, requestLabel } from '@/lib/requests'
import { createRequestCheckoutSession, stripe, stripeEnabled } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your special order', robots: { index: false } }

async function pay(formData: FormData) {
  'use server'
  const token = String(formData.get('t') || '')
  const r = await findRequestByToken(token)
  if (!r) notFound()
  if (r.status !== 'APPROVED' || !r.quoteCents) redirect(`/request/${encodeURIComponent(r.publicToken)}`)
  if (stripeEnabled()) {
    const h = await headers()
    const site = (process.env.NEXT_PUBLIC_SITE_URL || `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`).replace(/\/$/, '')
    const session = await createRequestCheckoutSession({ id: r.id, code: r.code, email: r.email, quoteCents: r.quoteCents, publicToken: r.publicToken, label: requestLabel(r) }, site)
    redirect(session.url)
  }
  // Demo mode (no Stripe key): confirm through the same function the webhook uses.
  await markRequestPaid(r.id, `demo_${r.code}`)
  redirect(`/request/${encodeURIComponent(r.publicToken)}`)
}

export default async function RequestPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { token } = await params
  const { session_id } = await searchParams
  let r = await findRequestByToken(token)
  if (!r) notFound()
  const settings = await getSettings()

  // Back from Stripe before the webhook arrived: verify directly (idempotent).
  if (r.status === 'APPROVED' && stripeEnabled() && session_id) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id)
      if (session.metadata?.requestId === String(r.id) && session.payment_status === 'paid') {
        r = (await markRequestPaid(r.id, typeof session.payment_intent === 'string' ? session.payment_intent : session.id)).request ?? r
      }
    } catch (err) {
      console.error('[request] could not verify Stripe session', err)
    }
  }

  const label = requestLabel(r)
  const amount = formatPrice(r.quoteCents ?? 0)
  const demo = !stripeEnabled()

  return (
    <div className="wrap page-head" style={{ maxWidth: 640 }}>
      <span className="eyebrow">{r.kind === 'HOLIDAY' ? 'Holiday pre-order' : 'Custom order'} · {r.code}</span>
      {r.status === 'PENDING_REVIEW' && (
        <>
          <h1>We’ve got your request</h1>
          <p className="section-intro">Jeannie or Tonya will review it and email {r.email} with a confirmation and a payment link. Nothing has been charged.</p>
        </>
      )}
      {r.status === 'APPROVED' && (
        <>
          <h1>Approved — pay to confirm</h1>
          <p className="section-intro">
            {r.kind === 'HOLIDAY' ? <>A deposit of <strong>{amount}</strong> confirms your order; the rest is due at pickup.</> : <>The total for your order is <strong>{amount}</strong>.</>}
          </p>
          {r.ownerNote && <p className="demo-note" style={{ borderStyle: 'solid' }}>{r.ownerNote}</p>}
        </>
      )}
      {r.status === 'PAID' && (
        <div style={{ textAlign: 'center' }}>
          <SuccessMark />
          <h1>You’re all set!</h1>
          <p className="section-intro" style={{ margin: '0 auto' }}>We received {amount}. Your {label} is confirmed.</p>
        </div>
      )}
      {r.status === 'REJECTED' && (
        <>
          <h1>We couldn’t take this one</h1>
          <p className="form-error" style={{ color: 'var(--ink)' }}>{r.rejectionReason}</p>
          <p className="section-intro">Nothing was charged. If another date or design could work, call <a href={settings.phoneHref}>{settings.phone}</a>.</p>
        </>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <p style={{ margin: 0, fontSize: '1.1rem' }}><strong>{r.status === 'PAID' ? 'Pickup' : 'For'}:</strong> {longDate(r.desiredDate)}</p>
        <p style={{ color: 'var(--ink-soft)' }}>{r.customerName} · {r.phone}</p>
        <ul style={{ margin: '0 0 6px', paddingLeft: '1.1em' }}>
          {describeRequest(r).map((line) => (
            <li key={line} style={{ margin: '4px 0', overflowWrap: 'anywhere' }}>{line}</li>
          ))}
        </ul>
        {r.kind === 'HOLIDAY' && typeof r.orderTotalCents === 'number' && (
          <dl className="totals" style={{ marginTop: 12 }}>
            <div><dt>Order total</dt><dd>{formatPrice(r.orderTotalCents)}</dd></div>
            {r.quoteCents ? <div><dt>{r.status === 'PAID' ? 'Deposit paid' : 'Deposit'}</dt><dd>{amount}</dd></div> : null}
            {r.quoteCents ? <div><dt>Due at pickup</dt><dd>{formatPrice(Math.max(0, r.orderTotalCents - r.quoteCents))}</dd></div> : null}
          </dl>
        )}
        {r.status === 'APPROVED' && (
          <form action={pay} style={{ marginTop: 18 }}>
            <input type="hidden" name="t" value={token} />
            <button className="btn btn-gold" type="submit" style={{ width: '100%' }}>{demo ? `Simulate payment of ${amount}` : `Pay ${amount} securely`}</button>
            {demo && <p className="demo-note" style={{ marginTop: 12 }}><strong>Demo payments.</strong> Stripe is not connected yet — no card is charged.</p>}
          </form>
        )}
      </div>
      <p style={{ marginTop: 16, color: 'var(--ink-soft)' }}>Questions? Call <a href={settings.phoneHref}>{settings.phone}</a>. Keep this page’s link to check on your order.</p>
    </div>
  )
}
