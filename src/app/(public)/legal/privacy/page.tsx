import type { Metadata } from 'next'
import React from 'react'

import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Privacy Policy', alternates: { canonical: '/legal/privacy' } }

export default async function PrivacyPage() {
  const s = await getSettings()
  return (
    <div className="wrap page-head prose">
      <h1>Privacy Policy</h1>
      <p>The Magpie Bistro + Cupcakery (“we”) respects your privacy. This page explains what we collect when you use this website and how we use it.</p>
      <h2>What we collect</h2>
      <p>When you place a pickup order we collect your name, phone number, optional email address, your order and any notes you add. We use this only to prepare your order, contact you about it and keep our sales records.</p>
      <h2>Payments</h2>
      <p>Card payments are processed by Stripe on Stripe’s own secure page. We never see or store your card number.</p>
      <h2>Your cart</h2>
      <p>The items in your cart are saved in your own browser so they are still there if you reload the page. They are not sent to us until you check out.</p>
      <h2>Analytics</h2>
      <p>If you allow it, we use Google Analytics to count visits and see which pages are useful. It is off until you accept, and you can change your choice any time with the “Cookie settings” link at the bottom of the page.</p>
      <h2>Sharing</h2>
      <p>We do not sell your information. We share it only with the service providers that run this site for us (hosting, payments and email delivery) and when the law requires it.</p>
      <h2>Your choices</h2>
      <p>To see, correct or delete the information we hold about you, call <a href={s.phoneHref}>{s.phone}</a> or email <a href={`mailto:${s.email}`}>{s.email}</a>.</p>
      <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem' }}>This policy is a plain-language summary and should be reviewed by the business before launch.</p>
    </div>
  )
}
