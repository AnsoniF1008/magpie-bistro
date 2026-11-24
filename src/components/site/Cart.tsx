'use client'

import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'

import { IconBag, IconCheck, IconClose, IconMinus, IconPlus } from '@/components/ui/Icons'
import { cartCount, cartSubtotal, MAX_QTY, useCart, useCartUi } from '@/lib/cart'
import { formatPrice } from '@/lib/money'

/** Loads the saved cart after hydration so server and client markup match. */
export function useCartReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void Promise.resolve(useCart.persist.rehydrate()).then(() => setReady(true))
  }, [])
  return ready
}

/** Apple-style exponential deceleration projection for swipe-to-dismiss velocity handoff. */
function projectHorizontal(velocityPxPerSec: number, decelerationRate = 0.996): number {
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate)
}

export function CartButton() {
  const ready = useCartReady()
  const count = useCart((s) => cartCount(s.items))
  const setOpen = useCartUi((s) => s.setOpen)
  const reduce = useReducedMotion()
  const shown = ready ? count : 0
  return (
    <button
      type="button"
      className="cart-btn"
      onClick={() => setOpen(true)}
      aria-label={`Your order, ${shown} ${shown === 1 ? 'item' : 'items'}`}
    >
      <IconBag size={21} />
      <AnimatePresence>
        {shown > 0 && (
          <motion.span
            key={shown}
            className="cart-count"
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
          >
            {shown}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export function QtyStepper({ dishId, qty, name }: { dishId: string; qty: number; name: string }) {
  const setQty = useCart((s) => s.setQty)
  return (
    <span className="qty">
      <button type="button" onClick={() => setQty(dishId, qty - 1)} aria-label={`One less ${name}`}>
        <IconMinus size={15} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => setQty(dishId, qty + 1)} disabled={qty >= MAX_QTY} aria-label={`One more ${name}`}>
        <IconPlus size={15} />
      </button>
    </span>
  )
}

export function CartLines() {
  const items = useCart((s) => s.items)
  const remove = useCart((s) => s.remove)
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {items.map((i) => (
        <motion.div
          key={i.dishId}
          className="cart-line"
          layout={!reduce}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
        >
          <div>
            <div className="name">{i.name}</div>
            <div className="unit">{formatPrice(i.unitCents)} each</div>
          </div>
          <strong>{formatPrice(i.unitCents * i.qty)}</strong>
          <QtyStepper dishId={i.dishId} qty={i.qty} name={i.name} />
          <button type="button" className="link-btn" style={{ justifySelf: 'end' }} onClick={() => remove(i.dishId)}>
            Remove
          </button>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}

export function CartDrawer({ phone, phoneHref }: { phone: string; phoneHref: string }) {
  const { open, setOpen } = useCartUi()
  const items = useCart((s) => s.items)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const closeRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const subtotal = cartSubtotal(items)

  useEffect(() => setOpen(false), [pathname, setOpen])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
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

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (previousFocus && document.body.contains(previousFocus)) {
        previousFocus.focus()
      }
    }
  }, [open, setOpen])

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const width = drawerRef.current?.offsetWidth ?? 420
    const projected = info.offset.x + projectHorizontal(info.velocity.x)
    if (projected > width * 0.35 || info.offset.x > 130) {
      setOpen(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            ref={drawerRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Your order"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
            drag={reduce ? false : 'x'}
            dragDirectionLock
            dragConstraints={{ left: 0 }}
            dragElastic={{ left: 0.06, right: 0.45 }}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
          >
            <div className="drawer-head">
              <h2>Your order</h2>
              <button ref={closeRef} type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <IconClose size={20} />
              </button>
            </div>
            <div className="drawer-body">
              {items.length === 0 ? (
                <div className="empty-state">
                  <p>Nothing here yet.</p>
                  <p>
                    <Link className="btn btn-gold btn-sm" href="/menu" onClick={() => setOpen(false)}>See this week’s menu</Link>
                  </p>
                </div>
              ) : (
                <CartLines />
              )}
            </div>
            {items.length > 0 && (
              <div className="drawer-foot">
                <dl className="totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                </dl>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--ink-soft)' }}>Tax is added at checkout. Pickup only.</p>
                <Link className="btn btn-gold" href="/order/checkout">Checkout · pick a pickup time</Link>
                <a className="btn btn-ghost btn-sm" href={phoneHref}>Or call {phone}</a>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

type AddProps = { dish: { id: string; name: string; priceCents: number | null; canOrder: boolean; isSoldOut: boolean }; ordering: boolean; label?: string }

export function AddToCart({ dish, ordering, label = 'Add' }: AddProps) {
  const add = useCart((s) => s.add)
  const [added, setAdded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (dish.isSoldOut) return <button type="button" className="add-btn" disabled>Sold out</button>
  if (!ordering || !dish.canOrder || dish.priceCents === null) return null

  const unitCents = dish.priceCents

  return (
    <>
      <button
        type="button"
        className={`add-btn${added ? ' added' : ''}`}
        onClick={() => {
          add({ dishId: dish.id, name: dish.name, unitCents })
          setAdded(true)
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => setAdded(false), 1400)
        }}
        aria-label={`Add ${dish.name} to your order`}
      >
        {added ? (
          <>
            <IconCheck size={15} />
            <span>Added</span>
          </>
        ) : (
          <>
            <IconPlus size={15} />
            <span>{label}</span>
          </>
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {added ? `Added ${dish.name} to your order.` : ''}
      </span>
    </>
  )
}
