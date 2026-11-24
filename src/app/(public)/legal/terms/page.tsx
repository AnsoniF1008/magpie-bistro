import type { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'

import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Terms of Service', alternates: { canonical: '/legal/terms' } }

export default async function TermsPage() {
  const s = await getSettings()
  return (
    <div className="wrap page-head prose">
      <h1>Terms of Service</h1>
      <h2>Pickup orders</h2>
      <p>Online orders are for pickup at {s.addressLine1}, {s.addressLine2}, at the time you choose. Please bring the name the order was placed under. Food is prepared fresh and served while supplies last; if we cannot fulfil part of an order we will contact you and refund that part.</p>
      <h2>Prices and tax</h2>
      <p>Prices are in US dollars. Applicable sales tax is added at checkout. The total charged is the total shown before you pay.</p>
      <h2>Changes and cancellations</h2>
      <p>To change or cancel an order, call <a href={s.phoneHref}>{s.phone}</a> as early as possible. Orders that are already being prepared may not be refundable.</p>
      <h2>Allergens</h2>
      <p>Please read our <Link href="/legal/allergy">allergy notice</Link> before ordering.</p>
      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>These terms are a plain-language summary and should be reviewed by the business before launch.</p>
    </div>
  )
}
