import { defineConfig } from '@playwright/test'
import { existsSync } from 'node:fs'

const chrome = process.env.CHROME_PATH || (existsSync('/usr/local/bin/google-chrome') ? '/usr/local/bin/google-chrome' : undefined)
const PORT = 4322

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      executablePath: chrome,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
    },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `npx astro build && npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
