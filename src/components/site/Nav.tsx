'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { IconArrowRight, IconClose, IconMenu, IconPhone } from '@/components/ui/Icons'

export const NAV = [
  { href: '/menu', label: "This Week's Menu" },
  { href: '/cupcakes', label: 'Cupcakery' },
  { href: '/holiday', label: 'Holiday Orders' },
  { href: '/story', label: 'Our Story' },
  { href: '/visit', label: 'Visit Us' },
]

/** The gold underline glides between links as you navigate (critically damped spring). */
export function Nav() {
  const pathname = usePathname()
  const reduce = useReducedMotion()
  return (
    <nav className="main" aria-label="Main">
      <ul>
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined}>
                {item.label}
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : 'nav-underline'}
                    className="nav-underline"
                    transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
                  />
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type MobileNavProps = {
  hours: string
  addressLine1: string
  addressLine2: string
  phone: string
  phoneHref: string
  statusLabel: string
  isOpen: boolean
}

export function MobileNav({ hours, addressLine1, addressLine2, phone, phoneHref, statusLabel, isOpen }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const reduce = useReducedMotion()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !sheetRef.current) return
      const focusable = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
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
      document.body.style.overflow = previousOverflow
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        triggerRef.current.focus()
      } else {
        previousFocus?.focus()
      }
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-menu-btn"
        aria-expanded={open}
        aria-controls="mobile-nav-sheet"
        aria-label={open ? 'Close menu' : 'Open navigation menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconClose size={19} /> : <IconMenu size={19} />}
        <span>Menu</span>
      </button>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <motion.div
                  className="mobile-sheet-backdrop"
                  initial={reduce ? { opacity: 0 } : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setOpen(false)}
                />
                <motion.div
                  ref={sheetRef}
                  id="mobile-nav-sheet"
                  className="mobile-sheet"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Site navigation"
                  initial={reduce ? { opacity: 0 } : { x: '100%' }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: '100%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
                >
                  <div className="mobile-sheet-head">
                    <span className={`status-pill${isOpen ? '' : ' closed'}`}>
                      <span className="dot" />
                      <span>{statusLabel}</span>
                    </span>
                    <button
                      ref={closeRef}
                      type="button"
                      className="icon-btn"
                      aria-label="Close navigation menu"
                      onClick={() => setOpen(false)}
                    >
                      <IconClose size={20} />
                    </button>
                  </div>
                  <div className="mobile-sheet-body">
                    <nav aria-label="Mobile">
                      <ul className="mobile-nav-list">
                        {NAV.map((item) => {
                          const active = pathname === item.href || pathname.startsWith(item.href + '/')
                          return (
                            <li key={item.href}>
                              <Link
                                href={item.href}
                                className="mobile-nav-link"
                                aria-current={active ? 'page' : undefined}
                                onClick={() => setOpen(false)}
                              >
                                <span>{item.label}</span>
                                <IconArrowRight size={17} />
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </nav>

                    <div className="mobile-sheet-meta">
                      <p><strong>Hours</strong><br />{hours}</p>
                      <p><strong>Visit</strong><br />{addressLine1}<br />{addressLine2}</p>
                      <a className="btn btn-gold" href={phoneHref} onClick={() => setOpen(false)}>
                        <IconPhone size={18} />
                        <span>Call {phone}</span>
                      </a>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}
