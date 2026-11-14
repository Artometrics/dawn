import { expect, test, type Page } from '@playwright/test'

const ROUTES = ['/', '/onboarding/', '/profile/', '/share/', '/numerology/', '/tarot/', '/tarot/cards/', '/tarot/cards/the-fool/', '/tarot/cards/king-of-pentacles/', '/tarot/readings/', '/journal/', '/privacy/']

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  return errors
}

async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(over, 'page should not scroll sideways').toBeLessThanOrEqual(1)
}

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`loads ${route}`, async ({ page }) => {
      const errors = watchErrors(page)
      const res = await page.goto(route)
      expect(res?.status()).toBe(200)
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page.locator('footer')).toContainText('reflection and entertainment')
      await noHorizontalScroll(page)
      expect(errors).toEqual([])
    })
  }

  test('unknown route shows the 404 page', async ({ page }) => {
    const res = await page.goto('/nope/')
    expect(res?.status()).toBe(404)
    await expect(page.locator('h1')).toContainText("isn't in the deck")
  })
})

test('the deck browser lists all 78 cards and each links to a page', async ({ page }) => {
  await page.goto('/tarot/cards/')
  await expect(page.locator('.card-tile')).toHaveCount(78)
  await page.locator('.card-tile').first().click()
  await expect(page).toHaveURL(/\/tarot\/cards\/the-fool\//)
  await expect(page.locator('h1')).toHaveText('The Fool')
  await expect(page.getByText('Upright')).toBeVisible()
  await expect(page.getByText('Reversed', { exact: true })).toBeVisible()
})

test('numerology calculator shows a life path', async ({ page }) => {
  await page.goto('/numerology/')
  await page.fill('#n-date', '1985-11-29')
  await expect(page.locator('#dial-num')).toHaveText('9')
  await page.fill('#n-date', '1992-03-14')
  await expect(page.locator('#dial-num')).toHaveText('11')
  await page.fill('#n-name', 'Ada Lovelace')
  await expect(page.locator('#num-result')).toContainText('Expression')
})

test('tarot table: deal, flip everything, save, and find it in My readings', async ({ page }) => {
  const errors = watchErrors(page)
  await page.goto('/tarot/')
  await expect(page.locator('#table canvas')).toBeVisible()
  await page.click('[data-spread="three"]')
  await page.fill('#question', 'What should I keep?')
  await page.click('#btn-deal')
  await expect(page.locator('#status')).toContainText('Dealt', { timeout: 30_000 })
  await expect(page.locator('#btn-save')).toBeDisabled()
  await page.click('#btn-reveal')
  await expect(page.locator('#status')).toContainText('All cards turned', { timeout: 30_000 })
  await expect(page.locator('#reading-list li')).toHaveCount(3)
  await page.click('#btn-save')
  await expect(page.locator('#save-msg')).toContainText('Saved')
  await page.goto('/tarot/readings/')
  await expect(page.locator('.saved')).toHaveCount(1)
  await expect(page.locator('.saved')).toContainText('What should I keep?')
  await expect(page.locator('.saved-card')).toHaveCount(3)
  page.once('dialog', (d) => d.accept())
  await page.click('[data-del]')
  await expect(page.locator('#readings-empty')).toBeVisible()
  expect(errors).toEqual([])
})

test('celtic cross deals ten cards', async ({ page }) => {
  await page.goto('/tarot/')
  await page.click('[data-spread="celtic"]')
  await page.click('#btn-deal')
  await expect(page.locator('#status')).toContainText('Dealt', { timeout: 40_000 })
  await page.click('#btn-reveal')
  await expect(page.locator('#reading-list li')).toHaveCount(10, { timeout: 30_000 })
})

test('profile flow: onboarding, second self, share link respects privacy', async ({ page, context }) => {
  const errors = watchErrors(page)
  await page.goto('/profile/')
  await expect(page.locator('#self-empty')).toBeVisible()

  await page.goto('/onboarding/')
  await page.fill('#f-name', 'Mara Ellison')
  await page.fill('#f-date', '1992-03-14')
  await page.fill('#f-place', 'Lisbon, Portugal')
  await expect(page.locator('#pv-chips')).toContainText('Life path 11')
  await page.fill('#add-movie', 'Spirited Away')
  await page.click('[data-add-btn="movie"]')
  await page.fill('#add-book', 'The Hobbit')
  await page.press('#add-book', 'Enter')
  await page.fill('#fav-place', 'Oxford, United Kingdom')
  await page.click('#list-book [data-pin-for]')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/profile\/$/)
  await expect(page.locator('h1:visible')).toContainText('Mara Ellison')
  await expect(page.locator('.numcard').first()).toContainText('11')
  await expect(page.locator('svg.map circle')).toHaveCount(2)
  await expect(page.locator('.constel')).toBeVisible()
  await expect(page.locator('.fav-lists')).toContainText('The Hobbit')
  await noHorizontalScroll(page)

  const link = await page.locator('#share-link').getAttribute('data-full')
  expect(link).toContain('/share/#d=')
  const shared = await context.newPage()
  await shared.goto(link!)
  await expect(shared.locator('h1:visible')).toContainText('Mara Ellison')
  await expect(shared.locator('.numcard').first()).toContainText('11')
  await expect(shared.locator('body')).not.toContainText('1992')
  await expect(shared.locator('body')).not.toContainText('The Hobbit')
  await shared.close()

  await page.locator('[data-vis="favorites"]').evaluate((el: HTMLInputElement) => el.click())
  await page.locator('[data-vis="birth"]').evaluate((el: HTMLInputElement) => el.click())
  const link2 = await page.locator('#share-link').getAttribute('data-full')
  const shared2 = await context.newPage()
  await shared2.goto(link2!)
  await expect(shared2.locator('body')).toContainText('The Hobbit')
  await expect(shared2.locator('body')).toContainText('March 14, 1992')
  await shared2.close()

  page.once('dialog', (d) => d.accept())
  await page.click('#btn-wipe')
  await expect(page.locator('#self-empty')).toBeVisible()
  expect(errors).toEqual([])
})

test('a broken share link explains itself', async ({ page }) => {
  await page.goto('/share/#d=garbage')
  await expect(page.locator('#share-bad')).toBeVisible()
})

test('share links escape hostile text', async ({ page }) => {
  const evil = btoa(JSON.stringify({ v: 1, view: { name: '<img src=x onerror=window.__xss=1>', favorites: [{ kind: 'movie', title: '<script>window.__xss=2</script>', themeId: 'love' }] } }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  await page.goto(`/share/#d=${evil}`)
  await expect(page.locator('h1:visible')).toContainText('<img src=x')
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
})
