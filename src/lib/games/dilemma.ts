/**
 * Prisoner's-dilemma village from kylesmcauliffe/dawn.
 * Agents roam, meet, and score cooperate/defect. Nothing leaves the browser.
 */

export type StrategyKey =
  | 'TitForTat'
  | 'AlwaysDefect'
  | 'AlwaysCooperate'
  | 'Grudger'
  | 'Pavlov'
  | 'GenerousTitForTat'
  | 'Random';

export type Action = 'C' | 'D';
export type AgentMode = 'roaming' | 'interacting' | 'cooldown';

export const STRATEGY_ORDER: StrategyKey[] = [
  'TitForTat',
  'Grudger',
  'Pavlov',
  'AlwaysDefect',
  'AlwaysCooperate',
  'GenerousTitForTat',
  'Random',
];

export const STRATEGY_COLORS: Record<StrategyKey, string> = {
  TitForTat: '#72A8F8',
  Grudger: '#B877F4',
  Pavlov: '#F0B75E',
  AlwaysDefect: '#EF7C72',
  AlwaysCooperate: '#78D391',
  GenerousTitForTat: '#7AD5D0',
  Random: '#C8CDD7',
};

export function pickAction(
  strategy: StrategyKey,
  opponentHistory: Action[],
  selfHistory: Action[],
  random: () => number,
): Action {
  switch (strategy) {
    case 'AlwaysCooperate':
      return 'C';
    case 'AlwaysDefect':
      return 'D';
    case 'TitForTat':
      return opponentHistory.at(-1) ?? 'C';
    case 'Grudger':
      return opponentHistory.includes('D') ? 'D' : 'C';
    case 'Pavlov': {
      if (selfHistory.length === 0 || opponentHistory.length === 0) return 'C';
      const mine = selfHistory.at(-1)!;
      const theirs = opponentHistory.at(-1)!;
      const payoff = scoreRound(mine, theirs)[0];
      return payoff >= 3 ? mine : mine === 'C' ? 'D' : 'C';
    }
    case 'GenerousTitForTat': {
      const last = opponentHistory.at(-1);
      if (!last) return 'C';
      if (last === 'D' && random() < 0.15) return 'C';
      return last;
    }
    case 'Random':
      return random() < 0.5 ? 'C' : 'D';
    default:
      return 'C';
  }
}

/** Standard payoffs: 3/3, 0/5, 5/0, 1/1. */
export function scoreRound(a: Action, b: Action): [number, number] {
  if (a === 'C' && b === 'C') return [3, 3];
  if (a === 'C' && b === 'D') return [0, 5];
  if (a === 'D' && b === 'C') return [5, 0];
  return [1, 1];
}

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1400;
const ENCOUNTER_DISTANCE = 82;
const ROAM_SPEED = 72;
const INTERACTION_SECONDS = 0.42;
const BUBBLE_SECONDS = 0.72;
const COOLDOWN_SECONDS = 0.24;
const SEPARATION_DISTANCE = 54;
const PATH_MARGIN = 110;

export type AgentSnapshot = {
  id: string;
  name: StrategyKey;
  color: string;
  x: number;
  y: number;
  mode: AgentMode;
  score: number;
  lastAction: Action | null;
  lastPoints: number;
};

export type SimulationSnapshot = {
  elapsed: number;
  width: number;
  height: number;
  agents: AgentSnapshot[];
  standings: Array<{ name: StrategyKey; score: number; color: string }>;
  events: string[];
};

type AgentState = AgentSnapshot & {
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  bubbleTimer: number;
  speed: number;
  cooldown: number;
  encounterId: string | null;
  historySelf: Map<string, Action[]>;
  historyOther: Map<string, Action[]>;
};

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Headless village. `step` is deterministic for a seed. */
export class DilemmaVillage {
  private readonly random: () => number;
  private readonly agents: AgentState[];
  private readonly events: string[] = [];
  private readonly encounters = new Map<string, { id: string; agentA: string; agentB: string; timer: number }>();
  private elapsed = 0;
  private encounterId = 0;

  constructor(strategyKeys: StrategyKey[] = STRATEGY_ORDER, seed = 7) {
    this.random = mulberry32(seed);
    this.agents = strategyKeys.map((name, index) => {
      const angle = (Math.PI * 2 * index) / strategyKeys.length;
      return {
        id: `agent-${index}`,
        name,
        color: STRATEGY_COLORS[name],
        x: WORLD_WIDTH / 2 + Math.cos(angle) * 290,
        y: WORLD_HEIGHT / 2 + Math.sin(angle) * 210,
        targetX: PATH_MARGIN + this.random() * (WORLD_WIDTH - PATH_MARGIN * 2),
        targetY: PATH_MARGIN + this.random() * (WORLD_HEIGHT - PATH_MARGIN * 2),
        vx: 0,
        vy: 0,
        mode: 'roaming' as const,
        score: 0,
        lastAction: null,
        lastPoints: 0,
        bubbleTimer: 0,
        speed: ROAM_SPEED + this.random() * 20,
        cooldown: this.random() * 0.4,
        encounterId: null,
        historySelf: new Map(),
        historyOther: new Map(),
      };
    });
  }

