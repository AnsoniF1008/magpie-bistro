import Link from 'next/link'
import React from 'react'

import { IconPhone } from '@/components/ui/Icons'
import { SITE } from '@/lib/content'
import type { Settings } from '@/lib/data'
import { formatClock, toMinutes, WEEKDAY_NAMES } from '@/lib/time'
import { Brand } from './Brand'
import { CartButton } from './Cart'
import { CookieSettingsLink } from './Consent'
import { MobileNav, Nav } from './Nav'
import { StatusPill, type Status } from './StatusPill'

export const hoursLine = (s: Settings) =>
  `${s.open.hours.weekdays.map((d) => WEEKDAY_NAMES[d].slice(0, 3)).join(' · ')}, ${formatClock(toMinutes(s.open.hours.open))} – ${formatClock(toMinutes(s.open.hours.close))}`

export function Header({ settings, status }: { settings: Settings; status: Status }) {
  const hours = hoursLine(settings)
  return (
    <header className="site">
      <div className="wrap header-in">
        <Brand />
        <div className="header-status-desktop">
          <StatusPill initial={status} />
        </div>
        <Nav />
        <div className="header-actions">
          {settings.onlineOrdering && <CartButton />}
          <a className="btn btn-call btn-sm header-call" href={settings.phoneHref}>
            <IconPhone size={16} />
            <span>Call {settings.phone}</span>
          </a>
          <MobileNav
            hours={hours}
            addressLine1={settings.addressLine1}
            addressLine2={settings.addressLine2}
            phone={settings.phone}
            phoneHref={settings.phoneHref}
            statusLabel={status.label}
            isOpen={status.open}
          />
        </div>
      </div>
    </header>
  )
}

export function Footer({ settings }: { settings: Settings }) {
  return (
    <footer className="site">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-verse">{SITE.verse} — {SITE.verseRef}</p>
          <p>Smithfield, Virginia · Takeout lunch &amp; custom cupcakery</p>
          <p style={{ marginTop: 14 }}>
            <Link href="/legal/privacy">Privacy</Link> · <Link href="/legal/terms">Terms</Link> · <Link href="/legal/allergy">Allergy notice</Link>
            {process.env.NEXT_PUBLIC_GA_ID && <> · <CookieSettingsLink /></>}
          </p>
        </div>
        <div>
          <p><strong>{SITE.name}</strong></p>
          <p>{settings.addressLine1}, {settings.addressLine2}</p>
          <p>
            <a href={settings.phoneHref}>{settings.phone}</a> · <a href={`mailto:${settings.email}`}>{settings.email}</a>
          </p>
          <p>{hoursLine(settings)} · Takeout only</p>
          {settings.facebookUrl && (
            <p>
              <a href={settings.facebookUrl} target="_blank" rel="noopener">Follow this week’s menu on Facebook</a>
              {settings.instagramUrl && <> · <a href={settings.instagramUrl} target="_blank" rel="noopener">Instagram</a></>}
            </p>
          )}
        </div>
      </div>
    </footer>
  )
}

export function CallBar({ settings }: { settings: Settings }) {
  return (
    <div className="callbar">
      <a className="btn btn-call" href={settings.phoneHref}>
        <IconPhone size={17} />
        <span>Call {settings.phone}</span>
      </a>
      <Link className="btn btn-ghost" href="/menu">{settings.onlineOrdering ? 'Order Online' : 'This Week’s Menu'}</Link>
    </div>
  )
}
