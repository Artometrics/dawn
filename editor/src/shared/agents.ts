/**
 * Client for the Dawn Agents editor API.
 * Contract (planned on cursor/dawn-agents-v1-0f2d, not merged):
 *   Authorization: Bearer <DAWN_EDITOR_TOKEN>
 *   GET  /api/v1/agents
 *   POST /api/v1/jobs                 { agentId, prompt, title? }
 *   POST /api/v1/jobs/:id/messages    { text, prompt }
 * Agent ids are `a_` plus 12 hex characters. Errors are `{ "error": string }`.
 * A down service, a missing token, or a 404 becomes a stub result. A 401 does not.
 */

export type DawnAgent = {
  id: string;
  name: string;
  instructions?: string;
  model?: string;
  computer?: string;
};

export type DawnReply = {
  agentId: string;
  content: string;
  toolCalls: unknown[];
  usage?: { inputTokens: number; outputTokens: number; costUsd: number };
};

export type DawnJob = {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'stubbed';
  stubbed: boolean;
  agentId: string;
  title?: string;
  replies: DawnReply[];
  message?: string;
};

export type AgentsList = {
  stubbed: boolean;
  agents: DawnAgent[];
  message?: string;
};

export type AgentsSpend = {
  known: boolean;
  spentUsd: number | null;
  capUsd: number | null;
  message?: string;
};

export type AgentsClientOptions = {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

const STUB_AGENT: DawnAgent = {
  id: 'a_000000000001',
  name: 'Stub agent',
  instructions: 'Dawn Agents is not merged yet. Tasks sent here are recorded locally and do not run.',
  model: 'stand-in',
  computer: 'hetzner',
};

const AGENT_ID = /^a_[0-9a-f]{12}$/;

function trimBase(url: string): string {
  return url.replace(/\/+$/, '');
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 300) };
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
    return (body as { error: string }).error;
  }
  return fallback;
}

export function normalizeAgent(value: unknown): DawnAgent | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { id?: unknown; name?: unknown; instructions?: unknown; model?: unknown; computer?: unknown };
  if (typeof record.id !== 'string' || !AGENT_ID.test(record.id)) return null;
  if (typeof record.name !== 'string' || !record.name.trim()) return null;
  return {
    id: record.id,
    name: record.name.trim(),
    instructions: typeof record.instructions === 'string' ? record.instructions : undefined,
    model: typeof record.model === 'string' ? record.model : undefined,
    computer: typeof record.computer === 'string' ? record.computer : undefined,
  };
}

export function normalizeJob(value: unknown, fallbackAgentId: string): DawnJob | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as {
    jobId?: unknown;
    id?: unknown;
    status?: unknown;
    agentId?: unknown;
    title?: unknown;
    replies?: unknown;
    message?: unknown;
    stubbed?: unknown;
  };
  const jobId = typeof record.jobId === 'string' ? record.jobId : typeof record.id === 'string' ? record.id : '';
  if (!jobId) return null;
  const statusRaw = typeof record.status === 'string' ? record.status : 'completed';
  const status = (['queued', 'running', 'completed', 'failed', 'stubbed'] as const).find((item) => item === statusRaw) ?? 'completed';
  const replies = Array.isArray(record.replies)
    ? record.replies.flatMap((reply) => {
        if (!reply || typeof reply !== 'object') return [];
        const item = reply as { agentId?: unknown; content?: unknown; toolCalls?: unknown; usage?: unknown };
        const content = typeof item.content === 'string' ? item.content : '';
        const usage = item.usage && typeof item.usage === 'object' ? (item.usage as DawnReply['usage']) : undefined;
        return [{
          agentId: typeof item.agentId === 'string' ? item.agentId : fallbackAgentId,
          content,
          toolCalls: Array.isArray(item.toolCalls) ? item.toolCalls : [],
          usage,
        }];
      })
    : [];
  return {
    jobId,
    status,
    stubbed: record.stubbed === true || status === 'stubbed',
    agentId: typeof record.agentId === 'string' ? record.agentId : fallbackAgentId,
    title: typeof record.title === 'string' ? record.title : undefined,
    replies,
    message: typeof record.message === 'string' ? record.message : undefined,
  };
}

function stubList(message: string): AgentsList {
  return { stubbed: true, agents: [STUB_AGENT], message };
}

function stubJob(agentId: string, message: string, title?: string): DawnJob {
  return {
    jobId: `stub_${Math.random().toString(16).slice(2, 14)}`,
    status: 'stubbed',
    stubbed: true,
    agentId: agentId || STUB_AGENT.id,
    title,
    replies: [],
    message,
  };
}

