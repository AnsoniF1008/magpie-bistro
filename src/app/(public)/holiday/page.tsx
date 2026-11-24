import type { Metadata } from 'next'
import React from 'react'

import { hoursLine } from '@/components/site/Chrome'
import { Countdown } from '@/components/site/Countdown'
import { HolidayOrderForm } from '@/components/site/RequestForms'
import { ALLERGY_NOTE, HOLIDAY } from '@/lib/content'
import { getHolidayCampaigns, getSettings } from '@/lib/data'
import { formatPriceShort } from '@/lib/money'
import { longDate } from '@/lib/requests'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Holiday Special Orders — Lumpia, Dumplings & Cookie Dough',
  description: 'Holiday special orders from The Magpie Bistro in Smithfield, VA: frozen beef lumpia, Korean beef dumplings and jumbo gourmet cookie dough. Order ahead for Thanksgiving and Christmas pickup.',
  alternates: { canonical: '/holiday' },
}

export default async function HolidayPage() {
  const [settings, campaigns] = await Promise.all([getSettings(), getHolidayCampaigns()])
  // One catalog on the page: the next holiday still taking orders (or the latest one if all are closed).
  const featured = campaigns.find((c) => c.isOpen) ?? campaigns[campaigns.length - 1]

  return (
    <>
      <div className="wrap page-head">
        <span className="eyebrow">Seasonal pre-orders</span>
        <h1>Holiday Special Orders</h1>
        <p className="section-intro">{featured?.intro || HOLIDAY.intro}</p>
      </div>
      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          {!featured ? (
            <div className="supplies">
              <p>There are no holiday pre-orders open right now. Follow the bistro on Facebook for the next one, or call <a href={settings.phoneHref}>{settings.phone}</a>.</p>
            </div>
          ) : (
            <>
              <ul className="price-list" style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '6px 22px', boxShadow: 'var(--shadow)' }}>
                {featured.items.map((i) => (
                  <li key={i.name}>
                    <span>
                      <strong>{i.name}</strong>{i.detail && <> — {i.detail}</>}
                      {i.options.length > 0 && (
                        <>
                          <br />
                          <small style={{ color: 'var(--ink-soft)' }}>{i.options.join(' · ')}</small>
                        </>
                      )}
                    </span>
                    <span className="amt">{formatPriceShort(i.priceCents)}</span>
                  </li>
                ))}
              </ul>

              <div className="deadlines">
                {campaigns.map((c) => (
                  <article className={`deadline-card${c.isOpen ? '' : ' closed'}`} key={c.id}>
                    <h3>{c.title}</h3>
                    <dl>
                      <dt>Order by</dt><dd>{longDate(c.orderByAt)}</dd>
                      <dt>Pick up</dt><dd>{longDate(c.pickupAt)}</dd>
                    </dl>
                    <Countdown to={c.orderByAt} />
                  </article>
                ))}
                <article className="deadline-card">
                  <h3>How to order</h3>
                  <p style={{ margin: 0 }}>
                    Use the form below, call <a href={settings.phoneHref}>{settings.phone}</a>, or message on Facebook Messenger or Instagram DM. Pickup at the bistro, {hoursLine(settings).split(', ')[1]}. {featured.depositPercent}% deposit required.
                  </p>
                </article>
              </div>

              <HolidayOrderForm campaigns={campaigns} phone={settings.phone} phoneHref={settings.phoneHref} />
            </>
          )}
          <p className="allergy"><strong>Allergy note:</strong> {ALLERGY_NOTE}</p>
        </div>
      </section>
    </>
  )
}
