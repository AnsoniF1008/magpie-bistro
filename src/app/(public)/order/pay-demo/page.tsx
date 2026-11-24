import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import React from 'react'

import { formatPrice } from '@/lib/money'
import { cancelPendingOrder, confirmOrder, findOrderByToken } from '@/lib/orders'
import { stripeEnabled } from '@/lib/stripe'
import { formatPickup } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Demo payment', robots: { index: false } }

/**
 * Stand-in for Stripe Checkout while no Stripe key is configured.
 * It confirms the order through the same confirmOrder() the real webhook uses.
 * This route refuses to work once STRIPE_SECRET_KEY is set.
 */
async function pay(formData: FormData) {
  'use server'
  if (stripeEnabled()) notFound()
  const token = String(formData.get('t') || '')
  const order = await findOrderByToken(token)
  if (!order) notFound()
  if (formData.get('action') === 'cancel') {
    await cancelPendingOrder(order.id)
    redirect('/order/checkout?cancelled=1')
  }
  await confirmOrder(order.id, `demo_${order.code}`)
  redirect(`/order/success?t=${encodeURIComponent(order.publicToken)}`)
}

export default async function PayDemoPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (stripeEnabled()) notFound()
  const { t } = await searchParams
  const order = await findOrderByToken(t || '')
  if (!order) notFound()
  if (order.status !== 'PENDING') redirect(`/order/success?t=${encodeURIComponent(order.publicToken)}`)

  return (
    <div className="wrap page-head" style={{ maxWidth: 620 }}>
      <span className="eyebrow">Demo mode · no card is charged</span>
      <h1>Payment</h1>
      <p className="demo-note">Stripe isn’t connected yet. This page stands in for Stripe Checkout so the whole order flow can be tested. Add <code>STRIPE_SECRET_KEY</code> to switch to real payments.</p>
      <div className="panel" style={{ marginTop: 18 }}>
        <p style={{ margin: 0 }}>Order <strong>{order.code}</strong> for {order.customerName}</p>
        <p style={{ color: 'var(--ink-soft)' }}>Pickup {formatPickup(order.pickupAt)}</p>
        <dl className="totals">
          {order.items.map((i) => (
            <div key={i.id}><dt>{i.qty} × {i.nameSnap}</dt><dd>{formatPrice(i.unitCents * i.qty)}</dd></div>
          ))}
          <div><dt>Sales tax</dt><dd>{formatPrice(order.taxCents)}</dd></div>
          <div className="grand"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
        </dl>
        <form action={pay} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
          <input type="hidden" name="t" value={t} />
          <button className="btn btn-gold" type="submit" name="action" value="pay">Simulate successful payment</button>
          <button className="btn btn-ghost" type="submit" name="action" value="cancel">Cancel</button>
        </form>
      </div>
      <p style={{ marginTop: 14 }}><Link href="/menu">Back to the menu</Link></p>
    </div>
  )
}
