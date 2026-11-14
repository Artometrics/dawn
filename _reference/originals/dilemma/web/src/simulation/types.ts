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

export interface AgentSnapshot {
  id: string;
  name: StrategyKey;
  color: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  mode: AgentMode;
  facing: 'up' | 'down' | 'left' | 'right';
  score: number;
  lastAction: Action | null;
  lastPoints: number;
  bubbleTimer: number;
}

export interface EventEntry {
  id: string;
  text: string;
  timestamp: number;
}

export interface EncounterSnapshot {
  id: string;
  agentA: string;
  agentB: string;
  actionA: Action;
  actionB: Action;
  timer: number;
}

export interface SimulationSnapshot {
  elapsed: number;
  agents: AgentSnapshot[];
  standings: Array<{ name: StrategyKey; score: number; color: string }>;
  events: EventEntry[];
  activeEncounters: EncounterSnapshot[];
}
