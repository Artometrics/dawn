import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const out = 'out';

// Next may emit a route folder of RSC text dumps without index.html.
// That directory shadows the route on Firebase Hosting, so add a real index.
// The text dumps stay: client-side navigation prefetches them.
function publish(route) {
  const html = join(out, `${route}.html`);
  const dir = join(out, route);
  if (!existsSync(html)) {
    console.warn(`fix-static-export: out/${route}.html missing; skip`);
    return;
  }
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  copyFileSync(html, join(dir, 'index.html'));
  console.log(`fix-static-export: wrote out/${route}/index.html`);
}

publish('studio');
publish('atlas');
publish('agents');
publish('letter');
publish('newsletter');
publish('invoices');
publish('contacts');
publish('games');
publish('fernbound');
publish('aftercare');
publish('books');
publish('cuts');
publish('shows');
publish('research');
publish('credits');
publish('village');
publish('town');
publish('desk');
publish('editor');
publish('code');
publish('code/editor');
publish('kits');
publish('projects');
publish('artifacts');
publish('preview/bench');
publish('preview/habits');
publish('preview/stuck');
publish('preview/village');
publish('preview');
