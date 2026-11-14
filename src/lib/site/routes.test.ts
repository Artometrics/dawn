import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { NAV_ITEMS, REDIRECTS, SITE_ROUTES } from './nav.ts';

const read = (file: string) => readFileSync(path.resolve(file), 'utf8');
const pageFor = (route: string) => (route === '/' ? 'src/app/page.tsx' : `src/app${route}/page.tsx`);

test('every route in the site map has a page, and the village and town addresses keep theirs', () => {
  for (const route of SITE_ROUTES) assert.ok(existsSync(path.resolve(pageFor(route))), `${route} has no page.tsx`);
  assert.ok(SITE_ROUTES.includes('/village'));
  assert.ok(SITE_ROUTES.includes('/town'));
});

test('/ is the Atlas home and the old Atlas and town addresses redirect', () => {
  const home = read('src/app/page.tsx');
  assert.match(home, /<AtlasScreen \/>/);
  assert.doesNotMatch(home, /HomeClient|PixelHome/);
  assert.match(home, /<h1 className="dw-sr-only">Atlas<\/h1>/);
  for (const [file, to] of [['src/app/atlas/page.tsx', '/'], ['src/app/town/page.tsx', '/village?section=village']]) {
    assert.match(read(file), new RegExp(`<Redirect to="${to.replace(/[?]/g, '\\?')}"`), `${file} redirects to ${to}`);
    assert.match(read(file), /robots: \{ index: false, follow: false \}/);
  }
  assert.deepEqual(REDIRECTS.map((entry) => entry.from).sort(), ['/atlas', '/editor', '/town']);
  assert.ok(existsSync(path.resolve('src/components/home/pixel-home.tsx')), 'town code is kept');
  assert.ok(existsSync(path.resolve('src/components/dawn/village-game.tsx')), 'village code is kept');
  assert.match(read('src/app/village/page.tsx'), /DawnApp/);
});

test('the sidebar only links to routes that exist', () => {
  for (const item of NAV_ITEMS) {
    const route = item.href.split('?')[0];
    assert.ok(SITE_ROUTES.includes(route), `${item.href} is not a route`);
  }
});

test('the root layout wraps every page in the one shell, and no page brings its own nav or footer', () => {
  assert.match(read('src/app/layout.tsx'), /<AppShell>\{children\}<\/AppShell>/);
  for (const route of SITE_ROUTES) {
    const page = read(pageFor(route));
    assert.doesNotMatch(page, /DawnNav|SiteFooter|DawnDrawer|tabbar/i, `${route} has its own nav`);
  }
});

test('the root layout, the static host headers, and robots.txt still keep Dawn out of search engines', () => {
  assert.match(read('src/app/layout.tsx'), /robots: \{ index: false, follow: false \}/);
  assert.match(read('firebase.json'), /"X-Robots-Tag"[\s\S]*"noindex, nofollow"/);
  assert.match(read('public/robots.txt'), /Disallow: \//);
});

test('Caddy: every page is public, the APIs (kits included) go through the one auth snippet, and unknown paths get the styled 404', () => {
  const caddy = read('deploy/Caddyfile');
  const publicLine = caddy.split('\n').find((line) => line.includes('@public path')) ?? '';
  const publicPaths = publicLine.split(/\s+/);
  for (const route of ['/', '/atlas', '/village', '/town', '/projects', '/artifacts', '/code', '/code/*', '/desk', '/kits', '/kits/*', '/credits', '/preview', '/newsletter', '/invoices', '/contacts', '/games', '/fernbound', '/aftercare', '/books', '/play/*', '/cuts', '/shows', '/research', '/walk', '/walk/*']) {
    assert.ok(publicPaths.includes(route), `${route} is public`);
  }
  for (const route of ['/agents', '/editor', '/api']) assert.ok(!publicPaths.includes(route), `${route} must not be a public static path`);
  assert.match(caddy, /handle \/agents\* \{\s*import dawn_auth\b/);
  assert.match(caddy, /handle \/api\/\* \{\s*import dawn_auth\b/);
  assert.match(caddy, /handle \/api\/kits\* \{\s*import dawn_auth\b/, 'kit APIs need the auth step or the gateway never sees the owner (NightCode: "Could not start a session.")');
  assert.match(caddy, /handle \/editor\* \{\s*import dawn_auth_on\b/, 'OpenVSCode keeps the real sign-in whatever the switch says');
  assert.match(caddy, /\(dawn_auth\) \{\s*import \{\$DAWN_AUTH_SNIPPET:dawn_auth_on\}/);
  assert.match(caddy, /\(dawn_auth_off\)/);
  assert.match(caddy, /rewrite \* \/404\.html\s*file_server \{\s*status 404/);
  assert.doesNotMatch(caddy, /respond "Not found"/, 'no raw text 404 (it downloads as desk.txt on iPhone)');
  assert.match(read('deploy/oauth2-proxy.cfg'), /cookie_expire = "720h"/);
});

test('the static export publishes the nested pages as folders so Firebase finds them', () => {
  const script = read('scripts/fix-static-export.mjs');
  for (const route of ['town', 'village', 'atlas', 'code', 'code/editor', 'kits', 'desk', 'newsletter', 'invoices', 'contacts', 'games', 'fernbound', 'aftercare', 'books', 'cuts', 'shows', 'research', 'walk']) assert.match(script, new RegExp(`publish\\('${route}'\\)`));
});
