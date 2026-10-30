'use client';

import { useEffect, useRef, useState } from 'react';
import { AGENTS, agentById, type Agent } from '@/lib/agents';
import { buildHq } from '@/lib/hq-map';
import { askGeminiLine, completeText } from '@/lib/guide';
import type { Memory } from '@/components/dawn/dawn-provider';
import { chebyshev, rankMemories, shouldReflect, stepToward, TALK_DISTANCE } from '@/lib/town/loop';
import { blockAt, DAILY_SCHEDULE, observationText, observeNearby, planAct } from '@/lib/town/schedule';
import {
  continuePrompt,
  importancePrompt,
  leavePrompt,
  parseImportance,
  reflectionPrompt,
  startPrompt,
  summaryPrompt,
  trimSpeakerPrefix,
  type TalkLine,
} from '@/lib/town/prompts';

export type TownPose = {
  id: string;
  gx: number;
  gy: number;
  caption: string;
};

type SimAgent = {
  id: Agent['id'];
  gx: number;
  gy: number;
  activity: string;
  intent: 'work' | 'walk' | 'talk';
  blockKey: string;
  lastTalk: number;
};

type Talk = {
  a: Agent['id'];
  b: Agent['id'];
  lines: TalkLine[];
  phase: 'start' | 'continue' | 'leave' | 'memory';
};

const STEP_MS = 900;

const starts: Record<Agent['id'], { gx: number; gy: number }> = {
  trinity: { gx: 4, gy: 3 },
  kali: { gx: 3, gy: 7 },
  nimbus: { gx: 12, gy: 7 },
};

