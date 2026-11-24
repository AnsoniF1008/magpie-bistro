import type { CollectionConfig } from 'payload'
import { loggedIn, ownerOnly, ownerOnlyField } from './access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  admin: { useAsTitle: 'email', group: 'Settings', defaultColumns: ['email', 'name', 'role'] },
  auth: { maxLoginAttempts: 8, lockTime: 10 * 60 * 1000 },
  access: {
    read: loggedIn,
    create: ownerOnly,
    update: ({ req }) => {
      if (!req.user) return false
      if ((req.user as { role?: string }).role === 'OWNER') return true
      return { id: { equals: req.user.id } }
    },
    delete: ownerOnly,
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        // The very first account becomes the owner.
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users', req })
          if (totalDocs === 0) data.role = 'OWNER'
        }
        return data
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', label: 'Name' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'STAFF',
      label: 'Role',
      options: [
        { label: 'Owner — full access', value: 'OWNER' },
        { label: 'Staff — no prices, no deleting', value: 'STAFF' },
      ],
      access: { update: ownerOnlyField },
    },
  ],
}
