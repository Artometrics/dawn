import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { SEED_COLLECTIONS } from './collections';
import type { AnswerRecord, ChunkRecord, CollectionRecord, SourceRecord } from './types';

export type ResearchStore = {
  listCollections(): Promise<CollectionRecord[]>;
  saveCollections(list: CollectionRecord[]): Promise<void>;
  getSource(id: string): Promise<SourceRecord | null>;
  listSources(): Promise<SourceRecord[]>;
  putSource(source: SourceRecord): Promise<void>;
  updateSource(id: string, patch: Partial<SourceRecord>): Promise<void>;
  deleteSource(id: string): Promise<void>;
  tryClaim(id: string): Promise<boolean>;
  replaceChunks(sourceId: string, chunks: ChunkRecord[]): Promise<void>;
  listChunks(collectionId: string): Promise<ChunkRecord[]>;
  readFile(id: string): Promise<Buffer>;
  writeFile(id: string, data: Buffer): Promise<void>;
  totalBytes(): Promise<number>;
  saveAnswer(answer: AnswerRecord): Promise<void>;
};

export class MemoryStore implements ResearchStore {
  collections: CollectionRecord[] = [];
  sources = new Map<string, SourceRecord>();
  chunks: ChunkRecord[] = [];
  files = new Map<string, Buffer>();
  answers: AnswerRecord[] = [];

  async listCollections() {
    return this.collections;
  }

  async saveCollections(list: CollectionRecord[]) {
    this.collections = list;
  }

  async getSource(id: string) {
    return this.sources.get(id) ?? null;
  }

  async listSources() {
    return [...this.sources.values()];
  }

  async putSource(source: SourceRecord) {
    this.sources.set(source.id, source);
  }

  async updateSource(id: string, patch: Partial<SourceRecord>) {
    const current = this.sources.get(id);
    if (current) this.sources.set(id, { ...current, ...patch, id });
  }

  async deleteSource(id: string) {
    this.sources.delete(id);
    this.chunks = this.chunks.filter((chunk) => chunk.sourceId !== id);
    this.files.delete(id);
  }

  async tryClaim(id: string) {
    const source = this.sources.get(id);
    if (!source || source.status === 'processing') return false;
    source.status = 'processing';
    return true;
  }

  async replaceChunks(sourceId: string, chunks: ChunkRecord[]) {
    this.chunks = this.chunks.filter((chunk) => chunk.sourceId !== sourceId).concat(chunks);
  }

  async listChunks(collectionId: string) {
    if (collectionId === 'everything') return this.chunks.filter((chunk) => chunk.embedding.length > 0);
    return this.chunks.filter((chunk) => chunk.collectionId === collectionId);
  }

  async readFile(id: string) {
    const data = this.files.get(id);
    if (!data) throw new Error('That source has no file to read.');
    return data;
  }

  async writeFile(id: string, data: Buffer) {
    this.files.set(id, data);
  }

  async totalBytes() {
    let total = 0;
    for (const data of this.files.values()) total += data.byteLength;
    return total;
  }

  async saveAnswer(answer: AnswerRecord) {
    this.answers.unshift(answer);
  }
}

type FileShape = {
  collections: CollectionRecord[];
  sources: SourceRecord[];
  chunks: ChunkRecord[];
  answers: AnswerRecord[];
};

export class FileResearchStore implements ResearchStore {
  private chain: Promise<unknown> = Promise.resolve();
  private readonly filePath: string;
  private readonly blobDir: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.blobDir = path.join(path.dirname(filePath), 'research-files');
  }

  private async read(): Promise<FileShape> {
    try {
      const raw = JSON.parse(await readFile(this.filePath, 'utf8')) as Partial<FileShape>;
      return {
        collections: Array.isArray(raw.collections) && raw.collections.length ? raw.collections : SEED_COLLECTIONS.map((item) => ({ ...item })),
        sources: Array.isArray(raw.sources) ? raw.sources : [],
        chunks: Array.isArray(raw.chunks) ? raw.chunks : [],
        answers: Array.isArray(raw.answers) ? raw.answers : [],
      };
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code === 'ENOENT') return { collections: SEED_COLLECTIONS.map((item) => ({ ...item })), sources: [], chunks: [], answers: [] };
      throw error;
    }
  }

  private update(change: (data: FileShape) => void): Promise<FileShape> {
    const run = this.chain.then(async () => {
      const data = await this.read();
      change(data);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      const tmp = `${this.filePath}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(data));
      await rename(tmp, this.filePath);
      return data;
    });
    this.chain = run.then(() => undefined, () => undefined);
    return run;
  }

  async listCollections() {
    return (await this.read()).collections;
  }

  async saveCollections(list: CollectionRecord[]) {
    await this.update((data) => {
      data.collections = list;
    });
  }

  async getSource(id: string) {
    return (await this.read()).sources.find((item) => item.id === id) ?? null;
  }

  async listSources() {
    return (await this.read()).sources;
  }

  async putSource(source: SourceRecord) {
    await this.update((data) => {
      const index = data.sources.findIndex((item) => item.id === source.id);
      if (index >= 0) data.sources[index] = source;
      else data.sources.push(source);
    });
  }

  async updateSource(id: string, patch: Partial<SourceRecord>) {
    await this.update((data) => {
      const index = data.sources.findIndex((item) => item.id === id);
      if (index >= 0) data.sources[index] = { ...data.sources[index], ...patch, id };
    });
  }

  async deleteSource(id: string) {
    await this.update((data) => {
      data.sources = data.sources.filter((item) => item.id !== id);
      data.chunks = data.chunks.filter((chunk) => chunk.sourceId !== id);
    });
    await rm(path.join(this.blobDir, id), { force: true });
  }

  async tryClaim(id: string) {
    let claimed = false;
    await this.update((data) => {
      const source = data.sources.find((item) => item.id === id);
      if (!source || source.status === 'processing') return;
      source.status = 'processing';
      claimed = true;
    });
    return claimed;
  }

  async replaceChunks(sourceId: string, chunks: ChunkRecord[]) {
    await this.update((data) => {
      data.chunks = data.chunks.filter((chunk) => chunk.sourceId !== sourceId).concat(chunks);
    });
  }

  async listChunks(collectionId: string) {
    const chunks = (await this.read()).chunks;
    if (collectionId === 'everything') return chunks;
    return chunks.filter((chunk) => chunk.collectionId === collectionId);
  }

  async readFile(id: string) {
    return readFile(path.join(this.blobDir, id));
  }

  async writeFile(id: string, data: Buffer) {
    await mkdir(this.blobDir, { recursive: true });
    const target = path.join(this.blobDir, id);
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, data);
    await rename(tmp, target);
  }

  async totalBytes() {
    try {
      const names = await readdir(this.blobDir);
      let total = 0;
      for (const name of names) {
        if (name.endsWith('.tmp')) continue;
        const bytes = await readFile(path.join(this.blobDir, name));
        total += bytes.byteLength;
      }
      return total;
    } catch {
      return 0;
    }
  }

  async saveAnswer(answer: AnswerRecord) {
    await this.update((data) => {
      data.answers = [answer, ...data.answers].slice(0, 100);
    });
  }
}
