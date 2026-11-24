import { postgresAdapter } from '@payloadcms/db-postgres'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { gcsStorage } from '@payloadcms/storage-gcs'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { en } from '@payloadcms/translations/languages/en'
import fs from 'fs'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AuditLog } from './collections/AuditLog'
import { CustomCakeRequests } from './collections/CustomCakeRequests'
import { Dishes } from './collections/Dishes'
import { HolidayCampaigns } from './collections/HolidayCampaigns'
import { Media } from './collections/Media'
import { MenuSlots } from './collections/MenuSlots'
import { Orders } from './collections/Orders'
import { Users } from './collections/Users'
import { SiteSettings } from './globals/SiteSettings'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const databaseUrl = process.env.DATABASE_URL || ''
const usePostgres = /^postgres(ql)?:\/\//.test(databaseUrl)

const cloudSqlInstance = process.env.CLOUD_SQL_INSTANCE || ''
const building = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Local development needs zero setup: a SQLite file under ./data.
 * Production uses Postgres, either through a connection string (DATABASE_URL, e.g. Neon)
 * or a Google Cloud SQL instance (CLOUD_SQL_INSTANCE = project:region:instance, as on Firebase App Hosting).
 * In production the Postgres schema is created and updated by the migrations in ./migrations.
 */
async function database() {
  if (cloudSqlInstance) {
    const credentials = {
      user: process.env.DB_USER || 'magpie',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'magpie',
      max: 5,
    }
    // `next build` only loads this file; it never opens a connection, so it needs no Google credentials.
    if (building) return postgresAdapter({ pool: { ...credentials, host: '127.0.0.1' }, prodMigrations: migrations })
    const { Connector, IpAddressTypes } = await import('@google-cloud/cloud-sql-connector')
    const connector = new Connector()
    const options = await connector.getOptions({ instanceConnectionName: cloudSqlInstance, ipType: IpAddressTypes.PUBLIC })
    return postgresAdapter({ pool: { ...options, ...credentials }, prodMigrations: migrations })
  }
  if (usePostgres) return postgresAdapter({ pool: { connectionString: databaseUrl }, prodMigrations: migrations })
  const dataDir = path.resolve(process.cwd(), 'data')
  fs.mkdirSync(dataDir, { recursive: true })
  return sqliteAdapter({ client: { url: databaseUrl || `file:${path.join(dataDir, 'magpie.db')}` } })
}

const secret = process.env.PAYLOAD_SECRET || ''
if (!secret && process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
  throw new Error('PAYLOAD_SECRET is required in production. Set it in your environment.')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: ' · The Magpie Bistro' },
    avatar: 'default',
    components: {
      beforeNavLinks: ['/components/admin/NavLinks#NavLinks'],
      beforeDashboard: ['/components/admin/DashboardCards#DashboardCards'],
      views: {
        kanban: { Component: '/components/admin/views/KanbanView#KanbanView', path: '/kanban' },
        week: { Component: '/components/admin/views/WeekViewPage#WeekViewPage', path: '/week' },
      },
    },
  },
  // The bistro works in English: the admin is English-only whatever the browser language.
  i18n: { supportedLanguages: { en }, fallbackLanguage: 'en' },
  collections: [Dishes, MenuSlots, Media, Orders, CustomCakeRequests, HolidayCampaigns, Users, AuditLog],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: secret || 'dev-only-secret-change-me-before-deploying',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: await database(),
  sharp,
  telemetry: false,
  // A server's disk does not persist between deploys, so in production photos live in a bucket instead of ./media:
  // GCS_BUCKET (Firebase / Google Cloud) or BLOB_READ_WRITE_TOKEN (Vercel).
  plugins: [
    gcsStorage({ enabled: Boolean(process.env.GCS_BUCKET), collections: { media: true }, bucket: process.env.GCS_BUCKET || '', options: {} }),
    vercelBlobStorage({ enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN), collections: { media: true }, token: process.env.BLOB_READ_WRITE_TOKEN || '' }),
  ],
})
