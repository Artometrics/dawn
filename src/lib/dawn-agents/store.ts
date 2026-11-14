import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  AgentRecord,
  LedgerEntry,
  MemoryRecord,
  MessageRecord,
  RoutineRecord,
  SettingsRecord,
  ThreadRecord,
  TrainingRow,
} from './types';
import { DEFAULT_TRAINING_PROVIDERS } from './types';
import { normalizeTrainingProviders } from './training';
import type { EngagementEvent } from './engage';
import type { DataExample } from './data-studio';
import type { ArticleRecord, SendRecord, SubscriberRecord } from './publish';
import type { PublishedShow } from '../shows/types';

export type StoreData = {
  agents: AgentRecord[];
  threads: ThreadRecord[];
  messages: MessageRecord[];
  memories: MemoryRecord[];
  routines: RoutineRecord[];
  ledger: LedgerEntry[];
  training: TrainingRow[];
  events: EngagementEvent[];
  examples: DataExample[];
  articles: ArticleRecord[];
  subscribers: SubscriberRecord[];
  sends: SendRecord[];
  shows: PublishedShow[];
  listens: Record<string, number>;
  settings: SettingsRecord;
};

export function emptyStore(spendCapUsd = 20): StoreData {
  return {
    agents: [],
    threads: [],
    messages: [],
    memories: [],
    routines: [],
    ledger: [],
    training: [],
    events: [],
    examples: [],
    articles: [],
    subscribers: [],
    sends: [],
    shows: [],
    listens: {},
    settings: {
      spendCapUsd,
      trainingEnabled: true,
      trainingProviders: { ...DEFAULT_TRAINING_PROVIDERS },
      embeddingsEnabled: false,
    },
  };
}

function normalize(raw: Partial<StoreData> | null, spendCapUsd: number): StoreData {
  const base = emptyStore(spendCapUsd);
  if (!raw || typeof raw !== 'object') return base;
  return {
    agents: Array.isArray(raw.agents) ? raw.agents : [],
    threads: Array.isArray(raw.threads) ? raw.threads : [],
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    memories: Array.isArray(raw.memories) ? raw.memories : [],
    routines: Array.isArray(raw.routines) ? raw.routines : [],
    ledger: Array.isArray(raw.ledger) ? raw.ledger : [],
    training: Array.isArray(raw.training) ? raw.training : [],
    events: Array.isArray(raw.events) ? raw.events : [],
    examples: Array.isArray(raw.examples) ? raw.examples : [],
    articles: Array.isArray(raw.articles) ? raw.articles : [],
    subscribers: Array.isArray(raw.subscribers) ? raw.subscribers : [],
    sends: Array.isArray(raw.sends) ? raw.sends : [],
    shows: Array.isArray(raw.shows) ? raw.shows : [],
    listens: raw.listens && typeof raw.listens === 'object' ? raw.listens : {},
    settings: {
      spendCapUsd:
        typeof raw.settings?.spendCapUsd === 'number' && raw.settings.spendCapUsd >= 0
          ? raw.settings.spendCapUsd
          : spendCapUsd,
      trainingEnabled: raw.settings?.trainingEnabled !== false,
      trainingProviders: normalizeTrainingProviders(raw.settings?.trainingProviders),
      embeddingsEnabled: raw.settings?.embeddingsEnabled === true,
      lastCollectSlot: typeof raw.settings?.lastCollectSlot === 'string' ? raw.settings.lastCollectSlot : undefined,
    },
  };
}

export class FileStore {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;
  private readonly spendCapUsd: number;

  constructor(filePath: string, spendCapUsd = 20) {
    this.filePath = filePath;
    this.spendCapUsd = spendCapUsd;
  }

  async read(): Promise<StoreData> {
    try {
      const text = await readFile(this.filePath, 'utf8');
      return normalize(JSON.parse(text) as Partial<StoreData>, this.spendCapUsd);
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'ENOENT') return emptyStore(this.spendCapUsd);
      throw error;
    }
  }

  update(change: (data: StoreData) => void): Promise<StoreData> {
    const run = this.chain.then(async () => {
      const data = await this.read();
      change(data);
      if (data.messages.length > 5000) data.messages.splice(0, data.messages.length - 5000);
      if (data.ledger.length > 2000) data.ledger.splice(0, data.ledger.length - 2000);
      if (data.training.length > 5000) data.training.splice(0, data.training.length - 5000);
      if (data.events.length > 8000) data.events.splice(0, data.events.length - 8000);
      if (data.examples.length > 8000) data.examples.splice(0, data.examples.length - 8000);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(data), 'utf8');
      await rename(tmp, this.filePath);
      return data;
    });
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
