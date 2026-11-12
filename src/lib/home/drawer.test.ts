import assert from 'node:assert/strict';
import test from 'node:test';
import type { Thread } from '../../components/dawn-agents/api.ts';
import { DRAWER_LINKS, pinnedHref, recentsFrom, swipeClosesDrawer } from './drawer.ts';
import { TOWN_CAST } from '../credits/town.ts';

const thread = (over: Partial<Thread> & { id: string }): Thread => ({ kind: 'direct', title: 'Chat', agentIds: [], updatedAt: 0, ...over });

test('the sidebar links Village, the town, and the three work places', () => {
  assert.deepEqual(DRAWER_LINKS.map((link) => link.label), ['Projects', 'Code', 'Artifacts', 'Village', 'Dawn Town']);
  assert.equal(DRAWER_LINKS.find((link) => link.id === 'village')?.href, '/village?section=village');
  assert.equal(DRAWER_LINKS.find((link) => link.id === 'town')?.href, '/town');
});

test('every pinned agent opens its chat in the town', () => {
  assert.deepEqual(TOWN_CAST.map((agent) => agent.name), ['Atlas Scout', 'Code Mage', 'Recipe Keeper', 'Letter Carrier', 'Studio Painter', 'Agents Desk']);
  for (const agent of TOWN_CAST) assert.equal(pinnedHref(agent.id), `/town?bot=${agent.id}`);
});

test('recents are the newest saved chats, and only a ready desk has any', () => {
  const threads = [
    thread({ id: 'a', title: 'Old', updatedAt: 1 }),
    thread({ id: 'b', title: 'New', kind: 'group', updatedAt: 9 }),
    thread({ id: 'c', title: 'Job', kind: 'job', updatedAt: 10 }),
    thread({ id: 'd', title: 'Left', leftAt: 5, updatedAt: 8 }),
    thread({ id: 'e', title: '', updatedAt: 4 }),
  ];
  assert.deepEqual(recentsFrom('ready', threads).map((r) => r.title), ['New', 'Chat', 'Old']);
  assert.equal(recentsFrom('ready', threads)[0].href, '/agents?thread=b');
  assert.deepEqual(recentsFrom('signin', threads), []);
  assert.deepEqual(recentsFrom('offline', threads), []);
  assert.equal(recentsFrom('ready', threads, 2).length, 2);
});

test('a quick leftward flick or a long leftward drag closes; taps, nudges, scrolls, and rightward drags do not', () => {
  assert.equal(swipeClosesDrawer({ dx: -80, dy: 6, ms: 150 }, 318), true);
  assert.equal(swipeClosesDrawer({ dx: -48, dy: 0, ms: 400 }, 318), true);
  assert.equal(swipeClosesDrawer({ dx: -110, dy: 0, ms: 2000 }, 318), true);
  assert.equal(swipeClosesDrawer({ dx: -60, dy: 0, ms: 2000 }, 318), false);
  assert.equal(swipeClosesDrawer({ dx: 0, dy: 0, ms: 60 }, 318), false);
  assert.equal(swipeClosesDrawer({ dx: -20, dy: 2, ms: 100 }, 318), false);
  assert.equal(swipeClosesDrawer({ dx: -60, dy: 200, ms: 200 }, 318), false);
  assert.equal(swipeClosesDrawer({ dx: 120, dy: 0, ms: 100 }, 318), false);
});
