import { NextResponse } from 'next/server'

import { clientIp, rateLimit } from '@/lib/ratelimit'
import { requestSchema } from '@/lib/request-rules'
import { createRequest, RequestError } from '@/lib/requests'

export const dynamic = 'force-dynamic'

/** Custom cake requests and holiday pre-orders. Nothing is charged until the owner approves. */
export async function POST(req: Request) {
  const limit = await rateLimit(`cakes:${clientIp(req.headers)}`, 5, 300)
  if (!limit.ok) return NextResponse.json({ error: 'Too many requests. Please wait a few minutes or call the bistro.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } })

  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'form')] ??= issue.message
    return NextResponse.json({ error: Object.values(fields)[0] ?? 'Please check the form.', fields }, { status: 400 })
  }
  try {
    const { code, token } = await createRequest(parsed.data)
    return NextResponse.json({ code, statusUrl: `/request/${token}` })
  } catch (err) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: 409 })
    console.error('[cakes] failed', err)
    return NextResponse.json({ error: 'Something went wrong on our side. Please try again or call the bistro.' }, { status: 500 })
  }
}
