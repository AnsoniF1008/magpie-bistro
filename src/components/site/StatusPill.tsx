'use client'

import React, { useEffect, useState } from 'react'

export type Status = { open: boolean; label: string }

/** Shared live status so the header pill and the "Today" strip always agree. */
export function useLiveStatus(initial: Status): Status {
  const [status, setStatus] = useState(initial)
  useEffect(() => {
    let alive = true
    let activeController: AbortController | null = null
    const refresh = async () => {
      activeController?.abort()
      const ctrl = new AbortController()
      activeController = ctrl
      const timeout = setTimeout(() => ctrl.abort(), 8_000)
      try {
        const res = await fetch('/api/status', { cache: 'no-store', signal: ctrl.signal })
        if (res.ok && alive) setStatus(await res.json())
      } catch {
        /* keep the last known status on transient offline/abort */
      } finally {
        clearTimeout(timeout)
      }
    }
    const id = setInterval(refresh, 60_000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(id)
      activeController?.abort()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return status
}

export function StatusPill({ initial }: { initial: Status }) {
  const status = useLiveStatus(initial)
  return (
    <span className={`status-pill${status.open ? '' : ' closed'}`} role="status">
      <span className="dot" aria-hidden="true" />
      <span>{status.open ? 'Open now' : 'Closed'}</span>
    </span>
  )
}

export function StatusText({ initial }: { initial: Status }) {
  const status = useLiveStatus(initial)
  return <span className="t-item">{status.label} (Eastern)</span>
}
