# The Magpie Bistro + Cupcakery — Diseño, tanda 1 (pasos 1–11)

Aprobado por Ansoni el 2026-11-12.

## Decisiones
- CMS/datos: solo Payload CMS v3 (sin Prisma). Payload es la única fuente de verdad.
- Animaciones: librería Motion (`motion/react`), en código.
- Cuentas externas: ninguna aún. Todo corre en local con sustitutos; llaves en `.env` después.
- Alcance: sitio público + pedidos pickup + admin. Segunda tanda: formulario de pasteles
  personalizados, campañas holiday, SEO completo, Playwright E2E, deploy.

## Arquitectura
- Una app Next.js (App Router + TypeScript + Tailwind). Rutas: `(public)` sitio, `(payload)/admin`, `/api`.
- Base de datos: `DATABASE_URL` que empieza con `postgres` → adaptador Postgres (Neon);
  si no → SQLite en `./data/magpie.db`.
- Stripe: con `STRIPE_SECRET_KEY` → Checkout Session + webhook firmado. Sin llave → página
  `/order/pay-demo` que confirma el pedido por el mismo camino de servidor (`confirmOrder`).
- Email: con `RESEND_API_KEY` → Resend. Sin llave → consola + archivos en `./data/outbox/`.
- Rate limit: Upstash si hay llaves; si no, memoria.

## Colecciones Payload
- `users` (auth; role OWNER|STAFF — STAFF no edita precio ni borra platos)
- `media` (upload con sharp; `altEn` obligatorio, `altEs`)
- `dishes` (slug, nameEn/Es, descEn/Es, priceCents, category, tags, image, isVisible, isSoldOut, sortOrder)
- `menu-slots` (dish, weekday 1/2/4/5, weekOf opcional; sin weekOf = rotación por defecto; con weekOf = override)
- `orders` (customerName, phone, email, notes, pickupAt, status, subtotal/tax/totalCents, stripeId, items[] con snapshot)
- Global `site-settings` (horario, cierre manual, tasa de impuesto, banner, teléfono, etc.)

## Lógica clave (`src/lib`)
- `isOpenNow(settings, now)` — America/New_York, respeta cierre manual. Compartida cliente/servidor.
- `formatPrice(cents)`, `parsePriceToCents("15.00")` — enteros, nunca floats.
- `getWeekOf(date)` — lunes de la semana en hora de NY.
- `validatePickupAt` — dentro de horario, ≥30 min, ≤7 días.
- Totales siempre recalculados en servidor desde precios del CMS. Webhook idempotente por `stripeId`.

## Sitio público
Home, /menu, /cupcakes, /holiday, /story, /visit, /order/cart, /order/checkout, /order/success,
/legal/*. Contenido e imágenes migrados del HTML existente; misma paleta, fuentes, modo oscuro,
barra de llamada móvil, píldora de estado en vivo (`/api/status`).

## Admin
Payload admin con etiquetas EN/ES; lista de platos con toggles visible/agotado; campo de precio
"15.00"; vistas propias: semana (arrastrar platos a Lun/Mar/Jue/Vie) y Kanban de pedidos
(Pending→Confirmed→Ready→Completed) con sondeo cada 15 s y sonido.

## Animaciones
Hero escalonado + parallax, reveals en scroll en cascada, hover en tarjetas, pulso en píldora,
rebote en contador de carrito, drawer con spring, transición entre páginas. Respeta
`prefers-reduced-motion`; contenido SSR visible sin JS.

## Pruebas
Vitest: isOpenNow, precios, getWeekOf, validatePickupAt, cálculo de totales. Verificación manual
en navegador: menú → carrito → checkout demo → pedido CONFIRMED en Kanban. `next build` limpio.

## Entrega
Construido y verificado en el entorno de Claude; código copiado a `New Proyecto` sin `node_modules`.
