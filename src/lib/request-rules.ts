import { z } from 'zod'

import { nyParts } from './time'

export const CAKE_TYPES = ['Cupcakes', 'Custom cake', 'Bundt cake', 'Cheesecake', 'Cookies', 'Something else'] as const

const contact = {
  customerName: z.string().trim().min(2, 'Please enter your name.').max(80),
  phone: z.string().trim().regex(/^[0-9+()\-.\s]{7,20}$/, 'Please enter a phone number we can call.'),
  // Required here: the payment link is sent by email once the bistro approves.
  email: z.email('Please enter an email — we send your confirmation and payment link there.'),
  notes: z.string().trim().max(800).optional(),
}

const httpUrl = z.url({ protocol: /^https?$/, error: 'Use a link that starts with https://' })

export const customRequestSchema = z.object({
  kind: z.literal('CUSTOM'),
  ...contact,
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date you need it.'),
  productType: z.enum(CAKE_TYPES),
  size: z.string().trim().min(1, 'Tell us how many or what size.').max(80),
  flavor: z.string().trim().min(1, 'Tell us the flavor you have in mind.').max(160),
  decoration: z.string().trim().max(1000).optional(),
  message: z.string().trim().max(120).optional(),
  referenceUrl: z.union([z.literal(''), httpUrl]).optional(),
})

export const holidayRequestSchema = z.object({
  kind: z.literal('HOLIDAY'),
  ...contact,
  campaignId: z.string().min(1).max(64),
  items: z
    .array(z.object({ index: z.number().int().min(0).max(200), qty: z.number().int().min(1).max(50), option: z.string().max(120).optional() }))
    .min(1, 'Choose at least one item.')
    .max(30),
})

export const requestSchema = z.discriminatedUnion('kind', [customRequestSchema, holidayRequestSchema])
export type RequestInput = z.infer<typeof requestSchema>

export type Check = { ok: true } | { ok: false; error: string }

/** The date must exist, give the bistro `leadDays` of notice (New York days) and be within a year. */
export function checkLeadDate(desiredDate: string, leadDays: number, now: Date = new Date()): Check {
  const [y, m, d] = desiredDate.split('-').map(Number)
  const wanted = Date.UTC(y, m - 1, d)
  const roundTrip = new Date(wanted)
  if (roundTrip.getUTCFullYear() !== y || roundTrip.getUTCMonth() !== m - 1 || roundTrip.getUTCDate() !== d) return { ok: false, error: 'That date does not exist.' }
  const p = nyParts(now)
  const days = Math.round((wanted - Date.UTC(p.y, p.m - 1, p.d)) / 86_400_000)
  if (days < leadDays) {
    return { ok: false, error: leadDays > 0 ? `Custom orders need at least ${leadDays} day${leadDays === 1 ? '' : 's'} of notice. For something sooner, please call.` : 'Choose today or a later date.' }
  }
  if (days > 365) return { ok: false, error: 'Please choose a date within the next year.' }
  return { ok: true }
}

export type CampaignLike = {
  title: string
  isActive: boolean
  orderByAt: string
  depositPercent: number
  items: { name: string; priceCents: number; options: string[] }[]
}
export type HolidayLine = { name: string; option: string | null; qty: number; unitCents: number }
export type HolidayPricing = { ok: true; lines: HolidayLine[]; totalCents: number; depositCents: number } | { ok: false; error: string }

/** Prices a holiday order from the campaign only, and enforces the order-by deadline. */
export function priceHolidayItems(items: { index: number; qty: number; option?: string }[], campaign: CampaignLike, now: Date = new Date()): HolidayPricing {
  if (!campaign.isActive) return { ok: false, error: 'This holiday is not open for orders.' }
  if (now.getTime() >= new Date(campaign.orderByAt).getTime()) return { ok: false, error: `The deadline for ${campaign.title} orders has passed. Please call the bistro.` }
  const lines: HolidayLine[] = []
  for (const item of items) {
    const product = campaign.items[item.index]
    if (!product) return { ok: false, error: 'One of the items is no longer offered. Please reload the page.' }
    let option: string | null = null
    if (product.options.length) {
      if (!item.option || !product.options.includes(item.option)) return { ok: false, error: `Choose a flavor for ${product.name}.` }
      option = item.option
    }
    lines.push({ name: product.name, option, qty: item.qty, unitCents: product.priceCents })
  }
  const totalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0)
  const depositCents = Math.floor((totalCents * Math.round(campaign.depositPercent) + 50) / 100)
  return { ok: true, lines, totalCents, depositCents }
}
