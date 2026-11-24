import type { CollectionConfig } from 'payload'
import { auditHooks } from '../lib/audit'
import { loggedIn, ownerOnly, ownerOnlyField } from './access'

export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending payment',
  CONFIRMED: 'Confirmed',
  READY: 'Ready for pickup',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

/** Orders are created only by the server (checkout). Staff move them along the board. */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  admin: {
    group: 'Orders',
    useAsTitle: 'code',
    defaultColumns: ['code', 'customerName', 'pickupAt', 'status', 'totalCents'],
    listSearchableFields: ['code', 'customerName', 'phone'],
  },
  defaultSort: '-createdAt',
  access: { read: loggedIn, create: ownerOnly, update: loggedIn, delete: ownerOnly },
  hooks: { ...auditHooks('orders', 'code') },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'code', type: 'text', required: true, unique: true, index: true, label: 'Order number', access: { update: ownerOnlyField }, admin: { readOnly: true } },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'PENDING',
          index: true,
          label: 'Status',
          options: ORDER_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'customerName', type: 'text', required: true, label: 'Customer' },
        { name: 'phone', type: 'text', required: true, label: 'Phone' },
        { name: 'email', type: 'email', label: 'Email' },
      ],
    },
    { name: 'pickupAt', type: 'date', required: true, index: true, label: 'Pickup time', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'notes', type: 'textarea', label: 'Customer notes' },
    {
      name: 'items',
      type: 'array',
      required: true,
      label: 'Items',
      access: { update: ownerOnlyField },
      admin: { readOnly: true },
      fields: [
        { name: 'dish', type: 'relationship', relationTo: 'dishes' },
        { name: 'nameSnap', type: 'text', required: true, label: 'Name when ordered' },
        { name: 'qty', type: 'number', required: true, min: 1 },
        { name: 'unitCents', type: 'number', required: true, min: 0, admin: { components: { Field: '/components/admin/PriceField#PriceField' } } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'subtotalCents', type: 'number', required: true, label: 'Subtotal', access: { update: ownerOnlyField }, admin: { readOnly: true, components: { Field: '/components/admin/PriceField#PriceField' } } },
        { name: 'taxCents', type: 'number', required: true, label: 'Tax', access: { update: ownerOnlyField }, admin: { readOnly: true, components: { Field: '/components/admin/PriceField#PriceField' } } },
        { name: 'totalCents', type: 'number', required: true, label: 'Total', access: { update: ownerOnlyField }, admin: { readOnly: true, components: { Field: '/components/admin/PriceField#PriceField', Cell: '/components/admin/PriceCell#PriceCell' } } },
      ],
    },
    { name: 'allergyAckAt', type: 'date', label: 'Allergy notice accepted', access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'paymentMode', type: 'select', options: ['stripe', 'demo'], access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' }, label: 'Payment' },
    { name: 'stripeId', type: 'text', index: true, access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' }, label: 'Payment reference' },
    { name: 'confirmedAt', type: 'date', access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' }, label: 'Paid at' },
    { name: 'publicToken', type: 'text', required: true, index: true, access: { update: () => false }, admin: { hidden: true } },
  ],
}
