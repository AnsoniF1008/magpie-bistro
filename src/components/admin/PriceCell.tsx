import type { DefaultServerCellComponentProps } from 'payload'
import React from 'react'

import { formatPrice } from '@/lib/money'

export const PriceCell = ({ cellData }: DefaultServerCellComponentProps) => (
  <span>{typeof cellData === 'number' ? formatPrice(cellData) : '—'}</span>
)
