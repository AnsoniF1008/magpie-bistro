import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { cancelPendingOrder, confirmOrder } from '@/lib/orders'
import { markRequestPaid } from '@/lib/requests'
import { stripe, stripeEnabled } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/**
 * Stripe → us. The signature is verified against the raw body, and
 * confirmOrder is idempotent, so retries and duplicates are harmless.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeEnabled() || !secret) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object
      const ref = typeof session.payment_intent === 'string' ? session.payment_intent : session.id
      if (session.payment_status === 'paid') {
        if (session.metadata?.orderId) await confirmOrder(session.metadata.orderId, ref)
        if (session.metadata?.requestId) await markRequestPaid(session.metadata.requestId, ref)
      }
    } else if (event.type === 'checkout.session.expired') {
      const orderId = event.data.object.metadata?.orderId
      if (orderId) await cancelPendingOrder(orderId)
    }
  } catch (err) {
    console.error('[stripe webhook] handler failed', event.type, err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 }) // Stripe will retry
  }
  return NextResponse.json({ received: true })
}
