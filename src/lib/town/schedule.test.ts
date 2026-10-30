import assert from 'node:assert/strict';
import test from 'node:test';
import { TALK_DISTANCE } from './loop.ts';
import { blockAt, DAILY_SCHEDULE, observationText, observeNearby, planAct } from './schedule.ts';

test('the day plan picks work in the morning and a meeting later', () => {
  assert.equal(blockAt(DAILY_SCHEDULE.trinity, 9).intent, 'work');
  assert.equal(blockAt(DAILY_SCHEDULE.trinity, 9).activity, 'planning the day');
  assert.equal(blockAt(DAILY_SCHEDULE.trinity, 12).intent, 'meet');
  assert.equal(blockAt(DAILY_SCHEDULE.trinity, 20).intent, 'meet');
  assert.equal(blockAt(DAILY_SCHEDULE.kali, 23).intent, 'work');
  assert.equal(blockAt(DAILY_SCHEDULE.nimbus, -1).activity, blockAt(DAILY_SCHEDULE.nimbus, 23).activity);
});

test('planning walks, talks, or stays with the task', () => {
  assert.deepEqual(
    planAct({ intent: 'work', activity: 'reading a book', nearestId: 'kali', distance: 1, talkDistance: TALK_DISTANCE }),
    { kind: 'work', activity: 'reading a book' },
  );
  assert.equal(
    planAct({ intent: 'meet', activity: 'checking in', nearestId: 'kali', distance: 4, talkDistance: TALK_DISTANCE }).kind,
    'walk',
  );
  assert.equal(
    planAct({ intent: 'meet', activity: 'checking in', nearestId: 'kali', distance: 1, talkDistance: TALK_DISTANCE }).kind,
    'talk',
  );
});

test('an observation names who is close and becomes a memory line', () => {
  const nearby = observeNearby(
    { id: 'trinity', x: 4, y: 3 },
    [
      { id: 'kali', name: 'Kali', x: 5, y: 4 },
      { id: 'nimbus', name: 'Nimbus', x: 12, y: 7 },
    ],
  );
  assert.deepEqual(nearby, ['Kali']);
  assert.equal(observationText('Trinity', 'planning the day', nearby), 'Trinity is planning the day. Nearby: Kali.');
});
