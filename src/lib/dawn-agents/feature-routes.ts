import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { generateCutPackage } from '../cuts/generate';
import { narrateCut, transcribeCut } from '../cuts/media';
import { createKitModel, type SpendHooks } from './model-reply';
import type { DailyRequestCap } from './model-choice';
import { publicError } from './provider';
import { estimateCost } from './spend';
import type { FileStore } from './store';
import type { TrainingProvider } from './types';
import { feedUrlFor } from '../shows/desk';
import { findShow, listenKey, listenResult, publishProblems, renderEmbed, renderFeed } from '../shows/public';
import type { Episode, PublishedShow, Show } from '../shows/types';
import { SEED_COLLECTIONS } from '../research/collections';
import { geminiEmbedKey } from '../research/embed';
import { detectKind, uploadAllowed } from '../research/files';
import { importableZipEntries } from '../research/import-queue';
import { askResearch, modelEmbedder, processSource } from '../research/pipeline';
import { FileResearchStore } from '../research/store';
import type { SourceKind, SourceRecord } from '../research/types';

export type FeatureCtx = {
  store: FileStore;
  dataDir: string;
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  readJson: () => Promise<Record<string, unknown>>;
  readBody: (max?: number) => Promise<string>;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
  capBlocked: () => Promise<string | null>;
  record: (entry: { provider: TrainingProvider; model: string; promptTokens: number; completionTokens: number; costUsd: number }) => Promise<void>;
  dailyCap: DailyRequestCap;
  origin: string;
};

const RESEARCH_BODY_MAX = 36_000_000;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/;

export async function routeOwnerFeature(ctx: FeatureCtx): Promise<boolean> {
  const { pathname, req } = ctx;
  if (pathname.startsWith('/api/cuts/')) return cuts(ctx);
  if (pathname.startsWith('/api/shows/')) return showsOwner(ctx);
  if (pathname.startsWith('/api/research/')) return researchOwner(ctx);
  void req;
  return false;
}

export async function routePublicFeature(ctx: FeatureCtx): Promise<boolean> {
  const rss = ctx.pathname.match(/^\/api\/public\/rss\/([^/]+)$/);
  if (rss) {
    await publicRss(ctx, decodeURIComponent(rss[1]));
    return true;
  }
  const listen = ctx.pathname.match(/^\/api\/public\/listen\/([^/]+)\/([^/]+)$/);
  if (listen) {
    await publicListen(ctx, decodeURIComponent(listen[1]), decodeURIComponent(listen[2]));
    return true;
  }
  const embed = ctx.pathname.match(/^\/api\/public\/embed\/([^/]+)\/([^/]+)$/);
  if (embed) {
    await publicEmbed(ctx, decodeURIComponent(embed[1]), decodeURIComponent(embed[2]));
    return true;
  }
  return false;
}

async function cuts(ctx: FeatureCtx): Promise<boolean> {
  if (ctx.req.method !== 'POST') {
    ctx.sendJson(ctx.res, 405, { error: 'Method not allowed' });
    return true;
  }
  const body = await ctx.readJson();
  if (ctx.pathname === '/api/cuts/generate') {
    const spend: SpendHooks = { blocked: ctx.capBlocked, record: ctx.record };
    const result = await generateCutPackage(body, { cap: ctx.dailyCap, spend });
    ctx.sendJson(ctx.res, result.status, result.body);
    return true;
  }
  if (ctx.pathname === '/api/cuts/narrate' || ctx.pathname === '/api/cuts/transcribe') {
    const spend = {
      capBlocked: ctx.capBlocked,
      record: async (costUsd: number, model: string) => {
        const tokens = Math.max(1, Math.round(costUsd * 1_000_000));
        await ctx.record({ provider: 'google', model, promptTokens: tokens, completionTokens: 0, costUsd });
      },
    };
    if (ctx.pathname === '/api/cuts/narrate') {
      const result = await narrateCut(body, { spend });
      if (result.wav) {
        ctx.res.writeHead(200, { 'content-type': 'audio/wav', 'cache-control': 'no-store' });
        ctx.res.end(Buffer.from(result.wav));
        return true;
      }
      ctx.sendJson(ctx.res, result.status, result.body);
      return true;
    }
    const result = await transcribeCut(body, { spend });
    ctx.sendJson(ctx.res, result.status, result.body);
    return true;
  }
  return false;
}

