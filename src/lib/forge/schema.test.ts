import test from 'node:test';
import assert from 'node:assert/strict';
// Ported from Pantheon Forge (tools/forge/src/schema.test.js). Assertions are unchanged.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOG, parseCharacter, serializeCharacter, validateCharacter } from './schema.ts';

const dir = dirname(fileURLToPath(import.meta.url));
const load = (name: string) => JSON.parse(readFileSync(join(dir, 'presets', name), 'utf8'));

const joan = load('joan.json');
const napoleon = load('napoleon.json');
const sunTzu = load('sun-tzu.json');

test('legend presets match the schema', () => {
  for (const preset of [joan, napoleon, sunTzu]) {
    const result = validateCharacter(preset);
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(result.character, preset);
  }
});

test('presets are three different legends with period outfits', () => {
  assert.equal(joan.parts.outfit, 'plate');
  assert.equal(joan.parts.accessory, 'banner');
  assert.equal(napoleon.parts.outfit, 'greatcoat');
  assert.equal(napoleon.parts.accessory, 'bicorne');
  assert.equal(sunTzu.parts.outfit, 'robe');
  assert.equal(sunTzu.parts.accessory, 'sword');
  assert.equal(napoleon.body.height, joan.body.height);
});

test('serialize round-trips a valid character', () => {
  const text = serializeCharacter(joan);
  const again = parseCharacter(text);
  assert.equal(again.ok, true);
  assert.deepEqual(again.character, joan);
  assert.equal(serializeCharacter(again.character), text);
});

test('hex colors are normalized to lowercase', () => {
  const copy = structuredClone(joan);
  copy.colors.cloth = '#E4DCC8';
  const result = validateCharacter(copy);
  assert.equal(result.ok, true);
  assert.equal(result.character.colors.cloth, '#e4dcc8');
});

test('rejects an unknown outfit and a bad color together', () => {
  const copy = structuredClone(joan);
  copy.parts.outfit = 'cape';
  copy.colors.skin = 'red';
  const result = validateCharacter(copy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('Unknown outfit')));
  assert.ok(result.errors.some((e) => e.includes('colors.skin')));
});

test('rejects height outside 0 to 1', () => {
  const copy = structuredClone(napoleon);
  copy.body.height = 1.4;
  const result = validateCharacter(copy);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /body\.height/);
});

test('rejects the wrong schema version and unknown fields', () => {
  const copy = structuredClone(sunTzu);
  copy.version = 2;
  copy.pose = 'guard';
  const result = validateCharacter(copy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('version')));
  assert.ok(result.errors.some((e) => e.includes('pose')));
});

test('rejects empty names, broken JSON, and non-objects', () => {
  const copy = structuredClone(joan);
  copy.name = '   ';
  assert.equal(validateCharacter(copy).ok, false);
  assert.equal(parseCharacter('{').ok, false);
  assert.equal(validateCharacter(null).ok, false);
  assert.equal(validateCharacter([]).ok, false);
});

test('catalog ids are unique and presets only use them', () => {
  for (const [group, parts] of Object.entries(CATALOG)) {
    const ids = parts.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, group);
    for (const preset of [joan, napoleon, sunTzu]) {
      assert.ok(ids.includes(preset.parts[group]), `${preset.id} ${group}`);
    }
  }
});
