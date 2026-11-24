import Link from 'next/link'
import React from 'react'

/** Crisp vector Magpie mark — immediately visible on first paint without SSR opacity hiding. */
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="The Magpie Bistro + Cupcakery — home">
      <svg className="bird" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 50 L34 34" />
        <path d="M20 54 L40 36" style={{ opacity: 0.55 }} />
        <path d="M33 33c-6-1-10-6-9-12 1-5 5-9 10-10l4-3 1 5c4 1 7 4 8 8l6 2-6 3c0 6-4 11-10 12-1 3-3 5-6 6l1-6c-1-1 0-3 1-5z" />
        <circle cx="40" cy="14" r="1.4" fill="currentColor" stroke="none" />
        <path d="M30 38c3 2 8 2 11-1" style={{ opacity: 0.7 }} />
        <path d="M28 46l-2 5M34 44l0 6" />
      </svg>
      <span className="brand-name">
        <span className="script">The Magpie</span>
        <small>BISTRO + CUPCAKERY</small>
      </span>
    </Link>
  )
}
