import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/700.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/great-vibes/400.css'
import '@fontsource/public-sans/400.css'
import '@fontsource/public-sans/600.css'
import '@fontsource/public-sans/700.css'
import './globals.css'

import type { Metadata, Viewport } from 'next'
import React from 'react'

import { MotionProvider } from '@/components/motion/MotionProvider'
import { CartDrawer } from '@/components/site/Cart'
import { CallBar, Footer, Header, hoursLine } from '@/components/site/Chrome'
import { Analytics } from '@/components/site/Consent'
import { SITE } from '@/lib/content'
import { getSettings } from '@/lib/data'
import { isOpenNow, statusLabel, WEEKDAY_NAMES } from '@/lib/time'

export const dynamic = 'force-dynamic'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  const image = settings.heroImage ? [{ url: settings.heroImage.url, width: settings.heroImage.width, height: settings.heroImage.height, alt: settings.heroImage.alt }] : undefined
  const title = `${SITE.name} | Takeout Lunch & Custom Cupcakes in Smithfield, VA`
  const description = `${SITE.description} ${hoursLine(settings)}. Call ${settings.phone}.`
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | The Magpie Bistro + Cupcakery` },
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', locale: 'en_US', siteName: SITE.name, title: `${SITE.name} | Smithfield, VA`, description: `Counter-service takeout lunch and a custom cupcakery at ${settings.addressLine1}, ${settings.addressLine2}. Serving while supplies last.`, images: image },
    twitter: { card: 'summary_large_image', title, description, images: image?.map((i) => i.url) },
    icons: { icon: '/icon.svg' },
    verification: process.env.NEXT_PUBLIC_GSC_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GSC_VERIFICATION } : undefined,
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF4E8' },
    { media: '(prefers-color-scheme: dark)', color: '#1D1712' },
  ],
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings()
  const now = new Date()
  const status = { open: isOpenNow(settings.open, now).open, label: statusLabel(settings.open, now) }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: SITE.name,
    description: 'Counter-service takeout bistro and custom cupcakery in Smithfield, Virginia. Daily lunch combos, rotating protein bowls, soups, salads, custom cupcakes, cakes, bundts and cheesecakes.',
    '@id': `${siteUrl}/#restaurant`,
    url: siteUrl,
    hasMenu: `${siteUrl}/menu`,
    image: settings.heroImage ? `${siteUrl}${settings.heroImage.url}` : undefined,
    servesCuisine: ['American', 'Korean'],
    priceRange: '$$',
    telephone: settings.phoneHref.replace('tel:', ''),
    email: settings.email,
    address: { '@type': 'PostalAddress', streetAddress: settings.addressLine1, addressLocality: 'Smithfield', addressRegion: 'VA', postalCode: '23430', addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: settings.open.hours.weekdays.map((d) => WEEKDAY_NAMES[d]), opens: settings.open.hours.open, closes: settings.open.hours.close },
    ],
    sameAs: [settings.facebookUrl, settings.instagramUrl].filter(Boolean),
    ...(settings.onlineOrdering ? { potentialAction: { '@type': 'OrderAction', target: `${siteUrl}/menu`, deliveryMethod: 'http://purl.org/goodrelations/v1#DeliveryModePickUp' } } : {}),
  }

  return (
    <html lang="en">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      </head>
      <body>
        <a className="skip-link" href="#content">Skip to content</a>
        <MotionProvider>
          {settings.banner && <div className="banner" role="note">{settings.banner}</div>}
          <Header settings={settings} status={status} />
          <main id="content">{children}</main>
          <Footer settings={settings} />
          <CallBar settings={settings} />
          {process.env.NEXT_PUBLIC_GA_ID && <Analytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
          {settings.onlineOrdering && <CartDrawer phone={settings.phone} phoneHref={settings.phoneHref} />}
        </MotionProvider>
      </body>
    </html>
  )
}
