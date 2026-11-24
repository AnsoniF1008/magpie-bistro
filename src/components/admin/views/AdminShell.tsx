import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'
import React from 'react'

/** Wraps a custom page in Payload's admin chrome (sidebar, header) and requires a login. */
export function AdminShell({ initPageResult, params, searchParams, children }: AdminViewServerProps & { children: React.ReactNode }) {
  const { req, permissions, visibleEntities, locale } = initPageResult
  if (!req.user) redirect('/admin/login')
  return (
    <DefaultTemplate i18n={req.i18n} locale={locale} params={params} payload={req.payload} permissions={permissions} searchParams={searchParams} user={req.user} visibleEntities={visibleEntities}>
      <Gutter>{children}</Gutter>
    </DefaultTemplate>
  )
}
