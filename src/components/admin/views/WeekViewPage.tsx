import type { AdminViewServerProps } from 'payload'
import React from 'react'

import { WeekView } from '../WeekView'
import { AdminShell } from './AdminShell'

export const WeekViewPage = (props: AdminViewServerProps) => (
  <AdminShell {...props}>
    <WeekView />
  </AdminShell>
)
