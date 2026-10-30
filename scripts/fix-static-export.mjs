import { copyFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = 'out';

// Next may emit a route folder of RSC text dumps without index.html.
// That directory shadows the route on Firebase Hosting. Replace with a real index.
function publish(route) {
  const html = join(out, `${route}.html`);
  const dir = join(out, route);
  if (!existsSync(html)) {
    console.warn(`fix-static-export: out/${route}.html missing; skip`);
    return;
  }
  if (existsSync(dir)) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isFile() && name !== 'index.html') rmSync(p);
    }
  } else {
    mkdirSync(dir, { recursive: true });
  }
  copyFileSync(html, join(dir, 'index.html'));
  console.log(`fix-static-export: wrote out/${route}/index.html`);
}

publish('studio');
publish('atlas');
