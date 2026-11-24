'use client'

import { motion, useReducedMotion } from 'motion/react'
import React from 'react'

/** Circle draws, then the check strokes in. */
export function SuccessMark() {
  const reduce = useReducedMotion()
  return (
    <svg className="success-mark" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <motion.circle
        cx="32"
        cy="32"
        r="27"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.path
        d="M20 33l8.5 8.5L45 24"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: reduce ? 0 : 0.4, ease: 'easeOut' }}
      />
    </svg>
  )
}
