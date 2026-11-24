# Magpie Bistro — Tanda 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sitio público animado + pedidos pickup + admin para The Magpie Bistro, corriendo en local sin cuentas externas.

**Architecture:** Una app Next.js App Router con Payload CMS v3 embebido. Payload es la única capa de datos (SQLite local, Postgres si `DATABASE_URL` es postgres). Stripe/Resend/Upstash tienen sustituto local cuando falta la llave; ambos caminos convergen en las mismas funciones de servidor.

**Tech Stack:** Next 16.4 · React 19 · Payload 3.93 (`db-sqlite` / `db-postgres`) · Tailwind 4 · Motion 14 · Zustand 5 · Zod 4 · Stripe 23 · Resend 6 · @dnd-kit · Vitest 5.

**Spec:** `docs/superpowers/specs/2026-11-12-magpie-tanda-1-design.md`

## Global Constraints

- Dinero siempre en centavos enteros. Nunca floats. Formato solo al mostrar.
- Fechas en UTC en DB; lógica y display en `America/New_York`.
- Totales recalculados en servidor desde precios del CMS; nunca confiar en el cliente.
- Confirmación de pedido idempotente (por `stripeId` / estado).
- Zod en toda entrada de servidor.
- Server components por defecto; `"use client"` solo donde hay interacción o Motion.
- Animaciones respetan `prefers-reduced-motion`; contenido visible sin JS.
- Paleta, fuentes y radios exactamente los del brief (tokens CSS `--bg`, `--gold`, …).
- STAFF no puede editar `priceCents` ni borrar platos.
- Horario: Lun, Mar, Jue, Vie 11:30–16:30 (weekday 1,2,4,5).

## File Structure

```
src/
  payload.config.ts            # adaptador DB por env, colecciones, global, i18n en/es
  collections/{Users,Media,Dishes,MenuSlots,Orders}.ts
  globals/SiteSettings.ts
  lib/
    time.ts        # nyParts, getWeekOf, isOpenNow, validatePickupAt, pickupSlots
    money.ts       # formatPrice, parsePriceToCents, computeTotals
    content.ts     # texto estático migrado del HTML (signatures, rotation, reviews)
    data.ts        # getSettings, getDishes, getWeekMenu (server, cacheado por tag)
    orders.ts      # createOrder, confirmOrder (idempotente), orderSchema (zod)
    stripe.ts      # stripeEnabled, createCheckoutSession
    email.ts       # sendMail (Resend | outbox local), plantillas
    ratelimit.ts   # Upstash | memoria
    cart.ts        # store Zustand persistido
  components/
    motion/{Reveal,Stagger,HeroTitle,PageTransition}.tsx
    site/{Header,Footer,CallBar,StatusPill,DishCard,DayMenuCard,CartButton,CartDrawer,AddToCart,Map}.tsx
    admin/{PriceField,WeekView,OrdersKanban,DashboardCards}.tsx
  app/
    (public)/layout.tsx, page.tsx, menu/, cupcakes/, holiday/, story/, visit/,
             order/{cart,checkout,success,pay-demo}/, legal/{privacy,terms,allergy}/
    (payload)/…                # generado por Payload + vistas custom week / kanban
    api/{status,orders,orders/pending,orders/[id]/status,stripe/webhook,menu-week}/route.ts
  seed/{seed.ts, images/*}     # imágenes extraídas del HTML
tests/{time,money,orders}.test.ts
```

---

### Task 1: Scaffold + tokens de diseño

**Files:** package.json, next.config.mjs, tsconfig.json, postcss.config.mjs, `src/app/(public)/globals.css`, `src/payload.config.ts`, `.env.example`, `.gitignore`, vitest.config.ts

**Produces:** app que arranca (`npm run dev`), `/admin` carga, tokens CSS light/dark, fuentes vía `next/font`.