  step(dt: number): SimulationSnapshot {
    this.elapsed += dt;
    for (const [id, encounter] of [...this.encounters.entries()]) {
      encounter.timer -= dt;
      if (encounter.timer <= 0) this.endEncounter(id);
    }
    for (const agent of this.agents) {
      agent.bubbleTimer = Math.max(0, agent.bubbleTimer - dt);
      if (agent.bubbleTimer === 0) {
        agent.lastAction = null;
        agent.lastPoints = 0;
      }
      if (agent.cooldown > 0) {
        agent.cooldown = Math.max(0, agent.cooldown - dt);
        if (agent.cooldown === 0 && agent.mode === 'cooldown') agent.mode = 'roaming';
      }
      if (agent.mode !== 'roaming') continue;
      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 24) {
        agent.targetX = PATH_MARGIN + this.random() * (WORLD_WIDTH - PATH_MARGIN * 2);
        agent.targetY = PATH_MARGIN + this.random() * (WORLD_HEIGHT - PATH_MARGIN * 2);
      }
      const repel = this.repel(agent);
      const directionX = distance > 0 ? dx / distance : 0;
      const directionY = distance > 0 ? dy / distance : 0;
      agent.vx = (directionX + repel.x * 1.35) * agent.speed;
      agent.vy = (directionY + repel.y * 1.35) * agent.speed;
      agent.x = clamp(agent.x + agent.vx * dt, PATH_MARGIN, WORLD_WIDTH - PATH_MARGIN);
      agent.y = clamp(agent.y + agent.vy * dt, PATH_MARGIN, WORLD_HEIGHT - PATH_MARGIN);
    }
    this.seek();
    return this.snapshot();
  }

  snapshot(): SimulationSnapshot {
    return {
      elapsed: this.elapsed,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      agents: this.agents.map(({ id, name, color, x, y, mode, score, lastAction, lastPoints }) => ({
        id, name, color, x, y, mode, score, lastAction, lastPoints,
      })),
      standings: [...this.agents]
        .sort((a, b) => b.score - a.score)
        .map((agent) => ({ name: agent.name, score: agent.score, color: agent.color })),
      events: this.events.slice(0, 8),
    };
  }

  private repel(agent: AgentState) {
    let x = 0;
    let y = 0;
    for (const other of this.agents) {
      if (other.id === agent.id) continue;
      const dx = agent.x - other.x;
      const dy = agent.y - other.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance > SEPARATION_DISTANCE) continue;
      const force = (SEPARATION_DISTANCE - distance) / SEPARATION_DISTANCE;
      x += (dx / distance) * force;
      y += (dy / distance) * force;
    }
    return { x, y };
  }

  private seek() {
    for (let i = 0; i < this.agents.length; i += 1) {
      const a = this.agents[i];
      if (a.mode !== 'roaming' || a.cooldown > 0) continue;
      for (let j = i + 1; j < this.agents.length; j += 1) {
        const b = this.agents[j];
        if (b.mode !== 'roaming' || b.cooldown > 0) continue;
        if (Math.hypot(a.x - b.x, a.y - b.y) <= ENCOUNTER_DISTANCE) this.start(a, b);
      }
    }
  }

  private start(a: AgentState, b: AgentState) {
    if (a.encounterId || b.encounterId) return;
    const selfA = a.historySelf.get(b.id) ?? [];
    const otherA = a.historyOther.get(b.id) ?? [];
    const selfB = b.historySelf.get(a.id) ?? [];
    const otherB = b.historyOther.get(a.id) ?? [];
    const actionA = pickAction(a.name, otherA, selfA, this.random);
    const actionB = pickAction(b.name, otherB, selfB, this.random);
    selfA.push(actionA);
    otherA.push(actionB);
    selfB.push(actionB);
    otherB.push(actionA);
    a.historySelf.set(b.id, selfA);
    a.historyOther.set(b.id, otherA);
    b.historySelf.set(a.id, selfB);
    b.historyOther.set(a.id, otherB);
    const [pointsA, pointsB] = scoreRound(actionA, actionB);
    a.score += pointsA;
    b.score += pointsB;
    a.lastAction = actionA;
    b.lastAction = actionB;
    a.lastPoints = pointsA;
    b.lastPoints = pointsB;
    a.bubbleTimer = BUBBLE_SECONDS;
    b.bubbleTimer = BUBBLE_SECONDS;
    const id = `enc-${this.encounterId++}`;
    a.encounterId = id;
    b.encounterId = id;
    a.mode = 'interacting';
    b.mode = 'interacting';
    this.encounters.set(id, { id, agentA: a.id, agentB: b.id, timer: INTERACTION_SECONDS });
    this.events.unshift(`${a.name} ${actionA} (${pointsA}) vs ${b.name} ${actionB} (${pointsB})`);
    this.events.splice(12);
  }

  private endEncounter(id: string) {
    const encounter = this.encounters.get(id);
    this.encounters.delete(id);
    if (!encounter) return;
    for (const agent of this.agents) {
      if (agent.id !== encounter.agentA && agent.id !== encounter.agentB) continue;
      agent.encounterId = null;
      agent.mode = 'cooldown';
      agent.cooldown = COOLDOWN_SECONDS;
      agent.targetX = PATH_MARGIN + this.random() * (WORLD_WIDTH - PATH_MARGIN * 2);
      agent.targetY = PATH_MARGIN + this.random() * (WORLD_HEIGHT - PATH_MARGIN * 2);
    }
  }
}