async function showsOwner(ctx: FeatureCtx): Promise<boolean> {
  if (ctx.req.method === 'POST' && ctx.pathname === '/api/shows/publish') {
    const body = await ctx.readJson();
    const show = asShow(body.show);
    const episodes = Array.isArray(body.episodes) ? body.episodes.map(asEpisode).filter((item): item is Episode => item !== null) : [];
    if (!show) return send(ctx, 400, { error: 'A show needs a title and a slug.' });
    const problems = publishProblems(show, episodes);
    if (problems.length) return send(ctx, 400, { error: problems[0], problems });
    const published: PublishedShow = { show, episodes: episodes.filter((episode) => episode.showId === show.id || episode.showId === show.slug) };
    await ctx.store.update((data) => {
      data.shows = data.shows.filter((item) => item.show.slug !== show.slug);
      data.shows.push(published);
    });
    return send(ctx, 200, { ok: true, feedUrl: feedUrlFor(ctx.origin, show.slug) });
  }
  if (ctx.req.method === 'GET' && ctx.pathname === '/api/shows/stats') {
    const data = await ctx.store.read();
    const shows = data.shows.map((item) => ({
      slug: item.show.slug,
      title: item.show.title,
      episodes: item.episodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        downloads: data.listens[listenKey(item.show.slug, episode.id)] ?? 0,
      })),
    }));
    return send(ctx, 200, { shows });
  }
  return false;
}

async function publicRss(ctx: FeatureCtx, slug: string) {
  if (ctx.req.method !== 'GET' && ctx.req.method !== 'HEAD') {
    ctx.res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    ctx.res.end('Method not allowed');
    return;
  }
  const data = await ctx.store.read();
  const found = findShow(data.shows, slug);
  if (!found) {
    ctx.res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    ctx.res.end('Show not found');
    return;
  }
  const xml = renderFeed(found.show, found.episodes, ctx.origin);
  if (ctx.req.method === 'HEAD') {
    ctx.res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' });
    ctx.res.end();
    return;
  }
  ctx.res.writeHead(200, { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' });
  ctx.res.end(xml);
}

async function publicListen(ctx: FeatureCtx, slug: string, episodeId: string) {
  if (!ID_PATTERN.test(episodeId)) {
    ctx.res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    ctx.res.end('Episode not found');
    return;
  }
  const data = await ctx.store.read();
  const found = findShow(data.shows, slug);
  const episode = found?.episodes.find((item) => item.id === episodeId) ?? null;
  const method = ctx.req.method || 'GET';
  const accept = String(ctx.req.headers.accept || '');
  const key = listenKey(slug, episodeId);
  let count = data.listens[key] ?? 0;
  const preview = listenResult(episode, method, accept.includes('application/json'), count + 1);
  if (preview.counted) {
    await ctx.store.update((draft) => {
      draft.listens[key] = (draft.listens[key] ?? 0) + 1;
      count = draft.listens[key];
    });
  }
  const result = listenResult(episode, method, accept.includes('application/json'), count);
  if (result.json) return send(ctx, result.status, result.json);
  if (result.location) {
    ctx.res.writeHead(result.status, { location: result.location, 'cache-control': 'no-store' });
    ctx.res.end();
    return;
  }
  ctx.res.writeHead(result.status, { 'content-type': 'text/plain; charset=utf-8' });
  ctx.res.end(result.error || 'Episode not found');
}

async function publicEmbed(ctx: FeatureCtx, slug: string, episodeId: string) {
  if (ctx.req.method !== 'GET') {
    ctx.res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' });
    ctx.res.end('Method not allowed');
    return;
  }
  const data = await ctx.store.read();
  const found = findShow(data.shows, slug);
  const episode = found?.episodes.find((item) => item.id === episodeId) ?? null;
  if (!found || !episode || episode.status !== 'published' || !episode.audioUrl.startsWith('https://')) {
    ctx.res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    ctx.res.end('Episode not found');
    return;
  }
  ctx.res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': "default-src 'none'; media-src https:; img-src https:; style-src 'unsafe-inline'",
  });
  ctx.res.end(renderEmbed(found.show, episode));
}

function researchStore(ctx: FeatureCtx) {
  return new FileResearchStore(path.join(ctx.dataDir, 'research.json'));
}

