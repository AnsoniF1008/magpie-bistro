import { z } from 'zod'

import { boardUser, unauthorized } from '@/lib/board-auth'
import { getSettings } from '@/lib/data'
import { toRelationId } from '@/lib/relations'
import { isValidYmd } from '@/lib/time'

export const dynamic = 'force-dynamic'

const rotationWhere = { or: [{ weekOf: { exists: false } }, { weekOf: { equals: '' } }] }

/** Board data for the week editor: the rotation, this week's overrides and the dish list. */
export async function GET(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const weekOf = new URL(req.url).searchParams.get('weekOf') || ''
  if (weekOf && !isValidYmd(weekOf)) return Response.json({ error: 'Bad week.' }, { status: 400 })

  const settings = await getSettings()
  const [slots, dishes] = await Promise.all([
    payload.find({
      collection: 'menu-slots',
      where: weekOf ? { or: [{ weekOf: { equals: weekOf } }, ...rotationWhere.or] } : rotationWhere,
      sort: 'position',
      limit: 1000,
      depth: 0,
    }),
    payload.find({ collection: 'dishes', sort: 'sortOrder', limit: 500, depth: 0 }),
  ])

  const group = (pick: (weekOfValue: string | null | undefined) => boolean) => {
    const out: Record<string, string[]> = {}
    for (const s of slots.docs) {
      if (!pick(s.weekOf)) continue
      const dishId = String(typeof s.dish === 'object' && s.dish ? s.dish.id : s.dish)
      ;(out[String(s.weekday)] ??= []).push(dishId)
    }
    return out
  }

  return Response.json({
    weekOf: weekOf || null,
    openWeekdays: settings.open.hours.weekdays,
    rotation: group((w) => !w),
    override: weekOf ? group((w) => w === weekOf) : {},
    dishes: dishes.docs.map((d) => ({
      id: String(d.id),
      name: d.nameEn,
      category: d.category,
      priceCents: typeof d.priceCents === 'number' ? d.priceCents : null,
      isSoldOut: Boolean(d.isSoldOut),
      isVisible: d.isVisible !== false,
    })),
  })
}

const putBody = z.object({
  /** null → the regular rotation; a Monday date → that week only */
  weekOf: z.string().refine(isValidYmd, 'Bad week date.').nullable(),
  /** weekday ("1"–"7") → ordered dish ids. Omit a day to leave it on the rotation. */
  days: z.record(z.string().regex(/^[1-7]$/), z.array(z.string().min(1)).max(30)),
})

/** Replaces the slots for one week (or for the rotation) with what the editor sends. */
export async function PUT(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const parsed = putBody.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Could not read the menu you sent.' }, { status: 400 })
  const { weekOf, days } = parsed.data

  const uniqueIds = [...new Set(Object.values(days).flat())]
  if (uniqueIds.length > 0) {
    const relationIds = uniqueIds.map(toRelationId)
    const existing = await payload.find({
      collection: 'dishes',
      where: { id: { in: relationIds } },
      limit: relationIds.length,
      depth: 0,
    })
    const validIds = new Set(existing.docs.map((d) => String(d.id)))
    if (uniqueIds.some((id) => !validIds.has(id))) {
      return Response.json({ error: 'One or more selected dishes no longer exist. Refresh and try again.' }, { status: 400 })
    }
  }

  await payload.delete({ collection: 'menu-slots', where: weekOf ? { weekOf: { equals: weekOf } } : rotationWhere, user, overrideAccess: false })
  const jobs: Array<{ dish: number; weekday: '1'; weekOf: string | undefined; position: number }> = []
  for (const [weekday, dishIds] of Object.entries(days)) {
    for (const [position, dishId] of [...new Set(dishIds)].entries()) {
      jobs.push({ dish: toRelationId(dishId) as number, weekday: weekday as '1', weekOf: weekOf ?? undefined, position })
    }
  }
  await Promise.all(
    jobs.map((data) =>
      payload.create({
        collection: 'menu-slots',
        data,
        user,
        overrideAccess: false,
      }),
    ),
  )
  return Response.json({ ok: true, created: jobs.length })
}
