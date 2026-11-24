'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import Script from 'next/script'
import React, { useEffect, useState } from 'react'

const KEY = 'magpie-analytics-consent'
const EVENT = 'magpie:cookie-settings'

type Choice = 'granted' | 'denied' | null

/**
 * Google Analytics 4 behind consent. Nothing loads, and no analytics cookie is
 * set, until the visitor accepts. Renders nothing at all when no GA id is set.
 */
export function Analytics({ gaId }: { gaId: string }) {
  const [choice, setChoice] = useState<Choice>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    let stored: Choice = null
    try {
      const v = localStorage.getItem(KEY)
      stored = v === 'granted' || v === 'denied' ? v : null
    } catch {
      /* storage blocked: ask each visit */
    }
    setChoice(stored)
    setOpen(stored === null)
    setReady(true)
    const reopen = () => setOpen(true)
    window.addEventListener(EVENT, reopen)
    return () => window.removeEventListener(EVENT, reopen)
  }, [])

  function decide(next: Exclude<Choice, null>) {
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
    setOpen(false)
    if (choice === 'granted' && next === 'denied') return window.location.reload()
    setChoice(next)
  }

  return (
    <>
      {choice === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      <AnimatePresence>
        {ready && open && (
          <motion.div
            className="consent"
            role="dialog"
            aria-label="Cookies"
            initial={reduce ? false : { y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 32, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            <p>
              We’d like to use analytics cookies to see which pages people visit so we can improve the site. Your cart and orders work either way. <Link href="/legal/privacy">Privacy policy</Link>
            </p>
            <div className="consent-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => decide('denied')}>No thanks</button>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => decide('granted')}>Allow analytics</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** Footer link that reopens the banner so a visitor can change their mind. */
export function CookieSettingsLink() {
  return (
    <button type="button" className="link-btn" style={{ fontSize: 'inherit' }} onClick={() => window.dispatchEvent(new Event(EVENT))}>
      Cookie settings
    </button>
  )
}
