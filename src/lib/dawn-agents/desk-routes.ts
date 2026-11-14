import type { IncomingMessage, ServerResponse } from 'node:http';
import { embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { fetchArticleText, ArticleError } from './article-text';
import { embeddingsOn } from './embeddings';
import type { Generate } from './model-reply';
import { createKitModel } from './model-reply';
import type { DailyRequestCap } from './model-choice';
import { publicError } from './provider';
import { estimateEmbedCost } from './spend';
import type { FileStore } from './store';
import { DRAFT_WARNING, draftPackage } from '../cuts/draft';
import { PACKAGE_PROMPT, PackageError, parsePackage } from '../cuts/parse-package';
import { inspectUrl } from '../cuts/policy';
import { detectKind } from '../research/files';
import { importableZipEntries } from '../research/import-queue';
import { CapStop, askVault, processSource } from '../research/pipeline';
import type { EmbedTask } from '../research/embed';
import { EMBED_MODEL } from '../research/embed';
import { FILE_MAX, FileVault } from '../research/vault';
import type { SourceKind, SourceRecord } from '../research/types';
import { embedResult, findPublished, listenResult, rssResult } from '../shows/public';
import { SLUG_RE, type Episode, type PublishedShow, type Show } from '../shows/types';

const RESEARCH_BODY_MAX = 36_000_000;

export type DeskRouteDeps = {
  store: FileStore;
  researchPath: string;
  dailyCap: DailyRequestCap;
  capBlocked: () => Promise<string | null>;
  newId: (prefix: string) => string;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
  readBody: (req: IncomingMessage, max?: number) => Promise<string>;
  fetchImpl?: typeof fetch;
  generate?: Generate;
  researchEmbed?: (texts: string[], task: EmbedTask) => Promise<number[][]>;
  env?: Record<string, string | undefined>;
  publicOrigin: (req: IncomingMessage) => string;
};

export async function routeOwnerDesk(req: IncomingMessage, res: ServerResponse, pathname: string, deps: DeskRouteDeps): Promise<boolean> {
  if (req.method === 'POST' && pathname === '/api/cuts/generate') {
    await cutsGenerate(req, res, deps);
    return true;
  }
  if (req.method === 'POST' && pathname === '/api/shows/publish') {
    await publishShow(req, res, deps);
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/shows/stats') {
    const data = await deps.store.read();
    deps.sendJson(res, 200, { listens: data.listens });
    return true;
  }
  if (pathname === '/api/research/sources' && req.method === 'GET') {
    await listResearch(res, deps);
    return true;
  }
  if (pathname === '/api/research/sources' && req.method === 'POST') {
    await uploadResearch(req, res, deps);
    return true;
  }
  const process = pathname.match(/^\/api\/research\/sources\/([^/]+)\/process$/);
  if (process && req.method === 'POST') {
    await processResearch(process[1], res, deps);
    return true;
  }
  const remove = pathname.match(/^\/api\/research\/sources\/([^/]+)$/);
  if (remove && req.method === 'DELETE') {
    const vault = new FileVault(deps.researchPath);
    await vault.deleteSource(decodeURIComponent(remove[1]));
    deps.sendJson(res, 200, { ok: true });
    return true;
  }
  if (pathname === '/api/research/ask' && req.method === 'POST') {
    await askResearch(req, res, deps);
    return true;
  }
  return false;
}

export async function routePublicShow(req: IncomingMessage, res: ServerResponse, pathname: string, deps: DeskRouteDeps): Promise<boolean> {
  const rss = pathname.match(/^\/api\/public\/rss\/([^/]+)$/);
  if (rss && (req.method === 'GET' || req.method === 'HEAD')) {
    const data = await deps.store.read();
    const row = findPublished(data.shows, decodeURIComponent(rss[1]));
    const result = rssResult(row, deps.publicOrigin(req));
    if ('json' in result) {
      deps.sendJson(res, result.status, result.json);
      return true;
    }
    res.writeHead(req.method === 'HEAD' ? result.status : result.status, result.headers);
    res.end(req.method === 'HEAD' ? undefined : result.body);
    return true;
  }
  const listen = pathname.match(/^\/api\/public\/listen\/([^/]+)\/([^/]+)$/);
  if (listen && (req.method === 'GET' || req.method === 'HEAD')) {
    const slug = decodeURIComponent(listen[1]);
    const episodeId = decodeURIComponent(listen[2]);
    const data = await deps.store.read();
    const row = findPublished(data.shows, slug);
    const accept = String(req.headers.accept || '');
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const wantsJson = accept.includes('application/json') || url.searchParams.get('format') === 'json';
    const outcome = listenResult(row, episodeId, req.method || 'GET', wantsJson, data.listens);
    if (outcome.listens !== data.listens) {
      await deps.store.update((draft) => {
        draft.listens = outcome.listens;
      });
    }
    const result = outcome.result;
    if ('json' in result) {
      deps.sendJson(res, result.status, result.json);
      return true;
    }
    res.writeHead(result.status, result.headers);
    res.end(req.method === 'HEAD' ? undefined : result.body);
    return true;
  }
  const embed = pathname.match(/^\/api\/public\/embed\/([^/]+)\/([^/]+)$/);
  if (embed && req.method === 'GET') {
    const data = await deps.store.read();
    const row = findPublished(data.shows, decodeURIComponent(embed[1]));
    const result = embedResult(row, decodeURIComponent(embed[2]));
    if ('json' in result) {
      deps.sendJson(res, result.status, result.json);
      return true;
    }
    res.writeHead(result.status, result.headers);
    res.end(result.body);
    return true;
  }
  return false;
}

async function cutsGenerate(req: IncomingMessage, res: ServerResponse, deps: DeskRouteDeps) {
  const body = await readJson(req, deps, 400_000);
  const topic = String(body.topic || '').trim();
  const sourceUrl = String(body.sourceUrl || '').trim();
  let sourceText = String(body.sourceText || '').slice(0, 20_000);
  if (sourceUrl) {
    const inspected = inspectUrl(sourceUrl);
    if (!inspected.ok) return deps.sendJson(res, 400, { error: inspected.error });
    if (inspected.url) {
      try {
        const article = await fetchArticleText(inspected.url, deps.fetchImpl);
        sourceText = article.text;
      } catch (error) {
        if (error instanceof ArticleError) return deps.sendJson(res, error.status, { error: error.message });
        return deps.sendJson(res, 502, { error: 'That article could not be read.' });
      }
    }
  }
  if (!topic && !sourceText) return deps.sendJson(res, 400, { error: 'Add a topic or an article.' });
  const env = deps.env ?? process.env;
  const model = createKitModel({
    requested: body.model,
    cap: deps.dailyCap,
    env,
    generate: deps.generate,
    spend: {
      blocked: deps.capBlocked,
      record: async (entry) => {
        await deps.store.update((data) => {
          data.ledger.push({ id: deps.newId('led'), at: Date.now(), ...entry, source: 'cuts' });
        });
      },
    },
  });
  if (!model) {
    return deps.sendJson(res, 200, { package: draftPackage(topic, sourceText), provider: 'draft', model: 'local-draft', warning: DRAFT_WARNING });
  }
  try {
    const text = await model.reply(PACKAGE_PROMPT, [{ role: 'user', content: `Topic: ${topic || '(none)'}\nSource article:\n${sourceText || '(none)'}` }]);
    const pack = parsePackage(text);
    return deps.sendJson(res, 200, { package: pack, provider: model.choice.provider, model: model.choice.model, warning: '' });
  } catch (error) {
    const message = publicError(error);
    if (message.startsWith('Spend cap reached') || error instanceof Error && error.message.startsWith('Spend cap reached')) {
      const blocked = error instanceof Error ? error.message : message;
      return deps.sendJson(res, 402, { error: blocked });
    }
    if (error instanceof PackageError) return deps.sendJson(res, 502, { error: error.message });
    return deps.sendJson(res, 502, { error: message });
  }
}

async function publishShow(req: IncomingMessage, res: ServerResponse, deps: DeskRouteDeps) {
  const body = await readJson(req, deps, 400_000);
  const show = asShow(body.show);
  if (!show) return deps.sendJson(res, 400, { error: 'That show is missing a title or a slug.' });
  if (!SLUG_RE.test(show.slug)) return deps.sendJson(res, 400, { error: 'Use a short slug: lowercase letters, numbers, and hyphens.' });
  const episodes = asEpisodes(body.episodes, show.id).filter((episode) => episode.status === 'published' && episode.publishedAt && episode.audioUrl.startsWith('https://'));
  const published: PublishedShow = { show, episodes };
  await deps.store.update((data) => {
    data.shows = data.shows.filter((row) => row.show.slug !== show.slug).concat(published);
  });
  deps.sendJson(res, 200, { ok: true, slug: show.slug, episodes: episodes.length });
}

async function listResearch(res: ServerResponse, deps: DeskRouteDeps) {
  const vault = new FileVault(deps.researchPath);
  const data = await deps.store.read();
  const env = deps.env ?? process.env;
  deps.sendJson(res, 200, {
    sources: await vault.listSources(),
    embeddingsEnabled: embeddingsOn(env, data.settings),
    hasModelKey: Boolean(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || env.OPENROUTER_API_KEY || env.XAI_API_KEY),
  });
}

async function uploadResearch(req: IncomingMessage, res: ServerResponse, deps: DeskRouteDeps) {
  let body: Record<string, unknown>;
  try {
    body = await readJson(req, deps, RESEARCH_BODY_MAX);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request is too large.';
    return deps.sendJson(res, 413, { error: message });
  }
  const fileName = String(body.fileName || 'notes.txt');
  const contentType = String(body.contentType || 'text/plain');
  const collectionId = String(body.collectionId || 'dawn').slice(0, 40);
  const title = String(body.title || fileName).slice(0, 180);
  const encoded = String(body.dataBase64 || '');
  let bytes: Buffer;
  try {
    bytes = Buffer.from(encoded, 'base64');
  } catch {
    return deps.sendJson(res, 400, { error: 'That file could not be read.' });
  }
  if (!bytes.byteLength) return deps.sendJson(res, 400, { error: 'That file is empty.' });
  if (bytes.byteLength > FILE_MAX) return deps.sendJson(res, 413, { error: 'That file is over 25 MB.' });
  const vault = new FileVault(deps.researchPath);
  if (fileName.toLowerCase().endsWith('.zip') || contentType.includes('zip')) {
    const entries = await importableZipEntries(bytes);
    const made: SourceRecord[] = [];
    for (const entry of entries) {
      if (entry.bytes.byteLength > FILE_MAX) return deps.sendJson(res, 413, { error: `${entry.name} is over 25 MB.` });
      const source = sourceRow(deps.newId('src'), entry.name, entry.kind, entry.bytes.byteLength, collectionId, title);
      const saved = await vault.addSource(source, entry.bytes);
      if (!saved.ok) return deps.sendJson(res, 413, { error: saved.error });
      made.push(source);
    }
    return deps.sendJson(res, 200, { sources: made });
  }
  const kind = detectKind(fileName, contentType);
  if (!kind) return deps.sendJson(res, 400, { error: 'Use a PDF, EPUB, transcript, or web clip.' });
  const source = sourceRow(deps.newId('src'), fileName, kind, bytes.byteLength, collectionId, title);
  const saved = await vault.addSource(source, bytes);
  if (!saved.ok) return deps.sendJson(res, 413, { error: saved.error });
  deps.sendJson(res, 200, { source });
}

async function processResearch(id: string, res: ServerResponse, deps: DeskRouteDeps) {
  const vault = new FileVault(deps.researchPath);
  const data = await deps.store.read();
  const env = deps.env ?? process.env;
  const enabled = embeddingsOn(env, data.settings);
  const cap = await deps.capBlocked();
  if (cap) {
    await vault.updateSource(decodeURIComponent(id), { status: 'error', error: cap });
    return deps.sendJson(res, 402, { error: cap });
  }
  const gemini = Boolean(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);
  const embedModel = enabled ? deps.researchEmbed ?? (gemini ? googleEmbed : undefined) : undefined;
  try {
    const source = await processSource(vault, decodeURIComponent(id), {
      embeddingsEnabled: enabled && Boolean(embedModel),
      embedModel,
      canSpend: () => true,
      capMessage: cap || 'Spend cap reached.',
      recordBatch: async (texts) => {
        await deps.store.update((draft) => {
          draft.ledger.push({
            id: deps.newId('led'),
            at: Date.now(),
            model: EMBED_MODEL,
            provider: 'google',
            promptTokens: texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0),
            completionTokens: 0,
            costUsd: estimateEmbedCost(texts),
            source: 'research',
          });
        });
      },
    });
    if (source.status === 'error' && cap && source.error === cap) return deps.sendJson(res, 402, { error: cap });
    deps.sendJson(res, 200, { source });
  } catch (error) {
    if (error instanceof CapStop) return deps.sendJson(res, 402, { error: error.message });
    deps.sendJson(res, 400, { error: error instanceof Error ? error.message : 'Could not read that file.' });
  }
}

