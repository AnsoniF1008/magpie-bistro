import Link from 'next/link'
import React from 'react'

import { CountUp } from '@/components/motion/CountUp'
import { REVIEWS, SITE } from '@/lib/content'
import type { Settings } from '@/lib/data'

export function ReviewsSection({ settings, showStoryLink }: { settings: Settings; showStoryLink?: boolean }) {
  return (
    <section id="reviews">
      <div className="wrap">
        <h2>What Smithfield Says</h2>
        <p className="section-intro">{REVIEWS.intro}</p>
        <div className="review-grid">
          <div className="review-card">
            <div className="big-stat"><CountUp value={100} suffix="%" /></div>
            <p style={{ marginTop: 8 }}>of reviewers recommend The Magpie Bistro on Facebook — 15 reviews and counting.</p>
            {settings.facebookUrl && (
              <p className="src">
                <a href={settings.facebookUrl} target="_blank" rel="noopener">Read them on Facebook</a>
              </p>
            )}
          </div>
          <div className="review-card">
            <div className="stars" role="img" aria-label="5 of 5 stars">★★★★★</div>
            <blockquote>{REVIEWS.quote}</blockquote>
            <p className="src">
              {REVIEWS.quoteSource} · <a href={SITE.tripadvisorUrl} target="_blank" rel="noopener">Read on TripAdvisor</a>
            </p>
          </div>
          <div className="review-card">
            <div className="big-stat"><CountUp value={1100} suffix="+" /></div>
            <p style={{ marginTop: 8 }}>Facebook followers in the bistro’s first months — the weekly menu posts are where Smithfield checks what’s cooking.</p>
            {showStoryLink ? (
              <p className="src"><Link href="/story">Read our story</Link></p>
            ) : (
              settings.facebookUrl && (
                <p className="src">
                  <a href={settings.facebookUrl} target="_blank" rel="noopener">Follow The Magpie Bistro</a>
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
