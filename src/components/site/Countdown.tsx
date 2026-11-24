'use client'

import React, { useEffect, useState } from 'react'

const parts = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000))
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }
}

/** Live countdown to an order deadline. Renders a stable placeholder on the server to avoid hydration drift. */
export function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime()
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    if (Number.isNaN(target)) {
      setLeft(0)
      return
    }
    let id: ReturnType<typeof setInterval> | null = null
    const tick = () => {
      const remaining = target - Date.now()
      setLeft(remaining)
      if (remaining <= 0 && id) {
        clearInterval(id)
        id = null
      }
    }
    tick()
    if (target - Date.now() > 0) {
      id = setInterval(tick, 1000)
    }
    return () => {
      if (id) clearInterval(id)
    }
  }, [target])

  if (left !== null && left <= 0) return <p className="countdown closed">Ordering has closed</p>
  const p = left === null ? null : parts(left)
  const cell = (value: number | undefined, label: string) => (
    <span className="cd-cell">
      <span className="cd-num">{value === undefined ? '–' : String(value).padStart(2, '0')}</span>
      <span className="cd-label">{label}</span>
    </span>
  )
  return (
    <div className="countdown" role="timer" aria-label={p ? `${p.d} days, ${p.h} hours and ${p.m} minutes left to order` : 'Time left to order'}>
      {cell(p?.d, 'days')}
      {cell(p?.h, 'hrs')}
      {cell(p?.m, 'min')}
      {cell(p?.s, 'sec')}
    </div>
  )
}
