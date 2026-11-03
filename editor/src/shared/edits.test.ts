import assert from 'node:assert/strict';
import test from 'node:test';
import { applySelection, lineStats, parseJsonObject, prepareApply, stripFences, validateEdits } from './edits.ts';

test('selection replace prefers the line range', () => {
  const file = 'const a = 1;\nconst b = 2;\n';
  const next = applySelection(file, 'const b = 2;', 'const b = 3;', 2, 2);
  assert.equal(next, 'const a = 1;\nconst b = 3;\n');
});

test('fenced model output becomes the replacement only', () => {
  const parsed = parseJsonObject('```json\n{"explanation":"Rename","replacement":"const bar = 1"}\n```');
  assert.deepEqual(parsed, { explanation: 'Rename', replacement: 'const bar = 1' });
  assert.equal(stripFences('```ts\nconst x = 1\n```'), 'const x = 1');
});

test('agent edits drop traversal and keep a reviewable diff', () => {
  const originals = new Map([['src/a.ts', 'export const a = 1;\n']]);
  const edits = validateEdits(
    {
      edits: [
        { path: '../secrets.env', content: 'nope', summary: 'bad' },
        { path: 'src/a.ts', content: 'export const a = 2;\n', summary: 'Bump a' },
        { path: 'src/new.ts', content: 'export const created = true;\n', summary: 'Add file' },
      ],
    },
    originals,
  );
  assert.deepEqual(
    edits.map((edit) => edit.path),
    ['src/a.ts', 'src/new.ts'],
  );
  assert.equal(lineStats(edits[0].original, edits[0].proposed).added > 0, true);
});

test('apply waits until accept and refuses a file that changed', () => {
  const edits = [
    { path: 'src/a.ts', original: 'old', proposed: 'new', summary: 'swap' },
    { path: 'src/b.ts', original: '', proposed: 'fresh', summary: 'add' },
  ];
  const clean = prepareApply(edits, new Map([['src/a.ts', 'old'], ['src/b.ts', null]]));
  assert.equal(clean.conflicts.length, 0);
  assert.equal(clean.ok.length, 2);

  const dirty = prepareApply(edits, new Map([['src/a.ts', 'someone else'], ['src/b.ts', null]]));
  assert.deepEqual(dirty.ok, []);
  assert.deepEqual(dirty.conflicts, ['src/a.ts']);
});
