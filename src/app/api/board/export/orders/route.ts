import { boardUser, unauthorized } from '@/lib/board-auth'
import { formatPickup, nyToUtc } from '@/lib/time'

export const dynamic = 'force-dynamic'

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/
const dollars = (cents: number) => (cents / 100).toFixed(2)

/** Quotes a CSV cell and defuses spreadsheet formulas typed by customers (=, +, -, @). */
const cell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

/** Orders by pickup date (New York days, inclusive) as a CSV download. */
export async function GET(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const url = new URL(req.url)
  const from = DAY.exec(url.searchParams.get('from') ?? '')
  const to = DAY.exec(url.searchParams.get('to') ?? '')
  if (!from || !to) return Response.json({ error: 'Use from=YYYY-MM-DD&to=YYYY-MM-DD' }, { status: 400 })
  const start = nyToUtc(+from[1], +from[2], +from[3], 0)
  const end = nyToUtc(+to[1], +to[2], +to[3], 24 * 60)
  if (end <= start) return Response.json({ error: 'The end date must not be before the start date.' }, { status: 400 })

  const rows: string[] = [['Order', 'Status', 'Pickup (Eastern)', 'Customer', 'Phone', 'Email', 'Items', 'Notes', 'Subtotal', 'Tax', 'Total', 'Payment', 'Payment reference', 'Placed (UTC)'].map(cell).join(',')]
  for (let page = 1; ; page++) {
    const res = await payload.find({
      collection: 'orders',
      where: { and: [{ pickupAt: { greater_than_equal: start.toISOString() } }, { pickupAt: { less_than: end.toISOString() } }] },
      sort: 'pickupAt',
      limit: 200,
      page,
      depth: 0,
    })
    for (const o of res.docs) {
      rows.push(
        [o.code, o.status, formatPickup(o.pickupAt), o.customerName, o.phone, o.email ?? '', o.items.map((i) => `${i.qty} x ${i.nameSnap}`).join('; '), o.notes ?? '', dollars(o.subtotalCents), dollars(o.taxCents), dollars(o.totalCents), o.paymentMode ?? '', o.stripeId ?? '', o.createdAt]
          .map(cell)
          .join(','),
      )
    }
    if (!res.hasNextPage) break
  }

  return new Response('﻿' + rows.join('\r\n') + '\r\n', {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="magpie-orders-${from[0]}-to-${to[0]}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
