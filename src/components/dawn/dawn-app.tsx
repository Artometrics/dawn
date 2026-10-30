'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Castle, Flag, Map, MapPin, MessageCircle, Users } from 'lucide-react';
import { AGENTS, type Agent } from '@/lib/agents';
import { AgentSheet } from '@/components/dawn/agent-sheet';
import { DawnProvider, useDawn } from '@/components/dawn/dawn-provider';
import { GroupChat } from '@/components/dawn/group-chat';
import { QuestsPanel } from '@/components/dawn/quests-panel';
import { TeamCard } from '@/components/dawn/team-card';
import { useTown } from '@/components/dawn/use-town';

const VillageGame = dynamic(() => import('@/components/dawn/village-game').then((mod) => mod.VillageGame), { ssr: false });
const AtlasMap = dynamic(() => import('@/components/dawn/atlas-map').then((mod) => mod.AtlasMap), { ssr: false });

type Tab = 'village' | 'map' | 'chat' | 'quests' | 'team';

const TABS: { id: Tab; label: string; icon: typeof Castle }[] = [
  { id: 'village', label: 'Village', icon: Castle },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'quests', label: 'Quests', icon: Flag },
  { id: 'team', label: 'Team', icon: Users },
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
  const [tab, setTab] = useState<Tab>('village');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [localName, setLocalName] = useState('');
  const pending = dawn.approvals.filter((item) => item.status === 'pending').length;

  return (
    <div className="flex h-dvh flex-col bg-[#1c1410] text-[#f3e6d0]">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-[#5a4636] px-3 pt-[env(safe-area-inset-top)]">
        <p className="font-pixel text-[10px] tracking-wide">DAWN</p>
        <div className="ml-auto">
          {dawn.user ? (
            <button type="button" className="min-h-11 px-2 text-sm" onClick={() => void dawn.signOut()}>{dawn.name}</button>
          ) : dawn.mode === 'emulator' ? (
            <form className="flex gap-1" onSubmit={(event) => { event.preventDefault(); void dawn.signInLocal(localName); }}>
              <label className="sr-only" htmlFor="join-name">Your name</label>
              <input
                id="join-name"
                value={localName}
                onChange={(event) => setLocalName(event.target.value)}
                placeholder="Your name"
                className="min-h-11 w-28 border border-[#5a4636] bg-[#241910] px-2 text-base sm:w-40"
              />
              <button type="submit" className="min-h-11 border border-[#e2a04a] px-2 text-sm">Join</button>
            </form>
          ) : dawn.mode === 'hosted' ? (
            <button type="button" className="min-h-11 border border-[#e2a04a] px-3 text-sm" onClick={() => void dawn.signInGoogle()}>
              Sign in
            </button>
          ) : (
            <span className="text-xs text-[#d9cbb8]">On this phone</span>
          )}
        </div>
      </header>
      {dawn.authError && <p className="px-3 py-1 text-xs text-[#e2a04a]">{dawn.authError}</p>}
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === 'village' && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className={`relative min-h-0 ${agent ? 'h-32 shrink-0' : 'min-h-[200px] flex-1'}`}>
              <VillageGame
                avatar={dawn.avatar}
                poses={town.poses}
                onAgent={(id) => setAgent(AGENTS.find((item) => item.id === id) ?? null)}
                onYou={() => setTab('team')}
              />
            </div>
            <div className="flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
              {AGENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAgent(item)}
                  className="flex min-h-11 min-w-[7.5rem] items-center gap-2 border border-[#5a4636] px-2 text-sm"
                >
                  <img src={item.src} alt="" width={28} height={28} className="h-7 w-7 [image-rendering:pixelated]" />
                  {item.name}
                </button>
              ))}
            </div>
            {town.notice && (
              <p role="alert" className="mx-3 mb-2 shrink-0 border border-[#e2a04a] bg-[#3a2414] px-3 py-2 text-sm leading-snug text-[#f3e6d0]">
                {town.notice} These village lines are stand-ins.
              </p>
            )}
            {!agent && (
              <div className="shrink-0 px-3 pb-2 text-sm text-[#d9cbb8]">
                <p>{town.status}{town.lines.length > 0 ? ` · ${town.source === 'gemini' ? 'Gemini' : 'Stand-in'}` : ''}</p>
                {town.lines.slice(-2).map((line, index) => (
                  <p key={`${line.author}-${index}`} className="mt-1 text-[#f3e6d0]">{line.author}: {line.text}</p>
                ))}
              </div>
            )}
            {pending > 0 && !agent && (
              <p className="shrink-0 px-3 pb-2 text-xs text-[#e2a04a]">{pending} waiting for you</p>
            )}
            {agent && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <AgentSheet agent={agent} onClose={() => setAgent(null)} />
              </div>
            )}
          </div>
        )}
        {tab === 'map' && (
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <a href="/atlas" className="mb-2 inline-flex min-h-11 items-center gap-2 self-start text-sm text-[#e2a04a]">
              <MapPin className="h-4 w-4" aria-hidden />
              Campus
            </a>
            <AtlasMap avatar={dawn.avatar} />
          </div>
        )}
        {tab === 'chat' && (
          <div className="min-h-0 flex-1 p-3">
            <GroupChat />
          </div>
        )}
        {tab === 'quests' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <QuestsPanel />
          </div>
        )}
        {tab === 'team' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <TeamCard />
          </div>
        )}
      </main>
      <nav className="grid shrink-0 grid-cols-5 border-t border-[#5a4636] pb-[env(safe-area-inset-bottom)]">
        {TABS.map((item) => {
          const Icon = item.icon;
          const on = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => { setTab(item.id); if (item.id !== 'village') setAgent(null); }}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] ${on ? 'text-[#e2a04a]' : 'text-[#d9cbb8]'}`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
              {item.id === 'village' && pending > 0 ? ` ${pending}` : ''}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
