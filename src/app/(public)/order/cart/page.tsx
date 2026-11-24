import type { Metadata } from 'next'
import React from 'react'

import { CartPageBody } from '@/components/site/CheckoutForm'
import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Your Order', robots: { index: false } }

export default async function CartPage() {
  const s = await getSettings()
  return (
    <div className="wrap page-head">
      <h1>Your order</h1>
      <CartPageBody phone={s.phone} phoneHref={s.phoneHref} />
    </div>
  )
}
