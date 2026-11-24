import { boardUser, unauthorized } from '@/lib/board-auth'

export const dynamic = 'force-dynamic'

/** The whole menu (dishes + weekly slots) as JSON — a readable backup. */
export async function GET(req: Request) {
  const { payload, user } = await boardUser(req)
  if (!user) return unauthorized()
  const [dishes, slots] = await Promise.all([
    payload.find({ collection: 'dishes', sort: 'sortOrder', limit: 1000, depth: 0 }),
    payload.find({ collection: 'menu-slots', sort: 'weekday', limit: 2000, depth: 0 }),
  ])
  const body = {
    exportedAt: new Date().toISOString(),
    dishes: dishes.docs.map((d) => ({ id: d.id, slug: d.slug, name: d.nameEn, description: d.descEn ?? null, priceCents: d.priceCents ?? null, category: d.category, isVisible: d.isVisible, isSoldOut: d.isSoldOut, isOrderable: d.isOrderable, isSignature: d.isSignature, sortOrder: d.sortOrder, tags: d.tags ?? [] })),
    slots: slots.docs.map((s) => ({ dishId: typeof s.dish === 'object' && s.dish ? s.dish.id : s.dish, weekday: Number(s.weekday), weekOf: s.weekOf || null, position: s.position ?? 0 })),
  }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="magpie-menu-${body.exportedAt.slice(0, 10)}.json"`, 'Cache-Control': 'no-store' },
  })
}
