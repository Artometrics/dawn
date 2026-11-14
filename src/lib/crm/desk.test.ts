import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cleanTags,
  contactsToCsv,
  importContacts,
  money,
  moveDeal,
  parseContactsCsv,
  quickAdd,
  saveContact,
  saveDeal,
  searchDesk,
  setTaskDone,
  todayLists,
  tomorrowMorning,
  EMPTY_CRM,
} from './desk';

const now = new Date(2026, 10, 14, 15, 0, 0).getTime();

test('tags drop duplicates, a hash, and anything too long', () => {
  assert.deepEqual(cleanTags('Press, press, #magazine, this tag is way too long for the desk'), ['Press', 'magazine']);
});

test('quick add keeps the phone number and a follow-up tomorrow morning', () => {
  const added = quickAdd(EMPTY_CRM, { name: 'Mara Chen', phone: '415-555-0100', companyName: 'Northline' }, now);
  assert.equal(added.ok, true);
  if (!added.ok) return;
  assert.equal(added.contact.phone, '415-555-0100');
  assert.equal(added.contact.companyName, 'Northline');
  assert.ok(added.task);
  assert.equal(added.task?.title, 'Follow up Mara Chen');
  assert.equal(added.task?.dueAt, tomorrowMorning(now));
  const due = new Date(added.task?.dueAt ?? 0);
  assert.equal(due.getHours(), 9);
  assert.ok((added.task?.dueAt ?? 0) > now);
});

test('the board is five stages and today lists overdue work plus open proposals', () => {
  const person = saveContact(EMPTY_CRM, { name: 'Mara Chen', companyName: 'Northline' }, now);
  assert.equal(person.ok, true);
  if (!person.ok) return;
  const deal = saveDeal(person.data, { title: 'Magazine pages', contactId: person.contact.id, stage: 'proposal', valueCents: 250000 }, now);
  assert.equal(deal.ok, true);
  if (!deal.ok) return;
  assert.equal(money(deal.deal.valueCents), '$2,500.00');
  const moved = moveDeal(deal.data, deal.deal.id, 'won', now + 1);
  assert.equal(moved.ok, true);
  if (!moved.ok) return;
  assert.equal(moved.deal.stage, 'won');
  const withTask = quickAdd(moved.data, { name: 'Late call', phone: '1', followUp: true }, now - 3 * 86_400_000);
  assert.equal(withTask.ok, true);
  if (!withTask.ok || !withTask.task) return;
  const lists = todayLists(withTask.data, now);
  assert.equal(lists.overdue.some((task) => task.id === withTask.task?.id), true);
  const done = todayLists(setTaskDone(withTask.data, withTask.task.id, true, now), now);
  assert.equal(done.overdue.some((task) => task.id === withTask.task?.id), false);
  const proposal = saveDeal(withTask.data, { title: 'Open proposal', stage: 'proposal', valueCents: 100 }, now);
  assert.equal(proposal.ok, true);
  if (!proposal.ok) return;
  assert.equal(todayLists(proposal.data, now).proposals.length, 1);
});

test('search and csv cover the desk', () => {
  const added = quickAdd(EMPTY_CRM, { name: 'Mara Chen', phone: '415', companyName: 'Northline', followUp: false }, now);
  assert.equal(added.ok, true);
  if (!added.ok) return;
  const noted = {
    ...added.data,
    notes: [{ id: 'n1', contactId: added.contact.id, body: 'Asked about the rate card', createdAt: now }],
  };
  assert.deepEqual(searchDesk('mara press', noted).map((hit) => hit.kind), []);
  assert.deepEqual(searchDesk('mara northline', noted).map((hit) => hit.kind), ['person']);
  assert.deepEqual(searchDesk('rate', noted).map((hit) => hit.kind), ['note']);
  const csv = contactsToCsv(noted.contacts);
  assert.match(csv, /^name,company,email,phone,instagram,website,tags,source/);
  const rows = parseContactsCsv(`${csv}"Quoted, Name",Harbor,q@example.com,555,,,,\n`);
  assert.equal(rows.at(-1)?.name, 'Quoted, Name');
  const imported = importContacts(EMPTY_CRM, 'name,company,phone\nAda,Kite,555-0101\n', now);
  assert.equal(imported.ok, true);
  if (!imported.ok) return;
  assert.equal(imported.imported, 1);
  assert.equal(imported.data.contacts[0].phone, '555-0101');
  assert.equal(imported.data.companies[0].name, 'Kite');
});
