import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { DRAWER_LINKS, VILLAGE_HISTORY_HREF } from '../home/drawer.ts';
import { SITE_NAV, SITE_ROUTES } from './nav.ts';

const read = (file: string) => readFileSync(path.resolve(file), 'utf8');
const pageFor = (route: string) => (route === '/' ? 'src/app/page.tsx' : `src/app${route}/page.tsx`);

test('every route in the site map has a page, and the village and town keep theirs', () => {
  for (const route of SITE_ROUTES) assert.ok(existsSync(path.resolve(pageFor(route))), `${route} has no page.tsx`);
  assert.ok(SITE_ROUTES.includes('/village'));
  assert.ok(SITE_ROUTES.includes('/town'));
});

test('/ and /atlas both render the Atlas home, not the 8-bit town', () => {
  for (const file of ['src/app/page.tsx', 'src/app/atlas/page.tsx']) {
    const source = read(file);
    assert.match(source, /<AtlasHome \/>/, `${file} renders AtlasHome`);
    assert.doesNotMatch(source, /HomeClient|PixelHome/, `${file} must not render the town`);
    assert.match(source, /<h1 className="dw-sr-only">Atlas<\/h1>/);
    assert.match(source, /robots: \{ index: false, follow: false \}/);
  }
});

test('the 8-bit town and the village are still routes, and neither is the first screen', () => {
  assert.match(read('src/app/town/page.tsx'), /<HomeClient \/>/);
  assert.match(read('src/app/village/page.tsx'), /DawnApp/);
  assert.match(read('src/app/town/page.tsx'), /robots: \{ index: false, follow: false \}/);
  assert.ok(existsSync(path.resolve('src/components/home/pixel-home.tsx')), 'town code is kept');
  assert.ok(existsSync(path.resolve('src/components/dawn/village-game.tsx')), 'village code is kept');
  assert.equal(SITE_NAV[0].href, '/');
  assert.equal(SITE_NAV[0].label, 'Atlas');
  assert.ok(SITE_NAV.some((link) => link.href === '/village'));
  assert.ok(SITE_NAV.some((link) => link.href === '/town'));
});

test('the sidebar only links to routes that exist', () => {
  for (const href of [...DRAWER_LINKS.map((link) => link.href), VILLAGE_HISTORY_HREF]) {
    const route = href.split('?')[0];
    assert.ok(SITE_ROUTES.includes(route), `${href} is not a route`);
  }
});

test('the root layout, the static host headers, and robots.txt still keep Dawn out of search engines', () => {
  assert.match(read('src/app/layout.tsx'), /robots: \{ index: false, follow: false \}/);
  assert.match(read('firebase.json'), /"X-Robots-Tag"[\s\S]*"noindex, nofollow"/);
  assert.match(read('public/robots.txt'), /Disallow: \//);
});

test('the sign-in gate is unchanged: /agents, /editor and /api stay behind oauth2-proxy; the map, town and village are public', () => {
  const caddy = read('deploy/Caddyfile');
  const publicLine = caddy.split('\n').find((line) => line.includes('@public path')) ?? '';
  for (const route of ['/', '/atlas', '/village', '/town', '/projects', '/artifacts']) assert.ok(publicLine.split(/\s+/).includes(route), `${route} is public`);
  for (const route of ['/agents', '/editor', '/api']) assert.ok(!publicLine.split(/\s+/).includes(route), `${route} must not be public`);
  assert.match(caddy, /handle \/agents\* \{\s*import dawn_auth/);
  assert.match(caddy, /handle \/editor\* \{\s*import dawn_auth/);
  assert.match(caddy, /handle \/api\/\* \{\s*import dawn_auth/);
});

test('the static export publishes /town and /village as folders so Firebase finds them', () => {
  const script = read('scripts/fix-static-export.mjs');
  for (const route of ['town', 'village', 'atlas']) assert.match(script, new RegExp(`publish\\('${route}'\\)`));
});
