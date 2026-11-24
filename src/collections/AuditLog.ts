import type { CollectionConfig } from 'payload'
import { loggedIn } from './access'

const never = () => false

/** Read-only history of changes to dishes, orders and special requests. Written by hooks only. */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Change', plural: 'Change history' },
  admin: {
    group: 'Settings',
    useAsTitle: 'docTitle',
    defaultColumns: ['createdAt', 'userEmail', 'collectionSlug', 'docTitle', 'summary'],
    listSearchableFields: ['docTitle', 'userEmail', 'summary'],
    description: 'Who changed what, and when. To undo a change to a dish, open the dish and use its Versions tab.',
  },
  defaultSort: '-createdAt',
  access: { read: loggedIn, create: never, update: never, delete: never },
  fields: [
    { name: 'action', type: 'select', required: true, options: ['create', 'update', 'delete'], label: 'Action' },
    { name: 'collectionSlug', type: 'text', required: true, index: true, label: 'Where' },
    { name: 'docId', type: 'text', required: true, index: true, label: 'Record id' },
    { name: 'docTitle', type: 'text', label: 'Record' },
    { name: 'userEmail', type: 'text', label: 'Changed by' },
    { name: 'user', type: 'relationship', relationTo: 'users', label: 'User' },
    { name: 'summary', type: 'textarea', label: 'What changed' },
    { name: 'changes', type: 'json', label: 'Details' },
  ],
}