async function researchOwner(ctx: FeatureCtx): Promise<boolean> {
  const store = researchStore(ctx);
  if (ctx.req.method === 'GET' && ctx.pathname === '/api/research/sources') {
    const sources = await store.listSources();
    return send(ctx, 200, { sources: sources.map(publicSource), note: geminiEmbedKey() ? '' : 'Local matching, no model key.' });
  }
  if (ctx.req.method === 'POST' && ctx.pathname === '/api/research/collections') {
    const body = await ctx.readJson();
    const list = Array.isArray(body.collections) ? body.collections.flatMap((item) => { const row = asCollection(item); return row ? [row] : []; }).slice(0, 20) : [];
    await store.saveCollections(list.length ? list : SEED_COLLECTIONS.map((item) => ({ ...item })));
    return send(ctx, 200, { collections: await store.listCollections() });
  }
  if (ctx.req.method === 'GET' && ctx.pathname === '/api/research/collections') {
    return send(ctx, 200, { collections: await store.listCollections() });
  }
  if (ctx.req.method === 'POST' && ctx.pathname === '/api/research/sources') {
    try {
      const raw = await ctx.readBody(RESEARCH_BODY_MAX);
      const body = raw.trim() ? (JSON.parse(raw) as Record<string, unknown>) : {};
      const made = await acceptUpload(store, body);
      if ('error' in made) return send(ctx, made.status, { error: made.error });
      return send(ctx, 201, { sources: made.sources.map(publicSource) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      return send(ctx, message.includes('too large') ? 413 : 400, { error: publicError(error) });
    }
  }
  const remove = ctx.pathname.match(/^\/api\/research\/sources\/([^/]+)$/);
  if (remove && ctx.req.method === 'DELETE') {
    await store.deleteSource(decodeURIComponent(remove[1]));
    return send(ctx, 200, { ok: true });
  }
  const process = ctx.pathname.match(/^\/api\/research\/sources\/([^/]+)\/process$/);
  if (process && ctx.req.method === 'POST') {
    const id = decodeURIComponent(process[1]);
    const blocked = await ctx.capBlocked();
    if (blocked) return send(ctx, 429, { error: blocked });
    try {
      const key = geminiEmbedKey();
      const source = await processSource(store, id, modelEmbedder(key), {
        beforeBatch: async () => ctx.capBlocked(),
        afterBatch: async (texts) => {
          const tokens = texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0);
          const costUsd = key ? estimateCost('gemini-embedding-001', tokens, 0) : 0;
          await ctx.record({ provider: key ? 'google' : 'stand-in', model: key ? 'gemini-embedding-001' : 'hash-embed', promptTokens: tokens, completionTokens: 0, costUsd });
        },
      });
      return send(ctx, source.status === 'error' ? 429 : 200, { source: publicSource(source), error: source.error });
    } catch (error) {
      return send(ctx, 400, { error: publicError(error) });
    }
  }
  if (ctx.req.method === 'POST' && ctx.pathname === '/api/research/ask') {
    const blocked = await ctx.capBlocked();
    if (blocked) return send(ctx, 429, { error: blocked });
    const body = await ctx.readJson();
    const collectionId = String(body.collectionId || 'everything');
    const question = String(body.question || '');
    const key = geminiEmbedKey();
    const model = createKitModel({ requested: body.model, cap: ctx.dailyCap, spend: { blocked: ctx.capBlocked, record: ctx.record } });
    try {
      const answer = await askResearch(
        store,
        collectionId,
        question,
        modelEmbedder(key),
        model ? async (prompt) => model.reply('Answer from the passages.', [{ role: 'user', content: prompt }]) : null,
      );
      return send(ctx, 200, {
        answer,
        note: model ? '' : 'Local matching, no model key.',
      });
    } catch (error) {
      const message = publicError(error);
      if (message.startsWith('Spend cap reached') || message.startsWith('Daily model limit')) return send(ctx, 429, { error: message });
      return send(ctx, 400, { error: message });
    }
  }
  return false;
}

async function acceptUpload(store: FileResearchStore, body: Record<string, unknown>): Promise<{ sources: SourceRecord[] } | { status: number; error: string }> {
  const collectionId = String(body.collectionId || '').slice(0, 80);
  if (!collectionId) return { status: 400, error: 'Pick a collection.' };
  const collections = await store.listCollections();
  if (!collections.some((item) => item.id === collectionId)) return { status: 400, error: 'That collection is not on the desk.' };
  const existing = await store.listSources();
  if (existing.length >= 300) return { status: 400, error: 'The shelf holds 300 sources.' };
  const title = String(body.title || body.fileName || 'Untitled').slice(0, 180);
  const fileName = String(body.fileName || 'note.txt').slice(0, 180);
  const contentType = String(body.contentType || 'text/plain').slice(0, 80);
  let bytes: Buffer;
  if (typeof body.dataBase64 === 'string' && body.dataBase64) bytes = Buffer.from(body.dataBase64, 'base64');
  else if (typeof body.text === 'string') bytes = Buffer.from(body.text, 'utf8');
  else return { status: 400, error: 'Attach a file or paste text.' };
  const kind = detectKind(fileName, contentType);
  const total = await store.totalBytes();
  if (kind === null && (fileName.toLowerCase().endsWith('.zip') || contentType.includes('zip'))) {
    const entries = await importableZipEntries(bytes);
    if (!entries.length) return { status: 400, error: 'That zip has no readable PDF, EPUB, transcript, or web clip.' };
    const sources: SourceRecord[] = [];
    let used = total;
    for (const entry of entries) {
      if (existing.length + sources.length >= 300) break;
      const problem = uploadAllowed(entry.bytes.byteLength, used);
      if (problem) return { status: 413, error: problem };
      const source = await storeOne(store, collectionId, entry.name, entry.name, mimeFor(entry.kind), Buffer.from(entry.bytes), entry.kind);
      used += entry.bytes.byteLength;
      sources.push(source);
    }
    return { sources };
  }
  if (!kind) return { status: 400, error: 'Research reads PDF, EPUB, transcript, and web clips.' };
  const problem = uploadAllowed(bytes.byteLength, total);
  if (problem) return { status: 413, error: problem };
  return { sources: [await storeOne(store, collectionId, title, fileName, contentType, bytes, kind)] };
}

async function storeOne(store: FileResearchStore, collectionId: string, title: string, fileName: string, contentType: string, bytes: Buffer, kind: SourceKind): Promise<SourceRecord> {
  const source: SourceRecord = {
    id: randomUUID(),
    collectionId,
    title,
    kind,
    fileName,
    contentType,
    size: bytes.byteLength,
    status: 'uploaded',
    error: null,
    createdAt: new Date().toISOString(),
    pageCount: null,
    chunkCount: null,
  };
  await store.writeFile(source.id, bytes);
  await store.putSource(source);
  return source;
}

function publicSource(source: SourceRecord) {
  return {
    id: source.id,
    title: source.title,
    kind: source.kind,
    status: source.status,
    size: source.size,
    collectionId: source.collectionId,
    createdAt: source.createdAt,
    error: source.error,
    chunkCount: source.chunkCount,
    pageCount: source.pageCount,
    fileName: source.fileName,
  };
}

function mimeFor(kind: SourceKind): string {
  if (kind === 'pdf') return 'application/pdf';
  if (kind === 'epub') return 'application/epub+zip';
  if (kind === 'webclip') return 'text/html';
  return 'text/plain';
}

function send(ctx: FeatureCtx, status: number, body: unknown): boolean {
  ctx.sendJson(ctx.res, status, body);
  return true;
}

function asShow(value: unknown): Show | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<Show>;
  if (!row.title || !row.slug || !row.id) return null;
  return {
    id: String(row.id).slice(0, 80),
    title: String(row.title).slice(0, 180),
    slug: String(row.slug).toLowerCase().slice(0, 40),
    description: String(row.description || '').slice(0, 4000),
    author: String(row.author || '').slice(0, 180),
    ownerEmail: String(row.ownerEmail || '').slice(0, 180),
    language: String(row.language || 'en-us').slice(0, 16),
    category: String(row.category || 'Arts').slice(0, 80),
    explicit: Boolean(row.explicit),
    artworkUrl: String(row.artworkUrl || '').slice(0, 500),
    websiteUrl: String(row.websiteUrl || '').slice(0, 500),
    status: row.status === 'archived' ? 'archived' : 'active',
  };
}

