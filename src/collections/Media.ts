import type { CollectionConfig } from 'payload'
import { anyone, loggedIn, ownerOnly } from './access'

/** Turns "korean-bulgogi_bowl-2.jpg" into "Korean bulgogi bowl" as a starting alt text. */
const suggestAlt = (filename?: string | null) => {
  if (!filename) return ''
  const base = filename.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s*\d+$/, '').trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : ''
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Photo', plural: 'Photos' },
  admin: { group: 'Menu', useAsTitle: 'altEn', defaultColumns: ['filename', 'altEn', 'updatedAt'] },
  access: { read: anyone, create: loggedIn, update: loggedIn, delete: ownerOnly },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    adminThumbnail: 'thumb',
    focalPoint: true,
    crop: true,
    formatOptions: { format: 'webp', options: { quality: 82 } },
    resizeOptions: { width: 2000, withoutEnlargement: true },
    imageSizes: [
      { name: 'thumb', width: 320, height: 240, position: 'centre' },
      { name: 'card', width: 800, height: 600, position: 'centre' },
      { name: 'hero', width: 1400, height: 1050, position: 'centre' },
    ],
  },
  hooks: {
    beforeValidate: [
      ({ data, req }) => {
        if (data && !data.altEn) data.altEn = suggestAlt(req.file?.name ?? data.filename)
        return data
      },
    ],
  },
  fields: [
    {
      name: 'altEn',
      type: 'text',
      required: true,
      label: 'Description for screen readers',
      admin: { description: 'Say what is in the photo. A suggestion is filled in from the file name.' },
    },
    { name: 'altEs', type: 'text', admin: { hidden: true } },
  ],
}
