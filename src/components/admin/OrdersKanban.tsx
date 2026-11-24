'use client'

import './admin.css'

import { DndContext, DragOverlay, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { IconCheck, IconClose, IconNote, IconPrinter, IconRefresh, IconVolumeOff, IconVolumeOn } from '@/components/ui/Icons'
import { formatPrice } from '@/lib/money'
import { formatPickup } from '@/lib/time'

type Status = 'PENDING' | 'CONFIRMED' | 'READY' | 'COMPLETED' | 'CANCELLED'
type BoardOrder = {
  id: string
  code: string
  status: Status
  customerName: string
  phone: string
  email: string | null
  notes: string | null
  pickupAt: string
  createdAt: string
  paymentMode: string | null
  items: { name: string; qty: number; unitCents: number }[]
  subtotalCents: number
  taxCents: number
  totalCents: number
}

const COLUMNS: { status: Status; title: string; next?: Status; nextLabel?: string; nextText?: string }[] = [
  { status: 'PENDING', title: 'Waiting for payment', next: 'CONFIRMED', nextLabel: 'Mark paid', nextText: 'Mark paid' },
  { status: 'CONFIRMED', title: 'To prepare', next: 'READY', nextLabel: 'Ready ✓', nextText: 'Ready' },
  { status: 'READY', title: 'Ready for pickup', next: 'COMPLETED', nextLabel: 'Picked up ✓', nextText: 'Picked up' },
  { status: 'COMPLETED', title: 'Picked up today' },
]

const POLL_MS = 15_000
const SOUND_KEY = 'magpie-admin-sound'

/** Three-note chime made with the Web Audio API — no audio file to host. */
function chime(ctx: AudioContext) {
  const now = ctx.currentTime
  ;[
    [880, 0],
    [1174.66, 0.18],
    [1318.5, 0.36],
  ].forEach(([freq, at]) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + at)
    gain.gain.exponentialRampToValueAtTime(0.35, now + at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + at)
    osc.stop(now + at + 0.55)
  })
}

function ticketText(o: BoardOrder) {
  const line = '-'.repeat(32)
  const items = o.items.map((i) => `${String(i.qty).padStart(2)} x ${i.name}\n${formatPrice(i.unitCents * i.qty).padStart(32)}`).join('\n')
  return [
    'THE MAGPIE BISTRO + CUPCAKERY',
    line,
    `ORDER ${o.code}`,
    `PICKUP ${formatPickup(o.pickupAt)}`,
    `${o.customerName}  ${o.phone}`,
    line,
    items,
    line,
    `Subtotal${formatPrice(o.subtotalCents).padStart(24)}`,
    `Tax${formatPrice(o.taxCents).padStart(29)}`,
    `TOTAL${formatPrice(o.totalCents).padStart(27)}`,
    ...(o.notes ? [line, `NOTES: ${o.notes}`] : []),
    line,
    o.paymentMode === 'demo' ? 'DEMO PAYMENT — NOT CHARGED' : 'PAID ONLINE',
  ].join('\n')
}

function OrderCard({ order, fresh, onOpen, onMove, overlay = false }: { order: BoardOrder; fresh: boolean; onOpen: () => void; onMove: (to: Status) => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: order.id, disabled: overlay })
  const col = COLUMNS.find((c) => c.status === order.status)
  const nextStatus = col?.next
  return (
    <div ref={overlay ? undefined : setNodeRef} className={`mg-order s-${order.status}${isDragging ? ' dragging' : ''}${fresh ? ' fresh' : ''}`} {...(overlay ? {} : listeners)} {...(overlay ? {} : attributes)}>
      <div className="top">
        <span className="who">{order.customerName}</span>
        <span className="when">{formatPickup(order.pickupAt).split(' · ')[1]}</span>
      </div>
      <div className="meta">
        {order.code} · {formatPickup(order.pickupAt).split(' · ')[0]} · <a href={`tel:${order.phone}`} onPointerDown={(e) => e.stopPropagation()}>{order.phone}</a>
      </div>
      <ul>
        {order.items.map((i, idx) => (
          <li key={idx}><strong>{i.qty}×</strong> {i.name}</li>
        ))}
      </ul>
      {order.notes && (
        <p className="notes">
          <span style={{ flex: 'none', marginTop: 2 }}><IconNote size={15} /></span>
          <span>{order.notes}</span>
        </p>
      )}
      <div className="foot">
        <strong>{formatPrice(order.totalCents)}</strong>
        <span style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="mg-btn sm" onPointerDown={(e) => e.stopPropagation()} onClick={onOpen}>Details</button>
          {nextStatus && col?.nextLabel && (
            <button
              type="button"
              className="mg-btn sm primary"
              aria-label={col.nextLabel}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onMove(nextStatus)}
            >
              <span>{col.nextText}</span>
              <IconCheck size={14} />
            </button>
          )}
        </span>
      </div>
    </div>
  )
}

