import assert from 'node:assert/strict';
import test from 'node:test';
import { formatSpend, monthKey, priceUsage, spendView } from './spend.ts';

test('month key is UTC year-month', () => {
  assert.equal(monthKey(new Date('2026-11-03T23:30:00.000Z')), '2026-11');
});

test('stand-in calls cost nothing', () => {
  const usage = priceUsage('stand-in', 5000, 5000, true);
  assert.equal(usage.costUsd, 0);
});

test('flash price is an estimate from the token counts', () => {
  const usage = priceUsage('gemini-3.8-flash', 1_000_000, 1_000_000, false);
  assert.equal(usage.costUsd, 0.75);
});

test('spend view adds the agents ledger and blocks at the cap', () => {
  const open = spendView({ monthKey: '2026-11', editorUsd: 4, agentsUsd: 10, capUsd: 20 });
  assert.equal(open.totalUsd, 14);
  assert.equal(open.warn, false);
  assert.equal(open.blocked, false);

  const hot = spendView({ monthKey: '2026-11', editorUsd: 8, agentsUsd: 9, capUsd: 20 });
  assert.equal(hot.warn, true);
  assert.equal(hot.blocked, false);

  const closed = spendView({ monthKey: '2026-11', editorUsd: 12, agentsUsd: 8, capUsd: 20 });
  assert.equal(closed.blocked, true);
  assert.match(formatSpend(closed), /\$20\.00/);
});

test('a missing agents ledger is visible and is not treated as zero spend from them', () => {
  const view = spendView({ monthKey: '2026-11', editorUsd: 1, agentsUsd: null, capUsd: 20 });
  assert.equal(view.agentsKnown, false);
  assert.equal(view.totalUsd, 1);
  assert.match(formatSpend(view), /not merged/);
});