async function call(opts: AgentsClientOptions, path: string, init?: { method?: string; body?: unknown }): Promise<Response> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl ? trimBase(opts.baseUrl) : '';
  const timeout = opts.timeoutMs ?? 60_000;
  return fetchImpl(`${base}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(timeout),
  });
}

export async function listDawnAgents(opts: AgentsClientOptions): Promise<AgentsList> {
  if (!opts.baseUrl) return stubList('DAWN_AGENTS_URL is empty. Dawn Agents is not merged.');
  if (!opts.token) return stubList('DAWN_EDITOR_TOKEN is empty. Dawn Agents was not called.');
  try {
    const response = await call(opts, '/api/v1/agents');
    const body = await readJson(response);
    if (response.status === 404 || response.status === 501) {
      return stubList('Dawn Agents has no /api/v1/agents yet.');
    }
    if (response.status === 401 || response.status === 403) {
      return { stubbed: false, agents: [], message: errorMessage(body, 'Dawn Agents refused the editor token.') };
    }
    if (!response.ok) {
      return stubList(errorMessage(body, `Dawn Agents returned ${response.status}.`));
    }
    const raw = Array.isArray(body) ? body : (body as { agents?: unknown }).agents;
    const agents = Array.isArray(raw) ? raw.flatMap((item) => {
      const agent = normalizeAgent(item);
      return agent ? [agent] : [];
    }) : [];
    return { stubbed: false, agents, message: agents.length ? undefined : 'Dawn Agents returned no agents.' };
  } catch {
    return stubList('Dawn Agents is not reachable. The task list is a local stub.');
  }
}

export async function createDawnJob(
  opts: AgentsClientOptions,
  input: { agentId: string; prompt: string; title?: string },
): Promise<DawnJob> {
  if (!opts.baseUrl || !opts.token) {
    return stubJob(input.agentId, 'Dawn Agents is not configured. This task was not sent.');
  }
  try {
    const response = await call(opts, '/api/v1/jobs', {
      method: 'POST',
      body: { agentId: input.agentId, prompt: input.prompt, title: input.title },
    });
    const body = await readJson(response);
    if (response.status === 404 || response.status === 501) {
      return stubJob(input.agentId, 'Dawn Agents has no /api/v1/jobs yet. This task was not sent.', input.title);
    }
    if (!response.ok) {
      const failed = response.status === 401 || response.status === 402 || response.status === 403;
      return {
        ...stubJob(input.agentId, errorMessage(body, `Dawn Agents returned ${response.status}.`), input.title),
        stubbed: !failed,
        status: failed ? 'failed' : 'stubbed',
      };
    }
    return normalizeJob(body, input.agentId) ?? stubJob(input.agentId, 'Dawn Agents returned a job Dawn Code could not read.', input.title);
  } catch {
    return stubJob(input.agentId, 'Dawn Agents is not reachable. This task was not sent.', input.title);
  }
}

export async function postDawnJobMessage(
  opts: AgentsClientOptions,
  jobId: string,
  text: string,
  agentId = '',
): Promise<DawnJob> {
  if (jobId.startsWith('stub_') || !opts.baseUrl || !opts.token) {
    return stubJob(agentId, 'This job is a local stub. The follow-up was not sent.');
  }
  try {
    const response = await call(opts, `/api/v1/jobs/${encodeURIComponent(jobId)}/messages`, {
      method: 'POST',
      body: { text, prompt: text },
    });
    const body = await readJson(response);
    if (response.status === 404 || response.status === 501) {
      return stubJob(agentId, 'Dawn Agents does not have job messages yet. The follow-up was not sent.');
    }
    if (!response.ok) {
      return stubJob(agentId, errorMessage(body, `Dawn Agents returned ${response.status}.`));
    }
    return normalizeJob(body, agentId) ?? stubJob(agentId, 'Dawn Agents returned a follow-up Dawn Code could not read.');
  } catch {
    return stubJob(agentId, 'Dawn Agents is not reachable. The follow-up was not sent.');
  }
}

export async function readDawnAgentsSpend(opts: AgentsClientOptions): Promise<AgentsSpend> {
  if (!opts.baseUrl || !opts.token) {
    return { known: false, spentUsd: null, capUsd: null, message: 'Dawn Agents spend is not configured.' };
  }
  try {
    const response = await call(opts, '/api/v1/spend');
    if (response.status === 404 || response.status === 501) {
      return { known: false, spentUsd: null, capUsd: null, message: 'Dawn Agents does not publish /api/v1/spend yet.' };
    }
    if (!response.ok) {
      return { known: false, spentUsd: null, capUsd: null, message: `Dawn Agents spend returned ${response.status}.` };
    }
    const body = await readJson(response) as { spentUsd?: unknown; editorUsd?: unknown; capUsd?: unknown; totalUsd?: unknown };
    const spent = typeof body.spentUsd === 'number' ? body.spentUsd : typeof body.totalUsd === 'number' ? body.totalUsd : null;
    const cap = typeof body.capUsd === 'number' ? body.capUsd : null;
    if (spent === null) return { known: false, spentUsd: null, capUsd: cap, message: 'Dawn Agents spend had no spentUsd.' };
    return { known: true, spentUsd: spent, capUsd: cap };
  } catch {
    return { known: false, spentUsd: null, capUsd: null, message: 'Dawn Agents spend is not reachable.' };
  }
}
