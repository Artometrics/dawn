import { copyFileSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = 'out';
const studioHtml = join(out, 'studio.html');
const studioDir = join(out, 'studio');

if (!existsSync(studioHtml)) {
  console.warn('fix-static-export: out/studio.html missing; skip');
  process.exit(0);
}

// Next may emit a studio/ folder of RSC text dumps without index.html.
// That directory shadows /studio on Firebase Hosting. Replace with a real index.
if (existsSync(studioDir)) {
  for (const name of readdirSync(studioDir)) {
    const p = join(studioDir, name);
    if (statSync(p).isFile() && name !== 'index.html') rmSync(p);
  }
} else {
  mkdirSync(studioDir, { recursive: true });
}
copyFileSync(studioHtml, join(studioDir, 'index.html'));
console.log('fix-static-export: wrote out/studio/index.html');
