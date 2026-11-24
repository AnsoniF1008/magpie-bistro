# The Magpie Bistro + Cupcakery

Website with a CMS, online pickup orders and special-order requests.
Next.js (App Router) · Payload CMS v3 · Tailwind 4 · Motion · Stripe · Resend.

## Run it locally

Needs Node 20.9+ (tested on Node 22). No accounts and no database server required.

```bash
npm install
npm run seed     # menu, photos, holiday campaigns and the owner account (prints its password once)
npm run dev      # site: http://localhost:3000   admin: http://localhost:3000/admin
```

`npm run seed` is safe to repeat: it only adds what is missing and never touches orders or edits made in the admin.
To choose the owner login: `SEED_OWNER_EMAIL=… SEED_OWNER_PASSWORD=… npm run seed` (PowerShell: `$env:SEED_OWNER_PASSWORD="…"; npm run seed`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server (needs `PAYLOAD_SECRET`) |
| `npm run lint` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) on a throwaway database, port 3100. First time: `npx playwright install chromium` |
| `npm run seed` | Seed / top up the database |

## What works without keys, and how to switch on the real thing

Copy `.env.example` to `.env`. Each service switches over as soon as its key is present.

| Service | No key (local) | With key |
| --- | --- | --- |
| Database | SQLite at `./data/magpie.db` | Cloud SQL Postgres via `CLOUD_SQL_INSTANCE` (Firebase), or `DATABASE_URL=postgres://…` |
| Photos | `./media` on disk | `GCS_BUCKET` → Cloud Storage (Firebase), or `BLOB_READ_WRITE_TOKEN` → Vercel Blob |
| Payments | Demo payment pages, nothing is charged | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → Stripe Checkout |
| Email | Saved as HTML in `./data/outbox/` | `RESEND_API_KEY` + `EMAIL_FROM` |
| Rate limiting | In memory | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| Analytics | Off, no cookie banner | `NEXT_PUBLIC_GA_ID` → GA4 behind a consent banner |
| Error monitoring | Off | `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` |

Deployment steps are in [docs/DEPLOY.md](docs/DEPLOY.md). The owner's guide is [docs/OWNER-MANUAL.md](docs/OWNER-MANUAL.md). The account checklist is [docs/HANDOFF.md](docs/HANDOFF.md).

## How it is organised

```
src/
  payload.config.ts        database adapter by environment, collections, English-only admin
  collections/             Users (OWNER/STAFF), Media, Dishes, MenuSlots, Orders,
                           CustomCakeRequests, HolidayCampaigns, AuditLog
  globals/SiteSettings.ts  hours, closed-today switch, banner, photos, tax, contact
  lib/
    time.ts                America/New_York hours: isOpenNow, getWeekOf, pickupSlots…
    money.ts               integer cents: formatPrice, parsePriceToCents, computeTotals
    availability.ts        the "dish of the day" rule
    order-rules.ts         order schema (Zod) + pricing lines from the catalog
    orders.ts              createOrder / confirmOrder (idempotent)
    request-rules.ts       special-request schema, lead time, holiday pricing + deadline
    requests.ts            createRequest / approval emails / markRequestPaid (idempotent)
    audit.ts               change-history hooks
    data.ts stripe.ts email.ts ratelimit.ts cart.ts content.ts
  components/
    motion/                Reveal, Stagger, HeroTitle, ParallaxPhoto, CountUp…
    site/                  header, footer, cart, checkout, request forms, map, consent
    admin/                 PriceField, ToggleCell, OrdersKanban, WeekView, DashboardCards
  app/
    (public)/              /, /menu, /cupcakes, /holiday, /story, /visit, /order/*, /request/*, /legal/*
    (payload)/             Payload admin (/admin) and its REST API (/api/<collection>)
    api/                   /api/status, /api/checkout, /api/cakes, /api/stripe/webhook, /api/board/*
    sitemap.ts robots.ts
  seed/                    seed.ts + photos migrated from the original site
tests/                     Vitest unit tests; tests/e2e Playwright
```

Things worth knowing before changing code:

- **Payload is the only data layer** (no Prisma), so there is one schema, not two.
- **Money is integer cents everywhere.** The browser only sends ids and quantities; prices, tax and totals are computed on the server.
- **`/api/checkout` and `/api/board/*`** are custom routes. `/api/orders`, `/api/dishes`… belong to Payload's REST API.
- **Dish of the day:** a dish on the weekly board can only be ordered for a day it is served. Dishes not on the board that week can be ordered any open day.
- **Weekly menu:** a slot without `weekOf` is the regular rotation; with `weekOf` (a Monday, `YYYY-MM-DD`) it replaces that day for that week only.
- **Special requests** (custom cakes and holiday pre-orders) are never charged up front. The owner sets the amount and approves; the customer pays from `/request/<token>`.
- **Payment confirmation is idempotent** for orders and requests: the Stripe webhook and the return page can both call it safely.
- **Roles:** STAFF can mark sold out, move orders, edit the weekly menu and review requests. Only the OWNER changes prices, creates or deletes dishes, edits tax and refunds.
- **Change history:** every change to dishes, orders and requests is logged with who and what. Dishes also keep their last 30 versions (Versions tab → Restore).
- **Pages render per request**, so "sold out" and menu edits show immediately.
- **Hidden fields:** `nameEs`, `descEs`, `altEs` and `bannerEs` remain in the schema but are hidden in the admin, so existing databases upgrade without a destructive migration.

## Not built

A Spanish version of the public site, the tutorial video and the live training session. Stripe, Resend, Neon, Upstash, GA4, Sentry and Vercel Blob are wired but were only exercised in their no-key fallback; test each once after adding its key.
