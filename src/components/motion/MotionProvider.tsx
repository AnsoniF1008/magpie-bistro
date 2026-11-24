'use client'

import { MotionConfig } from 'motion/react'
import React from 'react'

/** Honors the visitor's "reduce motion" setting across every animation. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
