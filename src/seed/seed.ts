/**
 * Seeds the database with the menu migrated from the original static site.
 * Safe to run more than once: existing dishes are matched by slug and updated,
 * the regular rotation is rebuilt, orders are never touched.
 *
 *   npm run seed
 */
import 'dotenv/config'
import config from '@payload-config'
import crypto from 'crypto'
import path from 'path'
import { getPayload } from 'payload'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const img = (name: string) => path.join(dirname, 'images', name)

type SeedDish = {
  slug: string
  nameEn: string
  nameEs?: string
  descEn?: string
  priceCents?: number
  category: 'ENTREE' | 'BOWL' | 'SANDWICH' | 'SOUP' | 'SALAD' | 'DESSERT' | 'DRINK'
  image?: string
  isSignature?: boolean
  isOrderable?: boolean
}

const PHOTOS: Record<string, { file: string; altEn: string; altEs: string }> = {
  bulgogi: { file: 'bulgogi.jpg', altEn: 'Korean bulgogi bowl — sliced marinated beef over white rice with sesame seeds and green onions', altEs: 'Bowl de bulgogi coreano — carne marinada sobre arroz blanco con ajonjolí y cebollín' },
  'french-dip': { file: 'french-dip.jpg', altEn: 'Mississippi pot roast French dip sandwich with melted cheese', altEs: 'Sándwich French dip de carne Mississippi con queso derretido' },
  cookies: { file: 'cookies.jpg', altEn: 'A stack of bakery-style chocolate chip cookies on a cooling rack', altEs: 'Una pila de galletas con chispas de chocolate sobre una rejilla' },
  cupcakes: { file: 'cupcakes.jpg', altEn: 'A colorful assortment of cupcakes with tall swirled frosting', altEs: 'Un surtido colorido de cupcakes con betún en espiral' },
}

