import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
mkdirSync('dist', { recursive: true });
mkdirSync('extension/out', { recursive: true });

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
};

await esbuild.build({
  ...shared,
  entryPoints: ['extension/src/extension.ts'],
  outfile: 'extension/out/extension.js',
  external: ['vscode'],
});

await esbuild.build({
  ...shared,
  entryPoints: ['src/gateway/main.ts'],
  outfile: 'dist/gateway.cjs',
});

if (process.argv.includes('--package')) {
  cpSync('README.md', 'extension/README.md');
  const vsce = resolve(root, 'node_modules/.bin/vsce');
  const result = spawnSync(vsce, [
    'package',
    '--no-dependencies',
    '--allow-missing-repository',
    '--skip-license',
    '-o',
    resolve(root, 'dist/dawn-code.vsix'),
  ], { cwd: resolve(root, 'extension'), stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
