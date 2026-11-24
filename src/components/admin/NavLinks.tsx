import Link from 'next/link'
import React from 'react'

import { IconCalendar, IconClipboard, IconExternal } from '@/components/ui/Icons'

const item: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 10,
  fontWeight: 700,
  textDecoration: 'none',
  background: 'var(--theme-elevation-100)',
  color: 'var(--theme-text)',
  minHeight: 44,
}

export const NavLinks = () => (
  <div style={{ display: 'grid', gap: 8, marginBottom: 20, width: '100%' }}>
    <Link href="/admin/kanban" style={item}>
      <IconClipboard size={18} />
      <span>Orders board</span>
    </Link>
    <Link href="/admin/week" style={item}>
      <IconCalendar size={18} />
      <span>This week’s menu</span>
    </Link>
    <a href="/" target="_blank" rel="noopener" style={{ ...item, fontWeight: 600, background: 'transparent', border: '1px solid var(--theme-elevation-150)' }}>
      <IconExternal size={17} />
      <span>View website</span>
    </a>
  </div>
)
