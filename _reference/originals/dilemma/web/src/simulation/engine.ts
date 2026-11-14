import { pickAction, scoreRound, STRATEGY_COLORS, STRATEGY_ORDER } from './strategies';
import type {
  Action,
  AgentMode,
  AgentSnapshot,
  EncounterSnapshot,
  EventEntry,
  SimulationSnapshot,
  StrategyKey,
} from './types';

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1400;
const VIEWPORT_WIDTH = 980;
const VIEWPORT_HEIGHT = 720;
const ENCOUNTER_DISTANCE = 82;
const ROAM_SPEED = 72;
const INTERACTION_SECONDS = 0.42;
const BUBBLE_SECONDS = 0.72;
const COOLDOWN_SECONDS = 0.24;
const SEPARATION_DISTANCE = 54;
const PATH_MARGIN = 110;

type AgentState = AgentSnapshot & {
  speed: number;
  cooldown: number;
  encounterId: string | null;
  historySelf: Map<string, Action[]>;
  historyOther: Map<string, Action[]>;
};

type EncounterState = EncounterSnapshot & {
  pointsA: number;
  pointsB: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeTarget(random: () => number) {
  return {
    x: PATH_MARGIN + random() * (WORLD_WIDTH - PATH_MARGIN * 2),
    y: PATH_MARGIN + random() * (WORLD_HEIGHT - PATH_MARGIN * 2),
  };
}

function facingFromVelocity(vx: number, vy: number): AgentSnapshot['facing'] {
  if (Math.abs(vx) > Math.abs(vy)) {
    return vx >= 0 ? 'right' : 'left';
  }
  return vy >= 0 ? 'down' : 'up';
}

export class BrowserSimulation {
  private readonly random: () => number;
  private readonly agents: AgentState[];
  private readonly events: EventEntry[] = [];
  private readonly encounters = new Map<string, EncounterState>();
  private elapsed = 0;
  private eventId = 0;
  private encounterId = 0;

  constructor(strategyKeys: StrategyKey[] = STRATEGY_ORDER, seed = 7) {
    this.random = mulberry32(seed);
    this.agents = strategyKeys.map((name, index) => {
      const angle = (Math.PI * 2 * index) / strategyKeys.length;
      const centerX = WORLD_WIDTH / 2 + Math.cos(angle) * 290;
      const centerY = WORLD_HEIGHT / 2 + Math.sin(angle) * 210;
      const target = makeTarget(this.random);
      return {
        id: `agent-${index}`,
        name,
        color: STRATEGY_COLORS[name],
        x: centerX,
        y: centerY,
        targetX: target.x,
        targetY: target.y,
        vx: 0,
        vy: 0,
        mode: 'roaming' as AgentMode,
        facing: 'down' as const,
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

  getWorldSize() {
    return { width: WORLD_WIDTH, height: WORLD_HEIGHT, viewportWidth: VIEWPORT_WIDTH, viewportHeight: VIEWPORT_HEIGHT };
  }

  step(dt: number) {
    const scaledDt = dt;
    this.elapsed += scaledDt;
    this.updateEncounters(scaledDt);
    this.updateAgents(scaledDt);
    this.seekEncounters();
    return this.snapshot();
  }

  snapshot(): SimulationSnapshot {
    return {
      elapsed: this.elapsed,
      agents: this.agents.map(({ speed, cooldown, encounterId, historySelf, historyOther, ...agent }) => agent),
      standings: [...this.agents]
        .sort((a, b) => b.score - a.score)
        .map((agent) => ({ name: agent.name, score: agent.score, color: agent.color })),
      events: this.events,
      activeEncounters: [...this.encounters.values()].map(({ pointsA, pointsB, ...encounter }) => encounter),
    };
  }

  private updateEncounters(dt: number) {
    for (const [id, encounter] of [...this.encounters.entries()]) {
      encounter.timer -= dt;
      const agentA = this.agentById(encounter.agentA);
      const agentB = this.agentById(encounter.agentB);
      if (!agentA || !agentB) continue;

      if (encounter.timer <= 0) {
        this.endEncounter(id, agentA, agentB);
      }
    }
  }

  private updateAgents(dt: number) {
    for (const agent of this.agents) {
      agent.bubbleTimer = Math.max(0, agent.bubbleTimer - dt);
      if (agent.bubbleTimer === 0) {
        agent.lastAction = null;
        agent.lastPoints = 0;
      }

      if (agent.cooldown > 0) {
        agent.cooldown = Math.max(0, agent.cooldown - dt);
        if (agent.cooldown === 0 && agent.mode === 'cooldown') {
          agent.mode = 'roaming';
        }
      }

      if (agent.mode !== 'roaming') {
        agent.vx *= 0.8;
        agent.vy *= 0.8;
        continue;
      }

      const dx = agent.targetX - agent.x;
      const dy = agent.targetY - agent.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 24) {
        const target = makeTarget(this.random);
        agent.targetX = target.x;
        agent.targetY = target.y;
      }

      const directionX = distance > 0 ? dx / Math.max(distance, 1) : 0;
      const directionY = distance > 0 ? dy / Math.max(distance, 1) : 0;
      const repel = this.computeRepel(agent);
      agent.vx = (directionX + repel.x * 1.35) * agent.speed;
      agent.vy = (directionY + repel.y * 1.35) * agent.speed;

      agent.x = clamp(agent.x + agent.vx * dt, PATH_MARGIN, WORLD_WIDTH - PATH_MARGIN);
      agent.y = clamp(agent.y + agent.vy * dt, PATH_MARGIN, WORLD_HEIGHT - PATH_MARGIN);
      agent.facing = facingFromVelocity(agent.vx, agent.vy);
    }
  }

  private computeRepel(agent: AgentState) {
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

  private seekEncounters() {
    for (let index = 0; index < this.agents.length; index += 1) {
      const agentA = this.agents[index];
      if (agentA.mode !== 'roaming' || agentA.cooldown > 0) continue;
      for (let offset = index + 1; offset < this.agents.length; offset += 1) {
        const agentB = this.agents[offset];
        if (agentB.mode !== 'roaming' || agentB.cooldown > 0) continue;
        const distance = Math.hypot(agentA.x - agentB.x, agentA.y - agentB.y);
        if (distance > ENCOUNTER_DISTANCE) continue;
        this.startEncounter(agentA, agentB);
      }
    }
  }

  private startEncounter(agentA: AgentState, agentB: AgentState) {
    if (agentA.encounterId || agentB.encounterId) return;
    const selfHistoryA = agentA.historySelf.get(agentB.id) ?? [];
    const otherHistoryA = agentA.historyOther.get(agentB.id) ?? [];
    const selfHistoryB = agentB.historySelf.get(agentA.id) ?? [];
    const otherHistoryB = agentB.historyOther.get(agentA.id) ?? [];

    const actionA = pickAction(agentA.name, otherHistoryA, selfHistoryA, this.random);
    const actionB = pickAction(agentB.name, otherHistoryB, selfHistoryB, this.random);
    selfHistoryA.push(actionA);
    otherHistoryA.push(actionB);
    selfHistoryB.push(actionB);
    otherHistoryB.push(actionA);
    agentA.historySelf.set(agentB.id, selfHistoryA);
    agentA.historyOther.set(agentB.id, otherHistoryA);
    agentB.historySelf.set(agentA.id, selfHistoryB);
    agentB.historyOther.set(agentA.id, otherHistoryB);

    const [pointsA, pointsB] = scoreRound(actionA, actionB);
    agentA.score += pointsA;
    agentB.score += pointsB;
    agentA.lastAction = actionA;
    agentB.lastAction = actionB;
    agentA.lastPoints = pointsA;
    agentB.lastPoints = pointsB;
    agentA.bubbleTimer = BUBBLE_SECONDS;
    agentB.bubbleTimer = BUBBLE_SECONDS;

    const id = `enc-${this.encounterId++}`;
    agentA.encounterId = id;
    agentB.encounterId = id;
    agentA.mode = 'interacting';
    agentB.mode = 'interacting';
    agentA.vx = 0;
    agentA.vy = 0;
    agentB.vx = 0;
    agentB.vy = 0;
    agentA.facing = agentA.x < agentB.x ? 'right' : 'left';
    agentB.facing = agentB.x < agentA.x ? 'right' : 'left';

    this.encounters.set(id, {
      id,
      agentA: agentA.id,
      agentB: agentB.id,
      actionA,
      actionB,
      timer: INTERACTION_SECONDS,
      pointsA,
      pointsB,
    });

    const text = `${agentA.name} ${actionA} (${pointsA}) vs ${agentB.name} ${actionB} (${pointsB})`;
    this.events.unshift({ id: `evt-${this.eventId++}`, text, timestamp: this.elapsed });
    this.events.splice(12);
  }

  private endEncounter(id: string, agentA: AgentState, agentB: AgentState) {
    this.encounters.delete(id);
    agentA.encounterId = null;
    agentB.encounterId = null;
    agentA.mode = 'cooldown';
    agentB.mode = 'cooldown';
    agentA.cooldown = COOLDOWN_SECONDS;
    agentB.cooldown = COOLDOWN_SECONDS;
    const targetA = makeTarget(this.random);
    const targetB = makeTarget(this.random);
    agentA.targetX = targetA.x;
    agentA.targetY = targetA.y;
    agentB.targetX = targetB.x;
    agentB.targetY = targetB.y;
  }

  private agentById(id: string) {
    return this.agents.find((agent) => agent.id === id);
  }
}
