import type { Metadata } from 'next'
import React from 'react'

import { CheckoutForm, type CatalogEntry, type DayOption } from '@/components/site/CheckoutForm'
import { getDishes, getSettings, getWeekMenu, toDayMenus } from '@/lib/data'
import { stripeEnabled } from '@/lib/stripe'
import { getWeekOf, nyParts, pickupSlots } from '@/lib/time'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Checkout', robots: { index: false } }

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ cancelled?: string }> }) {
  const { cancelled } = await searchParams
  const settings = await getSettings()
  const now = new Date()
  const dishes = await getDishes()

  const catalog: Record<string, CatalogEntry> = {}
  for (const d of dishes) catalog[d.id] = { name: d.name, priceCents: d.priceCents, canOrder: d.canOrder }

  // Group valid slots by day and work out which dishes of the day are not cooked on each.
  const slots = settings.onlineOrdering ? pickupSlots(settings.open, now) : []
  const weeks = new Map<string, ReturnType<typeof toDayMenus>>()
  const days: DayOption[] = []
  for (const slot of slots) {
    let day = days.find((d) => d.label === slot.dayLabel)
    if (!day) {
      const at = new Date(slot.iso)
      const weekOf = getWeekOf(at)
      let week = weeks.get(weekOf)
      if (!week) {
        week = toDayMenus(await getWeekMenu(weekOf, settings.open.hours.weekdays))
        weeks.set(weekOf, week)
      }
      const weekday = nyParts(at).weekday
      const servedToday = new Set(week.find((w) => w.weekday === weekday)?.dishIds ?? [])
      const blocked = [...new Set(week.flatMap((w) => w.dishIds))].filter((id) => !servedToday.has(id))
      day = { key: slot.dayLabel, label: slot.dayLabel, slots: [], blocked }
      days.push(day)
    }
    day.slots.push(slot)
  }

  return (
    <div className="wrap page-head">
      <span className="eyebrow">Pickup order</span>
      <h1>Checkout</h1>
      {!settings.onlineOrdering ? (
        <p className="form-error">Online ordering is paused right now. Please call <a href={settings.phoneHref}>{settings.phone}</a>.</p>
      ) : (
        <CheckoutForm days={days} catalog={catalog} taxRateBps={settings.taxRateBps} demoMode={!stripeEnabled()} cancelled={Boolean(cancelled)} phone={settings.phone} phoneHref={settings.phoneHref} />
      )}
    </div>
  )
}
