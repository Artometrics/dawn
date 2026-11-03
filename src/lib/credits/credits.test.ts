import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { BUNDLED_ASSETS } from './assets';
import libraries from './libraries.json' with { type: 'json' };
import { AGENT_SPRITES } from './sprites';

test('every agent sprite file exists and is listed once', () => {
  const ids = new Set<string>();
  for (const sprite of AGENT_SPRITES) {
    assert.equal(ids.has(sprite.id), false);
    ids.add(sprite.id);
    assert.equal(existsSync(sprite.file), true, sprite.file);
    assert.equal(sprite.license, 'CC0-1.0');
    assert.match(sprite.sourceUrl, /^https:\/\/kenney\.nl\//);
  }
  assert.ok(AGENT_SPRITES.length >= 8);
});

test('bundled asset paths exist', () => {
  for (const asset of BUNDLED_ASSETS) assert.equal(existsSync(asset.file), true, asset.file);
});

test('library credits cover direct dependencies', () => {
  const dawn = JSON.parse(readFileSync('package.json', 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const editor = JSON.parse(readFileSync('editor/package.json', 'utf8')) as { devDependencies: Record<string, string> };
  const names = new Set(libraries.map((row) => `${row.kind}:${row.name}`));
  for (const name of [...Object.keys(dawn.dependencies), ...Object.keys(dawn.devDependencies)]) {
    assert.equal(names.has(`dawn:${name}`), true, name);
  }
  for (const name of Object.keys(editor.devDependencies)) {
    assert.equal(names.has(`dawn-code:${name}`), true, name);
  }
  assert.equal(libraries.some((row) => row.license === 'unknown'), false);
});
