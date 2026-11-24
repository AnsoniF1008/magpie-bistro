/**
 * Long-form copy migrated 1:1 from the original static site.
 * Menu items, prices, hours, banner and photos live in the CMS; this file is
 * for the storytelling text that changes rarely.
 */
export const SITE = {
  name: 'The Magpie Bistro + Cupcakery',
  shortName: 'The Magpie',
  tagline: 'Bistro + Cupcakery',
  lede: 'A counter-service takeout bistro and custom cupcakery in Smithfield, Virginia — homestyle lunches, rotating bowls, soups and salads, and cupcakes baked with love by lifelong friends Jeannie and Tonya.',
  verse: '“He has made everything beautiful in its time…”',
  verseRef: 'Ecclesiastes 3:11-12',
  geo: { lat: 36.967618, lng: -76.608097 },
  tripadvisorUrl: 'https://www.tripadvisor.ie/Restaurant_Review-g58187-d34738379-Reviews-Magpie_Bistro_Cupcakery-Smithfield_Virginia.html',
  description: 'The Magpie Bistro + Cupcakery is a women-owned, counter-service takeout bistro in Smithfield, VA. Daily lunch combos, rotating protein bowls, soups and salads — plus custom cupcakes, cakes and holiday special orders.',
}

export const TRUST_CHIPS = [
  { text: '100% recommended on Facebook · 15 reviews', star: true },
  { text: '5 of 5 on TripAdvisor', star: true },
  { text: 'Women-owned', star: false },
  { text: 'Takeout · Lunch only · $$', star: false },
]

export const ALLERGY_NOTE = 'The Magpie Bistro cannot accommodate allergy-free requests, and cross-contact with allergens may occur in the kitchen.'

export const SALAD_DRESSINGS = ['Sweet Sesame', 'Creamy Apple Vinaigrette', 'Buttermilk Ranch', 'Cilantro Lime']

export const SIGNATURE_LIST = [
  'Brazilian Steak Bites over seasoned white rice',
  'Chicken Salad Sandwich on a buttered croissant',
  'Beef Stroganoff over buttered noodles',
  'Meatball Sub with Bolognese-style red sauce',
  'Korean Japchae with Korean Beef Dumplings',
  'Mississippi Pot Roast French Dip Sandwich',
]

export const CUPCAKERY = {
  intro: 'Half of the Magpie is a cupcakery: cupcakes, cakes, bundts and cheesecakes made to order for birthdays, gatherings and sweet-tooth emergencies.',
  counter: [
    { label: 'Cupcakes, each', amount: '$4.50' },
    { label: 'Gourmet cookies, each', amount: '$3.50' },
    { label: 'Custom cakes, bundts & cheesecakes', amount: 'Ask us' },
  ],
  flavors: [
    'Sunshine Cake (pineapple & mandarin orange)', 'Andes Mint Chocolate', 'Apple Pie', 'Hostess-Inspired Chocolate', 'Pancake Cupcakes',
    'Strawberry Shortcake Cups', 'Banana Pudding Cups', 'Classic Cherry Cheesecake Cup', 'Caramel Cheesecake Crunch Cups', 'Lemon Blueberry Bundt Slice',
  ],
  orderTypes: ['Cupcakes', 'Custom cake', 'Bundt cake', 'Cheesecake', 'Cookies', 'Something else'],
}

export const HOLIDAY = {
  intro: 'Stock the freezer with Magpie favorites for the holidays. These special orders are sold frozen, ready to cook at home — a 50% deposit is due when you order.',
  items: [
    { name: 'Beef Lumpia', detail: '25 pieces, frozen', amount: '$37.50' },
    { name: 'Korean Beef Dumplings', detail: '25 pieces, frozen', amount: '$37.50' },
    { name: 'Jumbo Gourmet Cookie Dough Balls', detail: 'one dozen, frozen', amount: '$42', sub: 'Brown Butter Triple Chocolate · Cookies & Cream · Oatmeal with Macadamia Nuts & Chocolate Chunks' },
  ],
  deadlines: [
    { title: 'Thanksgiving', orderBy: 'Tuesday, November 17', pickup: 'Tuesday, November 24' },
    { title: 'Christmas', orderBy: 'Monday, December 14', pickup: 'Monday, December 21' },
  ],
  flavors: ['Brown Butter Triple Chocolate', 'Cookies & Cream', 'Oatmeal with Macadamia Nuts & Chocolate Chunks'],
}

export const STORY = {
  verseNote: 'Faith sits at the center of the Magpie — in the motto over the door, in the verse that ends every weekly menu, and in a mission of preparing food as if guests were coming to their own table, sharing love and fellowship in the spirit of Jesus Christ (James 1:17).',
}

export const REVIEWS = {
  intro: 'A new bistro with an old-fashioned reputation: get there early, because it sells out.',
  quote: '“There was a line at the door when it opened at 11:30 in the morning, it sells out fast.”',
  quoteSource: 'TripAdvisor review, October 2026 — 5 of 5',
}