const DISHES: SeedDish[] = [
  // Daily lunch combos — $15
  { slug: 'mississippi-pot-roast-french-dip', nameEn: 'Mississippi Pot Roast French Dip Sandwich', nameEs: 'Sándwich French Dip de Carne Mississippi', descEn: 'Slow-cooked pot roast piled into a sandwich for dipping — comfort food, Magpie style.', priceCents: 1500, category: 'SANDWICH', image: 'french-dip', isSignature: true },
  { slug: 'korean-bulgogi-bowl', nameEn: 'Korean Bulgogi Bowl', nameEs: 'Bowl de Bulgogi Coreano', descEn: 'Sweet-savory marinated beef over rice — a nod to Tonya’s Korean heritage. The Korean marinated beef combo is what one happy guest wrote up in a 5-star TripAdvisor review.', priceCents: 1500, category: 'BOWL', image: 'bulgogi', isSignature: true },
  { slug: 'brazilian-steak-bites', nameEn: 'Brazilian Steak Bites over seasoned rice', nameEs: 'Bocados de Res Brasileños sobre arroz sazonado', priceCents: 1500, category: 'ENTREE' },
  { slug: 'beef-stroganoff', nameEn: 'Beef Stroganoff over buttered noodles', nameEs: 'Stroganoff de Res sobre fideos con mantequilla', priceCents: 1500, category: 'ENTREE' },
  { slug: 'chicken-salad-croissant', nameEn: 'Chicken Salad Sandwich on a buttered croissant', nameEs: 'Sándwich de Ensalada de Pollo en croissant', priceCents: 1500, category: 'SANDWICH' },
  { slug: 'meatball-sub', nameEn: 'Meatball Sub with Bolognese-style red sauce', nameEs: 'Sub de Albóndigas con salsa roja estilo boloñesa', priceCents: 1500, category: 'SANDWICH' },
  { slug: 'korean-japchae-dumplings', nameEn: 'Korean Japchae with Korean Beef Dumplings', nameEs: 'Japchae Coreano con Dumplings de Res', priceCents: 1500, category: 'ENTREE' },
  // Protein bowls — $15
  { slug: 'brazilian-steak-bowl', nameEn: 'Brazilian Steak Bowl', nameEs: 'Bowl de Res Brasileño', priceCents: 1500, category: 'BOWL' },
  { slug: 'cilantro-lime-bowl', nameEn: 'Cilantro Lime Bowl', nameEs: 'Bowl de Cilantro y Limón', priceCents: 1500, category: 'BOWL' },
  { slug: 'honey-sriracha-bowl', nameEn: 'Honey Sriracha Bowl', nameEs: 'Bowl de Miel y Sriracha', priceCents: 1500, category: 'BOWL' },
  { slug: 'zesty-herb-bowl', nameEn: 'Zesty Herb Bowl', nameEs: 'Bowl de Hierbas', priceCents: 1500, category: 'BOWL' },
  // Rotating soups — $8.50
  { slug: 'broccoli-cheddar-soup', nameEn: 'Broccoli Cheddar', nameEs: 'Brócoli con Cheddar', priceCents: 850, category: 'SOUP' },
  { slug: 'chicken-tortilla-soup', nameEn: 'Chicken Tortilla', nameEs: 'Tortilla de Pollo', priceCents: 850, category: 'SOUP' },
  { slug: 'cream-of-chicken-wild-rice-soup', nameEn: 'Cream of Chicken & Wild Rice', nameEs: 'Crema de Pollo y Arroz Salvaje', priceCents: 850, category: 'SOUP' },
  { slug: 'baked-potato-soup', nameEn: 'Baked Potato', nameEs: 'Papa Horneada', priceCents: 850, category: 'SOUP' },
  { slug: 'chicken-noodle-soup', nameEn: 'Chicken Noodle', nameEs: 'Pollo con Fideos', priceCents: 850, category: 'SOUP' },
  // Salads — $8.50
  { slug: 'house-salad', nameEn: 'Classic or specialty salad', nameEs: 'Ensalada clásica o de especialidad', descEn: 'With a homemade dressing: Sweet Sesame, Creamy Apple Vinaigrette, Buttermilk Ranch or Cilantro Lime — tell us which in the order notes.', priceCents: 850, category: 'SALAD' },
  // Something sweet
  { slug: 'sunshine-cake-cupcake', nameEn: 'Sunshine Cake Cupcakes', nameEs: 'Cupcakes Sunshine Cake', descEn: 'Pineapple & mandarin orange.', priceCents: 450, category: 'DESSERT', image: 'cupcakes' },
  { slug: 'andes-mint-chocolate-cupcake', nameEn: 'Andes Mint Chocolate Cupcakes', nameEs: 'Cupcakes de Chocolate y Menta Andes', priceCents: 450, category: 'DESSERT' },
  { slug: 'apple-pie-cupcake', nameEn: 'Apple Pie Cupcakes', nameEs: 'Cupcakes de Pay de Manzana', priceCents: 450, category: 'DESSERT' },
  { slug: 'banana-pudding-cup', nameEn: 'Banana Pudding Cups', nameEs: 'Vasitos de Pudín de Banana', descEn: 'Dessert cups rotate weekly — ask at the counter for today’s price.', category: 'DESSERT', isOrderable: false },
  { slug: 'browned-butter-chocolate-chip-cookie', nameEn: 'Browned Butter Chocolate Chip Cookie', nameEs: 'Galleta de Mantequilla Dorada con Chispas de Chocolate', priceCents: 350, category: 'DESSERT', image: 'cookies', isSignature: true, descEn: 'Browned Butter Chocolate Chip and Oatmeal Macadamia Nut Chocolate Chunk — $3.50 each, and they go fast.' },
  { slug: 'oatmeal-macadamia-chocolate-chunk-cookie', nameEn: 'Oatmeal Macadamia Nut Chocolate Chunk Cookie', nameEs: 'Galleta de Avena, Macadamia y Trozos de Chocolate', priceCents: 350, category: 'DESSERT' },
  // Drinks
  { slug: 'bottled-beverage', nameEn: 'Bottled beverages', nameEs: 'Bebidas embotelladas', descEn: 'Available à la carte at the counter.', category: 'DRINK', isOrderable: false },
]

/** The regular rotation, exactly as published on the original site. */
const ROTATION: Record<string, string[]> = {
  '1': ['mississippi-pot-roast-french-dip', 'broccoli-cheddar-soup', 'sunshine-cake-cupcake'],
  '2': ['korean-bulgogi-bowl', 'chicken-tortilla-soup', 'andes-mint-chocolate-cupcake'],
  '4': ['brazilian-steak-bites', 'cream-of-chicken-wild-rice-soup', 'apple-pie-cupcake'],
  '5': ['beef-stroganoff', 'baked-potato-soup', 'banana-pudding-cup'],
}

