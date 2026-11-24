import { APIError, type CollectionConfig } from 'payload'
import { auditHooks } from '../lib/audit'
import { loggedIn, ownerOnly, ownerOnlyField } from './access'

export const REQUEST_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PAID'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

/**
 * Custom cakes and holiday pre-orders. Nothing is charged until the owner
 * reviews the request: set the amount, switch Status to "Approved" and save —
 * the customer is emailed a link to pay. "Rejected" emails them the reason.
 */
export const CustomCakeRequests: CollectionConfig = {
  slug: 'custom-cake-requests',
  labels: { singular: 'Special request', plural: 'Special requests' },
  admin: {
    group: 'Special orders',
    useAsTitle: 'code',
    defaultColumns: ['code', 'kind', 'customerName', 'desiredDate', 'status', 'quoteCents'],
    listSearchableFields: ['code', 'customerName', 'phone', 'email'],
    description: 'To accept: enter the amount to charge, set Status to Approved and save. The customer gets an email with a payment link.',
  },
  defaultSort: '-createdAt',
  access: { read: loggedIn, create: ownerOnly, update: loggedIn, delete: ownerOnly },
  hooks: {
    beforeChange: [
      ({ data, originalDoc }) => {
        const becoming = (s: string) => data.status === s && originalDoc?.status !== s
        if (becoming('APPROVED') && !(typeof data.quoteCents === 'number' && data.quoteCents > 0)) {
          throw new APIError('Enter the amount to charge before approving.', 400, undefined, true)
        }
        if (becoming('REJECTED') && !String(data.rejectionReason ?? '').trim()) {
          throw new APIError('Write a short reason for the customer before rejecting.', 400, undefined, true)
        }
        if (originalDoc?.status === 'PAID' && data.status && data.status !== 'PAID') {
          throw new APIError('This request is already paid. Refund it in Stripe before changing its status.', 400, undefined, true)
        }
        return data
      },
    ],
    afterDelete: auditHooks('custom-cake-requests', 'code').afterDelete,
    afterChange: [
      ...auditHooks('custom-cake-requests', 'code').afterChange,
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || doc.status === previousDoc?.status) return doc
        // Imported lazily: emails pull in server-only code the config must not load eagerly.
        const { notifyRequestDecision } = await import('../lib/requests')
        if (doc.status === 'APPROVED' || doc.status === 'REJECTED') await notifyRequestDecision(doc, req)
        return doc
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'code', type: 'text', required: true, unique: true, index: true, label: 'Request number', access: { update: ownerOnlyField }, admin: { readOnly: true } },
        { name: 'kind', type: 'select', required: true, defaultValue: 'CUSTOM', label: 'Type', options: [{ value: 'CUSTOM', label: 'Custom cake / cupcakes' }, { value: 'HOLIDAY', label: 'Holiday pre-order' }], access: { update: ownerOnlyField }, admin: { readOnly: true } },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'PENDING_REVIEW',
          index: true,
          label: 'Status',
          options: [
            { value: 'PENDING_REVIEW', label: 'Waiting for your review' },
            { value: 'APPROVED', label: 'Approved — payment link sent' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'PAID', label: 'Paid' },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'quoteCents', type: 'number', min: 0, label: 'Amount to charge now', admin: { description: 'For holiday orders this starts at the deposit. Change it if needed.', components: { Field: '/components/admin/PriceField#PriceField', Cell: '/components/admin/PriceCell#PriceCell' } } },
        { name: 'ownerNote', type: 'text', label: 'Note to the customer (optional)', admin: { description: 'Included in the approval email.' } },
      ],
    },
    { name: 'rejectionReason', type: 'textarea', label: 'Reason, if you reject it', admin: { description: 'Sent to the customer.' } },
    {
      type: 'row',
      fields: [
        { name: 'customerName', type: 'text', required: true, label: 'Customer' },
        { name: 'phone', type: 'text', required: true, label: 'Phone' },
        { name: 'email', type: 'email', required: true, label: 'Email' },
      ],
    },
    { name: 'desiredDate', type: 'date', required: true, label: 'Date needed / pickup', admin: { date: { pickerAppearance: 'dayOnly' } } },
    {
      type: 'row',
      fields: [
        { name: 'productType', type: 'text', label: 'What' },
        { name: 'size', type: 'text', label: 'Size / servings' },
        { name: 'flavor', type: 'text', label: 'Flavor' },
      ],
    },
    { name: 'decoration', type: 'textarea', label: 'Decoration / design' },
    { name: 'message', type: 'text', label: 'Message on the cake' },
    { name: 'referenceUrl', type: 'text', label: 'Reference link' },
    { name: 'campaign', type: 'relationship', relationTo: 'holiday-campaigns', label: 'Holiday', access: { update: ownerOnlyField }, admin: { readOnly: true, condition: (data) => data?.kind === 'HOLIDAY' } },
    {
      name: 'holidayItems',
      type: 'array',
      label: 'Holiday items',
      access: { update: ownerOnlyField },
      admin: { readOnly: true, condition: (data) => data?.kind === 'HOLIDAY' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'option', type: 'text', label: 'Flavor' },
        { name: 'qty', type: 'number', required: true, min: 1 },
        { name: 'unitCents', type: 'number', required: true, min: 0, admin: { components: { Field: '/components/admin/PriceField#PriceField' } } },
      ],
    },
    { name: 'orderTotalCents', type: 'number', label: 'Order total', access: { update: ownerOnlyField }, admin: { readOnly: true, condition: (data) => data?.kind === 'HOLIDAY', components: { Field: '/components/admin/PriceField#PriceField' } } },
    { name: 'notes', type: 'textarea', label: 'Customer notes' },
    { name: 'stripeId', type: 'text', index: true, label: 'Payment reference', access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'paidAt', type: 'date', label: 'Paid at', access: { update: ownerOnlyField }, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'publicToken', type: 'text', required: true, index: true, access: { update: () => false }, admin: { hidden: true } },
  ],
}
