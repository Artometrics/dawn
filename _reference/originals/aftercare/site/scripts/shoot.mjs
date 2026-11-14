// Screenshot helper (desktop + mobile).
//   node scripts/shoot.mjs mockups
//   node scripts/shoot.mjs process <milestone-slug> <name>=<path> [<name>=<path> ...]   (BASE_URL defaults to http://localhost:4321)
// Uses system Chrome if CHROME_PATH (or /usr/local/bin/google-chrome) exists, else Playwright's bundled Chromium.
import { chromium } from '@playwright/test'
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const chromePath = process.env.CHROME_PATH || (existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined)
export const launchArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl']

export const viewports = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

export async function shoot(jobs, { fullPage = true, settle = 600 } = {}) {
  const browser = await chromium.launch({ executablePath: chromePath, args: launchArgs })
  for (const [kind, opts] of Object.entries(viewports)) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: 'no-preference' })
    for (const job of jobs) {
      const page = await ctx.newPage()
      await page.goto(job.url, { waitUntil: 'load' })
      await page.evaluate(() => document.fonts.ready)
      if (job.before) await job.before(page, kind)
      await page.waitForTimeout(settle)
      const file = job.out(kind)
      mkdirSync(path.dirname(file), { recursive: true })
      await page.screenshot({ path: file, fullPage: job.fullPage ?? fullPage, ...(file.endsWith('.jpg') ? { type: 'jpeg', quality: 80 } : {}) })
      console.log('saved', path.relative(root, file))
      await page.close()
    }
    await ctx.close()
  }
  await browser.close()
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, ...rest] = process.argv.slice(2)
  if (mode === 'mockups') {
    const names = ['landing', 'onboarding', 'tarot-reading', 'card-detail', 'profile', 'journal', 'numerology']
    await shoot(names.map((n) => ({ url: pathToFileURL(path.join(root, `docs/mockups/${n}.html`)).href, out: (k) => path.join(root, `docs/mockups/img/${n}-${k}.jpg`) })))
  } else if (mode === 'process') {
    const [milestone, ...pairs] = rest
    const base = process.env.BASE_URL || 'http://localhost:4321'
    await shoot(pairs.map((p) => { const [name, route] = p.split('='); return { url: base + route, fullPage: process.env.FULL === '1', out: (k) => path.join(root, `docs/process/${milestone}-${name}-${k}.png`) } }))
  }
}
