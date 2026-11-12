// The named 390px shots for the shared-shell PR, against a running same-origin desk
// (scripts/same-origin-desk.mjs, or the live host) and the static export.
//   node scripts/shell-shots-live.mjs <outDir> [--live http://127.0.0.1:3000]
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const at = args.indexOf('--live');
const live = at >= 0 ? args[at + 1] : 'http://127.0.0.1:3000';
const outDir = path.resolve(args.find((arg, i) => !arg.startsWith('--') && args[i - 1] !== '--live') || 'shell-shots-live');
const chromeBin = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find((file) => existsSync(file));
if (!chromeBin) throw new Error('Chrome is not installed');
await mkdir(outDir, { recursive: true });

const post = (route, body) => fetch(`${live}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', origin: live }, body: JSON.stringify(body) }).then((response) => response.json());

const browser = await chromium.launch({ executablePath: chromeBin, headless: true, args: ['--no-sandbox'] });
try {
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const shot = async (name, run, wait = 900) => {
    const page = await phone.newPage();
    await run(page);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    await page.close();
  };
  const go = (route) => (page) => page.goto(`${live}${route}`, { waitUntil: 'load' });

  const created = await post('/api/agents', { name: 'Sage', instructions: 'You help with plans. Keep it short.', avatar: { sprite: 'sage' } });
  const thread = created.thread?.id;

  await shot('home-sidebar-open', async (page) => {
    await go('/')(page);
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'Menu' }).click();
  }, 1200);
  await shot('code', go('/code'));
  await shot('nightcode', async (page) => {
    await go('/kits/nightcode')(page);
    await page.getByRole('button', { name: /new session/i }).click();
    await page.waitForTimeout(600);
    await page.getByRole('textbox').first().fill('what is in my files?');
    await page.keyboard.press('Enter');
  }, 1800);
  await shot('teammates', async (page) => {
    await go('/kits/teammates')(page);
    await page.getByRole('button', { name: /new chat|new room|start/i }).first().click().catch(() => undefined);
    await page.waitForTimeout(600);
    await page.getByRole('textbox').first().fill('draft a title for the page');
    await page.keyboard.press('Enter');
  }, 1800);
  await shot('kits', go('/kits'));
  await shot('editor', go('/code/editor'));
  await shot('village', go('/village?section=village'), 1400);
  await shot('studio', go('/studio'), 1400);
  await shot('projects', go('/projects'));
  await shot('recipes', go('/artifacts'));
  await shot('agents', go('/agents'));
  if (thread) await shot('agent-chat', go(`/agents?thread=${thread}`), 1400);
  await shot('quests', go('/village?section=quests'));
  await shot('not-found', go('/nowhere'));

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  await page.goto(`${live}/code`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'desktop-code.png') });
  await page.goto(`${live}/agents${thread ? `?thread=${thread}` : ''}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, 'desktop-agents.png') });
  console.log(`wrote ${outDir}`);
} finally {
  await browser.close();
}
