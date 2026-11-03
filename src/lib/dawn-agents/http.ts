import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { passwordsMatch, signSession, tokensMatch, verifySession } from './auth';
import { ComputerRouter, type ComputerResult } from './computer';
import {
  chartStoryExample,
  collectDesk,
  collectSlot,
  countsByTrack,
  factExample,
  parseBackfill,
  preferenceExample,
  reviewExample,
  syntheticRoom,
  toDpoJsonl,
  toSftJsonl,
  type DataExample,
} from './data-studio';
import { eventAllowed, tastePairs, validReaderId, type EngagementEvent } from './engage';
import { newId } from './ids';
import { nextCron } from './cron';
import { emailProviderFromEnv, markdownToHtml, parseSubscriberCsv, renderLetterHtml, rewriteLinks, slugify, subscribersToCsv, type OutboxMail } from './publish';
import { canSpend, formatUsd, monthKey, spentThisMonth } from './spend';
import { FileStore } from './store';
import { keyStatus } from './provider';
import { recipeAttributes, recipeById, recipeSnippet, RECIPES } from './recipes';
import { scrubPii } from './pii';
import { secretValuesFromEnv } from './scrub';
import { exportableCount } from './training';
import { resumeTool, runAgentTurn, type TurnContext } from './turn';
import type { AgentRecord, ChatChannel, ComputerKind, MessageRecord, PixelAvatar } from './types';
import { TRAINING_PROVIDER_IDS } from './types';
import { validAvatar } from './avatar';
import { WorkerHub } from './worker-hub';
import type { WorkerKind } from './types';

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const MODELS = ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'x-ai/grok-4.7'];
const COMPUTERS: ComputerKind[] = ['hetzner', 'mac', 'cloud-vm'];

export type ServerOptions = {
  storePath: string;
  ownerEmail: string;
  ownerPassword: string;
  sessionSecret: string;
  workerToken: string;
  editorToken: string;
  spendCapUsd?: number;
  forceStandIn?: boolean;
  host?: string;
  port?: number;
  schedule?: boolean;
  fetchImpl?: typeof fetch;
};

export type RunningServer = {
  url: string;
  port: number;
  outbox: OutboxMail[];
  close: () => Promise<void>;
};

