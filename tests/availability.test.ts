import { describe, expect, it } from 'vitest'
import { isDishAvailableOn, servedWeekdays } from '@/lib/availability'

const week = [
  { weekday: 1, dishIds: ['french-dip', 'broccoli-soup'] },
  { weekday: 2, dishIds: ['bulgogi', 'tortilla-soup'] },
  { weekday: 4, dishIds: ['steak-bites'] },
  { weekday: 5, dishIds: ['stroganoff', 'broccoli-soup'] },
]

describe('isDishAvailableOn', () => {
  it('lets a dish of the day be ordered only for its day', () => {
    expect(isDishAvailableOn('bulgogi', 2, week)).toBe(true)
    expect(isDishAvailableOn('bulgogi', 1, week)).toBe(false)
    expect(isDishAvailableOn('bulgogi', 5, week)).toBe(false)
  })
  it('supports a dish served on several days', () => {
    expect(isDishAvailableOn('broccoli-soup', 1, week)).toBe(true)
    expect(isDishAvailableOn('broccoli-soup', 5, week)).toBe(true)
    expect(isDishAvailableOn('broccoli-soup', 4, week)).toBe(false)
  })
  it('lets dishes that are not on the board be ordered any day', () => {
    expect(isDishAvailableOn('cookie', 1, week)).toBe(true)
    expect(isDishAvailableOn('cookie', 4, week)).toBe(true)
  })
})

describe('servedWeekdays', () => {
  it('lists the days or null for any-day dishes', () => {
    expect(servedWeekdays('broccoli-soup', week)).toEqual([1, 5])
    expect(servedWeekdays('cookie', week)).toBeNull()
  })
})
