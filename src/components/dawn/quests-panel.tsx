'use client';

import { Flag } from 'lucide-react';
import { useDawn, type Quest } from '@/components/dawn/dawn-provider';
import { relativeWhen } from '@/components/dawn/relative-when';

function touchQuest(quest: Quest, milestones: Quest['milestones']): Quest {
  const done = milestones.every((item) => item.done);
  return {
    ...quest,
    milestones,
    status: done ? 'done' : 'active',
    updatedAt: Date.now(),
  };
}

function nextIdea(title: string): string {
  const text = title.toLowerCase();
  if (/\b(book|anime|story)\b/.test(text)) return 'Next: a one-page site for it.';
  if (/\b(site|web|app)\b/.test(text)) return 'Next: a short lesson for one person.';
  return 'Next: a book, a site, or a small habit.';
}

export function createQuest(title: string): Quest | null {
  const clean = title.trim().slice(0, 80);
  if (clean.length < 2) return null;
  const now = Date.now();
  return {
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
}

export function QuestsPanel({
  query,
  selectedId,
  onSelect,
}: {
  query: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { quests, saveQuest } = useDawn();
  const needle = query.trim().toLowerCase();
  const shown = [...quests]
    .filter((quest) => !needle || quest.title.toLowerCase().includes(needle))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const selected = quests.find((quest) => quest.id === selectedId) ?? null;

  function toggle(quest: Quest, index: number) {
    const milestones = quest.milestones.map((item, itemIndex) => (
      itemIndex === index ? { ...item, done: !item.done } : item
    ));
    saveQuest(touchQuest(quest, milestones));
  }

  if (selected) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 pt-2 pb-24">
        <p className="text-[15px] leading-6 text-[var(--dawn-secondary)]">
          A goal with three checks. Finish one, then the next idea shows up.
        </p>
        <ul className="mt-6 flex flex-col">
          {selected.milestones.map((milestone, index) => (
            <li key={`${selected.id}-${milestone.label}`}>
              <label className="flex min-h-11 items-center gap-3 text-[16px]">
                <input
                  type="checkbox"
                  checked={milestone.done}
                  onChange={() => toggle(selected, index)}
                  className="dawn-mark"
                />
                <span className={milestone.done ? 'text-[var(--dawn-secondary)]' : ''}>{milestone.label}</span>
              </label>
            </li>
          ))}
        </ul>
        {selected.status === 'done' && (
          <p className="mt-6 text-[15px] leading-6 text-[var(--dawn-accent)]">
            You finished. {nextIdea(selected.title)}
          </p>
        )}
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 pb-24 text-center">
        <img
          src="/tiles/you-0.png"
          alt=""
          width={72}
          height={72}
          className="h-[72px] w-[72px] [image-rendering:pixelated]"
        />
        <p className="mt-6 text-[20px] font-medium tracking-[-0.02em]">Start your first quest</p>
        <p className="mt-2 max-w-[28ch] text-[15px] leading-6 text-[var(--dawn-secondary)]">
          A goal with three checks. Finish one, then the next idea shows up.
        </p>
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 pb-24 text-center">
        <Flag className="h-6 w-6 text-[var(--dawn-muted)]" aria-hidden />
        <p className="mt-4 text-[16px]">No quests match that search.</p>
      </div>
    );
  }

  return (
    <ul className="flex h-full min-h-0 flex-col overflow-y-auto px-3 pt-2 pb-24">
      {shown.map((quest) => (
        <li key={quest.id}>
          <button
            type="button"
            onClick={() => onSelect(quest.id)}
            className="flex min-h-14 w-full flex-col items-start justify-center rounded-xl px-2 py-2 text-left hover:bg-[var(--dawn-elev)]"
          >
            <span className="text-[16px] leading-5">{quest.title}</span>
            <span className="mt-0.5 text-[13px] text-[var(--dawn-muted)]">
              {quest.status === 'done' ? 'Finished' : 'In progress'} · {relativeWhen(quest.updatedAt)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
