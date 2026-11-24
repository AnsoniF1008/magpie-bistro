import { NextResponse } from 'next/server'

import { getSettings } from '@/lib/data'
import { isOpenNow, statusLabel } from '@/lib/time'

export const dynamic = 'force-dynamic'

/** Open/closed right now, for the header pill. */
export async function GET() {
  const settings = await getSettings()
  const now = new Date()
  return NextResponse.json(
    { open: isOpenNow(settings.open, now).open, label: statusLabel(settings.open, now) },
    { headers: { 'Cache-Control': 'public, max-age=0, s-maxage=20, stale-while-revalidate=40' } },
  )
}
