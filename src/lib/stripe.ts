import 'server-only'

import Stripe from 'stripe'

import type { Order } from '@/payload-types'

/** With no STRIPE_SECRET_KEY the site runs in demo-payment mode (no real charges). */
export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY)

let client: Stripe | null = null
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured')
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}

export async function createCheckoutSession(order: Order, siteUrl: string): Promise<{ id: string; url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    client_reference_id: String(order.id),
    customer_email: order.email || undefined,
    metadata: { orderId: String(order.id), orderCode: order.code },
    payment_intent_data: { description: `Magpie Bistro pickup order ${order.code}`, metadata: { orderId: String(order.id) } },
    line_items: [
      ...order.items.map((i) => ({
        quantity: i.qty,
        price_data: { currency: 'usd', unit_amount: i.unitCents, product_data: { name: i.nameSnap } },
      })),
      ...(order.taxCents > 0
        ? [{ quantity: 1, price_data: { currency: 'usd', unit_amount: order.taxCents, product_data: { name: 'Sales tax' } } }]
        : []),
    ],
    success_url: `${siteUrl}/order/success?t=${order.publicToken}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/order/checkout?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return { id: session.id, url: session.url }
}

/** Checkout for an approved special request (custom cake or holiday deposit). */
export async function createRequestCheckoutSession(
  request: { id: string | number; code: string; email: string; quoteCents: number; publicToken: string; label: string },
  siteUrl: string,
): Promise<{ id: string; url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    client_reference_id: `request_${request.id}`,
    customer_email: request.email,
    metadata: { requestId: String(request.id), requestCode: request.code },
    payment_intent_data: { description: `Magpie Bistro ${request.label} ${request.code}`, metadata: { requestId: String(request.id) } },
    line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: request.quoteCents, product_data: { name: `${request.label} ${request.code}` } } }],
    success_url: `${siteUrl}/request/${request.publicToken}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/request/${request.publicToken}`,
  })
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return { id: session.id, url: session.url }
}
