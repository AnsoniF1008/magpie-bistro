import { NextResponse } from 'next/server'

import { orderSchema } from '@/lib/order-rules'
import { createOrder, OrderError, siteUrlFrom } from '@/lib/orders'
import { clientIp, rateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

/** Creates a PENDING order and returns the payment URL. */
export async function POST(req: Request) {
  const limit = await rateLimit(`checkout:${clientIp(req.headers)}`, 8, 60)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Please wait a minute and try again.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = orderSchema.safeParse(body)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'form')] ??= issue.message
    return NextResponse.json({ error: Object.values(fields)[0] ?? 'Please check the form.', fields }, { status: 400 })
  }

  try {
    const { redirectUrl } = await createOrder(parsed.data, siteUrlFrom(req))
    return NextResponse.json({ redirectUrl })
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message }, { status: 409 })
    console.error('[checkout] failed', err)
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again or call the bistro.' }, { status: 500 })
  }
}
