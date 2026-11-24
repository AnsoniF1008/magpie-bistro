import { boardUser, unauthorized } from '@/lib/board-auth'
import { nyParts, nyToUtc } from '@/lib/time'

export const dynamic = 'force-dynamic'

/** Orders for the Kanban board: everything still open, plus today's finished ones. */
export async function GET(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()

  const now = new Date()
  const p = nyParts(now)
  const startOfToday = nyToUtc(p.y, p.m, p.d, 0).toISOString()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()

  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      or: [
        { status: { in: ['CONFIRMED', 'READY'] } },
        { and: [{ status: { equals: 'PENDING' } }, { createdAt: { greater_than: twoHoursAgo } }] },
        { and: [{ status: { equals: 'COMPLETED' } }, { updatedAt: { greater_than: startOfToday } }] },
      ],
    },
    sort: 'pickupAt',
    limit: 200,
    depth: 0,
  })

  return Response.json({
    role: user.role,
    orders: docs.map((o) => ({
      id: String(o.id),
      code: o.code,
      status: o.status,
      customerName: o.customerName,
      phone: o.phone,
      email: o.email ?? null,
      notes: o.notes ?? null,
      pickupAt: o.pickupAt,
      createdAt: o.createdAt,
      paymentMode: o.paymentMode ?? null,
      items: o.items.map((i) => ({ name: i.nameSnap, qty: i.qty, unitCents: i.unitCents })),
      subtotalCents: o.subtotalCents,
      taxCents: o.taxCents,
      totalCents: o.totalCents,
    })),
  })
}
