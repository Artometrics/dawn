import assert from 'node:assert/strict';
import test from 'node:test';
import { standInAgent, standInChat, standInInline } from './prompts.ts';

test('stand-in chat names the open file and does not pretend to call a model', () => {
  const text = standInChat('What does greet return?', {
    workspaceName: 'dawn',
    file: { path: 'editor/sample/hello.ts', language: 'typescript', content: 'export function greet() { return "Hello"; }' },
    selection: { text: 'return "Hello";', startLine: 2, endLine: 2 },
  });
  assert.match(text, /editor\/sample\/hello\.ts/);
  assert.match(text, /stand-in/i);
  assert.match(text, /did not call/);
});

test('stand-in inline rename stays inside the selection', () => {
  const result = standInInline('rename foo to bar', 'const foo = 1;');
  assert.equal(result.replacement, 'const bar = 1;');
});

test('stand-in agent proposes notes and does not echo an unchanged file', () => {
  const plan = standInAgent('mark the files', [
    { path: 'src/a.ts', content: 'export const a = 1;\n' },
    { path: 'src/b.ts', content: '// Dawn Code: mark the files\nexport const b = 1;\n' },
  ]);
  assert.equal(plan.edits.length, 1);
  assert.equal(plan.edits[0].path, 'src/a.ts');
  assert.match(plan.edits[0].content, /^\/\/ Dawn Code:/);
});
