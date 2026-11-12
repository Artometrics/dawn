'use client';

import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { AGENTS, type Agent } from '@/lib/agents';
import { AgentSheet } from '@/components/dawn/agent-sheet';
import { DawnProvider, useDawn } from '@/components/dawn/dawn-provider';
import { LibraryPanel } from '@/components/dawn/library-panel';
import { QuestThread, useQuestChat } from '@/components/dawn/quest-chat';
import { createQuest, QuestsPanel } from '@/components/dawn/quests-panel';
import { useTown } from '@/components/dawn/use-town';
import { Composer } from '@/components/shell/composer';
import { useModelPicker } from '@/components/shell/model-picker';
import { OfflineCard } from '@/components/shell/status-card';

const VillageGame = dynamic(() => import('@/components/dawn/village-game').then((mod) => mod.VillageGame), { ssr: false });
const CharacterMaker = dynamic(() => import('@/components/forge/character-maker').then((mod) => mod.CharacterMaker), { ssr: false });

type Section = 'quests' | 'village' | 'characters' | 'library';
const SECTIONS: Section[] = ['quests', 'village', 'characters', 'library'];

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
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get('section');
  const section: Section = SECTIONS.find((item) => item === asked) ?? 'quests';
  const agent = AGENTS.find((item) => item.id === params.get('agent')) ?? null;

  const picker = useModelPicker();
  const chat = useQuestChat(picker, dawn.quests.map((quest) => `${quest.title} (${quest.status === 'done' ? 'finished' : 'in progress'})`));
  const [chatOpen, setChatOpen] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [questId, setQuestId] = useState<string | null>(null);
  const pending = dawn.approvals.filter((item) => item.status === 'pending').length;
  const selectedQuest = dawn.quests.find((item) => item.id === questId) ?? null;

  const openSection = (next: Section) => router.push(`/village?section=${next}`);
  const openAgent = (next: Agent) => router.push(`/village?section=${section}&agent=${next.id}`);
  const closeAgent = () => router.push(`/village?section=${section}`);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (agent) closeAgent();
      else if (composing) setComposing(false);
      else if (chatOpen) setChatOpen(false);
      else if (questId) setQuestId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // closeAgent only reads the section, which is in the dependency list through agent changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent, chatOpen, composing, questId, section]);

  function addQuest(event: FormEvent) {
    event.preventDefault();
    const quest = createQuest(draft);
    if (!quest) return;
    dawn.saveQuest(quest);
    setDraft('');
    setComposing(false);
    setChatOpen(false);
    setQuestId(quest.id);
  }

  function ask() {
    const text = message.trim();
    if (!text) return;
    setMessage('');
    setChatOpen(true);
    setQuestId(null);
    void chat.send(text);
  }

  const offline = picker.status === 'offline';

  return (
    <div className="dawn-root flex h-full min-h-0 flex-col">
      <div className="relative min-h-0 flex-1">
        {section === 'quests' && (chatOpen ? (
          <QuestThread chat={chat} onClose={() => setChatOpen(false)} />
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            {selectedQuest && (
              <div className="flex shrink-0 items-center gap-2 px-3 pt-2">
                <button type="button" className="dw-btn dw-btn--icon" aria-label="Back to quests" onClick={() => setQuestId(null)}>
                  <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
                <h2 className="dw-card-title">{selectedQuest.title}</h2>
              </div>
            )}
            <div className="min-h-0 flex-1">
              <QuestsPanel query="" selectedId={questId} onSelect={setQuestId} />
            </div>
          </div>
        ))}
        {section === 'village' && (
          <div className="relative z-0 flex h-full min-h-0 flex-col overflow-hidden">
            <div className="relative z-0 min-h-[200px] flex-1 overflow-hidden">
              <VillageGame
                avatar={dawn.avatar}
                looks={dawn.roster.looks}
                poses={town.poses}
                onAgent={(id) => { const match = AGENTS.find((item) => item.id === id); if (match) openAgent(match); }}
                onYou={() => openSection('library')}
              />
            </div>
            <div className="relative z-10 flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
              {AGENTS.map((item) => (
                <button key={item.id} type="button" onClick={() => openAgent(item)} className="dw-btn">
                  <AgentPortrait agent={item} size={28} />
                  {item.name}
                </button>
              ))}
            </div>
            {town.notice && <p role="alert" className="dw-alert mx-3 mb-2 shrink-0">{town.notice}</p>}
            <div className="shrink-0 px-4 pb-2 text-[length:var(--dawn-fs-action)] text-[var(--dawn-secondary)]">
              <p>{town.status}</p>
              {town.lines.slice(-2).map((line, index) => (
                <p key={`${line.author}-${index}`} className="mt-1 text-[var(--dawn-text)]">{line.author}: {line.text}</p>
              ))}
            </div>
            {pending > 0 && (
              <button
                type="button"
                className="dw-btn mx-3 mb-3 shrink-0 justify-start"
                onClick={() => {
                  const waiting = dawn.approvals.find((item) => item.status === 'pending');
                  const match = AGENTS.find((item) => item.id === waiting?.agentId);
                  if (match) openAgent(match);
                }}
              >
                {pending} waiting for you
              </button>
            )}
          </div>
        )}
        {section === 'characters' && <CharacterMaker onOpenVillage={() => openSection('village')} />}
        {section === 'library' && <LibraryPanel query="" onTalk={openAgent} />}
        {agent && (
          <div className="absolute inset-0 z-30 flex min-h-0 flex-col bg-[var(--dawn-bg)]">
            <AgentSheet key={agent.id} agent={agent} onClose={closeAgent} />
          </div>
        )}
      </div>

      {section === 'quests' && !agent && (
        <div className="relative shrink-0 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {composing ? (
            <form onSubmit={addQuest} className="mb-2 flex gap-2">
              <label className="sr-only" htmlFor="quest-title">Goal</label>
              <input id="quest-title" value={draft} autoFocus onChange={(event) => setDraft(event.target.value)} placeholder="A book, a site, a habit" className="dawn-field flex-1" />
              <button type="submit" className="dw-btn dw-btn--primary">Add</button>
            </form>
          ) : (
            <button type="button" onClick={() => { setChatOpen(false); setComposing(true); }} className="dw-btn dw-btn--primary absolute -top-12 right-4">
              <Plus aria-hidden />
              New quest
            </button>
          )}
          {offline && <OfflineCard line="Offline preview. Open live Dawn to chat with the guide." />}
          {!offline && (
            <Composer
              value={message}
              onChange={setMessage}
              onSubmit={ask}
              label="Ask the guide"
              placeholder="Ask the guide"
              picker={picker}
              busy={chat.busy}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AgentPortrait({ agent, size }: { agent: Agent; size: number }) {
  const { roster } = useDawn();
  const look = roster.looks[agent.id];
  return (
    <img
      src={look?.portrait || agent.src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={look?.portrait ? 'rounded-full object-cover' : '[image-rendering:pixelated]'}
    />
  );
}
