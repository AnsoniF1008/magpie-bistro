import React from 'react'

/** Renders formatted figures with tabular alignment immediately on first paint. */
export function CountUp({ value, suffix = '', className }: { value: number; suffix?: string; className?: string }) {
  const formatted = Math.round(value).toLocaleString('en-US') + suffix
  return <span className={className} style={{ fontVariantNumeric: 'lining-nums tabular-nums' }}>{formatted}</span>
}
