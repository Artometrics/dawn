import assert from 'node:assert/strict';
import test from 'node:test';
import { exportCharacterJson, fileSafeName, importCharacterJson } from './codec.ts';
import { FILE_MAX_BYTES, FORGE_SCHEMA, PARTS, PART_SLOTS, ROSTER_MAX } from './catalog.ts';
import { PRESETS, presetById } from './presets.ts';
import {
  ROSTER_KEY,
  assignAgent,
  docToEntry,
  entryToDoc,
  loadRoster,
  looksByAgent,
  parseRoster,
  removeEntry,
  saveRoster,
  upsertEntry,
  type StorageLike,
} from './roster.ts';
import { blankCharacter, characterEquals, parseCharacter } from './schema.ts';

const NOW = 1_800_000_000_000;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function entryId(n: number) {
  return `character-${String(n).padStart(4, '0')}`;
}

test('every preset is a valid character and the three named figures exist', () => {
  assert.deepEqual(PRESETS.map((preset) => preset.character.name), ['Joan of Arc', 'Napoleon', 'Sun Tzu']);
  for (const preset of PRESETS) {
    const parsed = parseCharacter(preset.character);
    assert.ok(parsed.ok, `${preset.id}: ${parsed.ok ? '' : parsed.error}`);
    assert.ok(characterEquals(parsed.value, preset.character));
  }
  assert.equal(presetById('napoleon')?.character.accessory, 'bicorne');
});

test('the schema refuses unknown parts, bad colors, and other schemas', () => {
  const good = blankCharacter();
  assert.ok(parseCharacter(good).ok);
  assert.equal(parseCharacter({ ...good, schema: 'something.else' }).ok, false);
  assert.equal(parseCharacter({ ...good, hair: 'mohawk' }).ok, false);
  assert.equal(parseCharacter({ ...good, clip: 'dance' }).ok, false);
  assert.equal(parseCharacter({ ...good, name: '   ' }).ok, false);
  assert.equal(parseCharacter({ ...good, colors: { ...good.colors, skin: 'red' } }).ok, false);
  assert.equal(parseCharacter({ ...good, colors: { ...good.colors, skin: 'url(javascript:1)' } }).ok, false);
  assert.equal(parseCharacter({ ...good, height: 'tall' }).ok, false);
  assert.equal(parseCharacter(null).ok, false);
  assert.equal(parseCharacter([good]).ok, false);
});

test('numbers are clamped, text is cleaned, and colors are lower-cased', () => {
  const parsed = parseCharacter({
    ...blankCharacter(),
    name: `  Ada\n\tLovelace${'x'.repeat(80)}`,
    height: 9,
    build: -4,
    colors: { ...blankCharacter().colors, skin: '#ABCDEF' },
  });
  assert.ok(parsed.ok);
  assert.equal(parsed.value.height, 1.2);
  assert.equal(parsed.value.build, 0);
  assert.equal(parsed.value.colors.skin, '#abcdef');
  assert.ok(parsed.value.name.length <= 40);
  assert.ok(!/[\n\t]/.test(parsed.value.name));
});

test('JSON export imports back to the same character, from a file or a bare object', () => {
  for (const preset of PRESETS) {
    const text = exportCharacterJson(preset.character);
    const back = importCharacterJson(text);
    assert.ok(back.ok);
    assert.ok(characterEquals(back.value, preset.character));
    const bare = importCharacterJson(JSON.stringify(preset.character));
    assert.ok(bare.ok);
  }
  assert.equal(fileSafeName('Joan of Arc'), 'joan-of-arc');
  assert.equal(fileSafeName('???'), 'character');
});

test('import rejects empty, huge, malformed, and foreign files', () => {
  assert.equal(importCharacterJson('').ok, false);
  assert.equal(importCharacterJson('{nope').ok, false);
  assert.equal(importCharacterJson(' '.repeat(FILE_MAX_BYTES + 1)).ok, false);
  assert.equal(importCharacterJson(JSON.stringify({ format: 'other/9', character: blankCharacter() })).ok, false);
  assert.equal(importCharacterJson(JSON.stringify({ schema: FORGE_SCHEMA })).ok, false);
});

test('save then load keeps the roster, newest first, with its renders', () => {
  const storage = memory();
  let roster = loadRoster(storage);
  assert.deepEqual(roster, []);

  const first = upsertEntry(roster, { id: entryId(1), character: PRESETS[0].character, portrait: PNG, sprite: PNG }, NOW);
  assert.ok(first.ok);
  const second = upsertEntry(first.roster, { id: entryId(2), character: PRESETS[1].character, portrait: PNG, sprite: '' }, NOW + 10);
  assert.ok(second.ok);
  roster = second.roster;
  assert.deepEqual(saveRoster(storage, roster), { ok: true });
  assert.ok(storage.data.has(ROSTER_KEY));

  const loaded = loadRoster(storage);
  assert.deepEqual(loaded.map((entry) => entry.character.name), ['Napoleon', 'Joan of Arc']);
  assert.equal(loaded[1].portrait, PNG);
  assert.deepEqual(loaded, roster);
});

test('saving over an id updates it and keeps its agent and createdAt', () => {
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[0].character, portrait: PNG, sprite: PNG }, NOW);
  assert.ok(made.ok);
  const assigned = assignAgent(made.roster, entryId(1), 'kali', NOW + 5);
  const edited = upsertEntry(assigned, { id: entryId(1), character: { ...PRESETS[0].character, name: 'Jeanne' }, portrait: PNG, sprite: PNG }, NOW + 50);
  assert.ok(edited.ok);
  assert.equal(edited.roster.length, 1);
  assert.equal(edited.entry.agentId, 'kali');
  assert.equal(edited.entry.createdAt, NOW);
  assert.equal(edited.entry.updatedAt, NOW + 50);
  assert.equal(edited.entry.character.name, 'Jeanne');
});

