'use client';

import { useState, type FormEvent } from 'react';
import { useDawn, type Quest } from '@/components/dawn/dawn-provider';

function nextIdea(title: string): string {
  const text = title.toLowerCase();
  if (/\b(book|anime|story)\b/.test(text)) return 'Next: a one-page site for it.';
  if (/\b(site|web|app)\b/.test(text)) return 'Next: a short lesson for one person.';
  return 'Next: a book, a site, or a small habit.';
}

export function QuestsPanel() {
  const { quests, saveQuest } = useDawn();
  const [title, setTitle] = useState('');

  function add(event: FormEvent) {
    event.preventDefault();
    const clean = title.trim().slice(0, 80);
    if (clean.length < 2) return;
    const now = Date.now();
    const quest: Quest = {
      id: crypto.randomUUID(),
      title: clean,
      note: '',
      status: 'active',
      milestones: [
        { label: 'Start', done: false },
        { label: 'Shape', done: false },
        { label: 'Finish', done: false },
      ],
      createdAt: now,
      updatedAt: now,
    };
    saveQuest(quest);
    setTitle('');
  }

  function toggle(quest: Quest, index: number) {
    const milestones = quest.milestones.map((item, itemIndex) => (
      itemIndex === index ? { ...item, done: !item.done } : item
    ));
    const done = milestones.every((item) => item.done);
    saveQuest({
      ...quest,
      milestones,
      status: done ? 'done' : 'active',
      updatedAt: Date.now(),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[#d9cbb8]">A goal with three checks. Finish one, then the next idea shows up.</p>
      <form className="flex gap-2" onSubmit={add}>
        <label className="sr-only" htmlFor="quest-title">Goal</label>
        <input
          id="quest-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="A book, a site, a habit"
          className="min-h-11 flex-1 border border-[#5a4636] bg-[#1c1410] px-3 text-base"
        />
        <button type="submit" className="min-h-11 border border-[#e2a04a] px-3 text-sm">Add</button>
      </form>
      {quests.length === 0 && <p className="text-sm text-[#d9cbb8]">No quests yet.</p>}
      {quests.map((quest) => (
        <article key={quest.id} className="border border-[#5a4636] p-3">
          <p className="text-sm font-semibold">{quest.title}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {quest.milestones.map((milestone, index) => (
              <li key={`${quest.id}-${milestone.label}`}>
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={milestone.done}
                    onChange={() => toggle(quest, index)}
                    className="h-5 w-5"
                  />
                  {milestone.label}
                </label>
              </li>
            ))}
          </ul>
          {quest.status === 'done' && <p className="mt-2 text-sm text-[#e2a04a]">You finished. {nextIdea(quest.title)}</p>}
        </article>
      ))}
    </div>
  );
}
