import type { MetadataRoute } from 'next'

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly') => ({ url: `${site}${path}`, lastModified: now, changeFrequency, priority })
  return [
    page('/', 1, 'daily'),
    page('/menu', 0.9, 'daily'),
    page('/cupcakes', 0.8, 'weekly'),
    page('/holiday', 0.8, 'weekly'),
    page('/story', 0.6, 'monthly'),
    page('/visit', 0.7, 'monthly'),
    page('/legal/allergy', 0.2, 'yearly'),
    page('/legal/privacy', 0.2, 'yearly'),
    page('/legal/terms', 0.2, 'yearly'),
  ]
}