- [ ] Generar base con `create-payload-app` (blank, sqlite) y ajustar a `src/`.
- [ ] `payload.config.ts`: `db = DATABASE_URL?.startsWith('postgres') ? postgresAdapter : sqliteAdapter({ url: 'file:./data/magpie.db' })`.
- [ ] Tailwind 4 con `@theme` mapeando los tokens del brief; dark por `prefers-color-scheme`.
- [ ] Scripts: dev, build, start, lint, test, seed.
- [ ] `npm run build` pasa. Commit.

### Task 2: Lógica pura (TDD)

**Files:** `src/lib/time.ts`, `src/lib/money.ts`, `tests/time.test.ts`, `tests/money.test.ts`

**Produces:**
```ts
type Hours = { weekdays: number[]; open: string; close: string }   // "11:30", "16:30"
type OpenSettings = { hours: Hours; manualClosed: boolean; closedMessage?: string }
nyParts(d: Date): { y:number; m:number; d:number; weekday:number; minutes:number }  // weekday 1=Mon..7=Sun
getWeekOf(d: Date): string                 // 'YYYY-MM-DD' del lunes en NY
isOpenNow(s: OpenSettings, now?: Date): { open: boolean; reason: 'open'|'closed-hours'|'closed-day'|'manual' }
validatePickupAt(pickupAt: Date, s: OpenSettings, now?: Date): { ok: true } | { ok: false; error: string }
pickupSlots(s: OpenSettings, now?: Date): { iso: string; label: string; dayLabel: string }[]  // cada 15 min, 7 días
formatPrice(cents: number): string         // 1500 -> "$15.00"
parsePriceToCents(input: string): number | null   // "15", "15.5", "$15.00" -> 1500/1550/1500; inválido -> null
computeTotals(lines: {unitCents:number; qty:number}[], taxRateBps: number): { subtotalCents; taxCents; totalCents }
```

- [ ] Tests primero. Casos: lunes 11:29 NY cerrado / 11:30 abierto / 16:30 cerrado; miércoles cerrado; `manualClosed`; cambio de horario DST (2026-03-09 y 2026-11-02); `getWeekOf` domingo 23:30 NY → lunes anterior; pickup a 29 min rechazado, a 31 aceptado, 8 días rechazado, miércoles rechazado; `parsePriceToCents('15.999')` → null; `computeTotals` con 5.3% redondea medio centavo hacia arriba (850 → tax 45).
- [ ] Ver fallar, implementar, ver pasar. Commit.

### Task 3: Colecciones Payload + roles + seed

**Files:** `src/collections/*`, `src/globals/SiteSettings.ts`, `src/seed/seed.ts`, `src/seed/images/*`, `src/components/admin/PriceField.tsx`

**Produces:** slugs `users`, `media`, `dishes`, `menu-slots`, `orders`, global `site-settings`; tipos en `src/payload-types.ts`; `npm run seed` crea owner (`owner@magpie.local` / contraseña impresa), settings, platos del HTML, rotación por defecto e imágenes.

- [ ] Access: `dishes.delete` y campo `priceCents.update` solo OWNER; `orders` lectura/escritura solo autenticados; `media`/`dishes`/`menu-slots` lectura pública.
- [ ] Labels `{ en, es }` en todos los campos; i18n admin en/es.
- [ ] `PriceField`: input texto "15.00" ↔ centavos con `parsePriceToCents`.
- [ ] `afterChange` en dishes/menu-slots/site-settings → `revalidateTag('menu')`.
- [ ] Extraer las 9 imágenes base64 del HTML a `src/seed/images/`.
- [ ] Seed idempotente. Correr y verificar conteos. Commit.

### Task 4: Layout público + Motion

**Files:** `src/app/(public)/layout.tsx`, `src/components/site/{Header,Footer,CallBar,StatusPill}.tsx`, `src/components/motion/*`, `src/lib/data.ts`, `src/lib/content.ts`, `src/app/api/status/route.ts`

**Produces:** `getSettings()`, `getDishes()`, `getWeekMenu(weekOf)` → `{ weekday, dishes[] }[]`; `<Reveal>`, `<Stagger>`/`<StaggerItem>`, `<HeroTitle>`, `<PageTransition>`; `GET /api/status` → `{ open, reason, label }`.

