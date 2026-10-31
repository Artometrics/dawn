'use client';

import { useState } from 'react';
import { Code2, MessageCircle } from 'lucide-react';
import { AGENTS, type Agent } from '@/lib/agents';
import { GroupChat } from '@/components/dawn/group-chat';
import { TeamCard } from '@/components/dawn/team-card';

function hit(query: string, ...parts: string[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return parts.some((part) => part.toLowerCase().includes(needle));
}

export function LibraryPanel({
  query,
  onTalk,
}: {
  query: string;
  onTalk: (agent: Agent) => void;
}) {
  const [roomOpen, setRoomOpen] = useState(false);
  const agents = AGENTS.filter((agent) => hit(query, agent.name, agent.title, agent.blurb));
  const showRoom = hit(query, 'room', 'chat', 'village room');
  const showStudio = hit(query, 'studio', 'code');
  const showYou = hit(query, 'you', 'team', 'name', 'share');
  const empty = agents.length === 0 && !showRoom && !showStudio && !showYou;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 pt-3 pb-28">
      {empty && <p className="text-[15px] text-[var(--dawn-secondary)]">Nothing in the library matches that.</p>}

      {agents.length > 0 && (
        <section>
          <h2 className="text-[13px] text-[var(--dawn-muted)]">Agents</h2>
          <ul className="mt-2 flex flex-col gap-3">
            {agents.map((agent) => (
              <li key={agent.id} className="flex items-center gap-3">
                <img
                  src={agent.src}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-xl bg-[var(--dawn-chip)] object-cover [image-rendering:pixelated]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] leading-5">{agent.name}</p>
                  <p className="truncate text-[13px] leading-5 text-[var(--dawn-muted)]">{agent.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onTalk(agent)}
                  className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium"
                >
                  Talk
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showRoom && (
        <section className="mt-8">
          <h2 className="text-[13px] text-[var(--dawn-muted)]">Room</h2>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--dawn-chip)]">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] leading-5">Village room</p>
              <p className="truncate text-[13px] leading-5 text-[var(--dawn-muted)]">Say something the room can hear.</p>
            </div>
            <button
              type="button"
              onClick={() => setRoomOpen((open) => !open)}
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium"
              aria-expanded={roomOpen}
            >
              {roomOpen ? 'Close' : 'Open'}
            </button>
          </div>
          {roomOpen && (
            <div className="mt-3 h-[min(28rem,60dvh)] min-h-64">
              <GroupChat />
            </div>
          )}
        </section>
      )}

      {showStudio && (
        <section className="mt-8">
          <h2 className="text-[13px] text-[var(--dawn-muted)]">Workspace</h2>
          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--dawn-chip)]">
              <Code2 className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] leading-5">Studio</p>
              <p className="truncate text-[13px] leading-5 text-[var(--dawn-muted)]">The older code workspace.</p>
            </div>
            <a
              href="/studio"
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--dawn-chip)] px-4 text-[14px] font-medium"
            >
              Open
            </a>
          </div>
        </section>
      )}

      {showYou && (
        <section className="mt-8">
          <h2 className="text-[13px] text-[var(--dawn-muted)]">You</h2>
          <div className="mt-3">
            <TeamCard />
          </div>
        </section>
      )}
    </div>
  );
}
