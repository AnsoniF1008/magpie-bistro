import 'server-only'

import crypto from 'crypto'
import type { PayloadRequest } from 'payload'

import type { CustomCakeRequest, HolidayCampaign } from '@/payload-types'
import { getSettings, normalizeSettings, payloadClient, type Settings } from './data'
import { esc, sendMail, shell } from './email'
import { formatPrice } from './money'
import { checkLeadDate, priceHolidayItems, type RequestInput } from './request-rules'
import { nyParts } from './time'

export class RequestError extends Error {}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const newCode = (prefix: string) => `${prefix}-` + Array.from(crypto.randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join('')

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const requestUrl = (token: string) => `${siteUrl()}/request/${token}`

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** "Tuesday, November 24" for a stored date, read in New York time. */
export function longDate(value: string | Date): string {
  const p = nyParts(typeof value === 'string' ? new Date(value) : value)
  return `${DAYS[p.weekday]}, ${MONTHS[p.m - 1]} ${p.d}`
}

/** Dates chosen as a calendar day are stored at noon New York so they never slip a day. */
const dayToIso = (ymd: string) => new Date(`${ymd}T17:00:00.000Z`).toISOString()

export const requestLabel = (r: Pick<CustomCakeRequest, 'kind'>) => (r.kind === 'HOLIDAY' ? 'holiday order' : 'custom order')

export function describeRequest(r: CustomCakeRequest): string[] {
  if (r.kind === 'HOLIDAY') {
    return (r.holidayItems ?? []).map((i) => `${i.qty} × ${i.name}${i.option ? ` (${i.option})` : ''} — ${formatPrice(i.unitCents * i.qty)}`)
  }
  return [
    [r.productType, r.size].filter(Boolean).join(' · '),
    r.flavor ? `Flavor: ${r.flavor}` : '',
    r.decoration ? `Design: ${r.decoration}` : '',
    r.message ? `Message on it: “${r.message}”` : '',
    r.referenceUrl ? `Reference: ${r.referenceUrl}` : '',
  ].filter(Boolean)
}

const list = (lines: string[]) => `<ul style="padding-left:18px;margin:10px 0;font-size:15px">${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`
const button = (href: string, text: string) => `<p style="margin:18px 0"><a href="${esc(href)}" style="background:#A8741C;color:#FFFDF8;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;display:inline-block">${esc(text)}</a></p>`

export async function createRequest(input: RequestInput): Promise<{ code: string; token: string }> {
  const payload = await payloadClient()
  const settings = await getSettings()
  const now = new Date()
  const base = {
    status: 'PENDING_REVIEW' as const,
    customerName: input.customerName,
    phone: input.phone,
    email: input.email,
    notes: input.notes || undefined,
    publicToken: crypto.randomBytes(24).toString('base64url'),
  }

  let data: Omit<CustomCakeRequest, 'id' | 'createdAt' | 'updatedAt'>
  if (input.kind === 'CUSTOM') {
    const lead = checkLeadDate(input.desiredDate, settings.cakeLeadDays, now)
    if (!lead.ok) throw new RequestError(lead.error)
    data = {
      ...base,
      code: newCode('C'),
      kind: 'CUSTOM',
      desiredDate: dayToIso(input.desiredDate),
      productType: input.productType,
      size: input.size,
      flavor: input.flavor,
      decoration: input.decoration || undefined,
      message: input.message || undefined,
      referenceUrl: input.referenceUrl || undefined,
    }
  } else {
    const campaign = (await payload.findByID({ collection: 'holiday-campaigns', id: input.campaignId, disableErrors: true, depth: 0 })) as HolidayCampaign | null
    if (!campaign) throw new RequestError('That holiday is no longer open for orders.')
    const priced = priceHolidayItems(
      input.items,
      {
        title: campaign.title,
        isActive: campaign.isActive !== false,
        orderByAt: campaign.orderByAt,
        depositPercent: campaign.depositPercent,
        items: campaign.items.map((i) => ({ name: i.detail ? `${i.name} — ${i.detail}` : i.name, priceCents: i.priceCents, options: i.options ?? [] })),
      },
      now,
    )
    if (!priced.ok) throw new RequestError(priced.error)
    data = {
      ...base,
      code: newCode('H'),
      kind: 'HOLIDAY',
      desiredDate: campaign.pickupAt,
      campaign: campaign.id,
      productType: `${campaign.title} pre-order`,
      holidayItems: priced.lines.map((l) => ({ name: l.name, option: l.option ?? undefined, qty: l.qty, unitCents: l.unitCents })),
      orderTotalCents: priced.totalCents,
      quoteCents: priced.depositCents, // suggested amount; the owner confirms it when approving
    }
  }

  const created = await payload.create({ collection: 'custom-cake-requests', data })
  await notifyRequestReceived(created, settings)
  return { code: created.code, token: created.publicToken }
}

async function notifyRequestReceived(r: CustomCakeRequest, settings: Settings) {
  const lines = describeRequest(r)
  const when = longDate(r.desiredDate)
  await Promise.all([
    sendMail({
      to: r.email,
      replyTo: settings.email,
      subject: `We received your ${requestLabel(r)} ${r.code} — The Magpie Bistro`,
      html: shell(
        `Thank you, ${r.customerName}!`,
        `<p style="font-size:16px">We received your ${requestLabel(r)} <strong>${esc(r.code)}</strong> for <strong>${esc(when)}</strong>.</p>${list(lines)}
<p style="font-size:15px">Nothing has been charged. Jeannie or Tonya will review it and email you a confirmation with a payment link${r.kind === 'HOLIDAY' ? ' for the deposit' : ''}.</p>
<p style="font-size:14px;color:#5E5342">Questions? Call ${esc(settings.phone)}.</p>`,
      ),
      text: `Thank you, ${r.customerName}!\nWe received your ${requestLabel(r)} ${r.code} for ${when}.\n${lines.map((l) => `- ${l}`).join('\n')}\n\nNothing has been charged. We will review it and email you a payment link.\nQuestions? Call ${settings.phone}.`,
    }),
    sendMail({
      to: settings.notificationEmail,
      replyTo: r.email,
      subject: `New ${requestLabel(r)} ${r.code} to review — ${r.customerName}, ${when}`,
      html: shell(
        `New ${requestLabel(r)} ${r.code}`,
        `<p style="font-size:16px"><strong>${esc(r.customerName)}</strong> · <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a> · ${esc(r.email)}</p>
<p style="font-size:17px"><strong>For: ${esc(when)}</strong></p>${list(lines)}
${r.notes ? `<p style="font-size:15px;background:#F0E3C4;border-radius:8px;padding:10px 12px"><strong>Notes:</strong> ${esc(r.notes)}</p>` : ''}
${button(`${siteUrl()}/admin/collections/custom-cake-requests/${r.id}`, 'Review this request')}
<p style="font-size:14px;color:#5E5342">Enter the amount, set Status to Approved and save — the customer gets a payment link.</p>`,
      ),
      text: `New ${requestLabel(r)} ${r.code}\n${r.customerName} · ${r.phone} · ${r.email}\nFor: ${when}\n${lines.map((l) => `- ${l}`).join('\n')}${r.notes ? `\nNotes: ${r.notes}` : ''}\n\nReview: ${siteUrl()}/admin/collections/custom-cake-requests/${r.id}`,
    }),
  ])
}

/** Called by the collection hook when the owner switches a request to Approved or Rejected. */
export async function notifyRequestDecision(r: CustomCakeRequest, req: PayloadRequest) {
  const settings = normalizeSettings(await req.payload.findGlobal({ slug: 'site-settings', depth: 1, req }))
  const when = longDate(r.desiredDate)
  if (r.status === 'APPROVED') {
    const amount = formatPrice(r.quoteCents ?? 0)
    const link = requestUrl(r.publicToken)
    const what = r.kind === 'HOLIDAY' ? `A deposit of <strong>${amount}</strong> confirms it; the rest is due at pickup.` : `The total is <strong>${amount}</strong>.`
    await sendMail({
      to: r.email,
      replyTo: settings.email,
      subject: `Your ${requestLabel(r)} ${r.code} is approved — pay to confirm`,
      html: shell(
        `Good news, ${r.customerName}!`,
        `<p style="font-size:16px">We can make your ${requestLabel(r)} <strong>${esc(r.code)}</strong> for <strong>${esc(when)}</strong>. ${what}</p>
${r.ownerNote ? `<p style="font-size:15px;background:#F0E3C4;border-radius:8px;padding:10px 12px">${esc(r.ownerNote)}</p>` : ''}
${list(describeRequest(r))}${button(link, `Pay ${amount} to confirm`)}
<p style="font-size:14px;color:#5E5342">Your order is confirmed once payment is received. Questions? Call ${esc(settings.phone)}.</p>`,
      ),
      text: `Good news, ${r.customerName}! We can make your ${requestLabel(r)} ${r.code} for ${when}.\nAmount due now: ${amount}\n${r.ownerNote ? `${r.ownerNote}\n` : ''}Pay here to confirm: ${link}\nQuestions? Call ${settings.phone}.`,
    })
  } else if (r.status === 'REJECTED') {
    await sendMail({
      to: r.email,
      replyTo: settings.email,
      subject: `About your ${requestLabel(r)} ${r.code} — The Magpie Bistro`,
      html: shell(
        `We’re sorry, ${r.customerName}`,
        `<p style="font-size:16px">We aren’t able to take your ${requestLabel(r)} <strong>${esc(r.code)}</strong> for ${esc(when)}.</p>
<p style="font-size:15px;background:#F0E3C4;border-radius:8px;padding:10px 12px">${esc(r.rejectionReason ?? '')}</p>
<p style="font-size:15px">Nothing was charged. If another date or design could work, call us at ${esc(settings.phone)} — we’d love to help.</p>`,
      ),
      text: `We're sorry, ${r.customerName}. We aren't able to take your ${requestLabel(r)} ${r.code} for ${when}.\n${r.rejectionReason ?? ''}\nNothing was charged. Call ${settings.phone} if another date could work.`,
    })
  }
}

/** APPROVED → PAID exactly once (webhook retries and the return page may both call it). */
export async function markRequestPaid(requestId: string | number, paymentRef: string): Promise<{ alreadyPaid: boolean; request: CustomCakeRequest | null }> {
  const payload = await payloadClient()
  const { docs } = await payload.update({
    collection: 'custom-cake-requests',
    where: { and: [{ id: { equals: requestId } }, { status: { equals: 'APPROVED' } }] },
    data: { status: 'PAID', stripeId: paymentRef, paidAt: new Date().toISOString() },
  })
  if (docs.length === 0) {
    const existing = await payload.findByID({ collection: 'custom-cake-requests', id: requestId, disableErrors: true, depth: 0 })
    return { alreadyPaid: true, request: existing }
  }
  const r = docs[0]
  const settings = await getSettings()
  const amount = formatPrice(r.quoteCents ?? 0)
  const when = longDate(r.desiredDate)
  await Promise.all([
    sendMail({
      to: r.email,
      replyTo: settings.email,
      subject: `Payment received — ${requestLabel(r)} ${r.code} is confirmed`,
      html: shell('You’re all set!', `<p style="font-size:16px">We received <strong>${amount}</strong> for your ${requestLabel(r)} <strong>${esc(r.code)}</strong>.</p><p style="font-size:16px"><strong>Pickup:</strong> ${esc(when)} at ${esc(settings.addressLine1)}, ${esc(settings.addressLine2)}</p>${list(describeRequest(r))}<p style="font-size:14px;color:#5E5342">Questions? Call ${esc(settings.phone)}.</p>`),
      text: `We received ${amount} for your ${requestLabel(r)} ${r.code}.\nPickup: ${when} at ${settings.addressLine1}, ${settings.addressLine2}\nQuestions? Call ${settings.phone}.`,
    }),
    sendMail({
      to: settings.notificationEmail,
      subject: `PAID ${amount} — ${requestLabel(r)} ${r.code}, ${r.customerName}, ${when}`,
      html: shell(`${r.code} is paid`, `<p style="font-size:16px"><strong>${esc(r.customerName)}</strong> paid <strong>${amount}</strong> for ${esc(when)}.</p>${list(describeRequest(r))}`),
      text: `${r.customerName} paid ${amount} for ${requestLabel(r)} ${r.code}, ${when}.`,
    }),
  ])
  return { alreadyPaid: false, request: r }
}

export async function findRequestByToken(token: string): Promise<CustomCakeRequest | null> {
  if (!token || token.length < 20) return null
  const payload = await payloadClient()
  const { docs } = await payload.find({ collection: 'custom-cake-requests', where: { publicToken: { equals: token } }, limit: 1, depth: 0 })
  return docs[0] ?? null
}