test('the roster is capped and bad renders are refused', () => {
  let roster: ReturnType<typeof parseRoster> = [];
  for (let n = 0; n < ROSTER_MAX; n += 1) {
    const next = upsertEntry(roster, { id: entryId(n), character: blankCharacter(), portrait: '', sprite: '' }, NOW + n);
    assert.ok(next.ok);
    roster = next.roster;
  }
  const over = upsertEntry(roster, { id: entryId(99), character: blankCharacter(), portrait: '', sprite: '' }, NOW + 99);
  assert.equal(over.ok, false);
  const replace = upsertEntry(roster, { id: entryId(3), character: blankCharacter(), portrait: '', sprite: '' }, NOW + 100);
  assert.ok(replace.ok);
  const evil = upsertEntry([], { id: entryId(1), character: blankCharacter(), portrait: 'data:text/html;base64,AAAA', sprite: '' }, NOW);
  assert.equal(evil.ok, false);
  const huge = upsertEntry([], { id: entryId(1), character: blankCharacter(), portrait: `data:image/png;base64,${'A'.repeat(70000)}`, sprite: '' }, NOW);
  assert.equal(huge.ok, false);
});

test('one character holds an agent at a time, and release works', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0].character, portrait: PNG, sprite: PNG }, NOW);
  assert.ok(a.ok);
  const b = upsertEntry(a.roster, { id: entryId(2), character: PRESETS[1].character, portrait: PNG, sprite: PNG }, NOW + 1);
  assert.ok(b.ok);
  let roster = assignAgent(b.roster, entryId(1), 'trinity', NOW + 2);
  roster = assignAgent(roster, entryId(2), 'trinity', NOW + 3);
  assert.equal(roster.find((item) => item.id === entryId(1))?.agentId, '');
  assert.equal(roster.find((item) => item.id === entryId(2))?.agentId, 'trinity');

  const looks = looksByAgent(roster);
  assert.equal(looks.trinity?.name, 'Napoleon');
  assert.equal(looks.kali, undefined);

  roster = assignAgent(roster, entryId(2), '', NOW + 4);
  assert.deepEqual(looksByAgent(roster), {});
  assert.equal(assignAgent(roster, 'missing-id-0000', 'kali', NOW), roster);
});

test('an agent with no sprite yet is not given a look', () => {
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[0].character, portrait: '', sprite: '' }, NOW);
  assert.ok(made.ok);
  assert.deepEqual(looksByAgent(assignAgent(made.roster, entryId(1), 'nimbus', NOW)), {});
});

test('remove deletes one entry', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0].character, portrait: '', sprite: '' }, NOW);
  assert.ok(a.ok);
  assert.deepEqual(removeEntry(a.roster, entryId(1)), []);
  assert.equal(removeEntry(a.roster, 'nope-nope-nope').length, 1);
});

test('corrupt storage loads as empty and bad entries are dropped one by one', () => {
  const storage = memory();
  storage.setItem(ROSTER_KEY, '{broken');
  assert.deepEqual(loadRoster(storage), []);

  const good = upsertEntry([], { id: entryId(1), character: PRESETS[2].character, portrait: PNG, sprite: PNG }, NOW);
  assert.ok(good.ok);
  const mixed = [good.entry, { id: entryId(2), character: { ...PRESETS[0].character, hair: 'mohawk' }, portrait: '', sprite: '', agentId: '', createdAt: NOW, updatedAt: NOW }, 7, null, { ...good.entry }];
  assert.deepEqual(parseRoster(mixed).map((entry) => entry.id), [entryId(1)]);

  storage.setItem(ROSTER_KEY, JSON.stringify({ not: 'a list' }));
  assert.deepEqual(loadRoster(storage), []);
});

test('two entries claiming one agent resolve to the newer one', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0].character, portrait: PNG, sprite: PNG }, NOW);
  const b = upsertEntry([], { id: entryId(2), character: PRESETS[1].character, portrait: PNG, sprite: PNG }, NOW + 5);
  assert.ok(a.ok && b.ok);
  const parsed = parseRoster([{ ...a.entry, agentId: 'kali' }, { ...b.entry, agentId: 'kali' }]);
  assert.deepEqual(parsed.map((entry) => [entry.id, entry.agentId]), [[entryId(1), ''], [entryId(2), 'kali']]);
});

test('a full storage reports an error instead of throwing', () => {
  const full: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  const result = saveRoster(full, []);
  assert.equal(result.ok, false);
});

test('the Firestore document round-trips and carries only the fields the rules allow', () => {
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[1].character, portrait: PNG, sprite: PNG }, NOW);
  assert.ok(made.ok);
  const doc = entryToDoc(assignAgent(made.roster, entryId(1), 'nimbus', NOW + 1)[0]);
  assert.deepEqual(Object.keys(doc).sort(), ['agentId', 'createdAt', 'id', 'name', 'portrait', 'spec', 'sprite', 'updatedAt']);
  assert.equal(doc.name, 'Napoleon');
  const back = docToEntry(JSON.parse(JSON.stringify(doc)));
  assert.equal(back?.agentId, 'nimbus');
  assert.ok(back && characterEquals(back.character, PRESETS[1].character));
  assert.equal(docToEntry({ ...doc, spec: { ...doc.spec, outfit: 'spacesuit' } }), null);
});

test('every catalog slot has a default the blank character can use', () => {
  const blank = blankCharacter();
  for (const slot of PART_SLOTS) {
    assert.ok(PARTS[slot].some((option) => option.id === blank[slot]), slot);
  }
});
