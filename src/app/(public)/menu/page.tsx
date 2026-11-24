import type { Metadata } from 'next'
import React from 'react'

import { hoursLine } from '@/components/site/Chrome'
import { Rotation, Signatures, WeekGrid } from '@/components/site/MenuSections'
import { IconClock } from '@/components/ui/Icons'
import { ALLERGY_NOTE, SIGNATURE_LIST } from '@/lib/content'
import { getDishes, getSettings, getWeekMenu } from '@/lib/data'
import { getWeekOf, nyParts } from '@/lib/time'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/menu' },
  title: "This Week's Menu — Lunch Takeout in Smithfield, VA",
  description: 'This week’s lunch at The Magpie Bistro in Smithfield, VA: daily $15 lunch combos, protein bowls, rotating soups, salads, cupcakes and gourmet cookies. Order ahead for pickup.',
}

export default async function MenuPage() {
  const now = new Date()
  const settings = await getSettings()
  const [week, dishes] = await Promise.all([getWeekMenu(getWeekOf(now), settings.open.hours.weekdays), getDishes()])

  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const section = (name: string, list: typeof dishes) => ({
    '@type': 'MenuSection',
    name,
    hasMenuItem: list.map((d) => ({
      '@type': 'MenuItem',
      name: d.name,
      ...(d.desc ? { description: d.desc } : {}),
      ...(d.image ? { image: `${site}${d.image.url}` } : {}),
      ...(d.priceCents !== null
        ? { offers: { '@type': 'Offer', price: (d.priceCents / 100).toFixed(2), priceCurrency: 'USD', availability: d.isSoldOut ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' } }
        : {}),
    })),
  })
  const menuLd = {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'The Magpie Bistro lunch menu',
    url: `${site}/menu`,
    inLanguage: 'en',
    hasMenuSection: [
      section('Lunch combos', dishes.filter((d) => d.category === 'ENTREE' || d.category === 'SANDWICH')),
      section('Protein bowls', dishes.filter((d) => d.category === 'BOWL')),
      section('Soups', dishes.filter((d) => d.category === 'SOUP')),
      section('Salads', dishes.filter((d) => d.category === 'SALAD')),
      section('Cupcakes, cookies & desserts', dishes.filter((d) => d.category === 'DESSERT')),
      section('Drinks', dishes.filter((d) => d.category === 'DRINK')),
    ].filter((s) => s.hasMenuItem.length > 0),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(menuLd).replace(/</g, '\\u003c') }} />
      <div className="wrap page-head">
        <span className="eyebrow">Lunch · Takeout</span>
        <h1>This Week’s Menu</h1>
        <p className="section-intro">
          Lunch is served {hoursLine(settings)}. The lineup rotates every week — Jeannie and Tonya post each week’s menu on{' '}
          {settings.facebookUrl ? <a href={settings.facebookUrl} target="_blank" rel="noopener">Facebook</a> : 'Facebook'}, and some weeks the days change, so check there or call ahead.
        </p>
      </div>

      <section style={{ paddingTop: 8 }}>
        <div className="wrap">
          <WeekGrid week={week} todayWeekday={nyParts(now).weekday} settings={settings} />
          <div className="supplies">
            <span style={{ color: 'var(--gold-strong)', flex: 'none', marginTop: 2 }}><IconClock size={24} /></span>
            <p>
              <strong>Serving while supplies last.</strong> When the doors open there is often a line — and popular dishes sell out.{' '}
              {settings.onlineOrdering ? 'Order ahead online, or call ' : 'Call '}
              <a href={settings.phoneHref}>{settings.phone}</a> to set your lunch aside.
            </p>
          </div>

          <h2 style={{ marginTop: 44 }}>From the Regular Rotation</h2>
          <Rotation dishes={dishes} week={week} settings={settings} />
          <p className="allergy"><strong>Allergy note:</strong> {ALLERGY_NOTE}</p>
        </div>
      </section>

      <section id="signatures">
        <div className="wrap">
          <h2>Counter Favorites</h2>
          <p className="section-intro">The dishes Smithfield keeps coming back for — watch the weekly menu for the day each one appears.</p>
          <Signatures dishes={dishes} />
          <ul className="sig-list">
            {SIGNATURE_LIST.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}
