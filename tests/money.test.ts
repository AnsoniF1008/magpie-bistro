import { describe, expect, it } from 'vitest'
import { computeTotals, formatPrice, formatPriceShort, parsePriceToCents, percentToBps } from '@/lib/money'

describe('formatPrice', () => {
  it('formats integer cents', () => {
    expect(formatPrice(1500)).toBe('$15.00')
    expect(formatPrice(850)).toBe('$8.50')
    expect(formatPrice(5)).toBe('$0.05')
    expect(formatPrice(123456)).toBe('$1,234.56')
  })
  it('drops .00 in the short menu format', () => {
    expect(formatPriceShort(1500)).toBe('$15')
    expect(formatPriceShort(850)).toBe('$8.50')
  })
})

describe('parsePriceToCents', () => {
  it('accepts the formats an owner would type', () => {
    expect(parsePriceToCents('15.00')).toBe(1500)
    expect(parsePriceToCents('15')).toBe(1500)
    expect(parsePriceToCents('15.5')).toBe(1550)
    expect(parsePriceToCents(' $8.50 ')).toBe(850)
    expect(parsePriceToCents('8,50')).toBe(850)
    expect(parsePriceToCents('0.07')).toBe(7)
  })
  it('rejects anything ambiguous', () => {
    for (const bad of ['', 'abc', '15.999', '-3', '1.2.3', '15 dollars']) expect(parsePriceToCents(bad)).toBeNull()
  })
})

describe('computeTotals', () => {
  it('sums lines and rounds tax half-up in integer math', () => {
    expect(computeTotals([{ unitCents: 850, qty: 1 }], 530)).toEqual({ subtotalCents: 850, taxCents: 45, totalCents: 895 })
    expect(computeTotals([{ unitCents: 1500, qty: 1 }], 530)).toEqual({ subtotalCents: 1500, taxCents: 80, totalCents: 1580 })
    expect(computeTotals([{ unitCents: 1500, qty: 2 }, { unitCents: 450, qty: 3 }], 530)).toEqual({ subtotalCents: 4350, taxCents: 231, totalCents: 4581 })
  })
  it('handles a zero rate', () => {
    expect(computeTotals([{ unitCents: 999, qty: 1 }], 0).taxCents).toBe(0)
  })
})

describe('percentToBps', () => {
  it('converts an owner-entered percent without float drift', () => {
    expect(percentToBps(5.3)).toBe(530)
    expect(percentToBps(11.3)).toBe(1130)
    expect(percentToBps(0)).toBe(0)
  })
})