function Column({ status, title, children, count }: { status: Status; title: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  return (
    <section ref={setNodeRef} className={`mg-col${isOver ? ' over' : ''}`} aria-label={title}>
      <div className="mg-col-head">
        <strong>{title}</strong>
        <span className="mg-count">{count}</span>
      </div>
      {children}
    </section>
  )
}

export function OrdersKanban() {
  const [orders, setOrders] = useState<BoardOrder[] | null>(null)
  const [role, setRole] = useState<'OWNER' | 'STAFF'>('STAFF')
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<BoardOrder | null>(null)
  const [confirmRefund, setConfirmRefund] = useState(false)
  const [refundBusy, setRefundBusy] = useState(false)
  const [dragging, setDragging] = useState<BoardOrder | null>(null)
  const [sound, setSound] = useState(false)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const seen = useRef<Set<string> | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const soundRef = useRef(false)
  const freshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const lastOpenerRef = useRef<HTMLElement | null>(null)
  const moveQueueRef = useRef<Map<string, Promise<void>>>(new Map())

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }))

  const load = useCallback(async () => {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 10_000)
    try {
      const res = await fetch('/api/board/orders', { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session ended. Sign in again.' : 'Could not load orders.')
      const json = (await res.json()) as { orders: BoardOrder[]; role: 'OWNER' | 'STAFF' }
      setRole(json.role)
      setOrders(json.orders)
      setUpdatedAt(new Date())
      setError(null)

      // A paid order we have not shown before = ring the bell.
      const paidIds = json.orders.filter((o) => o.status === 'CONFIRMED').map((o) => o.id)
      const currentSeen = seen.current
      if (currentSeen === null) {
        seen.current = new Set(json.orders.map((o) => o.id + o.status))
      } else {
        const arrivals = paidIds.filter((id) => !currentSeen.has(id + 'CONFIRMED'))
        json.orders.forEach((o) => currentSeen.add(o.id + o.status))
        if (arrivals.length) {
          setFresh(new Set(arrivals))
          if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
          freshTimerRef.current = setTimeout(() => setFresh(new Set()), 6000)
          if (soundRef.current && audio.current) chime(audio.current)
          document.title = `(${arrivals.length}) New order! · The Magpie`
          if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
          titleTimerRef.current = setTimeout(() => (document.title = 'Orders board · The Magpie'), 8000)
        }
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        setError(e instanceof Error ? e.message : 'Could not load orders.')
      }
    } finally {
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    void load()
    const id = setInterval(() => void load(), POLL_MS)
    return () => {
      clearInterval(id)
      if (freshTimerRef.current) clearTimeout(freshTimerRef.current)
      if (titleTimerRef.current) clearTimeout(titleTimerRef.current)
      void audio.current?.close().catch(() => {})
    }
  }, [load])

  useEffect(() => {
    // Browsers only allow sound after a tap, so restore the preference on the first interaction.
    if (localStorage.getItem(SOUND_KEY) !== '1') return
    const arm = () => {
      audio.current ??= new AudioContext()
      void audio.current.resume()
      soundRef.current = true
      setSound(true)
    }
    window.addEventListener('pointerdown', arm, { once: true })
    return () => window.removeEventListener('pointerdown', arm)
  }, [])

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setConfirmRefund(false)
        setOpen(null)
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (lastOpenerRef.current && document.body.contains(lastOpenerRef.current)) {
        lastOpenerRef.current.focus()
      }
    }
  }, [open])

  function openModal(order: BoardOrder) {
    lastOpenerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setConfirmRefund(false)
    setOpen(order)
  }

  function closeModal() {
    setConfirmRefund(false)
    setOpen(null)
  }

  function toggleSound() {
    const next = !sound
    if (next) {
      audio.current ??= new AudioContext()
      void audio.current.resume()
      chime(audio.current)
    }
    soundRef.current = next
    setSound(next)
    localStorage.setItem(SOUND_KEY, next ? '1' : '0')
  }

  function move(order: BoardOrder, to: Status) {
    if (order.status === to) return
    const prevStatus = order.status
    setOrders((list) => list?.map((o) => (o.id === order.id ? { ...o, status: to } : o)) ?? null)
    setOpen((curr) => (curr?.id === order.id ? { ...curr, status: to } : curr))
    seen.current?.add(order.id + to)

    const previousTask = moveQueueRef.current.get(order.id) ?? Promise.resolve()
    const nextTask = previousTask.then(async () => {
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), 10_000)
      try {
        const res = await fetch(`/api/board/orders/${order.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal: ctrl.signal,
          body: JSON.stringify({ status: to }),
        })
        if (!res.ok) throw new Error('Failed')
      } catch {
        setOrders((list) => list?.map((o) => (o.id === order.id ? { ...o, status: prevStatus } : o)) ?? null)
        setOpen((curr) => (curr?.id === order.id ? { ...curr, status: prevStatus } : curr))
        setError('That change was not saved. Check your connection and try again.')
      } finally {
        clearTimeout(timeout)
      }
    })
    moveQueueRef.current.set(order.id, nextTask)
    void nextTask.finally(() => {
      if (moveQueueRef.current.get(order.id) === nextTask) {
        moveQueueRef.current.delete(order.id)
      }
    })
  }

  async function executeRefund(order: BoardOrder) {
    setRefundBusy(true)
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 15_000)
    try {
      const res = await fetch(`/api/board/orders/${order.id}/refund`, {
        method: 'POST',
        credentials: 'include',
        signal: ctrl.signal,
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? 'The refund did not go through.')
        return
      }
      setConfirmRefund(false)
      setOpen(null)
      await load()
    } catch {
      setError('The refund request timed out or could not reach the server.')
    } finally {
      clearTimeout(timeout)
      setRefundBusy(false)
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setDragging(null)
    const order = orders?.find((o) => o.id === e.active.id)
    if (order && e.over) void move(order, e.over.id as Status)
  }

  return (
    <div className="mg">
      <h1>Orders board</h1>
      <p className="mg-sub">Drag a card to the next column, or tap its button. Updates every 15 seconds.</p>
      <div className="mg-bar">
        <button type="button" className={`mg-btn${sound ? ' on' : ''}`} onClick={toggleSound} aria-pressed={sound}>
          {sound ? <IconVolumeOn size={18} /> : <IconVolumeOff size={18} />}
          <span>{sound ? 'Sound on' : 'Turn on new-order sound'}</span>
        </button>
        <button type="button" className="mg-btn" onClick={() => void load()}>
          <IconRefresh size={17} />
          <span>Refresh</span>
        </button>
        <a className="mg-btn" href="/admin/collections/orders">All orders</a>
        {updatedAt && <span className="mg-sub" style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>Updated {updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>}
      </div>
      {error && <div className="mg-error" role="alert">{error}</div>}
      {orders === null ? (
        <p className="mg-empty">Loading orders…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={(e) => setDragging(orders.find((o) => o.id === e.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
          <div className="mg-board">
            {COLUMNS.map((col) => {
              const list = orders.filter((o) => o.status === col.status)
              return (
                <Column key={col.status} status={col.status} title={col.title} count={list.length}>
                  {list.length === 0 && <p className="mg-empty">Nothing here</p>}
                  {list.map((o) => (
                    <OrderCard key={o.id} order={o} fresh={fresh.has(o.id)} onOpen={() => openModal(o)} onMove={(to) => void move(o, to)} />
                  ))}
                </Column>
              )
            })}
          </div>
          <DragOverlay>{dragging && <OrderCard order={dragging} fresh={false} onOpen={() => {}} onMove={() => {}} overlay />}</DragOverlay>
        </DndContext>
      )}

      {open && (
        <div className="mg-modal-back" onClick={closeModal}>
          <div ref={modalRef} className="mg-modal" role="dialog" aria-modal="true" aria-label={`Order ${open.code}`} onClick={(e) => e.stopPropagation()}>
            <div className="mg-modal-head">
              <div>
                <h2 style={{ margin: 0 }}>Order {open.code}</h2>
                <p className="mg-sub" style={{ marginBottom: 0 }}>
                  {open.customerName} · <a href={`tel:${open.phone}`}>{open.phone}</a>{open.email ? ` · ${open.email}` : ''}
                </p>
              </div>
              <button ref={closeBtnRef} type="button" className="mg-btn sm" onClick={closeModal} aria-label="Close order details">
                <IconClose size={18} />
              </button>
            </div>

            <div className="mg-move-row" role="group" aria-label="Move order status">
              {COLUMNS.map((col) => (
                <button
                  key={col.status}
                  type="button"
                  className={`mg-btn sm${open.status === col.status ? ' primary' : ''}`}
                  aria-pressed={open.status === col.status}
                  onClick={() => void move(open, col.status)}
                >
                  {col.title}
                </button>
              ))}
            </div>

            <pre className="mg-ticket">{ticketText(open)}</pre>
            <div className="mg-bar" style={{ marginBottom: 0 }}>
              <button type="button" className="mg-btn primary" onClick={() => window.print()}>
                <IconPrinter size={17} />
                <span>Print ticket</span>
              </button>
              <a className="mg-btn" href={`/admin/collections/orders/${open.id}`}>Open full record</a>
              {role === 'OWNER' && open.status !== 'CANCELLED' && !confirmRefund && (
                <button type="button" className="mg-btn danger" onClick={() => setConfirmRefund(true)}>Cancel &amp; refund</button>
              )}
              <button type="button" className="mg-btn" onClick={closeModal}>Close</button>
            </div>

            {confirmRefund && (
              <div className="mg-confirm" role="alertdialog" aria-label="Confirm refund">
                <p>Cancel order {open.code} and refund {formatPrice(open.totalCents)}?</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="mg-btn sm danger-solid" disabled={refundBusy} onClick={() => void executeRefund(open)}>
                    {refundBusy ? 'Refunding…' : 'Yes, cancel & refund'}
                  </button>
                  <button type="button" className="mg-btn sm" disabled={refundBusy} onClick={() => setConfirmRefund(false)}>
                    Keep order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
