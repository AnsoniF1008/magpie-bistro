import { boardUser, unauthorized } from '@/lib/board-auth'
import { nyParts, nyToUtc } from '@/lib/time'

export const dynamic = 'force-dynamic'

/** Numbers for the admin dashboard cards. "Today" is the New York calendar day. */
export async function GET(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const p = nyParts()
  const start = nyToUtc(p.y, p.m, p.d, 0).toISOString()
  const end = nyToUtc(p.y, p.m, p.d, 24 * 60).toISOString()

  const [today, waiting, soldOut, toReview] = await Promise.all([
    payload.find({
      collection: 'orders',
      where: { and: [{ pickupAt: { greater_than_equal: start } }, { pickupAt: { less_than: end } }, { status: { in: ['CONFIRMED', 'READY', 'COMPLETED'] } }] },
      limit: 500,
      depth: 0,
    }),
    payload.count({ collection: 'orders', where: { status: { equals: 'CONFIRMED' } } }),
    payload.find({ collection: 'dishes', where: { isSoldOut: { equals: true } }, limit: 50, depth: 0 }),
    payload.count({ collection: 'custom-cake-requests', where: { status: { equals: 'PENDING_REVIEW' } } }),
  ])

  return Response.json({
    todayCount: today.totalDocs,
    todayRevenueCents: today.docs.reduce((sum, o) => sum + o.totalCents, 0),
    toPrepare: waiting.totalDocs,
    requestsToReview: toReview.totalDocs,
    soldOut: soldOut.docs.map((d) => ({ id: String(d.id), name: d.nameEn })),
  })
}
