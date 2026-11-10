import assert from 'node:assert/strict';
import test from 'node:test';
import { CARDINAL } from '../data/cardinal/index.ts';
import {
  answerQuiz, emptyProgress, erasDone, eraIndex, huntHit, huntPicks, huntStreak, pacificDay, parseProgress,
  quizOrder, rankFor, serializeProgress, unlockStop, xp, type Progress,
} from './progress.ts';

const ids = CARDINAL.stops.map((s) => s.id);
const DAY = '2026-11-10';

function unlockAll(list: string[], start: Progress = emptyProgress()): Progress {
  return list.reduce((progress, id) => unlockStop(progress, CARDINAL, id, DAY).progress, start);
}

test('storage parsing keeps good data, drops bad data, and never throws', () => {
  assert.deepEqual(parseProgress(null), emptyProgress());
  assert.deepEqual(parseProgress('not json'), emptyProgress());
  assert.deepEqual(parseProgress('42'), emptyProgress());
  const mixed = parseProgress(JSON.stringify({ unlocked: ['quad', 7, 'quad', 'maus'], quiz: { quad: true, maus: 'yes' }, hunt: { '2026-11-10': { found: ['quad'], done: false }, nope: { found: [] } }, at: 5 }));
  assert.deepEqual(mixed.unlocked, ['quad', 'maus']);
  assert.deepEqual(mixed.quiz, { quad: true });
  assert.deepEqual(Object.keys(mixed.hunt), ['2026-11-10']);
  assert.equal(mixed.at, null);
  const round = unlockAll(['quad', 'maus']);
  assert.deepEqual(parseProgress(serializeProgress(round)), round);
});

test('XP and ranks follow Cardinal Quest: 100 a stop, 50 a quiz, 250 a tour, 150 a thread, 200 a hunt', () => {
  assert.equal(xp(emptyProgress()), 0);
  const p: Progress = { ...emptyProgress(), unlocked: ['quad', 'maus'], quiz: { quad: true, maus: false }, routesDone: ['land'], threadsDone: ['son'], hunt: { a: { found: [], done: true } } };
  assert.equal(xp(p), 200 + 50 + 250 + 150 + 200);
  assert.deepEqual(rankFor(0), { rank: 'Visitor', next: { at: 300, rank: 'Prospective Student' } });
  assert.equal(rankFor(299).rank, 'Visitor');
  assert.equal(rankFor(300).rank, 'Prospective Student');
  assert.equal(rankFor(4900).rank, 'Founder');
  assert.equal(rankFor(4900).next, null);
});

test('eras sort by year and a stamp needs every stop in the era', () => {
  assert.equal(eraIndex(1876), 0);
  assert.equal(eraIndex(1906), 2);
  assert.equal(eraIndex(2013), 4);
  const all = unlockAll(ids);
  assert.deepEqual(erasDone(all, CARDINAL.stops), [true, true, true, true, true]);
  assert.deepEqual(erasDone(emptyProgress(), CARDINAL.stops), [false, false, false, false, false]);
});

test('unlocking a stop gives XP once, and finishing a tour and a thread is noticed', () => {
  const first = unlockStop(emptyProgress(), CARDINAL, 'maus', DAY);
  assert.ok(first.changed);
  assert.equal(xp(first.progress), 100);
  assert.equal(unlockStop(first.progress, CARDINAL, 'maus', DAY).changed, false);
  assert.equal(unlockStop(first.progress, CARDINAL, 'nowhere', DAY).changed, false);

  const land = CARDINAL.routes.find((r) => r.id === 'land')!;
  const almost = unlockAll(land.stops.slice(0, -1));
  assert.deepEqual(almost.routesDone, []);
  const done = unlockStop(almost, CARDINAL, land.stops.at(-1)!, DAY);
  assert.deepEqual(done.progress.routesDone, ['land']);
  assert.deepEqual(done.progress.threadsDone.includes('land'), true);
  assert.ok(done.progress.threadsDone.includes('land'));
});

