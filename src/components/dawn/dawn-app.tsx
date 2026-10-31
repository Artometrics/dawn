'use client';

import dynamic from 'next/dynamic';
import { useEffect, useId, useState, type FormEvent } from 'react';
import {
  BookOpen,
  Castle,
  ChevronLeft,
  Flag,
  Map as MapIcon,
  Menu,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { AGENTS, YOU_LOOKS, type Agent } from '@/lib/agents';
import { AgentSheet } from '@/components/dawn/agent-sheet';
import { DawnProvider, useDawn } from '@/components/dawn/dawn-provider';
import { LibraryPanel } from '@/components/dawn/library-panel';
import { createQuest, QuestsPanel } from '@/components/dawn/quests-panel';
import { relativeWhen } from '@/components/dawn/relative-when';
import { useTown } from '@/components/dawn/use-town';

const VillageGame = dynamic(() => import('@/components/dawn/village-game').then((mod) => mod.VillageGame), { ssr: false });
const CampusAtlas = dynamic(() => import('@/components/atlas/campus-atlas').then((mod) => mod.CampusAtlas), { ssr: false });

type Section = 'quests' | 'village' | 'atlas' | 'library';

const NAV: { id: Section; label: string; icon: typeof Flag }[] = [
  { id: 'quests', label: 'Quests', icon: Flag },
  { id: 'village', label: 'Village', icon: Castle },
  { id: 'atlas', label: 'Atlas', icon: MapIcon },
  { id: 'library', label: 'Library', icon: BookOpen },
];

export function DawnApp() {
  return (
    <DawnProvider>
      <Shell />
    </DawnProvider>
  );
}

function Shell() {
  const dawn = useDawn();
  const town = useTown(dawn.memories, dawn.remember);
  const [section, setSection] = useState<Section>('quests');
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [youOpen, setYouOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [questId, setQuestId] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const pending = dawn.approvals.filter((item) => item.status === 'pending').length;
  const selectedQuest = dawn.quests.find((item) => item.id === questId) ?? null;
  const title = agent
    ? agent.name
    : section === 'quests' && selectedQuest
      ? selectedQuest.title
      : NAV.find((item) => item.id === section)?.label ?? 'Dawn';

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (agent) setAgent(null);
      else if (youOpen) setYouOpen(false);
      else if (composing) setComposing(false);
      else if (questId) setQuestId(null);
      else setDrawer(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [agent, composing, questId, youOpen]);

  function openSection(next: Section) {
    setSection(next);
    setDrawer(false);
    setYouOpen(false);
    setAgent(null);
    if (next !== 'quests') {
      setQuestId(null);
      setComposing(false);
    }
  }

  function addQuest(event: FormEvent) {
    event.preventDefault();
    const quest = createQuest(draft);
    if (!quest) return;
    dawn.saveQuest(quest);
    setDraft('');
    setComposing(false);
    setSection('quests');
    setQuestId(quest.id);
  }

  const showChrome = section !== 'atlas' && !agent;
  const recent = [...dawn.quests].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);
  const agents = AGENTS.filter((item) => {
    const needle = query.trim().toLowerCase();
    return !needle || section !== 'village' || item.name.toLowerCase().includes(needle);
  });

  return (
    <div className="dawn-root flex h-dvh">
      {drawer && (
        <button type="button" className="fixed inset-0 z-40 bg-black/55 md:hidden" aria-label="Close menu" onClick={() => setDrawer(false)} />
      )}
      <aside
        className={`dawn-drawer fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col bg-[var(--dawn-bg)] transition-transform duration-200 ease-out md:static md:z-0 md:w-[280px] md:shrink-0 md:translate-x-0 ${drawer ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Dawn"
      >
        <div className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <p className="dawn-wordmark text-[34px] leading-none">Dawn</p>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--dawn-chip)] md:hidden" aria-label="Close menu" onClick={() => setDrawer(false)}>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav className="mt-6 flex flex-col px-3" aria-label="Sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => openSection(item.id)}
                className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[16px]"
              >
                <Icon className={`h-5 w-5 ${on ? 'text-[var(--dawn-accent)]' : ''}`} aria-hidden />
                <span className={on ? 'text-[var(--dawn-accent)]' : ''}>{item.label}</span>
                {item.id === 'village' && pending > 0 && (
                  <span className="ml-auto text-[13px] text-[var(--dawn-accent)]">{pending}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-6 px-5">
          <p className="text-[13px] text-[var(--dawn-muted)]">Pinned</p>
          <ul className="mt-1">
            {AGENTS.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { setAgent(item); setDrawer(false); }}
                  className="flex min-h-11 w-full items-center gap-3 text-left text-[16px]"
                >
                  <img src={item.src} alt="" width={22} height={22} className="h-[22px] w-[22px] [image-rendering:pixelated]" />
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-5">
          <p className="text-[13px] text-[var(--dawn-muted)]">Recents</p>
          {recent.length === 0 && <p className="mt-2 text-[14px] text-[var(--dawn-muted)]">Nothing recent.</p>}
          <ul className="mt-1">
            {recent.map((quest) => (
              <li key={quest.id}>
                <button
                  type="button"
                  onClick={() => { setSection('quests'); setQuestId(quest.id); setDrawer(false); }}
                  className="flex min-h-12 w-full flex-col items-start justify-center text-left"
                >
                  <span className="truncate text-[15px]">{quest.title}</span>
                  <span className="text-[13px] text-[var(--dawn-muted)]">{relativeWhen(quest.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <AccountBlock />
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {showChrome && (
          <header className="flex h-14 shrink-0 items-center px-3 pt-[env(safe-area-inset-top)]">
            {section === 'quests' && questId ? (
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--dawn-chip)]" aria-label="Back to quests" onClick={() => setQuestId(null)}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full bg-[var(--dawn-chip)] md:hidden" aria-label="Menu" onClick={() => setDrawer(true)}>
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            )}
            <h1 className="flex-1 truncate px-2 text-center text-[17px] font-semibold">{title}</h1>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[var(--dawn-chip)]"
              aria-label="You"
              aria-expanded={youOpen}
              onClick={() => setYouOpen((open) => !open)}
            >
              <img src={YOU_LOOKS[dawn.avatar]} alt="" width={28} height={28} className="h-7 w-7 [image-rendering:pixelated]" />
            </button>
          </header>
        )}
        {dawn.authError && showChrome && (
          <p role="alert" className="px-4 pb-1 text-[13px] text-[var(--dawn-accent)]">{dawn.authError}</p>
        )}
        {youOpen && showChrome && (
          <div className="absolute top-16 right-3 z-30 w-[min(100%-1.5rem,320px)] rounded-2xl bg-[var(--dawn-elev)] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.4)]">
            <AccountBlock />
          </div>
        )}

        <main className="relative min-h-0 flex-1">
          {section === 'quests' && (
            <QuestsPanel query={query} selectedId={questId} onSelect={setQuestId} />
          )}
          {section === 'village' && (
            <div className="relative z-0 flex h-full min-h-0 flex-col overflow-hidden">
              <div className="relative z-0 min-h-[200px] flex-1 overflow-hidden">
                <VillageGame
                  avatar={dawn.avatar}
                  poses={town.poses}
                  onAgent={(id) => setAgent(AGENTS.find((item) => item.id === id) ?? null)}
                  onYou={() => openSection('library')}
                />
              </div>
              <div className="relative z-10 flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
                {agents.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAgent(item)}
                    className="flex min-h-11 items-center gap-2 rounded-full bg-[var(--dawn-chip)] px-3 text-[14px]"
                  >
                    <img src={item.src} alt="" width={28} height={28} className="h-7 w-7 [image-rendering:pixelated]" />
                    {item.name}
                  </button>
                ))}
              </div>
              {town.notice && (
                <p role="alert" className="mx-3 mb-2 shrink-0 rounded-2xl bg-[var(--dawn-elev)] px-3 py-2 text-[14px] leading-snug">
                  {town.notice} These village lines are stand-ins.
                </p>
              )}
              <div className="shrink-0 px-4 pb-2 text-[14px] text-[var(--dawn-secondary)]">
                <p>{town.status}{town.lines.length > 0 ? ` · ${town.source === 'gemini' ? 'Gemini' : 'Stand-in'}` : ''}</p>
                {town.lines.slice(-2).map((line, index) => (
                  <p key={`${line.author}-${index}`} className="mt-1 text-[var(--dawn-text)]">{line.author}: {line.text}</p>
                ))}
              </div>
              {pending > 0 && (
                <button
                  type="button"
                  className="mx-3 mb-3 min-h-11 shrink-0 rounded-full bg-[var(--dawn-chip)] px-3 text-left text-[14px] text-[var(--dawn-accent)]"
                  onClick={() => {
                    const waiting = dawn.approvals.find((item) => item.status === 'pending');
                    const match = AGENTS.find((item) => item.id === waiting?.agentId);
                    if (match) setAgent(match);
                  }}
                >
                  {pending} waiting for you
                </button>
              )}
            </div>
          )}
          {section === 'atlas' && (
            <div className="absolute inset-0">
              <CampusAtlas framed="shell" onMenu={() => setDrawer(true)} avatar={dawn.avatar} />
            </div>
          )}
          {section === 'library' && (
            <LibraryPanel query={query} onTalk={setAgent} />
          )}
          {agent && (
            <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[var(--dawn-bg)]">
              <AgentSheet agent={agent} onClose={() => setAgent(null)} />
            </div>
          )}
        </main>

        {showChrome && (
          <div className="relative shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => { setSection('quests'); setQuestId(null); setComposing(true); }}
              className="absolute -top-12 right-4 inline-flex h-11 items-center gap-1 rounded-full bg-[var(--dawn-pill)] px-4 text-[15px] font-medium text-[var(--dawn-ink)] shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
            >
              <Plus className="h-4 w-4" aria-hidden />
              New quest
            </button>
            {composing && (
              <form onSubmit={addQuest} className="mb-2 flex gap-2">
                <label className="sr-only" htmlFor="quest-title">Goal</label>
                <input
                  id="quest-title"
                  value={draft}
                  autoFocus
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="A book, a site, a habit"
                  className="dawn-field flex-1"
                />
                <button type="submit" className="inline-flex h-11 items-center rounded-full bg-[var(--dawn-pill)] px-4 text-[14px] font-medium text-[var(--dawn-ink)]">
                  Add
                </button>
              </form>
            )}
            <label className="dawn-search flex h-12 items-center gap-2 rounded-full bg-[var(--dawn-field)] px-4">
              <Search className="h-5 w-5 text-[var(--dawn-muted)]" aria-hidden />
              <span className="sr-only">Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[#a8a199]"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountBlock() {
  const dawn = useDawn();
  const fieldId = useId();
  const [localName, setLocalName] = useState('');

  if (dawn.user) {
    return (
      <button type="button" className="min-h-11 w-full text-left text-[15px]" onClick={() => void dawn.signOut()}>
        {dawn.name} · Sign out
      </button>
    );
  }
  if (dawn.mode === 'emulator') {
    return (
      <form
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void dawn.signInLocal(localName);
        }}
      >
        <label className="sr-only" htmlFor={fieldId}>Your name</label>
        <input
          id={fieldId}
          value={localName}
          onChange={(event) => setLocalName(event.target.value)}
          placeholder="Name"
          className="dawn-field"
        />
        <button type="submit" className="inline-flex h-11 items-center rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium">
          Join
        </button>
      </form>
    );
  }
  if (dawn.mode === 'hosted') {
    return (
      <button type="button" className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--dawn-chip)] text-[14px] font-medium" onClick={() => void dawn.signInGoogle()}>
        Sign in
      </button>
    );
  }
  return <p className="min-h-11 text-[14px] text-[var(--dawn-muted)]">On this phone</p>;
}
