// Captures the process screenshots for milestones 02-05 (desktop + mobile) into docs/process/.
//   BASE_URL=http://localhost:4321 node scripts/milestones.mjs
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const out = path.join(root, 'docs/process')
const base = process.env.BASE_URL || 'http://localhost:4321'
const chromePath = process.env.CHROME_PATH || (existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined)
mkdirSync(out, { recursive: true })

const profile = {
  id: 'me', displayName: 'Mara Ellison', birthDate: '1992-03-14',
  birthPlace: { label: 'Lisbon, Portugal', lat: 38.72, lng: -9.14 },
  favorites: [
    { id: '1', kind: 'movie', title: 'Spirited Away', themeId: 'change', place: { label: 'Tokyo, Japan', lat: 35.68, lng: 139.69 } },
    { id: '2', kind: 'book', title: 'The Hobbit', themeId: 'home', place: { label: 'Oxford, United Kingdom', lat: 51.75, lng: -1.26 } },
    { id: '3', kind: 'movie', title: 'Amelie', themeId: 'joy', place: { label: 'Paris, France', lat: 48.86, lng: 2.35 } },
    { id: '4', kind: 'book', title: 'One Hundred Years of Solitude', themeId: 'memory', place: { label: 'Bogota, Colombia', lat: 4.71, lng: -74.07 } },
    { id: '5', kind: 'thing', title: 'Rainy windows', themeId: 'rest' },
    { id: '6', kind: 'thing', title: 'Night markets', themeId: 'wonder' },
    { id: '7', kind: 'movie', title: "Howl's Moving Castle", themeId: 'wonder' },
  ],
  visibility: { birth: false, numbers: true, map: true, favorites: true, connections: true },
  updatedAt: new Date().toISOString(),
}

const views = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

const jobs = [
  ['02-tarot-table-idle', '/tarot/', async () => {}],
  ['02-tarot-three-card', '/tarot/', async (p) => {
    await p.fill('#question', 'What should I carry into spring?')
    await p.click('#btn-deal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('Dealt'), null, { timeout: 40000 })
    await p.click('#btn-reveal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('All cards'), null, { timeout: 40000 })
    await p.waitForTimeout(800)
    await p.locator('#table').scrollIntoViewIfNeeded()
  }],
  ['02-tarot-celtic-cross', '/tarot/', async (p) => {
    await p.click('[data-spread="celtic"]')
    await p.click('#btn-deal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('Dealt'), null, { timeout: 60000 })
    await p.click('#btn-reveal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('All cards'), null, { timeout: 60000 })
    await p.waitForTimeout(800)
    await p.locator('#table').scrollIntoViewIfNeeded()
  }],
  ['02-tarot-reading-notes', '/tarot/', async (p) => {
    await p.click('#btn-deal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('Dealt'), null, { timeout: 40000 })
    await p.click('#btn-reveal'); await p.waitForFunction(() => document.getElementById('status').textContent.startsWith('All cards'), null, { timeout: 40000 })
    await p.locator('#reading').scrollIntoViewIfNeeded()
    await p.waitForTimeout(400)
  }],
  ['03-card-detail', '/tarot/cards/the-star/', async () => {}],
  ['03-deck-browser', '/tarot/cards/', async () => {}],
  ['03-numerology', '/numerology/', async (p) => { await p.fill('#n-date', '1992-03-14'); await p.fill('#n-name', 'Mara Ellison'); await p.waitForTimeout(300) }],
  ['04-onboarding', '/onboarding/', async () => {}],
  ['04-second-self', '/profile/', async () => {}],
  ['04-second-self-connections', '/profile/', async (p) => { await p.locator('.conn-sec').scrollIntoViewIfNeeded(); await p.waitForTimeout(300) }],
  ['04-share-controls', '/profile/', async (p) => { await p.locator('#self-tools').scrollIntoViewIfNeeded(); await p.waitForTimeout(300) }],
  ['05-landing', '/', async () => {}],
]

const browser = await chromium.launch({ executablePath: chromePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] })
for (const [kind, opts] of Object.entries(views)) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: 'no-preference' })
  await ctx.addInitScript((p) => { if (!localStorage.getItem('aftercare.profile')) localStorage.setItem('aftercare.profile', JSON.stringify(p)) }, profile)
  for (const [name, route, act] of jobs) {
    const page = await ctx.newPage()
    await page.goto(base + route, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(900)
    await act(page)
    await page.waitForTimeout(500)
    const file = path.join(out, `${name}-${kind}.png`)
    await page.screenshot({ path: file })
    console.log('saved', path.relative(root, file))
    await page.close()
  }
  await ctx.close()
}
await browser.close()
