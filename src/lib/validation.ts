/** Client-side field validators matching server Zod schemas in order-rules.ts and request-rules.ts. */

const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateCustomerName(value: string): string | null {
  const v = value.trim()
  if (v.length < 2) return 'Please enter your name (at least 2 characters).'
  if (v.length > 80) return 'Name must be 80 characters or fewer.'
  return null
}

export function validatePhone(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Please enter a phone number we can call.'
  if (!PHONE_RE.test(v)) return 'Enter a valid 7–20 digit phone number.'
  return null
}

export function validateEmail(value: string, required: boolean): string | null {
  const v = value.trim()
  if (!v) return required ? 'Please enter an email — we send your confirmation and payment link there.' : null
  if (!EMAIL_RE.test(v)) return 'That email address does not look right.'
  return null
}

export function validateHttpUrl(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  try {
    const url = new URL(v)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Use a link that starts with https://'
    return null
  } catch {
    return 'Use a link that starts with https://'
  }
}

export function validateRequiredText(value: string, emptyMessage: string, maxLength: number): string | null {
  const v = value.trim()
  if (!v) return emptyMessage
  if (v.length > maxLength) return `Keep this under ${maxLength} characters.`
  return null
}
