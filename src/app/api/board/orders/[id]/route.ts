import { z } from 'zod'

import { boardUser, unauthorized } from '@/lib/board-auth'
import { ORDER_STATUSES } from '@/collections/Orders'

export const dynamic = 'force-dynamic'

const body = z.object({ status: z.enum(ORDER_STATUSES) })
const orderLocks = new Map<string, Promise<unknown>>()

function serializeOrderUpdate<T>(id: string, work: () => Promise<T>): Promise<T> {
  const prev = orderLocks.get(id) ?? Promise.resolve()
  const next = prev.catch(() => undefined).then(work)
  orderLocks.set(id, next)
  void next.finally(() => {
    if (orderLocks.get(id) === next) orderLocks.delete(id)
  })
  return next
}

/** Moves an order to another column. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const { id } = await params
  const parsed = body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Unknown status.' }, { status: 400 })

  return serializeOrderUpdate(id, async () => {
    const existing = await payload.findByID({ collection: 'orders', id, disableErrors: true, depth: 0 })
    if (!existing) return Response.json({ error: 'Order not found.' }, { status: 404 })
    if (existing.status === parsed.data.status) {
      return Response.json({ id: String(existing.id), status: existing.status })
    }
    try {
      const order = await payload.update({ collection: 'orders', id, data: { status: parsed.data.status }, user, overrideAccess: false })
      return Response.json({ id: String(order.id), status: order.status })
    } catch (err) {
      console.error('[board/orders PATCH] failed', id, err)
      return Response.json({ error: 'Could not update that order.' }, { status: 500 })
    }
  })
}
