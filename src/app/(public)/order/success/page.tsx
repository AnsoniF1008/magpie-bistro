import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { SuccessMark } from '@/components/motion/SuccessMark'
import { ClearCartOnMount } from '@/components/site/CheckoutForm'
import { getSettings } from '@/lib/data'
import { formatPrice } from '@/lib/money'
import { confirmOrder, findOrderByToken } from '@/lib/orders'
import { stripe, stripeEnabled } from '@/lib/stripe'
import { formatPickup } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Order confirmed', robots: { index: false } }

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ t?: string; session_id?: string }> }) {
  const { t, session_id } = await searchParams
  let order = await findOrderByToken(t || '')
  if (!order) notFound()
  const settings = await getSettings()

  // The webhook normally confirms the order first. If the customer got back
  // here before it arrived, ask Stripe directly (confirmOrder is idempotent).
  if (order.status === 'PENDING' && stripeEnabled() && session_id) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id)
      if (session.metadata?.orderId === String(order.id) && session.payment_status === 'paid') {
        const ref = typeof session.payment_intent === 'string' ? session.payment_intent : session.id
        order = (await confirmOrder(order.id, ref)).order ?? order
      }
    } catch (err) {
      console.error('[success] could not verify Stripe session', err)
    }
  }

  const paid = order.status !== 'PENDING' && order.status !== 'CANCELLED'

  return (
    <div className="wrap page-head" style={{ maxWidth: 640, textAlign: 'center' }}>
      {paid ? (
        <>
          <ClearCartOnMount />
          <SuccessMark />
          <h1>Thank you, {order.customerName.split(' ')[0]}!</h1>
          <p className="section-intro" style={{ margin: '0 auto' }}>Your order is confirmed and the kitchen has it.</p>
          <p className="order-code" aria-label={`Order number ${order.code}`}>{order.code}</p>
        </>
      ) : order.status === 'CANCELLED' ? (
        <>
          <h1>This order was cancelled</h1>
          <p className="section-intro" style={{ margin: '0 auto' }}>Nothing was charged. You can start again from the menu.</p>
        </>
      ) : (
        <>
          <h1>We’re confirming your payment…</h1>
          <p className="section-intro" style={{ margin: '0 auto' }}>This usually takes a few seconds. Refresh this page in a moment — if it doesn’t update, call <a href={settings.phoneHref}>{settings.phone}</a> with order number <strong>{order.code}</strong>.</p>
        </>
      )}

      <div className="panel" style={{ textAlign: 'left', marginTop: 22 }}>
        <p style={{ margin: 0, fontSize: '1.1rem' }}><strong>Pickup:</strong> {formatPickup(order.pickupAt)} (Eastern)</p>
        <p style={{ color: 'var(--ink-soft)' }}>{settings.addressLine1}, {settings.addressLine2} — give your name at the counter.</p>
        <dl className="totals">
          {order.items.map((i) => (
            <div key={i.id}><dt>{i.qty} × {i.nameSnap}</dt><dd>{formatPrice(i.unitCents * i.qty)}</dd></div>
          ))}
          <div><dt>Subtotal</dt><dd>{formatPrice(order.subtotalCents)}</dd></div>
          <div><dt>Sales tax</dt><dd>{formatPrice(order.taxCents)}</dd></div>
          <div className="grand"><dt>{paid ? 'Total paid' : 'Total'}</dt><dd>{formatPrice(order.totalCents)}</dd></div>
        </dl>
        {order.email && paid && <p style={{ margin: '12px 0 0', color: 'var(--ink-soft)', fontSize: '0.92rem' }}>A receipt is on its way to {order.email}.</p>}
      </div>
      <p style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link className="btn btn-gold" href="/menu">Back to the menu</Link>
        <a className="btn btn-ghost" href={settings.phoneHref}>Call {settings.phone}</a>
      </p>
    </div>
  )
}