function asEpisode(value: unknown): Episode | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<Episode>;
  if (!row.id || !row.title || !row.guid) return null;
  return {
    id: String(row.id).slice(0, 80),
    showId: String(row.showId || ''),
    title: String(row.title).slice(0, 180),
    summary: String(row.summary || '').slice(0, 4000),
    audioUrl: String(row.audioUrl || '').slice(0, 500),
    audioBytes: Math.max(0, Math.round(Number(row.audioBytes) || 0)),
    contentType: String(row.contentType || 'audio/mpeg').slice(0, 80),
    durationSeconds: Math.max(0, Math.round(Number(row.durationSeconds) || 0)),
    episodeNumber: Math.max(1, Math.round(Number(row.episodeNumber) || 1)),
    season: Math.max(1, Math.round(Number(row.season) || 1)),
    explicit: Boolean(row.explicit),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : null,
    guid: String(row.guid).slice(0, 180),
    artworkUrl: String(row.artworkUrl || '').slice(0, 500),
  };
}

function asCollection(value: unknown): { id: string; name: string; blurb: string; sort: number } | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as { id?: unknown; name?: unknown; blurb?: unknown; sort?: unknown };
  if (typeof row.id !== 'string' || typeof row.name !== 'string') return null;
  return { id: row.id.slice(0, 80), name: row.name.slice(0, 80), blurb: typeof row.blurb === 'string' ? row.blurb.slice(0, 160) : '', sort: typeof row.sort === 'number' ? row.sort : 0 };
}