async function askResearch(req: IncomingMessage, res: ServerResponse, deps: DeskRouteDeps) {
  const body = await readJson(req, deps, 400_000);
  const question = String(body.question || '');
  const collectionId = String(body.collectionId || 'everything');
  const names = Array.isArray(body.names)
    ? body.names.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as { id?: unknown; name?: unknown };
        if (typeof row.id !== 'string' || typeof row.name !== 'string') return [];
        return [{ id: row.id, name: row.name }];
      })
    : [];
  const data = await deps.store.read();
  const env = deps.env ?? process.env;
  const enabled = embeddingsOn(env, data.settings);
  const cap = await deps.capBlocked();
  if (cap) return deps.sendJson(res, 402, { error: cap });
  const gemini = Boolean(env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = createKitModel({
    requested: body.model,
    cap: deps.dailyCap,
    env,
    generate: deps.generate,
    spend: {
      blocked: deps.capBlocked,
      record: async (entry) => {
        await deps.store.update((draft) => {
          draft.ledger.push({ id: deps.newId('led'), at: Date.now(), ...entry, source: 'research' });
        });
      },
    },
  });
  try {
    const answer = await askVault(new FileVault(deps.researchPath), collectionId, question, {
      embeddingsEnabled: enabled && Boolean(deps.researchEmbed || gemini),
      embedModel: enabled ? deps.researchEmbed ?? (gemini ? googleEmbed : undefined) : undefined,
      canSpend: () => true,
      capMessage: cap || 'Spend cap reached.',
      recordBatch: async (texts) => {
        if (!enabled) return;
        await deps.store.update((draft) => {
          draft.ledger.push({
            id: deps.newId('led'),
            at: Date.now(),
            model: EMBED_MODEL,
            provider: 'google',
            promptTokens: texts.reduce((sum, text) => sum + Math.ceil(text.length / 4), 0),
            completionTokens: 0,
            costUsd: estimateEmbedCost(texts),
            source: 'research',
          });
        });
      },
      names,
      writeAnswer: model
        ? async (prompt) => model.reply('Answer only from the passages. Cite them with [1] style markers.', [{ role: 'user', content: prompt }])
        : undefined,
    });
    const note = answer.mode === 'local' ? (enabled ? '' : 'Model embeddings are off. Matching stays on this machine.') : '';
    deps.sendJson(res, 200, { answer, note: model ? note : note || 'Local matching, no model key.' });
  } catch (error) {
    if (error instanceof CapStop) return deps.sendJson(res, 402, { error: error.message });
    const message = publicError(error);
    if (message.startsWith('Spend cap reached')) return deps.sendJson(res, 402, { error: message });
    deps.sendJson(res, 400, { error: message });
  }
}

