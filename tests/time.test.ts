import { describe, expect, it } from 'vitest'
import { getWeekOf, isOpenNow, isValidYmd, nyParts, nyToUtc, pickupSlots, statusLabel, validatePickupAt, type OpenSettings } from '@/lib/time'

const S: OpenSettings = { hours: { weekdays: [1, 2, 4, 5], open: '11:30', close: '16:30' }, manualClosed: false }
// 2026-11-09 is a Monday (EST, UTC-5). 2026-07-06 is a Monday (EDT, UTC-4).
const est = (d: string, hm: string) => new Date(`${d}T${hm}:00-05:00`)
const edt = (d: string, hm: string) => new Date(`${d}T${hm}:00-04:00`)

describe('nyParts', () => {
  it('reads New York wall time regardless of host timezone', () => {
    expect(nyParts(est('2026-11-09', '11:30'))).toMatchObject({ y: 2026, m: 11, d: 9, weekday: 1, minutes: 690 })
    expect(nyParts(edt('2026-07-06', '16:29'))).toMatchObject({ weekday: 1, minutes: 989 })
  })
  it('treats Sunday as weekday 7', () => {
    expect(nyParts(est('2026-11-08', '12:00')).weekday).toBe(7)
  })
})

describe('nyToUtc', () => {
  it('round-trips in both EST and EDT', () => {
    expect(nyToUtc(2026, 11, 9, 690).toISOString()).toBe('2026-11-09T16:30:00.000Z')
    expect(nyToUtc(2026, 7, 6, 690).toISOString()).toBe('2026-07-06T15:30:00.000Z')
  })
})

describe('isOpenNow', () => {
  it('is closed one minute before opening and open at opening', () => {
    expect(isOpenNow(S, est('2026-11-09', '11:29'))).toEqual({ open: false, reason: 'closed-hours' })
    expect(isOpenNow(S, est('2026-11-09', '11:30'))).toEqual({ open: true, reason: 'open' })
  })
  it('closes exactly at closing time', () => {
    expect(isOpenNow(S, est('2026-11-09', '16:29')).open).toBe(true)
    expect(isOpenNow(S, est('2026-11-09', '16:30'))).toEqual({ open: false, reason: 'closed-hours' })
  })
  it('is closed on Wednesday', () => {
    expect(isOpenNow(S, est('2026-11-11', '12:00'))).toEqual({ open: false, reason: 'closed-day' })
  })
  it('respects the manual override', () => {
    expect(isOpenNow({ ...S, manualClosed: true }, est('2026-11-09', '12:00'))).toEqual({ open: false, reason: 'manual' })
  })
  it('works during daylight saving time', () => {
    expect(isOpenNow(S, edt('2026-07-06', '11:30')).open).toBe(true)
    expect(isOpenNow(S, edt('2026-07-06', '11:29')).open).toBe(false)
  })
})

describe('statusLabel', () => {
  it('describes the current state like the original site', () => {
    expect(statusLabel(S, est('2026-11-09', '12:00'))).toBe('Open now · until 4:30 PM')
    expect(statusLabel(S, est('2026-11-09', '09:00'))).toBe('Closed · opens today at 11:30 AM')
    expect(statusLabel(S, est('2026-11-09', '17:00'))).toBe('Closed · opens tomorrow at 11:30 AM')
    expect(statusLabel(S, est('2026-11-10', '17:00'))).toBe('Closed · opens Thursday at 11:30 AM')
  })
  it('shows the owner message when manually closed', () => {
    expect(statusLabel({ ...S, manualClosed: true, closedMessage: 'Closed for Thanksgiving' }, est('2026-11-09', '12:00'))).toBe('Closed for Thanksgiving')
  })
})

describe('getWeekOf', () => {
  it('returns the Monday of the New York week', () => {
    expect(getWeekOf(est('2026-11-12', '00:45'))).toBe('2026-11-09')
    expect(getWeekOf(est('2026-11-09', '00:01'))).toBe('2026-11-09')
  })
  it('keeps late Sunday night in the previous week even though UTC is already Monday', () => {
    expect(getWeekOf(est('2026-11-08', '23:30'))).toBe('2026-11-02')
  })
  it('crosses month boundaries', () => {
    expect(getWeekOf(est('2026-12-02', '12:00'))).toBe('2026-11-30')
  })
})

describe('validatePickupAt', () => {
  const now = est('2026-11-09', '12:00')
  it('rejects less than 30 minutes of lead time', () => {
    expect(validatePickupAt(est('2026-11-09', '12:29'), S, now).ok).toBe(false)
    expect(validatePickupAt(est('2026-11-09', '12:31'), S, now).ok).toBe(true)
  })
  it('rejects outside opening hours and closed days', () => {
    expect(validatePickupAt(est('2026-11-10', '11:00'), S, now).ok).toBe(false)
    expect(validatePickupAt(est('2026-11-10', '16:45'), S, now).ok).toBe(false)
    expect(validatePickupAt(est('2026-11-11', '12:00'), S, now).ok).toBe(false)
  })
  it('rejects more than 7 days ahead', () => {
    expect(validatePickupAt(est('2026-11-16', '11:45'), S, now).ok).toBe(true)
    expect(validatePickupAt(est('2026-11-17', '12:00'), S, now).ok).toBe(false)
  })
  it('rejects same-day pickup while manually closed', () => {
    const closed = { ...S, manualClosed: true }
    expect(validatePickupAt(est('2026-11-09', '13:00'), closed, now).ok).toBe(false)
    expect(validatePickupAt(est('2026-11-10', '13:00'), closed, now).ok).toBe(true)
  })
})

describe('pickupSlots', () => {
  it('only offers valid quarter-hour slots', () => {
    const now = est('2026-11-09', '12:00')
    const slots = pickupSlots(S, now)
    expect(slots[0].iso).toBe(est('2026-11-09', '12:30').toISOString())
    expect(slots.every((s) => validatePickupAt(new Date(s.iso), S, now).ok)).toBe(true)
    expect(slots.some((s) => s.dayLabel.startsWith('Wed'))).toBe(false)
  })
})

describe('isValidYmd', () => {
  it('accepts valid calendar dates and rejects impossible ones', () => {
    expect(isValidYmd('2026-11-09')).toBe(true)
    expect(isValidYmd('2024-02-29')).toBe(true)
    expect(isValidYmd('2026-02-29')).toBe(false)
    expect(isValidYmd('2026-99-99')).toBe(false)
    expect(isValidYmd('2026-11-9')).toBe(false)
  })
})
