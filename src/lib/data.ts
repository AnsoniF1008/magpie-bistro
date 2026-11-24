import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Dish, Media, SiteSetting } from '@/payload-types'
import type { DayMenu } from './availability'
import { percentToBps } from './money'
import { getWeekOf, type OpenSettings } from './time'

export const payloadClient = () => getPayload({ config })

export type ImageView = { url: string; alt: string; width: number; height: number }

export type DishView = {
  id: string
  slug: string
  name: string
  nameEs: string | null
  desc: string | null
  priceCents: number | null
  category: Dish['category']
  isSoldOut: boolean
  /** Has a price, is flagged orderable and is not sold out. */
  canOrder: boolean
  isSignature: boolean
  image: ImageView | null
}

export type Settings = {
  open: OpenSettings
  taxRateBps: number
  onlineOrdering: boolean
  cakeLeadDays: number
  banner: string | null
  phone: string
  phoneHref: string
  email: string
  addressLine1: string
  addressLine2: string
  facebookUrl: string | null
  instagramUrl: string | null
  notificationEmail: string
  heroImage: ImageView | null
  heroCaption: string | null
  cupcakeryImage: ImageView | null
}

function isMediaDoc(media: unknown): media is Media {
  return Boolean(media && typeof media === 'object' && ('url' in media || 'sizes' in media))
}

export function imageView(media: unknown, size: 'card' | 'hero' | 'thumb' = 'card'): ImageView | null {
  if (!isMediaDoc(media)) return null
  const sized = media.sizes?.[size]
  const url = sized?.url || media.url
  if (!url) return null
  return {
    url,
    alt: media.altEn || '',
    width: sized?.width || media.width || 800,
    height: sized?.height || media.height || 600,
  }
}

export function dishView(d: Dish): DishView {
  const priceCents = typeof d.priceCents === 'number' ? d.priceCents : null
  return {
    id: String(d.id),
    slug: d.slug || String(d.id),
    name: d.nameEn,
    nameEs: d.nameEs || null,
    desc: d.descEn || null,
    priceCents,
    category: d.category,
    isSoldOut: Boolean(d.isSoldOut),
    canOrder: Boolean(d.isOrderable) && priceCents !== null && !d.isSoldOut,
    isSignature: Boolean(d.isSignature),
    image: imageView(d.image),
  }
}

export function normalizeSettings(s: SiteSetting): Settings {
  const phone = s.phone || '(757) 339-2423'
  const digits = phone.replace(/\D/g, '')
  return {
    open: {
      hours: {
        weekdays: (s.openWeekdays?.length ? s.openWeekdays : ['1', '2', '4', '5']).map(Number).sort(),
        open: s.openTime || '11:30',
        close: s.closeTime || '16:30',
      },
      manualClosed: Boolean(s.manualClosed),
      closedMessage: s.closedMessage || null,
    },
    taxRateBps: percentToBps(s.taxRatePercent ?? 5.3),
    onlineOrdering: s.onlineOrdering !== false,
    cakeLeadDays: typeof s.cakeLeadDays === 'number' ? s.cakeLeadDays : 3,
    banner: s.bannerEn?.trim() || null,
    phone,
    phoneHref: `tel:+${digits.length === 10 ? '1' : ''}${digits}`,
    email: s.email || 'themagpiecupcakery@gmail.com',
    addressLine1: s.addressLine1 || '1604 S Church Street, Suite B',
    addressLine2: s.addressLine2 || 'Smithfield, VA 23430',
    facebookUrl: s.facebookUrl || null,
    instagramUrl: s.instagramUrl || null,
    notificationEmail: s.notificationEmail || process.env.BISTRO_NOTIFICATION_EMAIL || s.email || 'themagpiecupcakery@gmail.com',
    heroImage: imageView(s.heroImage, 'hero'),
    heroCaption: s.heroCaption || null,
    cupcakeryImage: imageView(s.cupcakeryImage, 'hero'),
  }
}

export async function getSettings(): Promise<Settings> {
  const payload = await payloadClient()
  const s = await payload.findGlobal({ slug: 'site-settings', depth: 1 })
  return normalizeSettings(s)
}

/** Visible dishes in owner-defined order. */
export async function getDishes(): Promise<DishView[]> {
  const payload = await payloadClient()
  const { docs } = await payload.find({
    collection: 'dishes',
    where: { isVisible: { equals: true } },
    sort: 'sortOrder',
    limit: 500,
    depth: 1,
  })
  return docs.map(dishView)
}

export type WeekDay = { weekday: number; dishes: DishView[]; isOverride: boolean }

/**
 * The board for one week: for each open weekday, that week's own slots if the
 * owner set any, otherwise the regular rotation.
 */
export async function getWeekMenu(weekOf: string = getWeekOf(), weekdays?: number[]): Promise<WeekDay[]> {
  const payload = await payloadClient()
  const days = weekdays ?? (await getSettings()).open.hours.weekdays
  const { docs } = await payload.find({
    collection: 'menu-slots',
    where: { or: [{ weekOf: { equals: weekOf } }, { weekOf: { exists: false } }, { weekOf: { equals: '' } }] },
    sort: 'position',
    limit: 500,
    depth: 2,
  })
  return days.map((weekday) => {
    const forDay = docs.filter((s) => Number(s.weekday) === weekday && s.dish && typeof s.dish === 'object')
    const override = forDay.filter((s) => s.weekOf === weekOf)
    const chosen = override.length ? override : forDay.filter((s) => !s.weekOf)
    return {
      weekday,
      isOverride: override.length > 0,
      dishes: chosen.map((s) => dishView(s.dish as Dish)).filter((d, i, all) => all.findIndex((x) => x.id === d.id) === i),
    }
  })
}

export const toDayMenus = (week: WeekDay[]): DayMenu[] => week.map((d) => ({ weekday: d.weekday, dishIds: d.dishes.map((x) => x.id) }))

/** Board roles shown on a day card. */
export const isEntree = (d: DishView) => d.category === 'ENTREE' || d.category === 'BOWL' || d.category === 'SANDWICH'

export type CampaignView = {
  id: string
  title: string
  intro: string | null
  orderByAt: string
  pickupAt: string
  depositPercent: number
  isOpen: boolean
  items: { name: string; detail: string | null; priceCents: number; options: string[] }[]
}

/** Holiday campaigns the owner switched on, soonest deadline first. Past-pickup ones are dropped. */
export async function getHolidayCampaigns(now: Date = new Date()): Promise<CampaignView[]> {
  const payload = await payloadClient()
  const { docs } = await payload.find({ collection: 'holiday-campaigns', where: { isActive: { equals: true } }, sort: 'orderByAt', limit: 20, depth: 0 })
  return docs
    .filter((c) => new Date(c.pickupAt).getTime() + 36 * 3600_000 > now.getTime())
    .map((c) => ({
      id: String(c.id),
      title: c.title,
      intro: c.intro || null,
      orderByAt: c.orderByAt,
      pickupAt: c.pickupAt,
      depositPercent: c.depositPercent,
      isOpen: new Date(c.orderByAt).getTime() > now.getTime(),
      items: c.items.map((i) => ({ name: i.name, detail: i.detail || null, priceCents: i.priceCents, options: i.options ?? [] })),
    }))
}
