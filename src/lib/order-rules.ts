import { z } from 'zod'

import { MAX_QTY } from './limits'

/** Everything the browser is allowed to tell us about an order. No prices, no totals. */
export const orderSchema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your name.').max(80),
  phone: z.string().trim().regex(/^[0-9+()\-.\s]{7,20}$/, 'Please enter a phone number we can call.'),
  email: z.union([z.literal(''), z.email('That email address does not look right.')]).optional(),
  notes: z.string().trim().max(500).optional(),
  pickupAt: z.iso.datetime({ error: 'Choose a pickup time.' }),
  allergyAck: z.literal(true, { error: 'Please confirm you have read the allergy notice.' }),
  items: z
    .array(z.object({ dishId: z.string().min(1).max(64), qty: z.number().int().min(1).max(MAX_QTY) }))
    .min(1, 'Your order is empty.')
    .max(40),
})

export type OrderInput = z.infer<typeof orderSchema>

export type OrderableDish = { id: string; name: string; priceCents: number | null; isVisible: boolean; isSoldOut: boolean; isOrderable: boolean }
export type OrderLine = { dishId: string; nameSnap: string; qty: number; unitCents: number }
export type LinesResult = { ok: true; lines: OrderLine[] } | { ok: false; error: string }

/** Turns requested items into priced lines using only catalog data. */
export function buildLines(items: { dishId: string; qty: number }[], dishes: OrderableDish[]): LinesResult {
  const byId = new Map(dishes.map((d) => [d.id, d]))
  const merged = new Map<string, number>()
  for (const i of items) merged.set(i.dishId, (merged.get(i.dishId) ?? 0) + i.qty)

  const lines: OrderLine[] = []
  for (const [dishId, qty] of merged) {
    const dish = byId.get(dishId)
    if (!dish || !dish.isVisible) return { ok: false, error: 'One of the items in your order is no longer on the menu. Please review your order.' }
    if (dish.isSoldOut) return { ok: false, error: `${dish.name} just sold out. Please remove it from your order.` }
    if (!dish.isOrderable || dish.priceCents === null) return { ok: false, error: `${dish.name} can’t be ordered online — please ask at the counter.` }
    if (qty > MAX_QTY) return { ok: false, error: `For more than ${MAX_QTY} of ${dish.name}, please call the bistro.` }
    lines.push({ dishId, nameSnap: dish.name, qty, unitCents: dish.priceCents })
  }
  return { ok: true, lines }
}
