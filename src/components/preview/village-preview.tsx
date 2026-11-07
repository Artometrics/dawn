'use client';

import { useState } from 'react';
import './preview.css';
import { Castle, Flag, Map as MapIcon, MessageCircle, Users } from 'lucide-react';
import { AGENTS } from '@/lib/agents';
import { VillageGame } from '@/components/dawn/village-game';
import type { VillagePose } from '@/components/dawn/village-scene';

const POSES: VillagePose[] = [
  { id: 'trinity', gx: 4, gy: 3, caption: 'Sample line' },
  { id: 'kali', gx: 6, gy: 7, caption: 'Sample line' },
  { id: 'nimbus', gx: 11, gy: 4, caption: 'Sample line' },
];

const TABS = [
  { id: 'village', label: 'Village', icon: Castle },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'quests', label: 'Quests', icon: Flag },
  { id: 'team', label: 'Team', icon: Users },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function VillagePreview() {
  const [tab, setTab] = useState<TabId>('village');
  const [note, setNote] = useState('Sample line. Agents are off.');

  return (
    <div className="pv-village" data-preview-village="">
      <header className="pv-village-bar">
        <p className="pv-word">Dawn</p>
        <button type="button" className="pv-village-sign" disabled>
          Sign in
        </button>
      </header>
      <div className="pv-village-scene">
        {tab === 'village' && (
          <VillageGame
            avatar={0}
            poses={POSES}
            onAgent={(id) => {
              const agent = AGENTS.find((item) => item.id === id);
              setNote(agent ? `${agent.name} is a sprite. Agents are off.` : 'Agents are off.');
            }}
            onYou={() => setNote('That is the player sprite. Agents are off.')}
          />
        )}
        {tab === 'map' && (
          <div className="pv-village-panel">
            <img src="/sprites/town/atlas-scout.png" alt="" width={64} height={64} />
            <h1>Map</h1>
            <p>Stand-in spot. Not your location. Atlas still says the Cardinal note is coming soon.</p>
          </div>
        )}
        {tab === 'chat' && (
          <div className="pv-village-panel">
            <h1>Chat</h1>
            <p>Sample line. Nothing is sent, and no model is called.</p>
          </div>
        )}
        {tab === 'quests' && (
          <div className="pv-village-panel">
            <h1>Quests</h1>
            <p>The live quest is still three generic checks. The bench is the sample for one goal at a time.</p>
            <a className="pv-pill" href="/preview/bench">Open the bench</a>
          </div>
        )}
        {tab === 'team' && (
          <ul className="pv-village-cast">
            {AGENTS.map((agent) => (
              <li key={agent.id}>
                <img src={agent.src} alt="" width={64} height={64} />
                <strong>{agent.name}</strong>
                <span>{agent.title}. Sprite only.</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="pv-village-strip" aria-label="Team">
        <div className="pv-village-strip-row">
          {AGENTS.map((agent) => (
            <button key={agent.id} type="button" onClick={() => setNote(`${agent.name} is a sprite. Agents are off.`)}>
              <img src={agent.src} alt="" width={32} height={32} />
              {agent.name}
            </button>
          ))}
        </div>
      </div>
      <p className="pv-village-note" role="status">{note}</p>
      <nav className="pv-village-nav" aria-label="Village">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? 'page' : undefined}
              onClick={() => setTab(item.id)}
            >
              <Icon aria-hidden />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
