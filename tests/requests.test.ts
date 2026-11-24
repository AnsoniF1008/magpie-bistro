import { describe, expect, it } from 'vitest'
import { checkLeadDate, priceHolidayItems, requestSchema, type CampaignLike } from '@/lib/request-rules'

const now = new Date('2026-11-12T15:00:00-05:00') // Thu Nov 12, 3 PM New York

describe('checkLeadDate', () => {
  it('needs the configured days of notice, counted in New York days', () => {
    expect(checkLeadDate('2026-11-14', 3, now).ok).toBe(false)
    expect(checkLeadDate('2026-11-15', 3, now).ok).toBe(true)
    expect(checkLeadDate('2026-11-12', 0, now).ok).toBe(true)
  })
  it('rejects past dates, nonsense and dates over a year away', () => {
    expect(checkLeadDate('2026-11-01', 0, now).ok).toBe(false)
    expect(checkLeadDate('2026-02-31', 0, now).ok).toBe(false)
    expect(checkLeadDate('2028-01-01', 3, now).ok).toBe(false)
  })
  it('uses the New York date late at night, not the UTC date', () => {
    const lateNight = new Date('2026-11-12T23:30:00-05:00') // already Nov 13 in UTC
    expect(checkLeadDate('2026-11-15', 3, lateNight).ok).toBe(true)
  })
})

const campaign: CampaignLike = {
  title: 'Thanksgiving',
  isActive: true,
  orderByAt: '2026-11-18T04:59:00.000Z', // end of Tue Nov 17, New York
  depositPercent: 50,
  items: [
    { name: 'Beef Lumpia', priceCents: 3750, options: [] },
    { name: 'Cookie Dough Balls', priceCents: 4200, options: ['Cookies & Cream', 'Brown Butter Triple Chocolate'] },
  ],
}

describe('priceHolidayItems', () => {
  it('prices from the campaign and computes the deposit', () => {
    const r = priceHolidayItems([{ index: 0, qty: 2 }, { index: 1, qty: 1, option: 'Cookies & Cream' }], campaign, now)
    expect(r).toEqual({
      ok: true,
      lines: [
        { name: 'Beef Lumpia', option: null, qty: 2, unitCents: 3750 },
        { name: 'Cookie Dough Balls', option: 'Cookies & Cream', qty: 1, unitCents: 4200 },
      ],
      totalCents: 11700,
      depositCents: 5850,
    })
  })
  it('rounds an odd deposit half-up to a whole cent', () => {
    const r = priceHolidayItems([{ index: 0, qty: 1 }], { ...campaign, depositPercent: 33 }, now)
    expect(r.ok && r.depositCents).toBe(1238) // 3750 × 33% = 1237.5
  })
  it('refuses orders after the deadline or for a hidden campaign', () => {
    expect(priceHolidayItems([{ index: 0, qty: 1 }], campaign, new Date('2026-11-18T05:00:00.000Z')).ok).toBe(false)
    expect(priceHolidayItems([{ index: 0, qty: 1 }], { ...campaign, isActive: false }, now).ok).toBe(false)
  })
  it('requires a valid flavor when the item has flavors, and rejects unknown items', () => {
    expect(priceHolidayItems([{ index: 1, qty: 1 }], campaign, now).ok).toBe(false)
    expect(priceHolidayItems([{ index: 1, qty: 1, option: 'Mint' }], campaign, now).ok).toBe(false)
    expect(priceHolidayItems([{ index: 7, qty: 1 }], campaign, now).ok).toBe(false)
  })
})

describe('requestSchema', () => {
  const contact = { customerName: 'Ana Pérez', phone: '(757) 555-0100', email: 'ana@example.com' }
  it('accepts a custom cake request', () => {
    const r = requestSchema.safeParse({ kind: 'CUSTOM', ...contact, desiredDate: '2026-12-01', productType: 'Custom cake', size: 'Serves 20', flavor: 'Vanilla', decoration: 'Blue flowers', message: '', referenceUrl: '', notes: '' })
    expect(r.success).toBe(true)
  })
  it('needs an email (the payment link is emailed) and a safe reference link', () => {
    const base = { kind: 'CUSTOM', ...contact, desiredDate: '2026-12-01', productType: 'Cupcakes', size: '24', flavor: 'x', decoration: 'y' }
    expect(requestSchema.safeParse({ ...base, email: '' }).success).toBe(false)
    expect(requestSchema.safeParse({ ...base, referenceUrl: 'javascript:alert(1)' }).success).toBe(false)
    expect(requestSchema.safeParse({ ...base, referenceUrl: 'https://pinterest.com/pin/1' }).success).toBe(true)
  })
  it('accepts a holiday order and ignores any price the browser sends', () => {
    const r = requestSchema.safeParse({ kind: 'HOLIDAY', ...contact, campaignId: '1', items: [{ index: 0, qty: 2, unitCents: 1 }], notes: '' })
    expect(r.success).toBe(true)
    expect(r.success && r.data.kind === 'HOLIDAY' && r.data.items[0]).toEqual({ index: 0, qty: 2 })
  })
  it('rejects an empty holiday order', () => {
    expect(requestSchema.safeParse({ kind: 'HOLIDAY', ...contact, campaignId: '1', items: [] }).success).toBe(false)
  })
})
