import { describe, expect, it } from 'vitest'
import { buildLines, orderSchema, type OrderableDish } from '@/lib/order-rules'

const valid = {
  customerName: 'Ana Pérez',
  phone: '(757) 555-0100',
  email: '',
  notes: '',
  pickupAt: '2026-11-09T17:30:00.000Z',
  allergyAck: true,
  items: [{ dishId: '1', qty: 2 }],
}

describe('orderSchema', () => {
  it('accepts a normal order', () => {
    expect(orderSchema.safeParse(valid).success).toBe(true)
  })
  it('requires the allergy acknowledgement', () => {
    expect(orderSchema.safeParse({ ...valid, allergyAck: false }).success).toBe(false)
    const { allergyAck: _omit, ...rest } = valid
    expect(orderSchema.safeParse(rest).success).toBe(false)
  })
  it('rejects empty carts and bad quantities', () => {
    expect(orderSchema.safeParse({ ...valid, items: [] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, items: [{ dishId: '1', qty: 0 }] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, items: [{ dishId: '1', qty: 21 }] }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, items: [{ dishId: '1', qty: 1.5 }] }).success).toBe(false)
  })
  it('validates contact details', () => {
    expect(orderSchema.safeParse({ ...valid, customerName: ' ' }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, phone: 'call me' }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
    expect(orderSchema.safeParse({ ...valid, email: 'ana@example.com' }).success).toBe(true)
  })
  it('ignores a client-supplied price or total', () => {
    const parsed = orderSchema.parse({ ...valid, totalCents: 1, items: [{ dishId: '1', qty: 1, unitCents: 1 }] })
    expect(parsed).not.toHaveProperty('totalCents')
    expect(parsed.items[0]).not.toHaveProperty('unitCents')
  })
})

describe('buildLines', () => {
  const dishes: OrderableDish[] = [
    { id: '1', name: 'Korean Bulgogi Bowl', priceCents: 1500, isVisible: true, isSoldOut: false, isOrderable: true },
    { id: '2', name: 'Cookie', priceCents: 350, isVisible: true, isSoldOut: false, isOrderable: true },
    { id: '3', name: 'Sold Out Soup', priceCents: 850, isVisible: true, isSoldOut: true, isOrderable: true },
    { id: '4', name: 'Hidden', priceCents: 850, isVisible: false, isSoldOut: false, isOrderable: true },
    { id: '5', name: 'Banana Pudding Cups', priceCents: null, isVisible: true, isSoldOut: false, isOrderable: false },
  ]
  it('prices lines from the catalog and snapshots the name', () => {
    const r = buildLines([{ dishId: '1', qty: 2 }, { dishId: '2', qty: 3 }], dishes)
    expect(r).toEqual({ ok: true, lines: [
      { dishId: '1', nameSnap: 'Korean Bulgogi Bowl', qty: 2, unitCents: 1500 },
      { dishId: '2', nameSnap: 'Cookie', qty: 3, unitCents: 350 },
    ] })
  })
  it('merges duplicate dishes and caps the merged quantity', () => {
    const r = buildLines([{ dishId: '2', qty: 15 }, { dishId: '2', qty: 15 }], dishes)
    expect(r.ok).toBe(false)
    const ok = buildLines([{ dishId: '2', qty: 2 }, { dishId: '2', qty: 3 }], dishes)
    expect(ok.ok && ok.lines).toEqual([{ dishId: '2', nameSnap: 'Cookie', qty: 5, unitCents: 350 }])
  })
  it('rejects sold-out, hidden, unpriced and unknown dishes, naming the dish', () => {
    const sold = buildLines([{ dishId: '3', qty: 1 }], dishes)
    expect(sold).toEqual({ ok: false, error: 'Sold Out Soup just sold out. Please remove it from your order.' })
    expect(buildLines([{ dishId: '4', qty: 1 }], dishes).ok).toBe(false)
    expect(buildLines([{ dishId: '5', qty: 1 }], dishes).ok).toBe(false)
    expect(buildLines([{ dishId: '999', qty: 1 }], dishes).ok).toBe(false)
  })
})
