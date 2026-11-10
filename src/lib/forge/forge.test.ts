import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { exportCharacterJson, fileSafeName, importCharacterJson, slugFromName } from './codec.ts';
import { FILE_MAX_BYTES, ROSTER_MAX } from './catalog.ts';
import { PRESETS, blankCharacter, presetById } from './presets.ts';
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
import { CATALOG, validateCharacter } from './schema.ts';

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

const PRESET_FILES = ['joan.json', 'napoleon.json', 'sun-tzu.json'];
const presetText = (file: string) => readFileSync(new URL(`./presets/${file}`, import.meta.url), 'utf8');

test('the three Pantheon presets load as the same bytes Forge ships', () => {
  assert.deepEqual(PRESETS.map((preset) => preset.name), ['Joan of Arc', 'Napoleon Bonaparte', 'Sun Tzu']);
  assert.equal(presetById('napoleon')?.parts.accessory, 'bicorne');
  PRESET_FILES.forEach((file, i) => {
    assert.deepEqual(PRESETS[i], JSON.parse(presetText(file)));
  });
});

test('Pantheon JSON files import and export unchanged', () => {
  for (const file of PRESET_FILES) {
    const text = presetText(file);
    const imported = importCharacterJson(text);
    assert.ok(imported.ok, file);
    assert.deepEqual(imported.character, JSON.parse(text));
    assert.equal(exportCharacterJson(imported.character), JSON.stringify(JSON.parse(text), null, 2));
  }
});

test('an exported file imports back to the same character', () => {
  for (const preset of PRESETS) {
    const back = importCharacterJson(exportCharacterJson(preset));
    assert.ok(back.ok);
    assert.deepEqual(back.character, preset);
  }
  assert.equal(fileSafeName(PRESETS[0]), 'joan');
});

test('import rejects empty, huge, malformed, and foreign files', () => {
  assert.equal(importCharacterJson('').ok, false);
  assert.equal(importCharacterJson('{nope').ok, false);
  assert.equal(importCharacterJson(' '.repeat(FILE_MAX_BYTES + 1)).ok, false);
  assert.equal(importCharacterJson(JSON.stringify({ format: 'dawn.forge.file/1', character: PRESETS[0] })).ok, false);
  assert.equal(importCharacterJson(JSON.stringify({ ...PRESETS[0], parts: { ...PRESETS[0].parts, hair: 'mohawk' } })).ok, false);
});

test('ids are slugs the schema accepts', () => {
  assert.equal(slugFromName('Ada Lovelace'), 'ada-lovelace');
  assert.equal(slugFromName('???'), 'character');
  assert.equal(slugFromName('x'.repeat(80)).length, 32);
  assert.ok(validateCharacter({ ...blankCharacter(), id: slugFromName('Jeanne d’Arc') }).ok);
});

test('the blank character is valid and uses catalog parts', () => {
  const blank = blankCharacter();
  assert.ok(validateCharacter(blank).ok);
  for (const [group, parts] of Object.entries(CATALOG)) {
    assert.ok(parts.some((part) => part.id === blank.parts[group as keyof typeof blank.parts]), group);
  }
});

test('save then load keeps the roster, newest first, with its renders', () => {
  const storage = memory();
  let roster = loadRoster(storage);
  assert.deepEqual(roster, []);

  const first = upsertEntry(roster, { id: entryId(1), character: PRESETS[0], portrait: PNG, sprite: PNG }, NOW);
  assert.ok(first.ok);
  const second = upsertEntry(first.roster, { id: entryId(2), character: PRESETS[1], portrait: PNG, sprite: '' }, NOW + 10);
  assert.ok(second.ok);
  roster = second.roster;
  assert.deepEqual(saveRoster(storage, roster), { ok: true });
  assert.ok(storage.data.has(ROSTER_KEY));

  const loaded = loadRoster(storage);
  assert.deepEqual(loaded.map((entry) => entry.character.name), ['Napoleon Bonaparte', 'Joan of Arc']);
  assert.equal(loaded[1].portrait, PNG);
  assert.deepEqual(loaded, roster);
});

