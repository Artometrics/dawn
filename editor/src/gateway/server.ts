import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { createDawnJob, listDawnAgents, postDawnJobMessage, readDawnAgentsSpend, type DawnJob } from '../shared/agents.ts';
import { applySelection, parseJsonObject, validateEdits, type FileEdit } from '../shared/edits.ts';
import { MODEL_CHOICES, remapModelId } from '../shared/models.ts';
import { agentUserPrompt, inlineUserPrompt, standInAgent, standInInline, type CodeContext } from '../shared/prompts.ts';
import { redact } from '../shared/redact.ts';
import { clip, safeRelativePath } from '../shared/paths.ts';
import { DEFAULT_CAP_USD, spendView, type SpendView } from '../shared/spend.ts';
import { HttpError, bearer, json, readJson, startSse, tokensMatch, writeEvent } from './http.ts';
import { completeText, resolveProvider, streamChat, type ChatTurn, type GatewayEnv } from './providers.ts';
import { SpendStore } from './store.ts';
import { TrainingLog, type TrainingResult } from './training-log.ts';
import type { TrainingInput } from '../shared/training.ts';

export type GatewayOptions = {
  token: string;
  dataDir: string;
  capUsd?: number;
  mock?: boolean;
  mockDelayMs?: number;
  agentsUrl?: string;
  editorToken?: string;
  trainingLogUrl?: string;
  trainingToken?: string;
  env?: GatewayEnv;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function stringField(source: Record<string, unknown>, key: string, max: number): string {
  const value = source[key];
  return typeof value === 'string' ? clip(value, max).text : '';
}

function contextFrom(value: unknown): CodeContext {
  const source = asObject(value);
  const file = asObject(source.file);
  const selection = asObject(source.selection);
  const files = Array.isArray(source.files) ? source.files.filter((item): item is string => typeof item === 'string').slice(0, 150) : [];
  const content = stringField(file, 'content', 24_000);
  const selected = stringField(selection, 'text', 12_000);
  return {
    workspaceName: stringField(source, 'workspaceName', 200),
    file: file.path && typeof file.path === 'string'
      ? {
          path: safeRelativePath(file.path) ?? clip(String(file.path), 300).text,
          language: stringField(file, 'language', 40) || 'plaintext',
          content,
        }
      : undefined,
    selection: selected
      ? {
          text: selected,
          startLine: Number(selection.startLine) || 1,
          endLine: Number(selection.endLine) || 1,
        }
      : undefined,
    files: files.map((filePath) => safeRelativePath(filePath) ?? filePath).filter((filePath) => !filePath.includes('..')).slice(0, 150),
  };
}

function chatMessages(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-20).flatMap((item) => {
    const record = asObject(item);
    const role = record.role === 'assistant' ? 'assistant' : record.role === 'user' ? 'user' : null;
    const content = typeof record.content === 'string' ? clip(record.content, 8_000).text : '';
    return role && content ? [{ role, content }] : [];
  });
}

function fileSnapshot(value: unknown): { path: string; content: string }[] {
  if (!Array.isArray(value)) return [];
  const files: { path: string; content: string }[] = [];
  for (const item of value) {
    if (files.length >= 20) break;
    const record = asObject(item);
    const filePath = typeof record.path === 'string' ? safeRelativePath(record.path) : null;
    if (!filePath || typeof record.content !== 'string') continue;
    files.push({ path: filePath, content: clip(record.content, 80_000).text });
  }
  return files;
}

