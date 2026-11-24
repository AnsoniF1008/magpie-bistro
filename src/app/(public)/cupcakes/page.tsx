import type { Metadata } from 'next'
import Image from 'next/image'
import React from 'react'

import { CakeWizard } from '@/components/site/RequestForms'
import { CUPCAKERY } from '@/lib/content'
import { getSettings } from '@/lib/data'
import { nyParts } from '@/lib/time'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  alternates: { canonical: '/cupcakes' },
  title: 'Cupcakes & Custom Cakes in Smithfield, VA',
  description: 'Cupcakes, custom cakes, bundts and cheesecakes made to order at The Magpie Cupcakery in Smithfield, VA. Cupcakes $4.50, gourmet cookies $3.50.',
}

export default async function CupcakesPage() {
  const settings = await getSettings()
  const p = nyParts()
  const min = new Date(Date.UTC(p.y, p.m - 1, p.d + settings.cakeLeadDays))
  const minDate = min.toISOString().slice(0, 10)
  return (
    <>
      <div className="wrap page-head">
        <span className="eyebrow">The Cupcakery</span>
        <h1>The Cupcakery &amp; Custom Orders</h1>
        <p className="section-intro">{CUPCAKERY.intro}</p>
      </div>
      <section style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="feature-grid">
            <div>
              {settings.cupcakeryImage && (
                <Image
                  className="rounded"
                  src={settings.cupcakeryImage.url}
                  alt={settings.cupcakeryImage.alt}
                  width={settings.cupcakeryImage.width}
                  height={settings.cupcakeryImage.height}
                  sizes="(max-width: 820px) 100vw, 540px"
                  priority
                />
              )}
            </div>
            <div>
              <h3>At the counter</h3>
              <ul className="price-list">
                {CUPCAKERY.counter.map((c) => (
                  <li key={c.label}><span>{c.label}</span><span className="amt">{c.amount}</span></li>
                ))}
              </ul>
              <h3>Recent flavors from the case</h3>
              <ul className="tag-list">
                {CUPCAKERY.flavors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p style={{ marginTop: 14 }} className="section-intro">
                To place a custom order, call <a href={settings.phoneHref}>{settings.phone}</a>, message the bistro on Facebook or Instagram, or send the request below — we’ll reply with a price and a payment link.
              </p>
            </div>
          </div>

          <CakeWizard minDate={minDate} leadDays={settings.cakeLeadDays} phone={settings.phone} phoneHref={settings.phoneHref} />
        </div>
      </section>
    </>
  )
}
