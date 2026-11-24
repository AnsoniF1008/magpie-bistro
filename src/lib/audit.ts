import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { formatPrice } from './money'

const SKIP = new Set(['id', 'createdAt', 'updatedAt', 'publicToken', 'sizes', 'filesize', 'thumbnailURL', 'url', 'password', 'salt', 'hash'])

const show = (field: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number' && /Cents$/.test(field)) return formatPrice(value)
  if (typeof value === 'boolean') return value ? 'yes' : 'no'
  if (typeof value === 'object') {
    const id = (value as { id?: unknown }).id
    if (id !== undefined && !Array.isArray(value)) return `#${String(id)}`
    return Array.isArray(value) ? `${value.length} item${value.length === 1 ? '' : 's'}` : 'changed'
  }
  const text = String(value)
  return text.length > 60 ? `${text.slice(0, 57)}…` : text
}

const same = (a: unknown, b: unknown) => {
  const norm = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) && 'id' in (v as object) ? (v as { id: unknown }).id : v)
  return JSON.stringify(norm(a) ?? null) === JSON.stringify(norm(b) ?? null)
}

export type Change = { field: string; from: string; to: string }

/** Field-by-field differences between two versions of a document, in words. */
export function diffDocs(before: Record<string, unknown> | undefined, after: Record<string, unknown>): Change[] {
  const changes: Change[] = []
  for (const field of new Set([...Object.keys(before ?? {}), ...Object.keys(after)])) {
    if (SKIP.has(field)) continue
    if (!same(before?.[field], after[field])) changes.push({ field, from: show(field, before?.[field]), to: show(field, after[field]) })
  }
  return changes
}

/**
 * Records who changed what and when. Attach to a collection:
 *   hooks: { ...auditHooks('dishes', 'nameEn') }
 * A failed log write never blocks the real change.
 */
export function auditHooks(collection: string, titleField: string): { afterChange: CollectionAfterChangeHook[]; afterDelete: CollectionAfterDeleteHook[] } {
  const write = async (req: Parameters<CollectionAfterChangeHook>[0]['req'], action: 'create' | 'update' | 'delete', doc: Record<string, unknown>, changes: Change[]) => {
    try {
      const user = req.user as { id?: string | number; email?: string } | null
      await req.payload.create({
        collection: 'audit-log',
        req,
        data: {
          action,
          collectionSlug: collection,
          docId: String(doc.id),
          docTitle: String(doc[titleField] ?? doc.id),
          userEmail: user?.email ?? 'system',
          user: (user?.id as number | undefined) ?? undefined,
          summary: action === 'update' ? changes.map((c) => `${c.field}: ${c.from} → ${c.to}`).join(' · ').slice(0, 900) : action === 'create' ? 'Created' : 'Deleted',
          changes,
        },
      })
    } catch (err) {
      req.payload.logger.error({ err }, `[audit] could not record ${action} on ${collection}`)
    }
  }
  return {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        const changes = operation === 'update' ? diffDocs(previousDoc, doc) : []
        if (operation === 'update' && changes.length === 0) return doc
        await write(req, operation, doc, changes)
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await write(req, 'delete', doc, [])
        return doc
      },
    ],
  }
}