export function startAgentsServer(options: ServerOptions): Promise<RunningServer> {
  const store = new FileStore(options.storePath, options.spendCapUsd ?? 20);
  const hub = new WorkerHub();
  const computers = new ComputerRouter(hub);
  const outbox: OutboxMail[] = [];
  const fetchImpl = options.fetchImpl ?? fetch;
  const email = emailProviderFromEnv(fetchImpl, outbox);
  const ctx: TurnContext = {
    store,
    computers,
    fetchImpl,
    forceStandIn: options.forceStandIn,
    secrets: secretValuesFromEnv(),
  };
  const ownerEmail = options.ownerEmail.trim().toLowerCase();

  const server = createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed';
      sendJson(res, 500, { error: message.slice(0, 200) });
    }
  });

  let timer: ReturnType<typeof setInterval> | undefined;
  if (options.schedule !== false) {
    timer = setInterval(() => {
      void tick(store, ctx);
    }, 20_000);
    timer.unref?.();
  }

  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 0;

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const bound = typeof address === 'object' && address ? address.port : port;
      resolve({
        url: `http://${host}:${bound}`,
        port: bound,
        outbox,
        close: () =>
          new Promise((done) => {
            if (timer) clearInterval(timer);
            hub.close();
            server.close(() => done());
          }),
      });
    });
  });

  async function route(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = url.pathname.replace(/\/$/, '') || '/';
    if (req.method === 'OPTIONS') {
      cors(res);
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && pathname === '/api/health') {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (pathname.startsWith('/api/public/')) {
      await publicRoute(req, res, pathname, url);
      return;
    }
    if (pathname.startsWith('/api/worker/')) {
      await workerRoute(req, res, pathname);
      return;
    }
    if (pathname.startsWith('/api/v1/')) {
      if (!options.editorToken || !tokensMatch(bearer(req), options.editorToken)) {
        sendJson(res, 401, { error: 'Editor token required.' });
        return;
      }
      await editorRoute(req, res, pathname);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/auth/login') {
      const body = await readJson(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!passwordsMatch(email, ownerEmail) || !passwordsMatch(password, options.ownerPassword)) {
        sendJson(res, 401, { error: 'Email or password is wrong.' });
        return;
      }
      sendJson(res, 200, { token: signSession(options.sessionSecret, email), email });
      return;
    }
    if (!ownerOk(req)) {
      sendJson(res, 401, { error: 'Sign in first.' });
      return;
    }
    await ownerRoute(req, res, pathname);
  }

  function ownerOk(req: IncomingMessage): boolean {
    const session = verifySession(options.sessionSecret, bearer(req));
    return Boolean(session && session.email.toLowerCase() === ownerEmail);
  }

  async function ownerRoute(req: IncomingMessage, res: ServerResponse, pathname: string) {
    if (req.method === 'GET' && pathname === '/api/state') {
      sendJson(res, 200, await snapshot());
      return;
    }
    if (req.method === 'POST' && pathname === '/api/agents') {
      const body = await readJson(req);
      const created = await createAgent(body);
      if ('error' in created) return sendJson(res, 400, created);
      return sendJson(res, 201, created);
    }
    const agentPatch = pathname.match(/^\/api\/agents\/([^/]+)$/);
    if (agentPatch && req.method === 'PATCH') return sendJson(res, 200, await patchAgent(agentPatch[1], await readJson(req)));
    if (agentPatch && req.method === 'DELETE') {
      await deleteAgent(agentPatch[1]);
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/memories') {
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      if (!text || text.length > 400) return sendJson(res, 400, { error: 'Memory must be 1 to 400 characters.' });
      const memory = { id: newId('mem'), agentId: String(body.agentId), text, createdAt: Date.now() };
      await store.update((data) => {
        data.memories.push(memory);
      });
      return sendJson(res, 201, memory);
    }
    const memoryDelete = pathname.match(/^\/api\/memories\/([^/]+)$/);
    if (memoryDelete && req.method === 'DELETE') {
      await store.update((data) => {
        data.memories = data.memories.filter((memory) => memory.id !== memoryDelete[1]);
      });
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'POST' && pathname === '/api/threads') {
      const body = await readJson(req);
      const thread = await createThread(body);
      if ('error' in thread) return sendJson(res, 400, thread);
      return sendJson(res, 201, thread);
    }
    const messagePost = pathname.match(/^\/api\/threads\/([^/]+)\/messages$/);
    if (messagePost && req.method === 'POST') {
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      if (!text) return sendJson(res, 400, { error: 'Write a message first.' });
      const blocked = await capBlocked();
      if (blocked) return sendJson(res, 402, { error: blocked });
      const sse = startSse(res);
      await talk(messagePost[1], text, 'chat', sse, typeof body.recipeId === 'string' ? body.recipeId : undefined);
      res.end();
      return;
    }
    const abPost = pathname.match(/^\/api\/threads\/([^/]+)\/ab$/);
    if (abPost && req.method === 'POST') {
      const body = await readJson(req);
      const text = String(body.text || '').trim();
      if (!text) return sendJson(res, 400, { error: 'Write a prompt first.' });
      const blocked = await capBlocked();
      if (blocked) return sendJson(res, 402, { error: blocked });
      const sse = startSse(res);
      await talk(abPost[1], text, 'chat', sse);
      await talk(abPost[1], `Give a clearly different answer to the same request:\n${text}`, 'chat', sse);
      sse('ab', { prompt: text });
      res.end();
      return;
    }
    if (req.method === 'POST' && pathname === '/api/preferences') {
      const body = await readJson(req);
      const data = await store.read();
      const chosen = data.messages.find((message) => message.id === body.chosenMessageId);
      const rejected = data.messages.find((message) => message.id === body.rejectedMessageId);
      if (!chosen || !rejected) return sendJson(res, 404, { error: 'Those replies are gone.' });
      const example = preferenceExample({
        id: newId('ex'),
        now: Date.now(),
        prompt: String(body.prompt || 'Which reply is better?'),
        chosen: chosen.content,
        rejected: rejected.content,
        reason: typeof body.reason === 'string' ? body.reason : undefined,
      });
      await store.update((draft) => {
        draft.examples.push(example);
      });
      return sendJson(res, 201, example);
    }
    if (req.method === 'POST' && pathname === '/api/confirm') {
      const body = await readJson(req);
      const message = await resumeTool(ctx, String(body.messageId), String(body.toolCallId), Boolean(body.allow));
      if (!message) return sendJson(res, 404, { error: 'Nothing is waiting for approval.' });
      return sendJson(res, 200, { message });
    }
    const feedback = pathname.match(/^\/api\/messages\/([^/]+)\/feedback$/);
    if (feedback && req.method === 'POST') {
      const body = await readJson(req);
      const updated = await setFeedback(feedback[1], body.feedback, body.correction);
      if (!updated) return sendJson(res, 404, { error: 'Message not found.' });
      return sendJson(res, 200, { message: updated });
    }
    if (req.method === 'POST' && pathname === '/api/routines') {
      const body = await readJson(req);
      const cron = String(body.cron || '').trim();
      const next = nextCron(cron, Date.now());
      if (!next) return sendJson(res, 400, { error: 'Use a 5-field UTC cron, like 0 8 * * *.' });
      const routine = {
        id: newId('rt'),
        agentId: String(body.agentId),
        name: String(body.name || 'Routine').slice(0, 40),
        cron,
        prompt: String(body.prompt || '').slice(0, 2000),
        enabled: body.enabled !== false,
        lastRunAt: null,
        nextRunAt: next,
        createdAt: Date.now(),
      };
      if (!routine.prompt) return sendJson(res, 400, { error: 'A routine needs a prompt.' });
      await store.update((data) => {
        data.routines.push(routine);
      });
      return sendJson(res, 201, routine);
    }
    const routineRun = pathname.match(/^\/api\/routines\/([^/]+)\/run$/);
    if (routineRun && req.method === 'POST') {
      const data = await store.read();
      const routine = data.routines.find((item) => item.id === routineRun[1]);
      if (!routine) return sendJson(res, 404, { error: 'Routine not found.' });
      const thread = data.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === routine.agentId);
      if (!thread) return sendJson(res, 404, { error: 'That agent has no chat.' });
      const blocked = await capBlocked();
      if (blocked) return sendJson(res, 402, { error: blocked });
      const sse = startSse(res);
      await talk(thread.id, routine.prompt, 'routine', sse);
      res.end();
      return;
    }
    const routinePatch = pathname.match(/^\/api\/routines\/([^/]+)$/);
    if (routinePatch && req.method === 'DELETE') {
      await store.update((data) => {
        data.routines = data.routines.filter((routine) => routine.id !== routinePatch[1]);
      });
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === 'PATCH' && pathname === '/api/settings') {
      const body = await readJson(req);
      await store.update((data) => {
        if (typeof body.spendCapUsd === 'number' && body.spendCapUsd >= 0 && body.spendCapUsd <= 1000) {
          data.settings.spendCapUsd = body.spendCapUsd;
        }
        if (typeof body.trainingEnabled === 'boolean') data.settings.trainingEnabled = body.trainingEnabled;
        if (body.trainingProviders && typeof body.trainingProviders === 'object') {
          for (const id of TRAINING_PROVIDER_IDS) {
            const value = (body.trainingProviders as Record<string, unknown>)[id];
            if (typeof value === 'boolean') data.settings.trainingProviders[id] = value;
          }
        }
      });
      return sendJson(res, 200, (await store.read()).settings);
    }
    if (req.method === 'GET' && pathname === '/api/training/export.jsonl') {
      const data = await store.read();
      const body = (await import('./training')).toFineTuneJsonl(data.training, data.settings.trainingProviders);
      cors(res);
      res.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'content-disposition': 'attachment; filename="dawn-agents-train.jsonl"',
      });
      res.end(body);
      return;
    }
    if (req.method === 'POST' && pathname === '/api/events') {
      const body = await readJson(req);
      const event = await addEvent({
        surface: body.surface === 'newsletter' ? 'newsletter' : 'recipes',
        action: String(body.action) as EngagementEvent['action'],
        itemId: String(body.itemId || ''),
        attributes: (body.attributes ?? {}) as EngagementEvent['attributes'],
        actor: { kind: 'owner', id: 'owner' },
      });
      if ('error' in event) return sendJson(res, 400, event);
      return sendJson(res, 201, event);
    }
    if (req.method === 'GET' && pathname === '/api/data') {
      const data = await store.read();
      return sendJson(res, 200, {
        counts: countsByTrack(data.examples),
        events: data.events.length,
        tastePairs: tastePairs(data.events).length,
        syntheticRoom: syntheticRoom(data.examples),
        queue: data.examples.filter((example) => example.status === 'pending').slice(-40),
        examples: data.examples.slice(-40),
      });
    }
    if (req.method === 'POST' && pathname === '/api/data/examples') {
      const body = await readJson(req);
      const made = makeExample(body);
      if ('error' in made) return sendJson(res, 400, made);
      await store.update((data) => {
        data.examples.push(made.example);
      });
      return sendJson(res, 201, made.example);
    }
    if (req.method === 'POST' && pathname === '/api/data/review') {
      const body = await readJson(req);
      const action = body.action === 'approve' || body.action === 'fix' || body.action === 'reject' ? body.action : null;
      if (!action) return sendJson(res, 400, { error: 'Choose approve, fix, or reject.' });
      let updated: DataExample | null = null;
      await store.update((data) => {
        const example = data.examples.find((item) => item.id === body.id);
        if (!example) return;
        const next = reviewExample(example, action, typeof body.correction === 'string' ? body.correction : undefined);
        Object.assign(example, next);
        updated = example;
      });
      if (!updated) return sendJson(res, 404, { error: 'Example not found.' });
      return sendJson(res, 200, updated);
    }
    if (req.method === 'POST' && pathname === '/api/data/collect') {
      const added = await runCollect();
      return sendJson(res, 200, { added });
    }
    if (req.method === 'POST' && pathname === '/api/data/synthetic') {
      const result = await runSynthetic(String((await readJson(req)).prompt || ''));
      if ('error' in result) return sendJson(res, result.status, { error: result.error });
      return sendJson(res, 201, result.example);
    }
    if (req.method === 'POST' && pathname === '/api/data/import') {
      const raw = await readBody(req);
      let jsonl = raw;
      if (raw.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(raw) as { jsonl?: string };
          if (typeof parsed.jsonl === 'string') jsonl = parsed.jsonl;
        } catch {
          jsonl = raw;
        }
      }
      const parsed = parseBackfill(jsonl, Date.now(), newId);
      await store.update((data) => {
        data.examples.push(...parsed.examples);
      });
      return sendJson(res, 200, { imported: parsed.examples.length, errors: parsed.errors });
    }
    if (req.method === 'POST' && pathname === '/api/data/import-dir') {
      const dir = process.env.DAWN_BACKFILL_DIR || '/workspace/personal-model';
      const loaded = await loadBackfillDir(dir);
      if ('error' in loaded) return sendJson(res, 404, loaded);
      const parsed = parseBackfill(loaded.jsonl, Date.now(), newId);
      await store.update((data) => {
        data.examples.push(...parsed.examples);
      });
      return sendJson(res, 200, { imported: parsed.examples.length, errors: parsed.errors, files: loaded.files });
    }
    if (req.method === 'GET' && pathname === '/api/data/export') {
      const data = await store.read();
      const format = urlSearch(req, 'format');
      const body = format === 'dpo' ? toDpoJsonl(data.examples, tastePairs(data.events)) : format === 'taste' ? toDpoJsonl([], tastePairs(data.events)) : toSftJsonl(data.examples);
      cors(res);
      res.writeHead(200, {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'content-disposition': `attachment; filename="dawn-${format || 'sft'}.jsonl"`,
      });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && pathname === '/api/articles') {
      const data = await store.read();
      return sendJson(res, 200, { articles: data.articles, sends: data.sends, provider: email.id });
    }
    if (req.method === 'POST' && pathname === '/api/articles') {
      const body = await readJson(req);
      const now = Date.now();
      const article = {
        id: newId('art'),
        title: String(body.title || 'Untitled').slice(0, 120),
        slug: slugify(String(body.slug || body.title || 'letter')),
        subject: String(body.subject || body.title || 'A letter').slice(0, 140),
        dek: String(body.dek || '').slice(0, 180),
        body: String(body.body || '').slice(0, 40_000),
        recipeId: typeof body.recipeId === 'string' ? body.recipeId : null,
        status: 'draft' as const,
        createdAt: now,
        updatedAt: now,
        publishedAt: null,
      };
      await store.update((data) => {
        data.articles.push(article);
      });
      return sendJson(res, 201, article);
    }
    const articlePatch = pathname.match(/^\/api\/articles\/([^/]+)$/);
    if (articlePatch && req.method === 'PATCH') {
      const body = await readJson(req);
      let article = null as Awaited<ReturnType<typeof store.read>>['articles'][number] | null;
      await store.update((data) => {
        const row = data.articles.find((item) => item.id === articlePatch[1]);
        if (!row) return;
        if (typeof body.title === 'string') row.title = body.title.slice(0, 120);
        if (typeof body.slug === 'string') row.slug = slugify(body.slug);
        if (typeof body.subject === 'string') row.subject = body.subject.slice(0, 140);
        if (typeof body.dek === 'string') row.dek = body.dek.slice(0, 180);
        if (typeof body.body === 'string') row.body = body.body.slice(0, 40_000);
        if (typeof body.recipeId === 'string' || body.recipeId === null) row.recipeId = body.recipeId;
        row.updatedAt = Date.now();
        article = row;
      });
      if (!article) return sendJson(res, 404, { error: 'Letter not found.' });
      return sendJson(res, 200, article);
    }
    const publish = pathname.match(/^\/api\/articles\/([^/]+)\/publish$/);
    if (publish && req.method === 'POST') {
      let article = null as Awaited<ReturnType<typeof store.read>>['articles'][number] | null;
      await store.update((data) => {
        const row = data.articles.find((item) => item.id === publish[1]);
        if (!row) return;
        row.status = 'published';
        row.publishedAt = Date.now();
        row.updatedAt = row.publishedAt;
        article = row;
      });
      if (!article) return sendJson(res, 404, { error: 'Letter not found.' });
      return sendJson(res, 200, article);
    }
    const draftWith = pathname.match(/^\/api\/articles\/([^/]+)\/draft$/);
    if (draftWith && req.method === 'POST') {
      const body = await readJson(req);
      const data = await store.read();
      const article = data.articles.find((item) => item.id === draftWith[1]);
      const agent = data.agents.find((item) => item.id === body.agentId) ?? data.agents[0];
      if (!article || !agent) return sendJson(res, 404, { error: 'Need a letter and an agent.' });
      const thread = data.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === agent.id);
      if (!thread) return sendJson(res, 404, { error: 'That agent has no chat.' });
      const blocked = await capBlocked();
      if (blocked) return sendJson(res, 402, { error: blocked });
      const notes = String(body.notes || article.title);
      let draft = '';
      await talk(thread.id, `Draft a short studio letter titled “${article.title}”. Notes: ${notes}`, 'editor', (event, payload) => {
        if (event === 'done') draft = (payload as { message?: MessageRecord }).message?.content || draft;
      }, article.recipeId || undefined);
      await store.update((draftStore) => {
        const row = draftStore.articles.find((item) => item.id === article.id);
        if (!row || !draft) return;
        row.body = draft.slice(0, 40_000);
        row.updatedAt = Date.now();
      });
      return sendJson(res, 200, { body: draft });
    }
    const sendLetter = pathname.match(/^\/api\/articles\/([^/]+)\/send$/);
    if (sendLetter && req.method === 'POST') {
      const body = await readJson(req);
      if (body.confirm !== true) return sendJson(res, 400, { error: 'Sending needs an explicit confirmation.' });
      const result = await sendArticle(sendLetter[1], req);
      if ('error' in result) return sendJson(res, result.status ?? 400, { error: result.error });
      return sendJson(res, 200, result);
    }
    if (req.method === 'GET' && pathname === '/api/subscribers') {
      const data = await store.read();
      return sendJson(res, 200, {
        subscribers: data.subscribers.map(publicSubscriber),
        provider: email.id,
      });
    }
    if (req.method === 'POST' && pathname === '/api/subscribers/import') {
      const raw = await readBody(req);
      const parsed = parseSubscriberCsv(raw);
      const now = Date.now();
      await store.update((data) => {
        for (const emailAddress of parsed.emails) {
          if (data.subscribers.some((row) => row.email === emailAddress)) continue;
          data.subscribers.push({
            id: newId('sub'),
            email: emailAddress,
            status: 'pending',
            consentAt: null,
            createdAt: now,
            confirmToken: randomBytes(16).toString('hex'),
            unsubToken: randomBytes(16).toString('hex'),
          });
        }
      });
      return sendJson(res, 200, { imported: parsed.emails.length, rejected: parsed.rejected });
    }
    if (req.method === 'GET' && pathname === '/api/subscribers/export.csv') {
      const data = await store.read();
      cors(res);
      res.writeHead(200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="subscribers.csv"',
      });
      res.end(subscribersToCsv(data.subscribers));
      return;
    }
    const confirmMail = pathname.match(/^\/api\/subscribers\/([^/]+)\/confirm-mail$/);
    if (confirmMail && req.method === 'POST') {
      const result = await sendConfirmation(confirmMail[1], req);
      if ('error' in result) return sendJson(res, result.status ?? 400, { error: result.error });
      return sendJson(res, 200, result);
    }
    sendJson(res, 404, { error: 'Not found.' });
  }

  async function editorRoute(req: IncomingMessage, res: ServerResponse, pathname: string) {
    if (req.method === 'GET' && pathname === '/api/v1/agents') {
      const data = await store.read();
      return sendJson(res, 200, { agents: data.agents });
    }
    if (req.method === 'GET' && pathname === '/api/v1/recipes') {
      return sendJson(res, 200, { recipes: RECIPES.map((recipe) => ({ id: recipe.id, name: recipe.name, tags: recipe.tags })) });
    }
    const snippet = pathname.match(/^\/api\/v1\/recipes\/([^/]+)\/snippet$/);
    if (snippet && req.method === 'GET') {
      const recipe = recipeById(decodeURIComponent(snippet[1]));
      if (!recipe) return sendJson(res, 404, { error: 'Recipe not found.' });
      return sendJson(res, 200, { id: recipe.id, name: recipe.name, html: recipeSnippet(recipe) });
    }
    const jobGet = pathname.match(/^\/api\/v1\/jobs\/([^/]+)$/);
    if (jobGet && req.method === 'GET') {
      const data = await store.read();
      const thread = data.threads.find((item) => item.id === jobGet[1]);
      if (!thread) return sendJson(res, 404, { error: 'Job not found.' });
      return sendJson(res, 200, { job: thread, messages: data.messages.filter((message) => message.threadId === thread.id) });
    }
    if (req.method === 'POST' && pathname === '/api/v1/jobs') {
      const body = await readJson(req);
      const data = await store.read();
      const agent = data.agents.find((item) => item.id === body.agentId);
      if (!agent) return sendJson(res, 404, { error: 'Agent not found.' });
      const now = Date.now();
      const thread = {
        id: newId('th'),
        kind: 'job' as const,
        title: String(body.title || 'Editor job').slice(0, 80),
        agentIds: [agent.id],
        createdAt: now,
        updatedAt: now,
      };
      await store.update((draft) => {
        draft.threads.push(thread);
      });
      const replies: MessageRecord[] = [];
      await talk(thread.id, String(body.prompt || ''), 'editor', (_event, payload) => {
        const message = (payload as { message?: MessageRecord }).message;
        if (message?.role === 'assistant') replies.push(message);
      });
      return sendJson(res, 201, { jobId: thread.id, replies });
    }
    const editorMessage = pathname.match(/^\/api\/v1\/agents\/([^/]+)\/messages$/);
    if (editorMessage && req.method === 'POST') {
      const body = await readJson(req);
      const data = await store.read();
      const agent = data.agents.find((item) => item.id === editorMessage[1]);
      if (!agent) return sendJson(res, 404, { error: 'Agent not found.' });
      let thread = body.threadId ? data.threads.find((item) => item.id === body.threadId) : data.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === agent.id);
      if (!thread) return sendJson(res, 404, { error: 'Thread not found.' });
      const replies: MessageRecord[] = [];
      await talk(thread.id, String(body.text || ''), 'editor', (_event, payload) => {
        const message = (payload as { message?: MessageRecord }).message;
        if (message?.role === 'assistant') replies.push(message);
      });
      return sendJson(res, 200, { threadId: thread.id, replies });
    }
    sendJson(res, 404, { error: 'Not found.' });
  }

  async function workerRoute(req: IncomingMessage, res: ServerResponse, pathname: string) {
    if (!options.workerToken) return sendJson(res, 503, { error: 'Set DAWN_WORKER_TOKEN on the gateway.' });
    const body = req.method === 'POST' ? await readJson(req) : {};
    if (!tokensMatch(String(body.token || ''), options.workerToken)) return sendJson(res, 401, { error: 'Worker token rejected.' });
    const kind: WorkerKind = body.kind === 'mac' ? 'mac' : 'linux';
    if (pathname === '/api/worker/hello') {
      return sendJson(res, 200, hub.hello({ kind, host: String(body.host || 'worker'), platform: String(body.platform || '') }));
    }
    if (pathname === '/api/worker/poll') {
      const job = await hub.poll(String(body.workerId || ''), kind, 18_000);
      return sendJson(res, 200, job ? { job: { id: job.id, agentId: job.agentId, task: job.task } } : { job: null });
    }
    if (pathname === '/api/worker/result') {
      const result = body.result as ComputerResult;
      if (!result || typeof result !== 'object' || !('status' in result)) return sendJson(res, 400, { error: 'Missing result.' });
      const ok = hub.finish(String(body.jobId || ''), result);
      return sendJson(res, ok ? 200 : 404, ok ? { ok: true } : { error: 'Job not found.' });
    }
    sendJson(res, 404, { error: 'Not found.' });
  }

  async function publicRoute(req: IncomingMessage, res: ServerResponse, pathname: string, url: URL) {
    if (req.method === 'GET' && pathname === '/api/public/letters') {
      const data = await store.read();
      return sendJson(res, 200, {
        letters: data.articles.filter((article) => article.status === 'published').map(publicArticle),
      });
    }
    const one = pathname.match(/^\/api\/public\/letters\/([^/]+)$/);
    if (one && req.method === 'GET') {
      const data = await store.read();
      const article = data.articles.find((item) => item.slug === decodeURIComponent(one[1]) && item.status === 'published');
      if (!article) return sendJson(res, 404, { error: 'Letter not found.' });
      const recipe = article.recipeId ? recipeById(article.recipeId) : undefined;
      return sendJson(res, 200, { letter: { ...publicArticle(article), html: markdownToHtml(article.body), recipeId: article.recipeId, colors: recipe ? recipeAttributes(recipe).colors : [] } });
    }
    if (req.method === 'POST' && pathname === '/api/public/subscribe') {
      const body = await readJson(req);
      const emailAddress = String(body.email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)) return sendJson(res, 400, { error: 'That email does not look right.' });
      const reader = readerId(req, body.readerId);
      const now = Date.now();
      let created = false;
      await store.update((data) => {
        if (data.subscribers.some((row) => row.email === emailAddress)) return;
        created = true;
        data.subscribers.push({
          id: newId('sub'),
          email: emailAddress,
          status: 'pending',
          consentAt: null,
          createdAt: now,
          confirmToken: randomBytes(16).toString('hex'),
          unsubToken: randomBytes(16).toString('hex'),
        });
      });
      return sendJson(res, 200, {
        pending: true,
        created,
        readerId: reader,
        message: 'You are not on the list yet. Kyle sends the confirmation himself.',
      });
    }
    if (req.method === 'POST' && pathname === '/api/public/confirm') {
      const body = await readJson(req);
      const token = String(body.token || url.searchParams.get('token') || '');
      const reader = readerId(req, body.readerId);
      let articleTopic = 'the list';
      let ok = false;
      await store.update((data) => {
        const row = data.subscribers.find((item) => item.confirmToken === token);
        if (!row || row.status === 'unsubscribed') return;
        row.status = 'confirmed';
        row.consentAt = Date.now();
        ok = true;
        data.events.push(makeEvent('newsletter', 'subscribe', 'list', { topic: articleTopic, name: 'Letter list' }, reader));
      });
      if (!ok) return sendJson(res, 400, { error: 'That confirmation link is not valid.' });
      await runCollect();
      return sendJson(res, 200, { ok: true, readerId: reader });
    }
    if (req.method === 'POST' && pathname === '/api/public/unsubscribe') {
      const body = await readJson(req);
      const token = String(body.token || '');
      const reader = readerId(req, body.readerId);
      let ok = false;
      await store.update((data) => {
        const row = data.subscribers.find((item) => item.unsubToken === token);
        if (!row) return;
        row.status = 'unsubscribed';
        ok = true;
        data.events.push(makeEvent('newsletter', 'unsubscribe', 'list', { topic: 'the list', name: 'Letter list' }, reader));
      });
      if (!ok) return sendJson(res, 400, { error: 'That unsubscribe link is not valid.' });
      await runCollect();
      return sendJson(res, 200, { ok: true, readerId: reader });
    }
    const opened = pathname.match(/^\/api\/public\/open\/([^/]+)\.gif$/);
    if (opened && req.method === 'GET') {
      const [sendId, subscriberId] = decodeURIComponent(opened[1]).split('.');
      const reader = readerId(req, url.searchParams.get('r'));
      await store.update((data) => {
        const send = data.sends.find((item) => item.id === sendId);
        if (!send || !subscriberId) return;
        send.openedIds = send.openedIds ?? [];
        if (send.openedIds.includes(subscriberId)) return;
        send.openedIds.push(subscriberId);
        send.opens += 1;
        const article = data.articles.find((item) => item.id === send.articleId);
        data.events.push(makeEvent('newsletter', 'open', send.articleId, letterAttributes(article), reader));
      });
      await runCollect();
      cors(res);
      res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store' });
      res.end(PIXEL);
      return;
    }
    const clicked = pathname.match(/^\/api\/public\/click\/([^/]+)$/);
    if (clicked && req.method === 'GET') {
      const [sendId, subscriberId] = decodeURIComponent(clicked[1]).split('.');
      const target = url.searchParams.get('u') || '';
      const reader = readerId(req, url.searchParams.get('r'));
      let safe = 'https://artometrics.com';
      try {
        const parsed = new URL(target);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safe = parsed.toString();
      } catch {
        safe = 'https://artometrics.com';
      }
      await store.update((data) => {
        const send = data.sends.find((item) => item.id === sendId);
        if (!send || !subscriberId) return;
        send.clickedIds = send.clickedIds ?? [];
        if (!send.clickedIds.includes(subscriberId)) {
          send.clickedIds.push(subscriberId);
          send.clicks += 1;
        }
        const article = data.articles.find((item) => item.id === send.articleId);
        data.events.push(makeEvent('newsletter', 'click', send.articleId, letterAttributes(article), reader));
      });
      await runCollect();
      cors(res);
      res.writeHead(302, { location: safe });
      res.end();
      return;
    }
    sendJson(res, 404, { error: 'Not found.' });
  }

  async function snapshot() {
    const data = await store.read();
    const spent = spentThisMonth(data.ledger, Date.now());
    return {
      ownerEmail,
      agents: data.agents,
      threads: data.threads,
      messages: data.messages.slice(-400),
      memories: data.memories,
      routines: data.routines,
      spend: { month: monthKey(Date.now()), spentUsd: spent, capUsd: data.settings.spendCapUsd, entries: data.ledger.slice(-30) },
      workers: hub.status(),
      keys: keyStatus(),
      editorTokenSet: Boolean(options.editorToken),
      training: {
        enabled: data.settings.trainingEnabled,
        providers: data.settings.trainingProviders,
        count: data.training.length,
        exportable: exportableCount(data.training, data.settings.trainingProviders),
      },
      events: data.events.slice(-80),
      data: { counts: countsByTrack(data.examples), syntheticRoom: syntheticRoom(data.examples), queue: data.examples.filter((example) => example.status === 'pending').length },
      articles: data.articles,
      subscribers: data.subscribers.map(publicSubscriber),
      sends: data.sends,
      mailProvider: email.id,
      recipes: RECIPES.map((recipe) => ({ id: recipe.id, name: recipe.name, tags: recipe.tags })),
    };
  }

  async function createAgent(body: Record<string, unknown>) {
    const name = String(body.name || '').trim();
    const instructions = String(body.instructions || '').trim();
    if (!name || name.length > 40) return { error: 'Name must be 1 to 40 characters.' };
    if (!instructions || instructions.length > 4000) return { error: 'Instructions must be 1 to 4000 characters.' };
    const model = MODELS.includes(String(body.model)) ? String(body.model) : MODELS[0];
    const computer = COMPUTERS.includes(body.computer as ComputerKind) ? (body.computer as ComputerKind) : 'hetzner';
    const avatar = validAvatar(body.avatar) ? (body.avatar as PixelAvatar) : { grid: 8 as const, cells: '0'.repeat(64) };
    const now = Date.now();
    const agent: AgentRecord = { id: newId('a'), name, instructions, model, computer, avatar, createdAt: now, updatedAt: now };
    const thread = { id: newId('th'), kind: 'direct' as const, title: name, agentIds: [agent.id], createdAt: now, updatedAt: now };
    await store.update((data) => {
      if (data.agents.length >= 24) return;
      data.agents.push(agent);
      data.threads.push(thread);
    });
    return { agent, thread };
  }

  async function patchAgent(id: string, body: Record<string, unknown>) {
    let agent: AgentRecord | null = null;
    await store.update((data) => {
      const row = data.agents.find((item) => item.id === id);
      if (!row) return;
      if (typeof body.name === 'string' && body.name.trim()) row.name = body.name.trim().slice(0, 40);
      if (typeof body.instructions === 'string') row.instructions = body.instructions.slice(0, 4000);
      if (typeof body.model === 'string' && MODELS.includes(body.model)) row.model = body.model;
      if (typeof body.computer === 'string' && COMPUTERS.includes(body.computer as ComputerKind)) row.computer = body.computer as ComputerKind;
      if (validAvatar(body.avatar)) row.avatar = body.avatar;
      row.updatedAt = Date.now();
      agent = row;
    });
    return agent ? { agent } : { error: 'Agent not found.' };
  }

  async function deleteAgent(id: string) {
    await store.update((data) => {
      data.agents = data.agents.filter((agent) => agent.id !== id);
      data.memories = data.memories.filter((memory) => memory.agentId !== id);
      data.routines = data.routines.filter((routine) => routine.agentId !== id);
      data.threads = data.threads.filter((thread) => !(thread.kind === 'direct' && thread.agentIds[0] === id));
    });
  }

  async function createThread(body: Record<string, unknown>) {
    const ids = Array.isArray(body.agentIds) ? body.agentIds.map(String) : [];
    if (ids.length < 2) return { error: 'A group needs at least two agents.' };
    const now = Date.now();
    const thread = {
      id: newId('th'),
      kind: 'group' as const,
      title: String(body.title || 'Group').slice(0, 40),
      agentIds: ids.slice(0, 6),
      createdAt: now,
      updatedAt: now,
    };
    await store.update((data) => {
      data.threads.push(thread);
    });
    return { thread };
  }

  async function talk(threadId: string, text: string, channel: ChatChannel, emit: (event: string, data: unknown) => void, recipeId?: string) {
    const data = await store.read();
    const thread = data.threads.find((item) => item.id === threadId);
    if (!thread) {
      emit('error', { message: 'That chat is gone.' });
      return;
    }
    const agents = thread.agentIds
      .map((id) => data.agents.find((agent) => agent.id === id))
      .filter((agent): agent is AgentRecord => Boolean(agent));
    if (!agents.length) {
      emit('error', { message: 'That chat has no agents.' });
      return;
    }
    let first = true;
    for (const agent of thread.kind === 'group' ? agents : agents.slice(0, 1)) {
      const current = (await store.read()).threads.find((item) => item.id === threadId);
      if (!current) return;
      const outcome = await runAgentTurn(ctx, {
        thread: current,
        agent,
        userText: text,
        appendUser: first,
        channel: thread.kind === 'group' ? 'group' : channel,
        emit,
        recipeId,
      });
      first = false;
      if (outcome.blocked) return;
    }
  }

  async function capBlocked(): Promise<string | null> {
    const data = await store.read();
    const spent = spentThisMonth(data.ledger, Date.now());
    if (canSpend(spent, data.settings.spendCapUsd)) return null;
    return `Spend cap reached (${formatUsd(spent)} of ${formatUsd(data.settings.spendCapUsd)} this UTC month). Raise it in Settings.`;
  }

  async function setFeedback(messageId: string, feedback: unknown, correction: unknown) {
    let message: MessageRecord | null = null;
    await store.update((data) => {
      const row = data.messages.find((item) => item.id === messageId);
      if (!row) return;
      if (feedback === 'up' || feedback === 'down' || feedback === null) row.feedback = feedback;
      if (typeof correction === 'string') {
        row.correction = scrubPii(correction, ctx.secrets).slice(0, 8000);
        data.examples.push({
          id: newId('ex'),
          ownerId: 'owner',
          track: 'agent-task',
          status: 'pending',
          synthetic: false,
          license: 'internal-owner',
          consent: 'owner',
          provenance: { source: 'agent-correction', uri: `message:${row.id}`, collectedAt: Date.now() },
          createdAt: Date.now(),
          messages: [
            { role: 'user', content: 'Correct the agent.' },
            { role: 'assistant', content: row.correction },
          ],
          correction: row.correction,
        });
      }
      const training = row.trainingId ? data.training.find((item) => item.id === row.trainingId) : undefined;
      if (training) {
        if (row.feedback) training.feedback = row.feedback;
        if (row.correction) training.correction = row.correction;
      }
      message = row;
    });
    return message;
  }

  async function addEvent(input: Omit<EngagementEvent, 'id' | 'at'>): Promise<EngagementEvent | { error: string }> {
    if (!input.itemId || !eventAllowed(input.surface, input.action)) return { error: 'That event is not valid.' };
    const event: EngagementEvent = { ...input, id: newId('ev'), at: Date.now(), attributes: stripAttributes(input.attributes) };
    await store.update((data) => {
      data.events.push(event);
    });
    await runCollect();
    return event;
  }

  function makeEvent(
    surface: EngagementEvent['surface'],
    action: EngagementEvent['action'],
    itemId: string,
    attributes: EngagementEvent['attributes'],
    reader: string,
  ): EngagementEvent {
    return {
      id: newId('ev'),
      at: Date.now(),
      surface,
      action,
      itemId,
      attributes: stripAttributes(attributes),
      actor: { kind: 'reader', id: reader },
    };
  }

  function makeExample(body: Record<string, unknown>): { example: DataExample } | { error: string } {
    const now = Date.now();
    if (body.track === 'chart-story') {
      const made = chartStoryExample({
        id: newId('ex'),
        now,
        sourceUrl: String(body.sourceUrl || ''),
        story: String(body.story || ''),
        chart: String(body.chart || ''),
      });
      return made.ok ? { example: made.example } : { error: made.error };
    }
    if (body.track === 'fact-check') {
      const made = factExample({
        id: newId('ex'),
        now,
        claim: String(body.claim || ''),
        sourceUrl: String(body.sourceUrl || ''),
        label: body.label === 'false' ? 'false' : 'true',
      });
      return made.ok ? { example: made.example } : { error: made.error };
    }
    return { error: 'Choose a chart-story or fact-check.' };
  }

  async function runCollect(): Promise<number> {
    const data = await store.read();
    const added = collectDesk({
      now: Date.now(),
      training: data.training,
      articles: data.articles.map((article) => ({ id: article.id, title: article.title, body: article.body, updatedAt: article.updatedAt })),
      events: data.events,
      examples: data.examples,
      secrets: ctx.secrets,
      id: newId,
    });
    if (added.length) {
      await store.update((draft) => {
        draft.examples.push(...added);
      });
    }
    return added.length;
  }

  async function runSynthetic(prompt: string): Promise<{ example: DataExample } | { error: string; status: number }> {
    const data = await store.read();
    if (syntheticRoom(data.examples) < 1) return { error: 'Synthetic examples are capped at about half the real set.', status: 409 };
    const blocked = await capBlocked();
    if (blocked) return { error: blocked, status: 402 };
    const agent = data.agents[0];
    if (!agent) return { error: 'Create an agent before generating synthetic rows.', status: 400 };
    const thread = data.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === agent.id);
    if (!thread) return { error: 'That agent has no chat.', status: 400 };
    const topic = prompt.trim() || 'A short studio note Kyle might have written.';
    let draft = '';
    let judgment = '';
    await talk(thread.id, `Write one synthetic training answer. Tag it as synthetic in your head. Topic: ${topic}`, 'editor', (_e, payload) => {
      const message = (payload as { message?: MessageRecord }).message;
      if (message?.role === 'assistant') draft = message.content;
    });
    await talk(thread.id, `Judge this synthetic answer. Reply with KEEP or DROP and one sentence.\n${draft.slice(0, 1500)}`, 'editor', (_e, payload) => {
      const message = (payload as { message?: MessageRecord }).message;
      if (message?.role === 'assistant') judgment = message.content;
    });
    const drop = /^\s*drop\b/i.test(judgment);
    const example: DataExample = {
      id: newId('ex'),
      ownerId: 'owner',
      track: 'synthetic',
      status: drop ? 'rejected' : 'pending',
      synthetic: true,
      license: 'synthetic-internal',
      consent: 'owner',
      provenance: { source: 'synthetic', collectedAt: Date.now(), generator: process.env.DAWN_SYNTHETIC_MODEL || 'desk-default' },
      createdAt: Date.now(),
      messages: [
        { role: 'user', content: topic },
        { role: 'assistant', content: scrubPii(draft, ctx.secrets) },
      ],
    };
    await store.update((draftStore) => {
      draftStore.examples.push(example);
    });
    return { example };
  }

  async function sendConfirmation(subscriberId: string, req: IncomingMessage) {
    const data = await store.read();
    const row = data.subscribers.find((item) => item.id === subscriberId);
    if (!row) return { error: 'Subscriber not found.', status: 404 };
    const origin = publicOrigin(req);
    const link = `${origin}/letter?confirm=${row.confirmToken}`;
    await email.send({
      to: row.email,
      subject: 'Confirm the Artometrics letter',
      text: `Confirm you want the letter: ${link}`,
      html: `<p>Confirm you want the letter.</p><p><a href="${link}">Confirm</a></p>`,
      articleId: 'confirm',
    });
    return { sent: true, provider: email.id, previewPath: email.id === 'console' ? `/letter?confirm=${row.confirmToken}` : undefined };
  }

  async function sendArticle(articleId: string, req: IncomingMessage) {
    const data = await store.read();
    const article = data.articles.find((item) => item.id === articleId);
    if (!article || article.status !== 'published') return { error: 'Publish the letter before sending it.', status: 400 };
    const confirmed = data.subscribers.filter((row) => row.status === 'confirmed');
    if (!confirmed.length) return { error: 'Nobody has confirmed yet.', status: 400 };
    const origin = publicOrigin(req);
    const send = {
      id: newId('send'),
      articleId: article.id,
      sentAt: Date.now(),
      recipients: confirmed.length,
      opens: 0,
      clicks: 0,
      openedIds: [] as string[],
      clickedIds: [] as string[],
    };
    for (const row of confirmed) {
      const token = `${send.id}.${row.id}`;
      const pixel = `<img src="${origin}/api/public/open/${token}.gif" width="1" height="1" alt="">`;
      const html = rewriteLinks(renderLetterHtml(article, pixel), `${origin}/api/public/click/${token}?u=`);
      const unsub = `${origin}/letter?unsub=${row.unsubToken}`;
      await email.send({
        to: row.email,
        subject: article.subject || article.title,
        html: `${html}<p><a href="${unsub}">Unsubscribe</a></p>`,
        text: `${article.title}\n\n${article.body}\n\nUnsubscribe: ${unsub}`,
        articleId: article.id,
      });
    }
    await store.update((draft) => {
      draft.sends.push(send);
    });
    return { sent: confirmed.length, provider: email.id, sendId: send.id };
  }

  async function tick(fileStore: FileStore, turn: TurnContext) {
    const now = Date.now();
    const data = await fileStore.read();
    for (const routine of data.routines) {
      if (!routine.enabled || routine.nextRunAt > now) continue;
      const thread = data.threads.find((item) => item.kind === 'direct' && item.agentIds[0] === routine.agentId);
      const next = nextCron(routine.cron, now) ?? now + 3_600_000;
      await fileStore.update((draft) => {
        const row = draft.routines.find((item) => item.id === routine.id);
        if (!row) return;
        row.lastRunAt = now;
        row.nextRunAt = next;
      });
      if (!thread) continue;
      const blocked = await capBlocked();
      if (blocked) continue;
      await talk(thread.id, routine.prompt, 'routine', () => undefined);
    }
    const slot = collectSlot(now);
    if (slot && data.settings.lastCollectSlot !== slot) {
      await runCollect();
      await fileStore.update((draft) => {
        draft.settings.lastCollectSlot = slot;
      });
    }
    void turn;
  }
}

