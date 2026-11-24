/**
 * Bistro time logic. Everything is computed in America/New_York regardless of
 * where the code runs (browser, Vercel UTC, a laptop in another timezone).
 * Shared by client and server — keep it dependency-free.
 */
export const BISTRO_TZ = 'America/New_York'

export type Hours = {
  /** ISO weekdays the bistro opens: 1 = Monday … 7 = Sunday */
  weekdays: number[]
  /** "HH:MM" 24h, New York wall time */
  open: string
  close: string
}

export type OpenSettings = {
  hours: Hours
  manualClosed: boolean
  closedMessage?: string | null
}

export type NyParts = { y: number; m: number; d: number; weekday: number; minutes: number }

const WEEKDAY_INDEX: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
export const WEEKDAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BISTRO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function nyParts(date: Date = new Date()): NyParts {
  const map: Record<string, string> = {}
  for (const p of partsFormatter.formatToParts(date)) map[p.type] = p.value
  return {
    y: Number(map.year),
    m: Number(map.month),
    d: Number(map.day),
    weekday: WEEKDAY_INDEX[map.weekday] ?? 1,
    minutes: (Number(map.hour) % 24) * 60 + Number(map.minute),
  }
}

/** Converts a New York wall-clock time to the UTC instant it represents. */
export function nyToUtc(y: number, m: number, d: number, minutes: number): Date {
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, minutes)
  let guess = wallAsUtc
  // Two passes settle the offset even across a DST change.
  for (let i = 0; i < 2; i++) {
    const p = nyParts(new Date(guess))
    const shownAsUtc = Date.UTC(p.y, p.m - 1, p.d, 0, p.minutes)
    guess += wallAsUtc - shownAsUtc
  }
  return new Date(guess)
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h)) return 0
  return h * 60 + (Number.isFinite(m) ? m : 0)
}

export function isValidYmd(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function formatClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Calendar-day arithmetic on a New York date, independent of host timezone. */
function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** Monday (YYYY-MM-DD) of the New York week containing `date`. */
export function getWeekOf(date: Date = new Date()): string {
  const p = nyParts(date)
  const mon = addDays(p.y, p.m, p.d, -(p.weekday - 1))
  return ymd(mon.y, mon.m, mon.d)
}

/** Shifts a weekOf string by whole weeks. */
export function shiftWeek(weekOf: string, weeks: number): string {
  const [y, m, d] = weekOf.split('-').map(Number)
  const t = addDays(y, m, d, weeks * 7)
  return ymd(t.y, t.m, t.d)
}

export type OpenState = { open: boolean; reason: 'open' | 'closed-hours' | 'closed-day' | 'manual' }

export function isOpenNow(s: OpenSettings, now: Date = new Date()): OpenState {
  if (s.manualClosed) return { open: false, reason: 'manual' }
  const p = nyParts(now)
  if (!s.hours.weekdays.includes(p.weekday)) return { open: false, reason: 'closed-day' }
  const open = toMinutes(s.hours.open)
  const close = toMinutes(s.hours.close)
  if (p.minutes >= open && p.minutes < close) return { open: true, reason: 'open' }
  return { open: false, reason: 'closed-hours' }
}

export function statusLabel(s: OpenSettings, now: Date = new Date()): string {
  const state = isOpenNow(s, now)
  const openAt = formatClock(toMinutes(s.hours.open))
  if (state.open) return `Open now · until ${formatClock(toMinutes(s.hours.close))}`
  if (state.reason === 'manual') return s.closedMessage?.trim() || 'Closed today'
  const p = nyParts(now)
  if (s.hours.weekdays.includes(p.weekday) && p.minutes < toMinutes(s.hours.open)) {
    return `Closed · opens today at ${openAt}`
  }
  for (let i = 1; i <= 7; i++) {
    const wd = ((p.weekday - 1 + i) % 7) + 1
    if (s.hours.weekdays.includes(wd)) {
      return `Closed · opens ${i === 1 ? 'tomorrow' : WEEKDAY_NAMES[wd]} at ${openAt}`
    }
  }
  return 'Closed'
}

export const MIN_LEAD_MINUTES = 30
export const MAX_DAYS_AHEAD = 7

export type PickupCheck = { ok: true } | { ok: false; error: string }

export function validatePickupAt(pickupAt: Date, s: OpenSettings, now: Date = new Date()): PickupCheck {
  if (Number.isNaN(pickupAt.getTime())) return { ok: false, error: 'Choose a pickup time.' }
  const leadMs = pickupAt.getTime() - now.getTime()
  if (leadMs < MIN_LEAD_MINUTES * 60_000) {
    return { ok: false, error: `Pickup must be at least ${MIN_LEAD_MINUTES} minutes from now.` }
  }
  const p = nyParts(pickupAt)
  const today = nyParts(now)
  const dayDiff = Math.round((Date.UTC(p.y, p.m - 1, p.d) - Date.UTC(today.y, today.m - 1, today.d)) / 86_400_000)
  if (dayDiff > MAX_DAYS_AHEAD) return { ok: false, error: `Pickup can be at most ${MAX_DAYS_AHEAD} days ahead.` }
  if (!s.hours.weekdays.includes(p.weekday)) return { ok: false, error: 'The bistro is closed that day.' }
  if (p.minutes < toMinutes(s.hours.open) || p.minutes > toMinutes(s.hours.close)) {
    return { ok: false, error: `Pickup is available ${formatClock(toMinutes(s.hours.open))} – ${formatClock(toMinutes(s.hours.close))}.` }
  }
  if (s.manualClosed && dayDiff === 0) return { ok: false, error: s.closedMessage?.trim() || 'The bistro is closed today.' }
  return { ok: true }
}

export type PickupSlot = { iso: string; label: string; dayLabel: string }

const SHORT_DAYS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SHORT_MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Every valid 15-minute pickup slot from now through the booking window. */
export function pickupSlots(s: OpenSettings, now: Date = new Date()): PickupSlot[] {
  const today = nyParts(now)
  const open = toMinutes(s.hours.open)
  const close = toMinutes(s.hours.close)
  const out: PickupSlot[] = []
  for (let offset = 0; offset <= MAX_DAYS_AHEAD; offset++) {
    const day = addDays(today.y, today.m, today.d, offset)
    for (let minutes = open; minutes <= close; minutes += 15) {
      const at = nyToUtc(day.y, day.m, day.d, minutes)
      if (!validatePickupAt(at, s, now).ok) continue
      const wd = nyParts(at).weekday
      const prefix = offset === 0 ? 'Today · ' : offset === 1 ? 'Tomorrow · ' : ''
      out.push({
        iso: at.toISOString(),
        label: formatClock(minutes),
        dayLabel: `${prefix}${SHORT_DAYS[wd]}, ${SHORT_MONTHS[day.m]} ${day.d}`,
      })
    }
  }
  return out
}

/** "Mon, Nov 9 · 12:30 PM" in New York time. */
export function formatPickup(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const p = nyParts(d)
  return `${SHORT_DAYS[p.weekday]}, ${SHORT_MONTHS[p.m]} ${p.d} · ${formatClock(p.minutes)}`
}