async function googleEmbed(texts: string[], task: EmbedTask): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) return texts.map(() => []);
  const google = createGoogleGenerativeAI({ apiKey: key });
  const { embeddings } = await embedMany({
    model: google.embedding(EMBED_MODEL),
    values: texts.map((text) => text.slice(0, 8000)),
    dimensions: 768,
    providerOptions: { google: { taskType: task, outputDimensionality: 768 } },
  });
  return embeddings;
}

function sourceRow(id: string, fileName: string, kind: SourceKind, size: number, collectionId: string, title: string): SourceRecord {
  return {
    id,
    collectionId,
    title: title || fileName,
    kind,
    fileName,
    contentType: kind === 'pdf' ? 'application/pdf' : kind === 'epub' ? 'application/epub+zip' : 'text/plain',
    status: 'uploaded',
    error: null,
    createdAt: new Date().toISOString(),
    pageCount: null,
    chunkCount: null,
    size,
  };
}

function asShow(value: unknown): Show | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<Show>;
  if (typeof row.title !== 'string' || typeof row.slug !== 'string') return null;
  return {
    id: String(row.id || row.slug),
    title: row.title,
    slug: row.slug,
    description: String(row.description || ''),
    author: String(row.author || ''),
    ownerEmail: String(row.ownerEmail || ''),
    language: String(row.language || 'en-us'),
    category: String(row.category || 'Arts'),
    explicit: Boolean(row.explicit),
    artworkUrl: String(row.artworkUrl || ''),
    websiteUrl: String(row.websiteUrl || ''),
    status: String(row.status || 'active'),
  };
}

function asEpisodes(value: unknown, showId: string): Episode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Partial<Episode>;
    if (typeof row.id !== 'string' || typeof row.title !== 'string') return [];
    const audio = String(row.audioUrl || '');
    return [{
      id: row.id,
      showId,
      title: row.title,
      summary: String(row.summary || ''),
      audioUrl: audio.startsWith('https://') ? audio : '',
      audioBytes: Math.max(0, Math.floor(Number(row.audioBytes) || 0)),
      contentType: String(row.contentType || 'audio/mpeg'),
      durationSeconds: Math.max(0, Math.floor(Number(row.durationSeconds) || 0)),
      episodeNumber: Math.max(0, Math.floor(Number(row.episodeNumber) || 0)),
      season: Math.max(1, Math.floor(Number(row.season) || 1)),
      explicit: Boolean(row.explicit),
      status: row.status === 'published' ? 'published' : 'draft',
      publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : null,
      guid: String(row.guid || ''),
      artworkUrl: String(row.artworkUrl || ''),
    } satisfies Episode];
  });
}

async function readJson(req: IncomingMessage, deps: DeskRouteDeps, max: number): Promise<Record<string, unknown>> {
  const raw = await deps.readBody(req, max);
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}
