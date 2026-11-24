'use client'

import type { DefaultCellComponentProps } from 'payload'
import React, { useEffect, useState } from 'react'

/** One-tap switch in the dish list for "Sold out" and "Show on website". */
export const ToggleCell = ({ cellData, rowData, field, collectionSlug }: DefaultCellComponentProps) => {
  const [on, setOn] = useState(Boolean(cellData))
  const [busy, setBusy] = useState(false)
  const name = 'name' in field ? String(field.name) : ''
  const danger = name === 'isSoldOut'

  useEffect(() => {
    setOn(Boolean(cellData))
  }, [cellData])

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    const next = !on
    setOn(next)
    setBusy(true)
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 10_000)
    try {
      const res = await fetch(`/api/${collectionSlug}/${rowData.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({ [name]: next }),
      })
      if (!res.ok) setOn(!next)
    } catch {
      setOn(!next)
    } finally {
      clearTimeout(timeout)
      setBusy(false)
    }
  }

  const activeColor = danger ? '#9A4834' : '#455838'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={name === 'isSoldOut' ? 'Sold out' : 'Show on website'}
      onClick={(e) => void toggle(e)}
      style={{
        width: 52,
        height: 32,
        borderRadius: 999,
        border: 'none',
        cursor: 'pointer',
        padding: 4,
        background: on ? activeColor : 'var(--theme-elevation-200)',
        transition: 'background .15s',
        display: 'inline-flex',
        alignItems: 'center',
        opacity: busy ? 0.6 : 1,
        touchAction: 'manipulation',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#fff',
          transform: `translateX(${on ? 20 : 0}px)`,
          transition: 'transform .15s',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }}
      />
    </button>
  )
}