- [ ] Header sticky con marca, nav, píldora (SSR inicial + refresco cada 60 s), botón carrito. Skip link. Footer con verso. CallBar móvil.
- [ ] Motion: CSS base visible; animación solo se aplica con JS y sin reduced-motion. Commit.

### Task 5: Páginas públicas

**Files:** `src/app/(public)/{page,menu/page,cupcakes/page,holiday/page,story/page,visit/page,legal/*/page}.tsx`, `src/components/site/{DishCard,DayMenuCard,Map}.tsx`

- [ ] Home: hero (título script animado, lede, CTAs, chips, tarjeta del verso, foto con parallax), today strip, destacados.
- [ ] Menu: grid semanal (override por `weekOf`), rotación con precios, signatures, nota de alergias; botón "Add" en platos pedibles.
- [ ] Cupcakes, Holiday, Story (+ reviews), Visit (Leaflet/OSM cargado en cliente, tabla de horas, direcciones), Legal.
- [ ] Metadata por página + JSON-LD Restaurant en layout. Commit.

### Task 6: Carrito + checkout + pedidos

**Files:** `src/lib/{cart,orders,stripe,email,ratelimit}.ts`, `src/components/site/{AddToCart,CartButton,CartDrawer}.tsx`, `src/app/(public)/order/*`, `src/app/api/{orders,stripe/webhook}/route.ts`, `tests/orders.test.ts`

**Produces:**
```ts
orderSchema  // zod: customerName, phone, email?, notes?, pickupAt ISO, allergyAck: true, items[{dishId, qty 1..20}]
createOrder(input): Promise<{ orderId: string; redirectUrl: string }>
confirmOrder(orderId: string, paymentRef: string): Promise<{ alreadyConfirmed: boolean }>
```

- [ ] Test de `orderSchema` (rechaza sin `allergyAck`, qty 0, items vacío) y de construcción de líneas desde platos (ignora precio del cliente, rechaza agotado/oculto).
- [ ] `POST /api/orders`: rate limit → zod → cargar platos → validar pickup → totales → crear PENDING → Stripe session o `/order/pay-demo?order=…`.
- [ ] Webhook: verifica firma, `confirmOrder`. `pay-demo`: server action que llama `confirmOrder` (solo si Stripe no está configurado).
- [ ] `confirmOrder`: si ya CONFIRMED retorna; si no, actualiza y envía emails (cliente + bistro).
- [ ] Carrito: bloquea agotados, drawer con spring, contador con rebote, se vacía en `/order/success`. Commit.

### Task 7: Admin — semana, Kanban, dashboard

**Files:** `src/components/admin/{WeekView,OrdersKanban,DashboardCards}.tsx`, `src/app/api/{orders/pending,orders/[id]/status,menu-week}/route.ts`, registro de vistas en `payload.config.ts`

- [ ] WeekView (`/admin/week`): sidebar de platos, 4 columnas, @dnd-kit, selector de semana, guardar (reemplaza slots de ese `weekOf`).
- [ ] OrdersKanban (`/admin/kanban`): 4 columnas, arrastrar cambia estado, sondeo 15 s, sonido WebAudio al llegar pedido nuevo, modal de detalle con imprimir ticket.
- [ ] Dashboard: pedidos de hoy, ingresos, agotados, accesos directos.
- [ ] Endpoints protegidos por sesión Payload. Commit.

### Task 8: Verificación + entrega

- [ ] `npm test`, `npm run build` limpios.
- [ ] Playwright (script suelto): home → menú → añadir → checkout → pay-demo → success → pedido CONFIRMED visible en Kanban; toggle agotado se refleja en menú; capturas light/dark/móvil revisadas.
- [ ] README (setup, env vars, cómo activar Stripe/Resend/Neon), `.env.example`.
- [ ] Copiar a `New Proyecto` sin `node_modules`, `.next`, `data/`.
