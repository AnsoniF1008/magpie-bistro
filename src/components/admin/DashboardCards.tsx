'use client'

import './admin.css'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'

import { IconArrowRight, IconDownload } from '@/components/ui/Icons'
import { formatPrice } from '@/lib/money'

type Summary = { requestsToReview: number; todayCount: number; todayRevenueCents: number; toPrepare: number; soldOut: { id: string; name: string }[] }

/** Today at a glance, above Payload's default dashboard. */
export const DashboardCards = () => {
  const [data, setData] = useState<Summary | null>(null)

  useEffect(() => {
    let alive = true
    let activeController: AbortController | null = null
    const load = () => {
      activeController?.abort()
      const ctrl = new AbortController()
      activeController = ctrl
      const timer = setTimeout(() => ctrl.abort(), 8_000)
      fetch('/api/board/summary', { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => alive && j && setData(j))
        .catch(() => {})
        .finally(() => clearTimeout(timer))
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(id)
      activeController?.abort()
    }
  }, [])

  return (
    <div className="mg">
      <div className="mg-cards">
        <Link className="mg-card" href="/admin/kanban">
          <div className="k">To prepare</div>
          <div className="v">{data ? data.toPrepare : '–'}</div>
          <div className="d"><span>Open the orders board</span> <IconArrowRight size={14} /></div>
        </Link>
        <Link className="mg-card" href="/admin/collections/custom-cake-requests?where[status][equals]=PENDING_REVIEW">
          <div className="k">Special requests</div>
          <div className="v">{data ? data.requestsToReview : '–'}</div>
          <div className="d">
            {data?.requestsToReview ? (
              <><span>Waiting for your review</span> <IconArrowRight size={14} /></>
            ) : (
              'Nothing to review'
            )}
          </div>
        </Link>
        <div className="mg-card">
          <div className="k">Orders today</div>
          <div className="v">{data ? data.todayCount : '–'}</div>
          <div className="d">{data ? `${formatPrice(data.todayRevenueCents)} with tax` : ' '}</div>
        </div>
        <Link className="mg-card" href="/admin/collections/dishes">
          <div className="k">Sold out</div>
          <div className="v">{data ? data.soldOut.length : '–'}</div>
          <div className="d">{data?.soldOut.length ? data.soldOut.map((d) => d.name).join(', ') : 'Everything is available'}</div>
        </Link>
        <Link className="mg-card" href="/admin/week">
          <div className="k">Menu</div>
          <div className="v" style={{ fontSize: '1.3rem', paddingTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Edit this week</span> <IconArrowRight size={16} />
          </div>
          <div className="d">Drag dishes onto each day</div>
        </Link>
      </div>
      <ExportPanel />
    </div>
  )
}

/** Download orders as a spreadsheet (CSV) for a date range, or the whole menu as JSON. */
function ExportPanel() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const [from, setFrom] = useState(today.slice(0, 8) + '01')
  const [to, setTo] = useState(today)
  const input: React.CSSProperties = { minHeight: 44, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--theme-elevation-200)', background: 'var(--theme-elevation-0)', color: 'var(--theme-text)', font: 'inherit' }
  return (
    <div className="mg-bar" style={{ marginBottom: 28 }}>
      <strong>Export</strong>
      <label>
        <span style={{ position: 'absolute', left: -9999 }}>From</span>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={input} aria-label="From date" />
      </label>
      <span>to</span>
      <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={input} aria-label="To date" />
      <a className="mg-btn" href={`/api/board/export/orders?from=${from}&to=${to}`}>
        <IconDownload size={16} />
        <span>Orders (CSV)</span>
      </a>
      <a className="mg-btn" href="/api/board/export/menu">
        <IconDownload size={16} />
        <span>Menu (JSON)</span>
      </a>
    </div>
  )
}