export function createGateway(options: GatewayOptions) {
  const env = options.env ?? process.env;
  const capUsd = Number.isFinite(options.capUsd) ? Number(options.capUsd) : DEFAULT_CAP_USD;
  const store = new SpendStore(path.join(options.dataDir, 'spend.json'), capUsd, options.now);
  const training = new TrainingLog(path.join(options.dataDir, 'training-log.jsonl'), {
    url: options.trainingLogUrl,
    token: options.trainingToken || options.editorToken,
    fetchImpl: options.fetchImpl,
    env,
    now: options.now,
  });
  const mock = options.mock === true || env.DAWN_CODE_MOCK === '1';
  const memory = new Map<string, DawnJob>();
  const server = createServer((req, res) => {
    void handle(req, res).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Gateway error';
      const status = error instanceof HttpError ? error.status : 500;
      if (res.headersSent) {
        writeEvent(res, 'error', { message: redact(message, env) }, env);
        res.end();
        return;
      }
      json(res, status, { error: error instanceof HttpError ? error.message : 'Gateway error' }, env);
    });
  });

  async function agentsOptions() {
    return {
      baseUrl: options.agentsUrl,
      token: options.editorToken,
      fetchImpl: options.fetchImpl,
      timeoutMs: 60_000,
    };
  }

  async function currentSpend(): Promise<SpendView> {
    const ledger = await store.load();
    const remote = await readDawnAgentsSpend(await agentsOptions());
    return spendView({
      monthKey: ledger.monthKey,
      editorUsd: ledger.spentUsd,
      agentsUsd: remote.known ? remote.spentUsd : null,
      capUsd: store.cap,
    });
  }

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const method = req.method ?? 'GET';
    if (method === 'GET' && url.pathname === '/health') {
      const kind = (model: string) => resolveProvider(model, env, mock);
      json(res, 200, {
        ok: true,
        service: 'dawn-code-gateway',
        mock,
        providers: {
          google: kind('gemini-3.8-flash') === 'google',
          xai: kind('x-ai/grok-4.7') === 'xai',
          openrouter: kind('openai/gpt-4o-mini') === 'openrouter',
        },
      });
      return;
    }

    if (!options.token || !tokensMatch(bearer(req), options.token)) {
      json(res, 401, { error: 'Unauthorized' });
      return;
    }

    if (method === 'GET' && url.pathname === '/v1/models') {
      json(res, 200, { models: MODEL_CHOICES });
      return;
    }
    if (method === 'GET' && url.pathname === '/v1/spend') {
      json(res, 200, await currentSpend());
      return;
    }
    if (method === 'GET' && url.pathname === '/v1/dawn-agents/agents') {
      json(res, 200, await listDawnAgents(await agentsOptions()));
      return;
    }
    if (method === 'POST' && url.pathname === '/v1/dawn-agents/jobs') {
      const body = asObject(await readJson(req, 256_000));
      const agentId = stringField(body, 'agentId', 80);
      const prompt = stringField(body, 'prompt', 20_000);
      const title = stringField(body, 'title', 200);
      if (!agentId || !prompt) throw new HttpError(400, 'agentId and prompt are required');
      const job = await createDawnJob(await agentsOptions(), { agentId, prompt, title });
      memory.set(job.jobId, job);
      json(res, job.status === 'failed' ? 402 : 200, job);
      return;
    }
    const messageMatch = url.pathname.match(/^\/v1\/dawn-agents\/jobs\/([^/]+)\/messages$/);
    if (method === 'POST' && messageMatch) {
      const body = asObject(await readJson(req, 256_000));
      const text = stringField(body, 'text', 20_000) || stringField(body, 'prompt', 20_000);
      if (!text) throw new HttpError(400, 'text is required');
      const jobId = decodeURIComponent(messageMatch[1]);
      const job = await postDawnJobMessage(await agentsOptions(), jobId, text, memory.get(jobId)?.agentId);
      memory.set(job.jobId || jobId, job);
      json(res, 200, job);
      return;
    }
    const jobMatch = url.pathname.match(/^\/v1\/dawn-agents\/jobs\/([^/]+)$/);
    if (method === 'GET' && jobMatch) {
      const job = memory.get(decodeURIComponent(jobMatch[1]));
      if (!job) throw new HttpError(404, 'Job is not in this gateway. Dawn Agents status polling is not merged.');
      json(res, 200, job);
      return;
    }
    if (method === 'POST' && url.pathname === '/v1/training-log') {
      const body = asObject(await readJson(req, 1_500_000));
      const kind = body.kind;
      const action = body.action;
      if (kind !== 'chat' && kind !== 'inline' && kind !== 'agent') throw new HttpError(400, 'kind must be chat, inline, or agent');
      if (action !== 'response' && action !== 'accept' && action !== 'reject' && action !== 'edit') {
        throw new HttpError(400, 'action must be response, accept, reject, or edit');
      }
      const edits = Array.isArray(body.edit)
        ? body.edit.flatMap((item) => {
            const record = asObject(item);
            if (typeof record.path !== 'string') return [];
            return [{
              path: record.path,
              before: typeof record.before === 'string' ? record.before : '',
              after: typeof record.after === 'string' ? record.after : '',
            }];
          })
        : [];
      const saved = await logTraining({
        kind,
        action,
        model: stringField(body, 'model', 80),
        prompt: stringField(body, 'prompt', 100_000),
        response: stringField(body, 'response', 100_000),
        paths: Array.isArray(body.paths) ? body.paths.filter((item): item is string => typeof item === 'string') : [],
        edit: edits,
      });
      json(res, 200, saved ?? { logged: false, forwarded: false, stubbed: true });
      return;
    }
    if (method === 'POST' && url.pathname === '/v1/chat') {
      await handleChat(req, res);
      return;
    }
    if (method === 'POST' && url.pathname === '/v1/edit') {
      await handleEdit(req, res);
      return;
    }
    if (method === 'POST' && url.pathname === '/v1/agent') {
      await handleAgent(req, res);
      return;
    }
    throw new HttpError(404, 'Not found');
  }

  async function logTraining(input: TrainingInput): Promise<TrainingResult | null> {
    try {
      return await training.record(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'training log failed';
      process.stderr.write(`${redact(message, env)}\n`);
      return null;
    }
  }

  function assertPaid(spend: SpendView, model: string): void {
    const standIn = mock || resolveProvider(model, env, mock) === 'mock';
    if (spend.blocked && !standIn) {
      throw new HttpError(402, `Monthly cap reached (${spend.totalUsd.toFixed(2)} of ${spend.capUsd.toFixed(2)}). Paid models are paused.`);
    }
  }

  async function handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = asObject(await readJson(req, 512_000));
    const model = remapModelId(stringField(body, 'model', 80) || 'gemini-3.8-flash');
    const messages = chatMessages(body.messages);
    const context = contextFrom(body.context);
    if (!messages.some((message) => message.role === 'user')) throw new HttpError(400, 'A user message is required');
    const spend = await currentSpend();
    startSse(res);
    writeEvent(res, 'ready', { model }, env);
    const standIn = mock || resolveProvider(model, env, mock) === 'mock';
    if (spend.blocked && !standIn) {
      writeEvent(res, 'error', { code: 'cap', message: `Monthly cap reached (${spend.totalUsd.toFixed(2)} of ${spend.capUsd.toFixed(2)}). Paid models are paused.` }, env);
      writeEvent(res, 'usage', { ...spend, costUsd: 0 }, env);
      writeEvent(res, 'done', { standIn: false }, env);
      res.end();
      return;
    }
    try {
      const result = await streamChat({
        model,
        messages,
        context,
        env,
        mock: standIn,
        mockDelayMs: options.mockDelayMs ?? 0,
        fetchImpl: options.fetchImpl,
        onDelta: (text) => writeEvent(res, 'delta', { text }, env),
      });
      const ledger = await store.record(result.usage.costUsd);
      const after = spendView({
        monthKey: ledger.monthKey,
        editorUsd: ledger.spentUsd,
        agentsUsd: spend.agentsUsd,
        capUsd: store.cap,
      });
      const logged = await logTraining({
        kind: 'chat',
        action: 'response',
        model: result.usage.model,
        prompt: messages.filter((message) => message.role === 'user').map((message) => message.content).join('\n\n'),
        response: result.text,
        paths: context.file ? [context.file.path] : [],
      });
      writeEvent(res, 'usage', { ...result.usage, spend: after }, env);
      writeEvent(res, 'training', logged ?? { logged: false, forwarded: false, stubbed: true }, env);
      writeEvent(res, 'done', { standIn: result.standIn }, env);
      res.end();
    } catch (error) {
      const message = redact(error instanceof Error ? error.message : 'Model call failed', env);
      writeEvent(res, 'error', { code: 'provider', message }, env);
      writeEvent(res, 'done', { standIn: false }, env);
      res.end();
    }
  }

  async function handleEdit(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = asObject(await readJson(req, 512_000));
    const model = remapModelId(stringField(body, 'model', 80) || 'gemini-3.8-flash');
    const instruction = stringField(body, 'instruction', 4_000);
    const selection = stringField(body, 'selection', 20_000);
    const fullFile = typeof body.fullFile === 'string' ? clip(body.fullFile, 200_000).text : '';
    const filePath = typeof body.path === 'string' ? safeRelativePath(body.path) ?? body.path : 'selection';
    const language = stringField(body, 'language', 40) || 'plaintext';
    const prefix = stringField(body, 'prefix', 8_000);
    const suffix = stringField(body, 'suffix', 8_000);
    const startLine = Number(body.startLine) || 1;
    const endLine = Number(body.endLine) || startLine;
    if (!instruction || !selection) throw new HttpError(400, 'instruction and selection are required');
    const spend = await currentSpend();
    assertPaid(spend, model);
    const standIn = mock || resolveProvider(model, env, mock) === 'mock';
    let explanation = '';
    let replacement = selection;
    let usageCost = 0;
    let usedStandIn = standIn;
    if (standIn) {
      const local = standInInline(instruction, selection);
      explanation = local.explanation;
      replacement = local.replacement;
    } else {
      const completed = await completeText({
        model,
        env,
        mock: false,
        fetchImpl: options.fetchImpl,
        messages: [
          { role: 'system', content: 'You edit the selection. Return JSON only.' },
          { role: 'user', content: inlineUserPrompt({ instruction, path: filePath, language, selection, prefix, suffix, startLine, endLine }) },
        ],
      });
      usageCost = completed.usage.costUsd;
      usedStandIn = completed.standIn;
      const parsed = asObject(parseJsonObject(completed.text));
      explanation = typeof parsed.explanation === 'string' ? parsed.explanation : 'Model edit';
      replacement = typeof parsed.replacement === 'string' ? parsed.replacement : completed.text;
    }
    const proposedFile = applySelection(fullFile, selection, replacement, startLine, endLine);
    if (proposedFile === null) throw new HttpError(422, 'The selection no longer matches the file.');
    const ledger = await store.record(usageCost);
    const after = spendView({ monthKey: ledger.monthKey, editorUsd: ledger.spentUsd, agentsUsd: spend.agentsUsd, capUsd: store.cap });
    const logged = await logTraining({
      kind: 'inline',
      action: 'edit',
      model: usedStandIn ? 'stand-in' : model,
      prompt: instruction,
      response: explanation,
      paths: [filePath],
      edit: [{ path: filePath, before: selection, after: replacement }],
    });
    json(res, 200, {
      explanation,
      replacement,
      proposedFile,
      standIn: usedStandIn,
      spend: after,
      training: logged,
    });
  }

  async function handleAgent(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = asObject(await readJson(req, 1_500_000));
    const model = remapModelId(stringField(body, 'model', 80) || 'gemini-3.8-flash');
    const task = stringField(body, 'task', 8_000);
    const files = fileSnapshot(body.files);
    if (!task) throw new HttpError(400, 'task is required');
    if (!files.length) throw new HttpError(400, 'At least one workspace file is required');
    const spend = await currentSpend();
    startSse(res);
    writeEvent(res, 'ready', { model }, env);
    const standIn = mock || resolveProvider(model, env, mock) === 'mock';
    if (spend.blocked && !standIn) {
      writeEvent(res, 'error', { code: 'cap', message: `Monthly cap reached (${spend.totalUsd.toFixed(2)} of ${spend.capUsd.toFixed(2)}).` }, env);
      writeEvent(res, 'done', { standIn: false }, env);
      res.end();
      return;
    }
    let edits: FileEdit[] = [];
    let steps: string[] = [];
    let cost = 0;
    let usedStandIn = standIn;
    if (standIn) {
      const plan = standInAgent(task, files);
      steps = plan.steps;
      edits = validateEdits({ edits: plan.edits }, new Map(files.map((file) => [file.path, file.content])));
    } else {
      try {
        const completed = await completeText({
          model,
          env,
          mock: false,
          fetchImpl: options.fetchImpl,
          messages: [
            { role: 'system', content: 'You plan file edits. Return JSON only.' },
            { role: 'user', content: agentUserPrompt(task, files) },
          ],
        });
        cost = completed.usage.costUsd;
        usedStandIn = completed.standIn;
        const parsed = asObject(parseJsonObject(completed.text));
        steps = Array.isArray(parsed.steps) ? parsed.steps.filter((step): step is string => typeof step === 'string').slice(0, 12) : ['Draft edits'];
        edits = validateEdits(parsed, new Map(files.map((file) => [file.path, file.content])));
      } catch (error) {
        writeEvent(res, 'error', { code: 'provider', message: redact(error instanceof Error ? error.message : 'Model call failed', env) }, env);
        writeEvent(res, 'done', { standIn: false }, env);
        res.end();
        return;
      }
    }
    steps.forEach((title, index) => {
      writeEvent(res, 'step', { id: String(index + 1), title, status: 'done' }, env);
    });
    for (const edit of edits) writeEvent(res, 'edit', { path: edit.path, summary: edit.summary }, env);
    writeEvent(res, 'review', { edits }, env);
    const ledger = await store.record(cost);
    const after = spendView({ monthKey: ledger.monthKey, editorUsd: ledger.spentUsd, agentsUsd: spend.agentsUsd, capUsd: store.cap });
    const logged = await logTraining({
      kind: 'agent',
      action: 'edit',
      model: usedStandIn ? 'stand-in' : model,
      prompt: task,
      response: steps.join('\n'),
      paths: edits.map((edit) => edit.path),
      edit: edits.map((edit) => ({ path: edit.path, before: edit.original, after: edit.proposed })),
    });
    writeEvent(res, 'usage', { costUsd: cost, spend: after, standIn: usedStandIn }, env);
    writeEvent(res, 'training', logged ?? { logged: false, forwarded: false, stubbed: true }, env);
    writeEvent(res, 'done', { standIn: usedStandIn }, env);
    res.end();
  }

  return server;
}
