import Image from 'next/image'
import React from 'react'

import { servedWeekdays } from '@/lib/availability'
import { SALAD_DRESSINGS } from '@/lib/content'
import { isEntree, toDayMenus, type DishView, type Settings, type WeekDay } from '@/lib/data'
import { formatPriceShort } from '@/lib/money'
import { formatClock, toMinutes, WEEKDAY_NAMES } from '@/lib/time'
import { AddToCart } from './Cart'

const shortHours = (s: Settings) =>
  `${formatClock(toMinutes(s.open.hours.open)).replace(/ [AP]M$/, '')} – ${formatClock(toMinutes(s.open.hours.close)).replace(/ [AP]M$/, '')}`

const samePrice = (dishes: DishView[]) => {
  const prices = [...new Set(dishes.map((d) => d.priceCents))]
  return prices.length === 1 && prices[0] !== null ? prices[0] : null
}

function DayGroup({ title, dishes, ordering }: { title: string; dishes: DishView[]; ordering: boolean }) {
  if (!dishes.length) return null
  const price = samePrice(dishes)
  return (
    <>
      <dt>{title}{price !== null ? ` · ${formatPriceShort(price)}` : ''}</dt>
      {dishes.map((d) => (
        <dd key={d.id}>
          <span className="dish-name">
            {d.name}
            {d.isSoldOut && <span className="soldout">SOLD OUT</span>}
          </span>
          {!d.isSoldOut && <AddToCart dish={d} ordering={ordering} />}
        </dd>
      ))}
    </>
  )
}

export function WeekGrid({ week, todayWeekday, settings }: { week: WeekDay[]; todayWeekday: number; settings: Settings }) {
  const ordering = settings.onlineOrdering
  return (
    <div className="week-grid">
      {week.map((day) => {
        const isToday = day.weekday === todayWeekday
        const entrees = day.dishes.filter(isEntree)
        const soups = day.dishes.filter((d) => d.category === 'SOUP')
        const sweets = day.dishes.filter((d) => d.category === 'DESSERT')
        const others = day.dishes.filter((d) => !isEntree(d) && d.category !== 'SOUP' && d.category !== 'DESSERT')
        return (
          <article key={day.weekday} className={`day-card${isToday ? ' today-card' : ''}`}>
            {isToday && <span className="today-tag">TODAY</span>}
            <h3>
              {WEEKDAY_NAMES[day.weekday]} <span className="day-hours">{shortHours(settings)}</span>
            </h3>
            {day.dishes.length === 0 ? (
              <p style={{ color: 'var(--ink-soft)', margin: '10px 0 0' }}>Menu coming soon — check Facebook or call ahead.</p>
            ) : (
              <dl>
                <DayGroup title="LUNCH COMBO" dishes={entrees} ordering={ordering} />
                <DayGroup title="SOUP OF THE DAY" dishes={soups} ordering={ordering} />
                <DayGroup title="FROM THE CUPCAKERY" dishes={sweets} ordering={ordering} />
                <DayGroup title="ALSO TODAY" dishes={others} ordering={ordering} />
              </dl>
            )}
          </article>
        )
      })}
    </div>
  )
}

function DishRows({ dishes, week, ordering, showPrice }: { dishes: DishView[]; week: WeekDay[]; ordering: boolean; showPrice: boolean }) {
  const menus = toDayMenus(week)
  return (
    <ul className="dish-list">
      {dishes.map((d) => {
        const days = servedWeekdays(d.id, menus)
        return (
          <li key={d.id} className="dish-row">
            <span>
              {d.name}
              {showPrice && d.priceCents !== null && <> — <strong>{formatPriceShort(d.priceCents)}</strong></>}
              {d.isSoldOut && <span className="soldout">SOLD OUT</span>}
              {days && <span className="dish-desc">This week: {days.map((w) => WEEKDAY_NAMES[w]).join(' & ')} only</span>}
              {d.desc && !days && <span className="dish-desc">{d.desc}</span>}
            </span>
            <AddToCart dish={d} ordering={ordering} />
          </li>
        )
      })}
    </ul>
  )
}

export function Rotation({ dishes, week, settings }: { dishes: DishView[]; week: WeekDay[]; settings: Settings }) {
  const ordering = settings.onlineOrdering
  const by = (c: DishView['category']) => dishes.filter((d) => d.category === c)
  const combos = dishes.filter((d) => d.category === 'ENTREE' || d.category === 'SANDWICH')
  const bowls = by('BOWL')
  const soups = by('SOUP')
  const salads = by('SALAD')
  const sweets = by('DESSERT')
  const drinks = by('DRINK')
  const comboPrice = samePrice(combos)
  const priceTag = (list: DishView[]) => {
    const p = samePrice(list)
    return p !== null ? <span className="price">{formatPriceShort(p)}</span> : null
  }
  return (
    <div className="rotation">
      <div className="rot-card">
        <h3>Daily Lunch Combo <span className="price">{comboPrice !== null ? formatPriceShort(comboPrice) : '$15'}</span></h3>
        <p className="sub">The entrée of the day with sides — the best way to try what Jeannie and Tonya are cooking this week.</p>
      </div>
      {bowls.length > 0 && (
        <div className="rot-card">
          <h3>Protein Bowls {priceTag(bowls)}</h3>
          <DishRows dishes={bowls} week={week} ordering={ordering} showPrice={samePrice(bowls) === null} />
        </div>
      )}
      {soups.length > 0 && (
        <div className="rot-card">
          <h3>Rotating Soups {priceTag(soups)}</h3>
          <DishRows dishes={soups} week={week} ordering={ordering} showPrice={samePrice(soups) === null} />
        </div>
      )}
      {salads.length > 0 && (
        <div className="rot-card">
          <h3>Salads {priceTag(salads)}</h3>
          <p className="sub">Classic &amp; specialty salads with homemade dressings: {SALAD_DRESSINGS.join(', ')}.</p>
          <DishRows dishes={salads.map((d) => ({ ...d, desc: null }))} week={week} ordering={ordering} showPrice={samePrice(salads) === null} />
        </div>
      )}
      {sweets.length > 0 && (
        <div className="rot-card">
          <h3>Something Sweet</h3>
          <DishRows dishes={sweets.map((d) => ({ ...d, desc: null }))} week={week} ordering={ordering} showPrice />
          <p className="sub" style={{ margin: '10px 0 0' }}>Dessert cups, bundt slices &amp; cheesecake cups rotate weekly.</p>
        </div>
      )}
      <div className="rot-card">
        <h3>Drinks</h3>
        <p className="sub">{drinks[0]?.desc ? `Bottled beverages — ${drinks[0].desc.charAt(0).toLowerCase()}${drinks[0].desc.slice(1)}` : 'Bottled beverages available à la carte at the counter.'}</p>
      </div>
    </div>
  )
}

export function Signatures({ dishes }: { dishes: DishView[] }) {
  const featured = dishes.flatMap((d) => (d.isSignature && d.image ? [{ dish: d, image: d.image }] : []))
  if (!featured.length) return null
  return (
    <div className="sig-grid">
      {featured.map(({ dish: d, image }) => (
        <article key={d.id} className="sig-card">
          <div className="sig-media">
            <Image src={image.url} alt={image.alt} width={image.width} height={image.height} sizes="(max-width: 640px) 100vw, 360px" />
          </div>
          <div className="sig-body">
            <h3>{d.category === 'DESSERT' && /cookie/i.test(d.name) ? 'Gourmet Cookies' : d.name.replace(/ Sandwich$/, '')}</h3>
            {d.desc && <p>{d.desc}</p>}
          </div>
        </article>
      ))}
    </div>
  )
}
