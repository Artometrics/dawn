import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ChunkRecord, SourceRecord } from './types';

export const FILE_MAX = 25 * 1024 * 1024;
export const TOTAL_MAX = 500 * 1024 * 1024;

export type VaultData = {
  sources: SourceRecord[];
  chunks: ChunkRecord[];
  files: Record<string, string>;
  bytes: number;
};

export function emptyVault(): VaultData {
  return { sources: [], chunks: [], files: {}, bytes: 0 };
}

export interface ResearchVault {
  getSource(id: string): Promise<SourceRecord | null>;
  listSources(): Promise<SourceRecord[]>;
  addSource(source: SourceRecord, bytes: Uint8Array): Promise<{ ok: true } | { ok: false; error: string }>;
  updateSource(id: string, patch: Partial<SourceRecord>): Promise<void>;
  deleteSource(id: string): Promise<void>;
  replaceChunks(sourceId: string, chunks: ChunkRecord[]): Promise<void>;
  listChunks(collectionId: string): Promise<ChunkRecord[]>;
  readFile(id: string): Promise<Uint8Array>;
}

function decode(data: VaultData, id: string): Uint8Array {
  const raw = data.files[id];
  if (!raw) return new Uint8Array();
  return Uint8Array.from(Buffer.from(raw, 'base64'));
}

export class MemoryVault implements ResearchVault {
  data: VaultData = emptyVault();

  async getSource(id: string) {
    return this.data.sources.find((source) => source.id === id) ?? null;
  }

  async listSources() {
    return this.data.sources;
  }

  async addSource(source: SourceRecord, bytes: Uint8Array): Promise<{ ok: true } | { ok: false; error: string }> {
    if (bytes.byteLength > FILE_MAX) return { ok: false, error: 'That file is over 25 MB.' };
    if (this.data.bytes + bytes.byteLength > TOTAL_MAX) return { ok: false, error: 'The research shelf is over 500 MB.' };
    this.data.sources.push(source);
    this.data.files[source.id] = Buffer.from(bytes).toString('base64');
    this.data.bytes += bytes.byteLength;
    return { ok: true };
  }

  async updateSource(id: string, patch: Partial<SourceRecord>) {
    const row = this.data.sources.find((source) => source.id === id);
    if (row) Object.assign(row, patch);
  }

  async deleteSource(id: string) {
    const row = this.data.sources.find((source) => source.id === id);
    this.data.sources = this.data.sources.filter((source) => source.id !== id);
    this.data.chunks = this.data.chunks.filter((chunk) => chunk.sourceId !== id);
    if (row && this.data.files[id]) {
      this.data.bytes = Math.max(0, this.data.bytes - row.size);
      delete this.data.files[id];
    }
  }

  async replaceChunks(sourceId: string, chunks: ChunkRecord[]) {
    this.data.chunks = this.data.chunks.filter((chunk) => chunk.sourceId !== sourceId).concat(chunks);
  }

  async listChunks(collectionId: string) {
    if (collectionId === 'everything') return this.data.chunks;
    return this.data.chunks.filter((chunk) => chunk.collectionId === collectionId);
  }

  async readFile(id: string) {
    return decode(this.data, id);
  }
}

export class FileVault implements ResearchVault {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async read(): Promise<VaultData> {
    try {
      const text = await readFile(this.filePath, 'utf8');
      const raw = JSON.parse(text) as Partial<VaultData>;
      return {
        sources: Array.isArray(raw.sources) ? raw.sources : [],
        chunks: Array.isArray(raw.chunks) ? raw.chunks : [],
        files: raw.files && typeof raw.files === 'object' ? raw.files : {},
        bytes: typeof raw.bytes === 'number' ? raw.bytes : 0,
      };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'ENOENT') return emptyVault();
      throw error;
    }
  }

  private update<T>(change: (data: VaultData) => T | Promise<T>): Promise<T> {
    const run = this.chain.then(async () => {
      const data = await this.read();
      const result = await change(data);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(data));
      await rename(tmp, this.filePath);
      return result;
    });
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  getSource(id: string) {
    return this.update((data) => data.sources.find((source) => source.id === id) ?? null);
  }

  listSources() {
    return this.update((data) => data.sources.slice());
  }

  addSource(source: SourceRecord, bytes: Uint8Array) {
    return this.update((data) => {
      if (bytes.byteLength > FILE_MAX) return { ok: false as const, error: 'That file is over 25 MB.' };
      if (data.bytes + bytes.byteLength > TOTAL_MAX) return { ok: false as const, error: 'The research shelf is over 500 MB.' };
      data.sources.push(source);
      data.files[source.id] = Buffer.from(bytes).toString('base64');
      data.bytes += bytes.byteLength;
      return { ok: true as const };
    });
  }

  updateSource(id: string, patch: Partial<SourceRecord>) {
    return this.update((data) => {
      const row = data.sources.find((source) => source.id === id);
      if (row) Object.assign(row, patch);
    });
  }

  deleteSource(id: string) {
    return this.update((data) => {
      const row = data.sources.find((source) => source.id === id);
      data.sources = data.sources.filter((source) => source.id !== id);
      data.chunks = data.chunks.filter((chunk) => chunk.sourceId !== id);
      if (row && data.files[id]) {
        data.bytes = Math.max(0, data.bytes - row.size);
        delete data.files[id];
      }
    });
  }

  replaceChunks(sourceId: string, chunks: ChunkRecord[]) {
    return this.update((data) => {
      data.chunks = data.chunks.filter((chunk) => chunk.sourceId !== sourceId).concat(chunks);
    });
  }

  listChunks(collectionId: string) {
    return this.update((data) => (collectionId === 'everything' ? data.chunks.slice() : data.chunks.filter((chunk) => chunk.collectionId === collectionId)));
  }

  readFile(id: string) {
    return this.update((data) => decode(data, id));
  }
}
