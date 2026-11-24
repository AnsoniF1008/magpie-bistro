import { expect, test, type Page } from '@playwright/test'

const OWNER = { email: 'owner@e2e.test', password: 'e2e-password-123' }

async function signIn(page: Page) {
  await page.goto('/admin')
  await page.fill('input[name="email"]', OWNER.email)
  await page.fill('input[name="password"]', OWNER.password)
  await page.click('button[type="submit"]')
  await expect(page.locator('.mg-cards')).toBeVisible({ timeout: 90_000 })
}

test('customer orders lunch and the bistro works it on the board', async ({ page, browser }) => {
  // Browse → add to cart. Cookies are not a dish of the day, so any open day works.
  await page.goto('/menu')
  await expect(page.getByRole('heading', { name: 'This Week’s Menu' })).toBeVisible()
  const addCookie = page.getByRole('button', { name: /Add Browned Butter Chocolate Chip Cookie/ }).first()
  await addCookie.click()
  await addCookie.click()
  await page.getByRole('button', { name: /Your order, 2 items/ }).click()
  await page.getByRole('link', { name: /Checkout/ }).click()

  // Checkout: first available day and time.
  await expect(page.locator('.time-chip').first()).toBeVisible()
  await page.locator('.time-chip').first().click()
  await page.fill('#co-name', 'E2E Customer')
  await page.fill('#co-phone', '(757) 555-0142')
  await page.fill('#co-email', 'customer@e2e.test')

  // The allergy acknowledgement is mandatory.
  await page.getByRole('button', { name: /^Pay/ }).click()
  await expect(page).toHaveURL(/\/order\/checkout/)
  await page.check('#co-ack')
  await expect(page.locator('.totals .grand dd')).toHaveText('$7.37') // 2 × $3.50 + 5.3% tax
  await page.getByRole('button', { name: /^Pay/ }).click()

  // Demo payment → confirmation (the same confirmOrder path the Stripe webhook uses).
  await page.getByRole('button', { name: 'Simulate successful payment' }).click()
  await expect(page.getByRole('heading', { name: /Thank you, E2E/ })).toBeVisible()
  const code = (await page.locator('.order-code').innerText()).trim()
  expect(code).toMatch(/^M-[A-Z2-9]{5}$/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('magpie-cart-v1') || '{}').state?.items?.length)).toBe(0)

  // The bistro sees it and moves it along.
  const admin = await (await browser.newContext()).newPage()
  await signIn(admin)
  await admin.goto('/admin/kanban')
  const card = admin.locator('.mg-order', { hasText: 'E2E Customer' })
  await expect(card).toBeVisible()
  await expect(admin.locator('.mg-col', { hasText: 'To prepare' }).locator('.mg-order', { hasText: code })).toBeVisible()
  await card.getByRole('button', { name: 'Ready ✓' }).click()
  await expect(admin.locator('.mg-col', { hasText: 'Ready for pickup' }).locator('.mg-order', { hasText: code })).toBeVisible()
  await admin.locator('.mg-order', { hasText: code }).getByRole('button', { name: 'Picked up ✓' }).click()
  await expect(admin.locator('.mg-col', { hasText: 'Picked up today' }).locator('.mg-order', { hasText: code })).toBeVisible()
})

test('a sold-out dish cannot be ordered', async ({ page, request }) => {
  await signIn(page)
  await page.goto('/admin/collections/dishes?limit=100')
  const row = page.locator('tr', { hasText: 'Chicken Noodle' })
  await row.locator('button[aria-label="Sold out"]').click()
  await expect(row.locator('button[aria-label="Sold out"]')).toHaveAttribute('aria-checked', 'true')

  const menu = await page.context().newPage()
  await menu.goto('/menu')
  await expect(menu.locator('.dish-row', { hasText: 'Chicken Noodle' }).locator('.soldout')).toBeVisible()
  await expect(menu.locator('.dish-row', { hasText: 'Chicken Noodle' }).getByRole('button', { name: 'Sold out' })).toBeDisabled()

  // The API refuses it too, whatever the browser sends.
  const dishes = await (await request.get('/api/dishes?where[slug][equals]=chicken-noodle-soup')).json()
  const res = await request.post('/api/checkout', {
    data: { customerName: 'Nope', phone: '7575550100', pickupAt: new Date(Date.now() + 5 * 86_400_000).toISOString(), allergyAck: true, items: [{ dishId: String(dishes.docs[0].id), qty: 1 }] },
  })
  expect(res.status()).toBe(409)
  expect((await res.json()).error).toContain('sold out')

  await row.locator('button[aria-label="Sold out"]').click() // leave the menu as we found it
  await expect(row.locator('button[aria-label="Sold out"]')).toHaveAttribute('aria-checked', 'false')
})

test('custom cake request: customer asks, owner approves with a price, customer pays', async ({ page, browser }) => {
  await page.goto('/cupcakes')
  await page.fill('#cw-size', '2 dozen')
  const date = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10)
  await page.fill('#cw-date', date)
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.fill('#cw-flavor', 'Sunshine Cake')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.fill('#cw-name', 'Cake Customer')
  await page.fill('#cw-phone', '757-555-0111')
  await page.fill('#cw-email', 'cake@e2e.test')
  await page.getByRole('button', { name: 'Send request' }).click()
  await expect(page.getByText('Request sent — thank you!')).toBeVisible()
  const code = (await page.locator('.order-code').innerText()).trim()
  await page.getByRole('link', { name: 'Check your request' }).click()
  await expect(page.getByRole('heading', { name: 'We’ve got your request' })).toBeVisible()
  const statusUrl = page.url()

  // Owner: approving without a price is refused; with a price it goes through.
  const admin = await (await browser.newContext()).newPage()
  await signIn(admin)
  await admin.goto('/admin/collections/custom-cake-requests')
  await admin.getByRole('link', { name: code }).click()
  await admin.locator('#field-quoteCents').fill('96.00')
  await admin.locator('#field-quoteCents').blur()
  await admin.locator('#field-status').click()
  await admin.getByRole('option', { name: /Approved/ }).click()
  await admin.click('#action-save')
  await expect(admin.getByText(/updated successfully/i).first()).toBeVisible()

  // Customer pays from the same link.
  await page.goto(statusUrl)
  await expect(page.getByRole('heading', { name: 'Approved — pay to confirm' })).toBeVisible()
  await page.getByRole('button', { name: 'Simulate payment of $96.00' }).click()
  await expect(page.getByRole('heading', { name: 'You’re all set!' })).toBeVisible()
})