export function useTown(
  memories: Memory[],
  remember: (agentId: Agent['id'], text: string, extra?: { importance?: number; kind?: Memory['kind'] }) => void,
) {
  const [poses, setPoses] = useState<TownPose[]>(initialPoses());
  const [lines, setLines] = useState<TalkLine[]>([]);
  const [source, setSource] = useState<'gemini' | 'practice'>('practice');
  const [status, setStatus] = useState('Walking over.');
  const [notice, setNotice] = useState<string | null>(null);
  const memoriesRef = useRef(memories);
  const rememberRef = useRef(remember);
  memoriesRef.current = memories;
  rememberRef.current = remember;

  useEffect(() => {
    const grid = buildHq();
    const agents = new Map<Agent['id'], SimAgent>(
      AGENTS.map((agent) => [agent.id, {
        id: agent.id,
        ...starts[agent.id],
        activity: '',
        intent: 'work' as const,
        blockKey: '',
        lastTalk: 0,
      }]),
    );
    let talk: Talk | null = null;
    let stopped = false;
    let timer = 0;
    const gate = { error: null as string | null };

    const publish = () => {
      setPoses(AGENTS.map((agent) => {
        const sim = agents.get(agent.id)!;
        const speaking = talk?.lines.at(-1);
        const caption = speaking && speaking.author === agent.name
          ? clip(speaking.text, 42)
          : sim.activity || agent.name;
        return { id: agent.id, gx: sim.gx, gy: sim.gy, caption };
      }));
      setLines(talk ? [...talk.lines] : []);
    };

    const tick = async () => {
      if (stopped) return;
      if (!talk) {
        const notes = act(agents, grid, new Date().getHours());
        for (const note of notes) {
          rememberRef.current(note.id, note.text, { importance: 2, kind: 'observation' });
        }
        const pair = adjacentPair([...agents.values()]);
        if (pair) {
          talk = { a: pair[0].id, b: pair[1].id, lines: [], phase: 'start' };
          setStatus(`${agentById(pair[0].id)?.name} walks up to ${agentById(pair[1].id)?.name}.`);
        } else {
          const focused = [...agents.values()].find((sim) => sim.intent !== 'work') ?? [...agents.values()][0];
          const who = agentById(focused.id);
          setStatus(`${who?.name ?? 'Someone'} is ${focused.activity}.`);
        }
        publish();
      } else {
        await speak(talk, agents, memoriesRef.current, rememberRef.current, setSource, setStatus, setNotice, gate);
        if (talk.phase === 'memory' && talk.lines.length > 0) {
          const done = talk;
          talk = null;
          agents.get(done.a)!.lastTalk = Date.now();
          agents.get(done.b)!.lastTalk = Date.now();
        }
        publish();
      }
      if (!stopped) timer = window.setTimeout(() => void tick(), talk ? 1600 : STEP_MS);
    };

    timer = window.setTimeout(() => void tick(), 600);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  return { poses, lines, source, status, notice };
}

function initialPoses(): TownPose[] {
  return AGENTS.map((agent) => ({
    id: agent.id,
    gx: starts[agent.id].gx,
    gy: starts[agent.id].gy,
    caption: agent.name,
  }));
}

/** Observe the hour and neighbors, remember a new block, then work, walk, or get ready to talk. */
function act(agents: Map<Agent['id'], SimAgent>, grid: number[][], hour: number): { id: Agent['id']; text: string }[] {
  const now = Date.now();
  const notes: { id: Agent['id']; text: string }[] = [];
  for (const sim of agents.values()) {
    const block = blockAt(DAILY_SCHEDULE[sim.id], hour);
    const others = [...agents.values()].filter((other) => other.id !== sim.id);
    const here = { x: sim.gx, y: sim.gy };
    others.sort((left, right) => chebyshev(here, { x: left.gx, y: left.gy }) - chebyshev(here, { x: right.gx, y: right.gy }));
    const nearest = others[0];
    const distance = nearest ? chebyshev(here, { x: nearest.gx, y: nearest.gy }) : undefined;
    const cooling = now < sim.lastTalk + 8000;
    const decision = planAct({
      intent: cooling ? 'work' : block.intent,
      activity: block.activity,
      nearestId: nearest?.id,
      distance,
      talkDistance: TALK_DISTANCE,
    });
    sim.activity = decision.activity;
    sim.intent = decision.kind;
    const key = `${block.startHour}-${block.activity}`;
    if (sim.blockKey !== key) {
      sim.blockKey = key;
      const agent = agentById(sim.id);
      const nearby = observeNearby(
        { id: sim.id, ...here },
        others.map((other) => ({
          id: other.id,
          name: agentById(other.id)?.name ?? other.id,
          x: other.gx,
          y: other.gy,
        })),
      );
      if (agent) notes.push({ id: sim.id, text: observationText(agent.name, block.activity, nearby) });
    }
    if (decision.kind !== 'walk' || !nearest) continue;
    const blocked = others.map((other) => ({ x: other.gx, y: other.gy }));
    const next = stepToward(grid, here, { x: nearest.gx, y: nearest.gy }, blocked);
    sim.gx = next.x;
    sim.gy = next.y;
  }
  return notes;
}

function adjacentPair(agents: SimAgent[]): [SimAgent, SimAgent] | null {
  const now = Date.now();
  const ready = agents.filter((agent) => now >= agent.lastTalk + 8000 && agent.intent === 'talk');
  for (let i = 0; i < ready.length; i += 1) {
    for (let j = i + 1; j < ready.length; j += 1) {
      if (chebyshev({ x: ready[i].gx, y: ready[i].gy }, { x: ready[j].gx, y: ready[j].gy }) <= TALK_DISTANCE) {
        return [ready[i], ready[j]];
      }
    }
  }
  return null;
}

async function speak(
  talk: Talk,
  agents: Map<Agent['id'], SimAgent>,
  memories: Memory[],
  remember: (agentId: Agent['id'], text: string, extra?: { importance?: number; kind?: Memory['kind'] }) => void,
  setSource: (source: 'gemini' | 'practice') => void,
  setStatus: (status: string) => void,
  setNotice: (notice: string | null) => void,
  gate: { error: string | null },
) {
  const speakerId = talk.lines.length % 2 === 0 ? talk.a : talk.b;
  const otherId = speakerId === talk.a ? talk.b : talk.a;
  const speaker = agentById(speakerId);
  const other = agentById(otherId);
  if (!speaker || !other) return;
  const related = rankMemories(
    memories.filter((memory) => memory.agentId === speaker.id),
    other.name,
    3,
  ).map((memory) => memory.text);

  let prompt = startPrompt(speaker, other, related);
  if (talk.phase === 'continue') prompt = continuePrompt(speaker, other, talk.lines, related);
  if (talk.phase === 'leave') prompt = leavePrompt(speaker, other, talk.lines);

  const spoken = await say(prompt, speaker, other, talk.phase, gate);
  setSource(spoken.source);
  if (spoken.error) setNotice(spoken.error);
  talk.lines.push({ author: speaker.name, text: spoken.text });
  setStatus(spoken.error ? `${speaker.name} answered with a stand-in.` : `${speaker.name} is talking.`);

  if (talk.phase === 'start') talk.phase = 'continue';
  else if (talk.lines.length >= 3) talk.phase = 'leave';
  if (talk.phase === 'leave' && talk.lines.length >= 4) {
    const summary = await say(summaryPrompt(speaker, other, talk.lines), speaker, other, 'memory', gate);
    const description = `Conversation with ${other.name} at ${new Date().toLocaleString()}: ${summary.text}`;
    const importance = gate.error ? 5 : await rate(description);
    remember(speaker.id, description, { importance, kind: 'conversation' });
    const mine = memories.filter((memory) => memory.agentId === speaker.id);
    const since = mine.reduce((sum, memory) => sum + (memory.importance ?? 5), 0) + importance;
    if (shouldReflect(since)) {
      const insight = gate.error
        ? `${speaker.name} noticed the talks keep coming back to one plan.`
        : await reflect(speaker, [...mine.map((memory) => memory.text), description]);
      if (insight) remember(speaker.id, insight, { importance: 6, kind: 'reflection' });
    }
    agents.get(speaker.id)!.activity = '';
    talk.phase = 'memory';
    setStatus(`${speaker.name} remembers the talk.`);
  }
}

async function say(
  prompt: string,
  speaker: Agent,
  other: Agent,
  phase: Talk['phase'] | 'memory',
  gate: { error: string | null },
): Promise<{ text: string; source: 'gemini' | 'practice'; error: string | null }> {
  if (gate.error) {
    return { text: practiceLine(speaker, other, phase), source: 'practice', error: gate.error };
  }
  const result = await askGeminiLine(prompt);
  if (result.text?.trim()) {
    return { text: clip(trimSpeakerPrefix(result.text, speaker.name, other.name), 200), source: 'gemini', error: null };
  }
  if (result.error) gate.error = result.error;
  return { text: practiceLine(speaker, other, phase), source: 'practice', error: result.error };
}

async function rate(description: string): Promise<number> {
  try {
    const raw = await completeText(importancePrompt(description));
    if (raw) return parseImportance(raw);
  } catch {
    // Fall through.
  }
  return 5;
}

async function reflect(speaker: Agent, statements: string[]): Promise<string | null> {
  try {
    const raw = await completeText(reflectionPrompt(speaker.name, statements.slice(-6)));
    if (!raw) return `${speaker.name} noticed the talks keep coming back to one plan.`;
    const parsed = JSON.parse(raw.slice(raw.indexOf('['), raw.lastIndexOf(']') + 1)) as { insight?: string }[];
    return parsed[0]?.insight?.slice(0, 400) ?? null;
  } catch {
    return `${speaker.name} noticed the talks keep coming back to one plan.`;
  }
}

function practiceLine(speaker: Agent, other: Agent, phase: Talk['phase'] | 'memory'): string {
  if (phase === 'start') return `${other.name}, I wanted to check the plan. ${speaker.plan}`;
  if (phase === 'leave') return 'I should get back to work. We can pick this up later.';
  if (phase === 'memory') return `I talked with ${other.name}. I liked that it stayed short.`;
  return `That helps, ${other.name}. I'll keep it in mind.`;
}

function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
