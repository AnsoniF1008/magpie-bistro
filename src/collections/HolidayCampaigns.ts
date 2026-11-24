import type { CollectionConfig } from 'payload'
import { anyone, loggedIn, ownerOnly } from './access'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

/** A seasonal pre-order window (Thanksgiving, Christmas…) with its own catalog and deadline. */
export const HolidayCampaigns: CollectionConfig = {
  slug: 'holiday-campaigns',
  labels: { singular: 'Holiday campaign', plural: 'Holiday campaigns' },
  admin: { group: 'Special orders', useAsTitle: 'title', defaultColumns: ['title', 'orderByAt', 'pickupAt', 'isActive'] },
  defaultSort: 'orderByAt',
  access: { read: anyone, create: ownerOnly, update: loggedIn, delete: ownerOnly },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.title && !data.slug) data.slug = slugify(data.title)
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'title', type: 'text', required: true, label: 'Holiday', admin: { placeholder: 'Thanksgiving' } },
        { name: 'isActive', type: 'checkbox', defaultValue: true, label: 'Show on the website', admin: { style: { alignSelf: 'flex-end' } } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'orderByAt', type: 'date', required: true, label: 'Order by', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'After this moment the website stops taking orders for this holiday.' } },
        { name: 'pickupAt', type: 'date', required: true, label: 'Pickup day', admin: { date: { pickerAppearance: 'dayOnly' } } },
        { name: 'depositPercent', type: 'number', required: true, defaultValue: 50, min: 0, max: 100, label: 'Deposit (%)' },
      ],
    },
    { name: 'intro', type: 'textarea', label: 'Short note shown with this holiday' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      label: 'What can be ordered',
      labels: { singular: 'Item', plural: 'Items' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, label: 'Name' },
            { name: 'detail', type: 'text', label: 'Size / detail', admin: { placeholder: '25 pieces, frozen' } },
            { name: 'priceCents', type: 'number', required: true, min: 0, label: 'Price', admin: { components: { Field: '/components/admin/PriceField#PriceField' } } },
          ],
        },
        { name: 'options', type: 'text', hasMany: true, label: 'Flavors to choose from (optional)' },
      ],
    },
    { name: 'slug', type: 'text', unique: true, index: true, admin: { position: 'sidebar', description: 'Filled in automatically.' } },
  ],
}
