import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

import { HeroPhoto, HeroTitle } from '@/components/motion/Hero'
import { hoursLine } from '@/components/site/Chrome'
import { Signatures, WeekGrid } from '@/components/site/MenuSections'
import { ReviewsSection } from '@/components/site/ReviewsSection'
import { StatusText } from '@/components/site/StatusPill'
import { IconPhone, IconStar } from '@/components/ui/Icons'
import { ALLERGY_NOTE, SITE, TRUST_CHIPS } from '@/lib/content'
import { getDishes, getSettings, getWeekMenu } from '@/lib/data'
import { getWeekOf, isOpenNow, nyParts, statusLabel } from '@/lib/time'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const now = new Date()
  const settings = await getSettings()
  const [week, dishes] = await Promise.all([getWeekMenu(getWeekOf(now), settings.open.hours.weekdays), getDishes()])
  const status = { open: isOpenNow(settings.open, now).open, label: statusLabel(settings.open, now) }

  return (
    <>
      <div className="hero wrap">
        <div className="hero-grid">
          <div>
            <HeroTitle script={SITE.shortName} rest={SITE.tagline} />
            <p className="lede">{SITE.lede}</p>
            <div className="hero-ctas">
              <Link className="btn btn-gold" href="/menu">See This Week’s Menu</Link>
              <a className="btn btn-ghost" href={settings.phoneHref}>
                <IconPhone size={17} />
                <span>Call {settings.phone}</span>
              </a>
            </div>
            <div className="trust-row">
              {TRUST_CHIPS.map((c) => (
                <span className="chip" key={c.text}>{c.star && <IconStar size={14} />} {c.text}</span>
              ))}
            </div>
          </div>
          <div className="hero-photo">
            {settings.heroImage && (
              <HeroPhoto>
                <Image
                  src={settings.heroImage.url}
                  alt={settings.heroImage.alt}
                  width={settings.heroImage.width}
                  height={settings.heroImage.height}
                  priority
                  sizes="(max-width: 860px) 100vw, 560px"
                />
              </HeroPhoto>
            )}
          </div>
        </div>

        <div className="today">
          <strong>Today at the counter</strong>
          <StatusText initial={status} />
          <span className="t-item">Open {hoursLine(settings)}</span>
          <span className="t-item">Serving while supplies last — favorites sell out fast</span>
          <span className="t-item"><a href={settings.phoneHref}>Call ahead: {settings.phone}</a></span>
        </div>
      </div>

      <section id="menu">
        <div className="wrap">
          <h2>This Week’s Menu</h2>
          <p className="section-intro">
            Lunch is served {hoursLine(settings)}. The lineup rotates every week
            {settings.onlineOrdering ? ' — add what you’d like and pick it up at the counter.' : '.'}
          </p>
          <WeekGrid week={week} todayWeekday={nyParts(now).weekday} settings={settings} />
          <p style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link className="btn btn-gold" href="/menu">Full menu &amp; prices</Link>
            <Link className="btn btn-ghost" href="/cupcakes">Custom Cupcakes &amp; Cakes</Link>
            <Link className="btn btn-ghost" href="/holiday">Holiday Specials</Link>
          </p>
          <p className="allergy"><strong>Allergy note:</strong> {ALLERGY_NOTE}</p>
        </div>
      </section>

      <section id="signatures">
        <div className="wrap">
          <h2>Counter Favorites</h2>
          <p className="section-intro">The dishes Smithfield keeps coming back for — watch the weekly menu for the day each one appears.</p>
          <Signatures dishes={dishes} />
          <div className="verse-card">
            <blockquote>{SITE.verse}</blockquote>
            <cite>{SITE.verseRef.toUpperCase()}</cite>
          </div>
        </div>
      </section>

      <ReviewsSection settings={settings} showStoryLink />
    </>
  )
}