function stripAttributes(attributes: EngagementEvent['attributes']): EngagementEvent['attributes'] {
  const clone = { ...attributes };
  delete (clone as { email?: string }).email;
  return clone;
}

function readerId(req: IncomingMessage, given: unknown): string {
  const header = req.headers['x-reader-id'];
  const raw = String(given || (Array.isArray(header) ? header[0] : header) || '');
  if (validReaderId(raw)) return raw;
  return `r_${randomBytes(8).toString('hex')}`;
}

function letterAttributes(article: { title: string; dek: string; recipeId: string | null } | undefined): EngagementEvent['attributes'] {
  if (!article) return { topic: 'letter' };
  const recipe = article.recipeId ? recipeById(article.recipeId) : undefined;
  const base = recipe ? recipeAttributes(recipe) : {};
  return { ...base, name: article.title, topic: article.dek || article.title };
}

function publicArticle(article: { id: string; title: string; slug: string; dek: string; recipeId: string | null; publishedAt: number | null }) {
  return { id: article.id, title: article.title, slug: article.slug, dek: article.dek, recipeId: article.recipeId, publishedAt: article.publishedAt };
}

function publicSubscriber(row: { id: string; email: string; status: string; consentAt: number | null; createdAt: number }) {
  return { id: row.id, email: row.email, status: row.status, consentAt: row.consentAt, createdAt: row.createdAt };
}

