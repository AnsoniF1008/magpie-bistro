import { describe, expect, it } from 'vitest'
import { toRelationId } from '@/lib/relations'
import { validateCustomerName, validateEmail, validateHttpUrl, validatePhone, validateRequiredText } from '@/lib/validation'

describe('toRelationId', () => {
  it('converts safe positive integer strings to numbers and preserves UUID/slug strings', () => {
    expect(toRelationId('42')).toBe(42)
    expect(toRelationId('0')).toBe(0)
    expect(toRelationId('abc-123')).toBe('abc-123')
    expect(toRelationId('-5')).toBe('-5')
  })
})

describe('client validators', () => {
  it('validates customer names', () => {
    expect(validateCustomerName('A')).not.toBeNull()
    expect(validateCustomerName('  ')).not.toBeNull()
    expect(validateCustomerName('Ana')).toBeNull()
    expect(validateCustomerName('x'.repeat(81))).not.toBeNull()
  })

  it('validates phone numbers', () => {
    expect(validatePhone('')).not.toBeNull()
    expect(validatePhone('call me')).not.toBeNull()
    expect(validatePhone('(757) 339-2423')).toBeNull()
  })

  it('validates optional and required email addresses', () => {
    expect(validateEmail('', false)).toBeNull()
    expect(validateEmail('', true)).not.toBeNull()
    expect(validateEmail('bad-email', false)).not.toBeNull()
    expect(validateEmail('guest@example.com', true)).toBeNull()
  })

  it('validates optional HTTP(S) reference URLs', () => {
    expect(validateHttpUrl('')).toBeNull()
    expect(validateHttpUrl('javascript:alert(1)')).not.toBeNull()
    expect(validateHttpUrl('https://example.com/cake.jpg')).toBeNull()
  })

  it('validates required text lengths', () => {
    expect(validateRequiredText(' ', 'Required', 50)).toBe('Required')
    expect(validateRequiredText('x'.repeat(51), 'Required', 50)).not.toBeNull()
    expect(validateRequiredText('2 dozen', 'Required', 50)).toBeNull()
  })
})
