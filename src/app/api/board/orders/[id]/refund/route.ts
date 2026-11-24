import { boardUser, unauthorized } from '@/lib/board-auth'
import { stripe, stripeEnabled } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

/** Owner only: refunds the full payment (when paid through Stripe) and cancels the order. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  if (user.role !== 'OWNER') return Response.json({ error: 'Only the owner can refund an order.' }, { status: 403 })
  const { id } = await params
  const order = await payload.findByID({ collection: 'orders', id, disableErrors: true })
  if (!order) return Response.json({ error: 'Order not found.' }, { status: 404 })
  if (order.status === 'CANCELLED') return Response.json({ error: 'This order is already cancelled.' }, { status: 409 })

  let refunded = false
  if (order.paymentMode === 'stripe' && order.stripeId) {
    let paymentIntentId: string | null = order.stripeId.startsWith('pi_') ? order.stripeId : null
    if (!paymentIntentId && order.stripeId.startsWith('cs_')) {
      if (!stripeEnabled()) return Response.json({ error: 'Stripe is not configured, so the refund must be done in the Stripe dashboard.' }, { status: 503 })
      try {
        const session = await stripe().checkout.sessions.retrieve(order.stripeId)
        if (typeof session.payment_intent === 'string') paymentIntentId = session.payment_intent
      } catch (err) {
        console.error('[refund] session lookup failed', err)
        return Response.json({ error: 'Could not look up this Stripe payment. Check the Stripe dashboard.' }, { status: 502 })
      }
    }
    if (paymentIntentId) {
      if (!stripeEnabled()) return Response.json({ error: 'Stripe is not configured, so the refund must be done in the Stripe dashboard.' }, { status: 503 })
      try {
        await stripe().refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey: `refund_${order.id}` })
        refunded = true
      } catch (err) {
        console.error('[refund] failed', err)
        return Response.json({ error: 'Stripe could not refund this payment. Check the Stripe dashboard.' }, { status: 502 })
      }
    }
  }

  const updated = await payload.update({
    collection: 'orders',
    where: { and: [{ id: { equals: id } }, { status: { not_equals: 'CANCELLED' } }] },
    data: { status: 'CANCELLED' },
    user,
    overrideAccess: false,
  })
  if (updated.docs.length === 0) {
    return Response.json({ error: 'This order is already cancelled.' }, { status: 409 })
  }
  return Response.json({ id: String(order.id), status: 'CANCELLED', refunded })
}
