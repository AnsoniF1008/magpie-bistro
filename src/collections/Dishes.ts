import type { CollectionConfig } from 'payload'
import { auditHooks } from '../lib/audit'
import { anyone, loggedIn, ownerOnly, ownerOnlyField } from './access'

export const DISH_CATEGORIES = [
  { value: 'ENTREE', label: 'Lunch entrée' },
  { value: 'BOWL', label: 'Protein bowl' },
  { value: 'SANDWICH', label: 'Sandwich' },
  { value: 'SOUP', label: 'Soup' },
  { value: 'SALAD', label: 'Salad' },
  { value: 'DESSERT', label: 'Dessert' },
  { value: 'DRINK', label: 'Drink' },
] as const

export type DishCategory = (typeof DISH_CATEGORIES)[number]['value']

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const Dishes: CollectionConfig = {
  slug: 'dishes',
  labels: { singular: 'Dish', plural: 'Dishes' },
  admin: {
    group: 'Menu',
    useAsTitle: 'nameEn',
    defaultColumns: ['nameEn', 'category', 'priceCents', 'isSoldOut', 'isVisible'],
    listSearchableFields: ['nameEn', 'nameEs', 'slug'],
    pagination: { defaultLimit: 50 },
  },
  defaultSort: 'sortOrder',
  access: { read: anyone, create: ownerOnly, update: loggedIn, delete: ownerOnly },
  // Keeps the last 30 saves of each dish; the Versions tab can restore any of them.
  versions: { maxPerDoc: 30 },
  hooks: {
    ...auditHooks('dishes', 'nameEn'),
    beforeValidate: [
      ({ data }) => {
        if (data?.nameEn && !data.slug) data.slug = slugify(data.nameEn)
        if (data?.slug) data.slug = slugify(data.slug)
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'nameEn', type: 'text', required: true, label: 'Name' },
        { name: 'nameEs', type: 'text', admin: { hidden: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'priceCents',
          type: 'number',
          min: 0,
          label: 'Price',
          access: { update: ownerOnlyField },
          admin: {
            width: '34%',
            description: 'Type it like 15.00. Leave empty for "ask at the counter".',
            components: { Field: '/components/admin/PriceField#PriceField', Cell: '/components/admin/PriceCell#PriceCell' },
          },
        },
        {
          name: 'category',
          type: 'select',
          required: true,
          defaultValue: 'ENTREE',
          label: 'Category',
          options: DISH_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
          admin: { width: '33%' },
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          label: 'Photo',
          admin: { width: '33%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'descEn', type: 'textarea', label: 'Description' },
        { name: 'descEs', type: 'textarea', admin: { hidden: true } },
      ],
    },
    {
      name: 'isSoldOut',
      type: 'checkbox',
      defaultValue: false,
      label: 'Sold out',
      admin: {
        position: 'sidebar',
        description: 'Shows a SOLD OUT badge and blocks ordering right away.',
        components: { Cell: '/components/admin/ToggleCell#ToggleCell' },
      },
    },
    {
      name: 'isVisible',
      type: 'checkbox',
      defaultValue: true,
      label: 'Show on website',
      admin: { position: 'sidebar', components: { Cell: '/components/admin/ToggleCell#ToggleCell' } },
    },
    {
      name: 'isOrderable',
      type: 'checkbox',
      defaultValue: true,
      label: 'Can be ordered online',
      admin: { position: 'sidebar', description: 'Needs a price.' },
    },
    {
      name: 'isSignature',
      type: 'checkbox',
      defaultValue: false,
      label: 'Counter favorite',
      admin: { position: 'sidebar', description: 'Featured with its photo on the menu page.' },
    },
    { name: 'sortOrder', type: 'number', defaultValue: 100, label: 'Order in lists', admin: { position: 'sidebar' } },
    {
      name: 'tags',
      type: 'text',
      hasMany: true,
      label: 'Tags',
      admin: { position: 'sidebar' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Web address name',
      admin: { position: 'sidebar', description: 'Filled in automatically.' },
    },
  ],
}
