import type { Metadata } from 'next'
import React from 'react'

import { BistroMap } from '@/components/site/Map'
import { IconMapPin } from '@/components/ui/Icons'
import { SITE } from '@/lib/content'
import { getSettings } from '@/lib/data'
import { formatClock, nyParts, toMinutes, WEEKDAY_NAMES } from '@/lib/time'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/visit' },
  title: 'Visit Us — 1604 S Church Street, Smithfield, VA',
  description: 'Find The Magpie Bistro + Cupcakery at 1604 S Church Street, Suite B, Smithfield, VA 23430. Hours, phone, map and directions.',
}

export default async function VisitPage() {
  const settings = await getSettings()
  const today = nyParts().weekday
  const { hours } = settings.open
  const range = `${formatClock(toMinutes(hours.open))} – ${formatClock(toMinutes(hours.close))}`
  const address = `${settings.addressLine1}, ${settings.addressLine2}`
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${SITE.name}, ${address}`)}`

  return (
    <>
      <div className="wrap page-head">
        <span className="eyebrow">Counter-service takeout</span>
        <h1>Visit Us</h1>
        <p className="section-intro">Counter-service takeout in Smithfield — order at the counter, or call ahead and we’ll have it ready.</p>
      </div>
      <section style={{ paddingTop: 16 }}>
        <div className="wrap">
          <div className="visit-grid">
            <div className="visit-card">
              <h3>{SITE.name}</h3>
              <p style={{ marginBottom: 4 }}>
                {settings.addressLine1}
                <br />
                {settings.addressLine2}
              </p>
              <p style={{ marginBottom: 4 }}>
                Phone: <a href={settings.phoneHref}>{settings.phone}</a>
                <br />
                Email: <a href={`mailto:${settings.email}`}>{settings.email}</a>
                <br />
                {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noopener">Facebook page</a>}
                {settings.instagramUrl && <> · <a href={settings.instagramUrl} target="_blank" rel="noopener">Instagram</a></>}
              </p>
              <table className="hours-table" aria-label="Opening hours">
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                    <tr key={d} className={d === today ? 'today-row' : undefined}>
                      <td>{WEEKDAY_NAMES[d]}</td>
                      <td>{hours.weekdays.includes(d) ? range : 'Closed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)' }}>Hours can change some weeks for family and community events — the weekly schedule is announced on Facebook.</p>
              <p style={{ marginTop: 14 }}>
                <a className="btn btn-ghost btn-sm" href={directions} target="_blank" rel="noopener">
                  <IconMapPin size={16} />
                  <span>Get Directions</span>
                </a>
              </p>
            </div>
            <div className="map-box">
              <BistroMap lat={SITE.geo.lat} lng={SITE.geo.lng} label={SITE.name} address={address} />
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
