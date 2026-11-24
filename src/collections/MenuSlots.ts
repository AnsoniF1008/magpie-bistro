import type { CollectionConfig } from 'payload'
import { anyone, loggedIn } from './access'

export const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '7', label: 'Sunday' },
]

/**
 * One dish on one weekday. `weekOf` empty = part of the regular rotation.
 * `weekOf` set (Monday, YYYY-MM-DD) = that week only, replacing the rotation for that day.
 * Edited through the Week view (/admin/week), not row by row.
 */
export const MenuSlots: CollectionConfig = {
  slug: 'menu-slots',
  labels: { singular: 'Menu slot', plural: 'Menu slots' },
  admin: { group: 'Menu', hidden: true, defaultColumns: ['dish', 'weekday', 'weekOf'] },
  access: { read: anyone, create: loggedIn, update: loggedIn, delete: loggedIn },
  fields: [
    { name: 'dish', type: 'relationship', relationTo: 'dishes', required: true, index: true },
    { name: 'weekday', type: 'select', required: true, options: WEEKDAY_OPTIONS },
    {
      name: 'weekOf',
      type: 'text',
      index: true,
      validate: (v: unknown) => !v || /^\d{4}-\d{2}-\d{2}$/.test(String(v)) || 'Use YYYY-MM-DD',
    },
    { name: 'position', type: 'number', defaultValue: 0 },
  ],
}
