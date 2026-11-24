import type { Metadata } from 'next'
import React from 'react'

import { ReviewsSection } from '@/components/site/ReviewsSection'
import { SITE, STORY } from '@/lib/content'
import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/story' },
  title: 'Our Story — Jeannie & Tonya',
  description: 'The Magpie Bistro + Cupcakery is the work of Jeannie and Tonya, lifelong friends of more than 40 years — a women-owned kitchen in Smithfield, VA built on friendship, faith and really good food.',
}

export default async function StoryPage() {
  const settings = await getSettings()
  return (
    <>
      <div className="wrap page-head">
        <span className="eyebrow">Women-owned · Smithfield, Virginia</span>
        <h1>Our Story</h1>
      </div>
      <section style={{ paddingTop: 12 }}>
        <div className="wrap">
          <div className="feature-grid">
            <div>
              <p>
                The Magpie Bistro + Cupcakery is the work of <strong>Jeannie and Tonya</strong>, lifelong friends of more than 40 years from Norfolk and Virginia Beach — a women-owned kitchen built on friendship, faith and really good food.
              </p>
              <p>
                The name is a piece of Tonya’s heritage: in Korean, the magpie is the <em>kkachi</em>, a beloved symbol of good luck. It suits a place where the day’s cooking is meant to feel like a blessing — and where a line at the door by 11:30 means the luck is holding.
              </p>
              <p>
                Their kitchen rule is simple: cook the way you would if the guests were coming to your own table. Every dish is prepared to be shared in love and fellowship, in the spirit of Jesus Christ — and every weekly menu closes with a verse of Scripture.
              </p>
              <p>
                Smithfield has noticed. In its first months the bistro passed 1,000 Facebook followers and earned a word-of-mouth reputation visitors call “a great addition to Smithfield.”
              </p>
            </div>
            <div className="story-verse">
              <blockquote>{SITE.verse}</blockquote>
              <cite>{SITE.verseRef.toUpperCase()} — THE BISTRO’S MOTTO</cite>
              <p style={{ marginTop: 16, color: 'var(--ink-soft)' }}>{STORY.verseNote}</p>
            </div>
          </div>
        </div>
      </section>

      <ReviewsSection settings={settings} />
    </>
  )
}
