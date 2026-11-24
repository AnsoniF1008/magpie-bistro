/** Money is always integer cents. Never floats. Format only at display time. */

export function formatPrice(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const abs = Math.abs(Math.trunc(cents))
  const dollars = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, '0')}`
}

/** Menu style: "$15" for whole dollars, "$8.50" otherwise. */
export function formatPriceShort(cents: number): string {
  const full = formatPrice(cents)
  return full.endsWith('.00') ? full.slice(0, -3) : full
}

/** Plain "15.00" for form inputs. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return ''
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

/** Parses what an owner types ("15", "15.5", "$8.50", "8,50") into cents. Null if invalid. */
export function parsePriceToCents(input: string): number | null {
  const m = /^\$?\s*(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(input.trim())
  if (!m) return null
  const dollars = Number(m[1])
  const cents = m[2] ? Number(m[2].padEnd(2, '0')) : 0
  return dollars * 100 + cents
}

/** 5.3 (%) → 530 basis points, tolerant of float representation. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}

export type Totals = { subtotalCents: number; taxCents: number; totalCents: number }

export function computeTotals(lines: { unitCents: number; qty: number }[], taxRateBps: number): Totals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0)
  // Integer half-up rounding: (subtotal × bps + 5000) / 10000
  const taxCents = Math.floor((subtotalCents * taxRateBps + 5000) / 10000)
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents }
}
