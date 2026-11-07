import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canVerify,
  emptyPreview,
  normalizePreview,
  saveIdea,
  selectHabit,
  selectSample,
  stepRound,
  toggleCheck,
  toggleHabit,
  verifySample,
} from './board';

test('one sample is open at a time and a switch clears its checks', () => {
  const first = selectSample(emptyPreview(), 'billboard');
  const marked = toggleCheck(first, 'read');
  assert.equal(marked.checks.find((check) => check.id === 'read')?.done, true);
  const next = selectSample(marked, 'brief');
  assert.equal(next.sampleId, 'brief');
  assert.equal(next.checks.every((check) => !check.done), true);
  assert.equal(selectSample(next, 'brief').checks[0].done, false);
});

test('an idea is saved as demonstration text and verify waits for the person', () => {
  const open = selectSample(emptyPreview(), 'stop');
  const short = saveIdea(open, '  ', 'i1');
  assert.equal(short.error?.includes('more'), true);
  const saved = saveIdea(open, '  A sample stop card  ', 'i1');
  assert.equal(saved.error, null);
  assert.equal(saved.state.ideas[0].text, 'A sample stop card');
  assert.equal(canVerify(saved.state), false);
  let state = saved.state;
  for (const check of state.checks) state = toggleCheck(state, check.id);
  const verified = verifySample(state);
  assert.equal(verified.error, null);
  assert.equal(verified.state.verified, true);
  assert.equal('agent' in verified.state, false);
});

test('habits stay one at a time and a stuck round stops at three steps', () => {
  const picked = selectHabit(emptyPreview(), 'line');
  const done = toggleHabit(picked, 'line');
  assert.equal(done.habitDone.line, true);
  assert.equal(toggleHabit(done, 'stop').habitDone.stop, false);
  assert.equal(stepRound(0), 1);
  assert.equal(stepRound(2), 3);
  assert.equal(stepRound(3), 3);
});

test('stored preview data drops anything that is not the demonstration shape', () => {
  const clean = normalizePreview({
    sampleId: 'billboard',
    ideas: [{ id: 'i1', text: 'Keep the header' }, { id: '', text: 'no' }],
    checks: [{ id: 'read', done: true }],
    verified: true,
    habitId: 'idea',
    habitDone: { line: false, stop: true, idea: true },
    steps: 9,
    agentSaid: 'I shipped it',
  });
  assert.equal(clean.verified, false);
  assert.equal(clean.ideas.length, 1);
  assert.equal(clean.steps, 3);
  assert.equal(JSON.stringify(clean).includes('shipped'), false);
});
