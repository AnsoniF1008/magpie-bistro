/**
 * "Dish of the day" rule.
 * A dish that is on the weekly board is only cooked on its day(s), so it can
 * only be ordered for pickup on a day it is served. Dishes that are not on the
 * board that week (bowls, cookies, drinks…) can be ordered any open day.
 */
export type DayMenu = { weekday: number; dishIds: string[] }

export function isDishAvailableOn(dishId: string, weekday: number, week: DayMenu[]): boolean {
  const onBoard = week.some((d) => d.dishIds.includes(dishId))
  if (!onBoard) return true
  return week.some((d) => d.weekday === weekday && d.dishIds.includes(dishId))
}

/** Weekdays (1–7) on which a board dish is served; null when it is an any-day dish. */
export function servedWeekdays(dishId: string, week: DayMenu[]): number[] | null {
  const days = week.filter((d) => d.dishIds.includes(dishId)).map((d) => d.weekday)
  return days.length ? days : null
}