test('saving over an id updates it and keeps its agent and createdAt', () => {
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[0], portrait: PNG, sprite: PNG }, NOW);
  assert.ok(made.ok);
  const assigned = assignAgent(made.roster, entryId(1), 'kali', NOW + 5);
  const edited = upsertEntry(assigned, { id: entryId(1), character: { ...PRESETS[0], name: 'Jeanne' }, portrait: PNG, sprite: PNG }, NOW + 50);
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
  const huge = upsertEntry([], { id: entryId(1), character: blankCharacter(), portrait: `data:image/png;base64,${'A'.repeat(95000)}`, sprite: '' }, NOW);
  assert.equal(huge.ok, false);
});

test('one character holds an agent at a time, and release works', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0], portrait: PNG, sprite: PNG }, NOW);
  assert.ok(a.ok);
  const b = upsertEntry(a.roster, { id: entryId(2), character: PRESETS[1], portrait: PNG, sprite: PNG }, NOW + 1);
  assert.ok(b.ok);
  let roster = assignAgent(b.roster, entryId(1), 'trinity', NOW + 2);
  roster = assignAgent(roster, entryId(2), 'trinity', NOW + 3);
  assert.equal(roster.find((item) => item.id === entryId(1))?.agentId, '');
  assert.equal(roster.find((item) => item.id === entryId(2))?.agentId, 'trinity');

  const looks = looksByAgent(roster);
  assert.equal(looks.trinity?.name, 'Napoleon Bonaparte');
  assert.equal(looks.kali, undefined);

  roster = assignAgent(roster, entryId(2), '', NOW + 4);
  assert.deepEqual(looksByAgent(roster), {});
  assert.equal(assignAgent(roster, 'missing-id-0000', 'kali', NOW), roster);
});

test('an agent with no sprite yet is not given a look', () => {
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[0], portrait: '', sprite: '' }, NOW);
  assert.ok(made.ok);
  assert.deepEqual(looksByAgent(assignAgent(made.roster, entryId(1), 'nimbus', NOW)), {});
});

test('remove deletes one entry', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0], portrait: '', sprite: '' }, NOW);
  assert.ok(a.ok);
  assert.deepEqual(removeEntry(a.roster, entryId(1)), []);
  assert.equal(removeEntry(a.roster, 'nope-nope-nope').length, 1);
});

test('corrupt storage loads as empty and bad entries are dropped one by one', () => {
  const storage = memory();
  storage.setItem(ROSTER_KEY, '{broken');
  assert.deepEqual(loadRoster(storage), []);

  const good = upsertEntry([], { id: entryId(1), character: PRESETS[2], portrait: PNG, sprite: PNG }, NOW);
  assert.ok(good.ok);
  const mixed = [good.entry, { id: entryId(2), character: { ...PRESETS[0], parts: { ...PRESETS[0].parts, hair: 'mohawk' } }, portrait: '', sprite: '', agentId: '', createdAt: NOW, updatedAt: NOW }, 7, null, { ...good.entry }];
  assert.deepEqual(parseRoster(mixed).map((entry) => entry.id), [entryId(1)]);

  storage.setItem(ROSTER_KEY, JSON.stringify({ not: 'a list' }));
  assert.deepEqual(loadRoster(storage), []);
});

test('two entries claiming one agent resolve to the newer one', () => {
  const a = upsertEntry([], { id: entryId(1), character: PRESETS[0], portrait: PNG, sprite: PNG }, NOW);
  const b = upsertEntry([], { id: entryId(2), character: PRESETS[1], portrait: PNG, sprite: PNG }, NOW + 5);
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
  const made = upsertEntry([], { id: entryId(1), character: PRESETS[1], portrait: PNG, sprite: PNG }, NOW);
  assert.ok(made.ok);
  const doc = entryToDoc(assignAgent(made.roster, entryId(1), 'nimbus', NOW + 1)[0]);
  assert.deepEqual(Object.keys(doc).sort(), ['agentId', 'createdAt', 'id', 'name', 'portrait', 'spec', 'sprite', 'updatedAt']);
  assert.equal(doc.name, 'Napoleon Bonaparte');
  const back = docToEntry(JSON.parse(JSON.stringify(doc)));
  assert.equal(back?.agentId, 'nimbus');
  assert.deepEqual(back?.character, PRESETS[1]);
  assert.equal(docToEntry({ ...doc, spec: { ...doc.spec, parts: { ...doc.spec.parts, outfit: 'spacesuit' } } }), null);
});