function publicOrigin(req: IncomingMessage): string {
  if (process.env.DAWN_AGENTS_PUBLIC_URL) return process.env.DAWN_AGENTS_PUBLIC_URL.replace(/\/$/, '');
  return `http://${req.headers.host || '127.0.0.1:8787'}`;
}

function urlSearch(req: IncomingMessage, key: string): string {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  return url.searchParams.get(key) || '';
}

function bearer(req: IncomingMessage): string {
  const header = req.headers.authorization || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

function cors(res: ServerResponse) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'authorization, content-type, x-reader-id');
  res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  if (res.writableEnded || res.headersSent) return;
  cors(res);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function startSse(res: ServerResponse) {
  cors(res);
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
  });
  return (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 400_000) throw new Error('Request is too large.');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = await readBody(req);
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

async function loadBackfillDir(dir: string): Promise<{ jsonl: string; files: string[] } | { error: string }> {
  let names: string[] = [];
  try {
    names = (await readdir(dir)).filter((name) => name.endsWith('.jsonl'));
  } catch {
    return { error: `No backfill directory at ${dir}. Paste JSONL instead, or set DAWN_BACKFILL_DIR.` };
  }
  if (!names.length) return { error: 'The backfill directory has no .jsonl files.' };
  const parts: string[] = [];
  for (const name of names) {
    parts.push(await readFile(path.join(dir, name), 'utf8'));
  }
  return { jsonl: parts.join('\n'), files: names };
}