test('a stop that finishes a route says so; a new rank wins the headline', () => {
  const stops = CARDINAL.routes.find((r) => r.id === 'biggame')!.stops;
  const result = unlockStop(unlockAll(stops.slice(0, -1)), CARDINAL, stops.at(-1)!, DAY);
  assert.ok(result.progress.routesDone.includes('biggame'));
  assert.ok(result.rankUp !== null);
  assert.equal(result.headline, `New rank: ${result.rankUp}!`);
});

test('quiz: right answer scores 50 once, wrong answer scores nothing, and neither can be retried', () => {
  const stop = CARDINAL.stops.find((s) => s.id === 'quad')!;
  const wrong = answerQuiz(emptyProgress(), CARDINAL, 'quad', (stop.quiz.correct + 1) % 3, DAY);
  assert.equal(wrong.correct, false);
  assert.equal(xp(wrong.progress), 0);
  assert.equal(answerQuiz(wrong.progress, CARDINAL, 'quad', stop.quiz.correct, DAY).alreadyAnswered, true);
  const right = answerQuiz(emptyProgress(), CARDINAL, 'quad', stop.quiz.correct, DAY);
  assert.equal(right.correct, true);
  assert.equal(xp(right.progress), 50);
  assert.equal(right.message, 'Correct! +50 XP');
});

test('quiz answer order is the same shuffle Cardinal Quest used', () => {
  assert.deepEqual(quizOrder('quad', 3), [0, 1, 2]);
  assert.deepEqual(quizOrder('maus', 3), [2, 0, 1]);
  assert.deepEqual(quizOrder('hoover', 3), [2, 1, 0]);
});

test('daily hunt picks match Cardinal Quest for fixed days', () => {
  assert.deepEqual(huntPicks('2026-10-25', ids), ['angel', 'rodin', 'white']);
  assert.deepEqual(huntPicks('2026-10-31', ids), ['hanna', 'white', 'oval']);
  assert.deepEqual(huntPicks('2026-11-10', ids), ['quad', 'angel', 'memchu']);
  assert.deepEqual(huntPicks('2027-01-01', ids), ['angel', 'memchu', 'barn']);
  for (const day of ['2026-11-01', '2026-11-02', '2026-12-25']) assert.equal(new Set(huntPicks(day, ids)).size, 3);
});

test('hunt: finding all three targets completes the day and starts a streak', () => {
  const picks = huntPicks(DAY, ids);
  let progress = emptyProgress();
  assert.equal(huntHit(progress, 'oval', DAY, ids), null);
  const first = huntHit(progress, picks[0], DAY, ids)!;
  assert.equal(first.message, 'Hunt target found! 1/3');
  assert.equal(huntHit(first.progress, picks[0], DAY, ids), null);
  progress = huntHit(first.progress, picks[1], DAY, ids)!.progress;
  const last = huntHit(progress, picks[2], DAY, ids)!;
  assert.equal(last.progress.hunt[DAY].done, true);
  assert.match(last.message, /Daily hunt complete! \+200 XP, 1-day streak/);
  assert.equal(xp(last.progress), 200);
  const yesterday = { ...last.progress, hunt: { ...last.progress.hunt, '2026-11-09': { found: [], done: true } } };
  assert.equal(huntStreak(yesterday, DAY), 2);
  assert.equal(huntStreak(emptyProgress(), DAY), 0);
});

test('hunt: unlocking a target counts it, and so does answering its quiz', () => {
  const [a, b] = huntPicks(DAY, ids);
  const byUnlock = unlockStop(emptyProgress(), CARDINAL, a, DAY);
  assert.deepEqual(byUnlock.progress.hunt[DAY].found, [a]);
  const stop = CARDINAL.stops.find((s) => s.id === b)!;
  const byQuiz = answerQuiz(byUnlock.progress, CARDINAL, b, stop.quiz.correct, DAY);
  assert.deepEqual(byQuiz.progress.hunt[DAY].found, [a, b]);
});

test('the hunt day is the Pacific calendar day', () => {
  assert.equal(pacificDay(new Date('2026-11-10T07:30:00Z')), '2026-11-09');
  assert.equal(pacificDay(new Date('2026-11-10T08:30:00Z')), '2026-11-10');
});
