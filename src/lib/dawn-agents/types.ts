export type ComputerKind = 'hetzner' | 'mac' | 'cloud-vm';

export type WorkerKind = 'linux' | 'mac';

export type TrainingProvider = 'google' | 'xai' | 'openrouter' | 'stand-in';

export type PixelAvatar = {
  grid: 8 | 16;
  cells: string;
};

export type AgentRecord = {
  id: string;
  name: string;
  instructions: string;
  model: string;
  computer: ComputerKind;
  avatar: PixelAvatar;
  createdAt: number;
  updatedAt: number;
};

export type ThreadKind = 'direct' | 'group' | 'job';

export type ThreadRecord = {
  id: string;
  kind: ThreadKind;
  title: string;
  agentIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type ToolState = 'running' | 'needs_confirm' | 'done' | 'denied' | 'error';

export type ToolCall = {
  id: string;
  name: string;
  input: unknown;
  state: ToolState;
  output?: unknown;
};

export type Usage = {
  model: string;
  provider: TrainingProvider;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
};

export type ChatChannel = 'chat' | 'group' | 'routine' | 'editor';

export type MessageRecord = {
  id: string;
  threadId: string;
  role: 'user' | 'assistant';
  agentId?: string;
  content: string;
  tools?: ToolCall[];
  createdAt: number;
  channel?: ChatChannel;
  usage?: Usage;
  trainingId?: string;
  feedback?: 'up' | 'down' | null;
  correction?: string | null;
};

export type MemoryRecord = {
  id: string;
  agentId: string;
  text: string;
  createdAt: number;
};

export type RoutineRecord = {
  id: string;
  agentId: string;
  name: string;
  cron: string;
  prompt: string;
  enabled: boolean;
  lastRunAt: number | null;
  nextRunAt: number;
  createdAt: number;
};

export type LedgerEntry = {
  id: string;
  at: number;
  model: string;
  provider: TrainingProvider;
  agentId?: string;
  threadId?: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  source: ChatChannel;
};

export type TrainingProviders = Record<TrainingProvider, boolean>;

export type SettingsRecord = {
  spendCapUsd: number;
  trainingEnabled: boolean;
  trainingProviders: TrainingProviders;
  /** UTC hour slot of the last Data Studio collect, `YYYY-MM-DD-HH`. */
  lastCollectSlot?: string;
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type TrainingRow = {
  id: string;
  at: number;
  provider: TrainingProvider;
  model: string;
  agentId: string;
  threadId: string;
  messageId: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  system: string;
  messages: ChatTurn[];
  response: string;
  feedback: 'up' | 'down' | null;
  correction: string | null;
  channel: ChatChannel;
};

export type WorkerStatus = {
  kind: WorkerKind;
  host: string;
  platform: string;
  seenAt: number;
  online: boolean;
};

export const TRAINING_PROVIDER_IDS: TrainingProvider[] = ['google', 'xai', 'openrouter', 'stand-in'];

export const DEFAULT_TRAINING_PROVIDERS: TrainingProviders = {
  google: true,
  xai: true,
  openrouter: true,
  'stand-in': true,
};

export function workerKindFor(computer: ComputerKind): WorkerKind | null {
  if (computer === 'hetzner') return 'linux';
  if (computer === 'mac') return 'mac';
  return null;
}

export function computerLabel(computer: ComputerKind): string {
  if (computer === 'hetzner') return 'Hetzner';
  if (computer === 'mac') return 'Mac';
  return 'Cloud VM';
}
