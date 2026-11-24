import type { Metadata } from 'next'
import React from 'react'

import { ALLERGY_NOTE } from '@/lib/content'
import { getSettings } from '@/lib/data'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Allergy Notice', alternates: { canonical: '/legal/allergy' } }

export default async function AllergyPage() {
  const s = await getSettings()
  return (
    <div className="wrap page-head prose">
      <h1>Allergy Notice</h1>
      <p><strong>{ALLERGY_NOTE}</strong></p>
      <p>Our kitchen prepares food containing milk, eggs, wheat, soy, peanuts, tree nuts, fish, shellfish and sesame on shared equipment. We cannot guarantee that any item is free of any allergen.</p>
      <p>If you have a food allergy or a dietary restriction, please call <a href={s.phoneHref}>{s.phone}</a> before ordering so we can tell you what is in a dish. When you order online you will be asked to confirm that you have read this notice.</p>
    </div>
  )
}
