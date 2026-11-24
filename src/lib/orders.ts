import 'server-only'

import crypto from 'crypto'

import type { Order } from '@/payload-types'
import { isDishAvailableOn, servedWeekdays } from './availability'
import { getSettings, getWeekMenu, payloadClient, toDayMenus } from './data'
import { sendOrderEmails } from './email'
import { computeTotals } from './money'
import { buildLines, type OrderInput } from './order-rules'
import { toRelationId } from './relations'
import { createCheckoutSession, stripeEnabled } from './stripe'
import { getWeekOf, nyParts, validatePickupAt, WEEKDAY_NAMES } from './time'

export class OrderError extends Error {}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I

function newCode() {
  const bytes = crypto.randomBytes(5)
  return 'M-' + Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/**
 * Validates everything again on the server, prices the order from the CMS and
 * stores it as PENDING. Returns where to send the customer to pay.
 */
export async function createOrder(input: OrderInput, siteUrl: string): Promise<{ orderId: string; redirectUrl: string }> {
  const payload = await payloadClient()
  const settings = await getSettings()
  if (!settings.onlineOrdering) throw new OrderError(`Online ordering is paused right now. Please call ${settings.phone}.`)

  const now = new Date()
  const pickupAt = new Date(input.pickupAt)

  const ids = [...new Set(input.items.map((i) => i.dishId))]
  const { docs } = await payload.find({ collection: 'dishes', where: { id: { in: ids } }, limit: ids.length, depth: 0 })
  const result = buildLines(
    input.items,
    docs.map((d) => ({
      id: String(d.id),
      name: d.nameEn,
      priceCents: typeof d.priceCents === 'number' ? d.priceCents : null,
      isVisible: d.isVisible !== false,
      isSoldOut: Boolean(d.isSoldOut),
      isOrderable: d.isOrderable !== false,
    })),
  )
  if (!result.ok) throw new OrderError(result.error)

  const pickupCheck = validatePickupAt(pickupAt, settings.open, now)
  if (!pickupCheck.ok) throw new OrderError(pickupCheck.error)

  // Dishes of the day can only be picked up on the day they are cooked.
  const week = toDayMenus(await getWeekMenu(getWeekOf(pickupAt), settings.open.hours.weekdays))
  const pickupWeekday = nyParts(pickupAt).weekday
  for (const line of result.lines) {
    if (!isDishAvailableOn(line.dishId, pickupWeekday, week)) {
      const days = (servedWeekdays(line.dishId, week) ?? []).map((w) => WEEKDAY_NAMES[w]).join(' and ')
      throw new OrderError(`${line.nameSnap} is only served on ${days} that week. Choose that day for pickup or remove it.`)
    }
  }

  const totals = computeTotals(result.lines, settings.taxRateBps)
  const paid = stripeEnabled()

  let order: Order | null = null
  for (let attempt = 0; attempt < 4 && !order; attempt++) {
    try {
      order = await payload.create({
        collection: 'orders',
        data: {
          code: newCode(),
          status: 'PENDING',
          customerName: input.customerName,
          phone: input.phone,
          email: input.email || undefined,
          notes: input.notes || undefined,
          pickupAt: pickupAt.toISOString(),
          items: result.lines.map((l) => ({ dish: toRelationId(l.dishId) as number, nameSnap: l.nameSnap, qty: l.qty, unitCents: l.unitCents })),
          ...totals,
          allergyAckAt: now.toISOString(),
          paymentMode: paid ? 'stripe' : 'demo',
          publicToken: crypto.randomBytes(24).toString('base64url'),
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const isCodeCollision = /unique|duplicate|code/i.test(msg)
      if (!isCodeCollision || attempt === 3) throw err
    }
  }
  if (!order) throw new OrderError('We could not save your order. Please try again.')

  if (paid) {
    try {
      const session = await createCheckoutSession(order, siteUrl)
      return { orderId: String(order.id), redirectUrl: session.url }
    } catch (err) {
      await cancelPendingOrder(order.id).catch((cancelErr) => console.error('[orders] cleanup after Stripe error failed', cancelErr))
      throw err
    }
  }
  return { orderId: String(order.id), redirectUrl: `${siteUrl}/order/pay-demo?t=${encodeURIComponent(order.publicToken)}` }
}

/**
 * Marks a PENDING order as paid exactly once. Safe to call repeatedly (Stripe
 * retries webhooks; the success page may also call it): only the call that
 * flips PENDING → CONFIRMED sends the emails.
 */
export async function confirmOrder(orderId: string | number, paymentRef: string): Promise<{ alreadyConfirmed: boolean; order: Order | null }> {
  const payload = await payloadClient()
  const { docs } = await payload.update({
    collection: 'orders',
    where: { and: [{ id: { equals: orderId } }, { status: { equals: 'PENDING' } }] },
    data: { status: 'CONFIRMED', stripeId: paymentRef, confirmedAt: new Date().toISOString() },
  })
  if (docs.length === 0) {
    const existing = await payload.findByID({ collection: 'orders', id: orderId, disableErrors: true })
    return { alreadyConfirmed: true, order: existing }
  }
  const order = docs[0]
  await sendOrderEmails(order, await getSettings())
  return { alreadyConfirmed: false, order }
}

export async function cancelPendingOrder(orderId: string | number) {
  const payload = await payloadClient()
  await payload.update({
    collection: 'orders',
    where: { and: [{ id: { equals: orderId } }, { status: { equals: 'PENDING' } }] },
    data: { status: 'CANCELLED' },
  })
}

export async function findOrderByToken(token: string): Promise<Order | null> {
  if (!token || token.length < 20) return null
  const payload = await payloadClient()
  const { docs } = await payload.find({ collection: 'orders', where: { publicToken: { equals: token } }, limit: 1, depth: 0 })
  return docs[0] ?? null
}

export function siteUrlFrom(req: Request): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/$/, '')
}
