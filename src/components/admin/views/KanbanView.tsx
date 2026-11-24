import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { OrdersKanban } from '../OrdersKanban'
import { AdminShell } from './AdminShell'

export const KanbanView = (props: AdminViewServerProps) => (
  <AdminShell {...props}>
    <OrdersKanban />
  </AdminShell>
)
