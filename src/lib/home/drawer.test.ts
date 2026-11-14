import assert from 'node:assert/strict';
import test from 'node:test';
import type { Thread } from '../../components/dawn-agents/api.ts';
import { recentsFrom, swipeClosesDrawer } from './drawer.ts';
import { NAV_GROUPS, NAV_ITEMS, PINNED_AGENTS, REDIRECTS, SITE_ROUTES, activeItem, pageTitle, pinnedHref } from '../site/nav.ts';

const thread = (over: Partial<Thread> & { id: string }): Thread => ({ kind: 'direct', title: 'Chat', agentIds: [], updatedAt: 0, ...over });

test('the sidebar lists the same places in the same order, and the village sections each get one entry', () => {
  assert.deepEqual(NAV_GROUPS.map((group) => group.label), [null, 'Work', 'Code', 'Agents']);
  assert.deepEqual(NAV_GROUPS[0].items.map((item) => item.label), ['Atlas', 'Quests', 'Village', 'Characters', 'Library']);
  assert.deepEqual(NAV_GROUPS[1].items.map((item) => item.label), ['Projects', 'Studio', 'Recipes', 'Letter', 'Newsletter', 'Invoices', 'Contacts', 'Cuts', 'Shows', 'Research']);
  assert.deepEqual(NAV_GROUPS[2].items.map((item) => item.label), ['Code', 'NightCode', 'Teammates', 'Editor', 'Kits']);
  assert.deepEqual(NAV_GROUPS[3].items.map((item) => item.label), ['Agents', 'Bot desk', 'Data', 'Settings']);
  assert.equal(new Set(NAV_ITEMS.map((item) => item.href)).size, NAV_ITEMS.length, 'no two entries share an address');
});

test('every pinned character opens its chat in the village', () => {
  assert.ok(PINNED_AGENTS.length > 0);
  for (const agent of PINNED_AGENTS) assert.equal(pinnedHref(agent.id), `/village?agent=${agent.id}`);
});

test('the current page is the highlighted entry, including sections and sub-pages', () => {
  assert.equal(activeItem('/')?.id, 'atlas');
  assert.equal(activeItem('/village', 'quests')?.id, 'quests');
  assert.equal(activeItem('/village', 'library')?.id, 'library');
  assert.equal(activeItem('/village')?.id, 'quests');
  assert.equal(activeItem('/agents', 'data')?.id, 'data');
  assert.equal(activeItem('/kits/sandbox')?.id, 'kits');
  assert.equal(activeItem('/code/editor/')?.id, 'editor');
  assert.equal(activeItem('/nowhere'), undefined);
  assert.equal(pageTitle('/nowhere'), 'Dawn');
  assert.equal(pageTitle('/credits'), 'Credits');
  assert.equal(pageTitle('/kits/sandbox'), 'Sandbox kit');
  assert.equal(pageTitle('/kits'), 'Kits');
});

test('old addresses redirect to a place that exists', () => {
  for (const redirect of REDIRECTS) {
    const target = redirect.to.split('?')[0];
    assert.ok(SITE_ROUTES.includes(target), `${redirect.from} goes to ${redirect.to}`);
    assert.ok(!NAV_ITEMS.some((item) => item.href === redirect.from), `${redirect.from} is not also a sidebar entry`);
  }
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
