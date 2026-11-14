import assert from 'node:assert/strict';
import test from 'node:test';
import { DESK_PAYLOAD_MAX, encodeDesk } from '../desks/store.ts';
import { ANSWER_CAP, rememberAnswer, rememberSource, SOURCE_CAP, parseResearch } from './desk.ts';
import type { DeskAnswer, DeskSource, ResearchDesk } from './types.ts';

test('300 sources and 100 answers stay under the desk cap, and the 301st is refused', () => {
  let data = parseResearch({ collections: [{ id: 'cardinal', name: 'Cardinal', blurb: 'The book.', createdAt: '2026-11-14T00:00:00.000Z' }], sources: [], answers: [] });
  for (let i = 0; i < SOURCE_CAP; i += 1) {
    const source: DeskSource = { id: `s${i}`, title: 'Note', kind: 'transcript', status: 'ready', size: 1200, collectionId: 'cardinal', createdAt: '2026-11-14T00:00:00.000Z', error: null };
    const saved = rememberSource(data, source);
    assert.equal(saved.ok, true);
    if (saved.ok) data = saved.data;
  }
  const refused = rememberSource(data, { id: 'overflow', title: 'Note', kind: 'transcript', status: 'ready', size: 1, collectionId: 'cardinal', createdAt: '2026-11-14T00:00:00.000Z', error: null });
  assert.equal(refused.ok, false);
  for (let i = 0; i < ANSWER_CAP; i += 1) {
    const answer: DeskAnswer = {
      id: `a${i}`,
      collectionId: 'cardinal',
      question: 'Where does it open?',
      answer: 'On the tall stick.',
      citations: [{ chunkId: 'c', sourceId: 's0', sourceTitle: 'Note', page: 1, timestamp: null, excerpt: 'The creek.' }],
      createdAt: '2026-11-14T00:00:00.000Z',
    };
    const saved = rememberAnswer(data, answer);
    assert.equal(saved.ok, true);
    if (saved.ok) data = saved.data;
  }
  const envelope = encodeDesk('research', data, Date.now());
  assert.ok(envelope);
  assert.ok(envelope && envelope.payload.length < DESK_PAYLOAD_MAX);
  const long = rememberAnswer(parseResearch(null), { id: 'long', collectionId: 'dawn', question: 'q', answer: 'x'.repeat(5000), citations: [], createdAt: '2026-11-14T00:00:00.000Z' });
  assert.equal(long.ok, true);
  if (long.ok) assert.equal(long.data.answers[0].answer.length, 4000);
});

test('the seeded collections are Dawn projects', () => {
  const data: ResearchDesk = parseResearch(null);
  assert.deepEqual(data.collections.map((row) => row.name), ['Cardinal', 'Pantheon', 'Artometrics', 'Prism & Pollen', 'Dawn']);
  assert.equal(JSON.stringify(data).toLowerCase().includes('glaze'), false);
  assert.equal(JSON.stringify(data).toLowerCase().includes('cone six'), false);
});
