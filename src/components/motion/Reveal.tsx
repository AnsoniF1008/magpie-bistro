import React from 'react'

type RevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  y?: number
  as?: 'div' | 'section' | 'article' | 'li' | 'p' | 'span'
  id?: string
  style?: React.CSSProperties
}

/**
 * Semantic layout wrapper. Content renders immediately without scroll-triggered
 * opacity gating so pages read instantaneously and predictably.
 */
export function Reveal({ children, className, as = 'div', id, style }: RevealProps) {
  const Tag = as
  return (
    <Tag id={id} style={style} className={className}>
      {children}
    </Tag>
  )
}

type StaggerProps = {
  children: React.ReactNode
  className?: string
  stagger?: number
  as?: 'div' | 'ul' | 'dl'
  immediate?: boolean
  style?: React.CSSProperties
}

export function Stagger({ children, className, as = 'div', style }: StaggerProps) {
  const Tag = as
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  )
}

type StaggerItemProps = {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'article' | 'li' | 'span' | 'p'
  style?: React.CSSProperties
}

export function StaggerItem({ children, className, as = 'div', style }: StaggerItemProps) {
  const Tag = as
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  )
}