async function run() {
  const payload = await getPayload({ config })
  const log = (m: string) => payload.logger.info(`[seed] ${m}`)

  // 1) Owner account
  const users = await payload.count({ collection: 'users' })
  if (users.totalDocs === 0) {
    const password = process.env.SEED_OWNER_PASSWORD || crypto.randomBytes(9).toString('base64url')
    const email = process.env.SEED_OWNER_EMAIL || 'owner@magpie.local'
    await payload.create({ collection: 'users', data: { email, password, name: 'Owner', role: 'OWNER' } })
    console.log(`\n  ┌──────────────────────────────────────────────┐\n  │  Admin login  →  http://localhost:3000/admin\n  │  Email:    ${email}\n  │  Password: ${password}\n  │  (change it after the first sign-in)\n  └──────────────────────────────────────────────┘\n`)
  } else log('users already exist — skipping owner account')

  // 2) Photos
  const mediaIds: Record<string, number | string> = {}
  for (const [key, p] of Object.entries(PHOTOS)) {
    const found = await payload.find({ collection: 'media', where: { altEn: { equals: p.altEn } }, limit: 1 })
    if (found.docs[0]) mediaIds[key] = found.docs[0].id
    else {
      const doc = await payload.create({ collection: 'media', data: { altEn: p.altEn, altEs: p.altEs }, filePath: img(p.file) })
      mediaIds[key] = doc.id
      log(`photo: ${p.file}`)
    }
  }

  // 3) Dishes
  const dishIds: Record<string, number | string> = {}
  for (const [i, d] of DISHES.entries()) {
    const data = {
      slug: d.slug,
      nameEn: d.nameEn,
      nameEs: d.nameEs,
      descEn: d.descEn,
      priceCents: d.priceCents ?? null,
      category: d.category,
      image: d.image ? (mediaIds[d.image] as number) : undefined,
      isSignature: Boolean(d.isSignature),
      isOrderable: d.isOrderable ?? true,
      sortOrder: (i + 1) * 10,
    }
    const found = await payload.find({ collection: 'dishes', where: { slug: { equals: d.slug } }, limit: 1 })
    if (found.docs[0]) {
      dishIds[d.slug] = found.docs[0].id
    } else {
      const doc = await payload.create({ collection: 'dishes', data: { ...data, isVisible: true, isSoldOut: false } })
      dishIds[d.slug] = doc.id
    }
  }
  log(`${Object.keys(dishIds).length} dishes ready`)

  // 4) Regular rotation (only when none exists, so owner edits are never overwritten)
  const rotation = await payload.count({ collection: 'menu-slots', where: { or: [{ weekOf: { exists: false } }, { weekOf: { equals: '' } }] } })
  if (rotation.totalDocs === 0) {
    for (const [weekday, slugs] of Object.entries(ROTATION)) {
      for (const [position, slug] of slugs.entries()) {
        await payload.create({ collection: 'menu-slots', data: { dish: dishIds[slug] as number, weekday: weekday as '1', position } })
      }
    }
    log('regular rotation created')
  } else log('rotation already exists — left as is')

  // 5) Site settings (photos + defaults, only where empty)
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      heroImage: settings.heroImage ?? (mediaIds.bulgogi as number),
      cupcakeryImage: settings.cupcakeryImage ?? (mediaIds.cupcakes as number),
      heroCaption: settings.heroCaption ?? 'The Korean Bulgogi Bowl, one of the rotating $15 protein bowls.',
      notificationEmail: settings.notificationEmail ?? (process.env.BISTRO_NOTIFICATION_EMAIL || 'themagpiecupcakery@gmail.com'),
    },
  })
  log('site settings ready')

  // 6) Holiday campaigns (only when none exist)
  const campaigns = await payload.count({ collection: 'holiday-campaigns' })
  if (campaigns.totalDocs === 0) {
    const items = [
      { name: 'Beef Lumpia', detail: '25 pieces, frozen', priceCents: 3750 },
      { name: 'Korean Beef Dumplings', detail: '25 pieces, frozen', priceCents: 3750 },
      { name: 'Jumbo Gourmet Cookie Dough Balls', detail: 'one dozen, frozen', priceCents: 4200, options: ['Brown Butter Triple Chocolate', 'Cookies & Cream', 'Oatmeal with Macadamia Nuts & Chocolate Chunks'] },
    ]
    // Deadlines end at 11:59 PM New York on the published day; pickup days are stored at noon.
    await payload.create({ collection: 'holiday-campaigns', data: { title: 'Thanksgiving', slug: 'thanksgiving', isActive: true, depositPercent: 50, orderByAt: '2026-11-18T04:59:00.000Z', pickupAt: '2026-11-24T17:00:00.000Z', items } })
    await payload.create({ collection: 'holiday-campaigns', data: { title: 'Christmas', slug: 'christmas', isActive: true, depositPercent: 50, orderByAt: '2026-12-15T04:59:00.000Z', pickupAt: '2026-12-21T17:00:00.000Z', items } })
    log('holiday campaigns created')
  } else log('holiday campaigns already exist — left as is')
  log('done')
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
