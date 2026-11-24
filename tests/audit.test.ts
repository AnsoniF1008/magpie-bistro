import { describe, expect, it } from 'vitest'
import { diffDocs } from '@/lib/audit'

describe('diffDocs', () => {
  it('reports only the fields that changed, with money formatted', () => {
    const before = { id: 1, nameEn: 'Bowl', priceCents: 1500, isSoldOut: false, updatedAt: 'a' }
    const after = { id: 1, nameEn: 'Bowl', priceCents: 1650, isSoldOut: true, updatedAt: 'b' }
    expect(diffDocs(before, after)).toEqual([
      { field: 'priceCents', from: '$15.00', to: '$16.50' },
      { field: 'isSoldOut', from: 'no', to: 'yes' },
    ])
  })
  it('treats a populated relation and its id as the same value', () => {
    expect(diffDocs({ image: { id: 4, url: '/x' } }, { image: 4 })).toEqual([])
    expect(diffDocs({ image: 4 }, { image: 5 })).toEqual([{ field: 'image', from: '4', to: '5' }])
  })
  it('never records secrets or tokens', () => {
    expect(diffDocs({ publicToken: 'a', hash: 'x' }, { publicToken: 'b', hash: 'y' })).toEqual([])
  })
  it('shows cleared values as a dash', () => {
    expect(diffDocs({ notes: 'Extra napkins' }, { notes: null })).toEqual([{ field: 'notes', from: 'Extra napkins', to: '—' }])
  })
})
