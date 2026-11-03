import { randomBytes } from 'node:crypto';
import { redact } from './redact.ts';
import { clip } from './paths.ts';

export type TrainingKind = 'chat' | 'inline' | 'agent';
export type TrainingAction = 'response' | 'accept' | 'reject' | 'edit';

export type TrainingEdit = {
  path: string;
  before: string;
  after: string;
};

export type TrainingInput = {
  kind: TrainingKind;
  action: TrainingAction;
  model: string;
  prompt: string;
  response: string;
  paths?: string[];
  edit?: TrainingEdit[];
};

export type TrainingRecord = {
  source: 'dawn-code';
  id: string;
  at: string;
  kind: TrainingKind;
  action: TrainingAction;
  model: string;
  prompt: string;
  response: string;
  paths: string[];
  edit: TrainingEdit[];
};

const KINDS = new Set<TrainingKind>(['chat', 'inline', 'agent']);
const ACTIONS = new Set<TrainingAction>(['response', 'accept', 'reject', 'edit']);

function field(value: unknown, max: number, env: Record<string, string | undefined>): string {
  const text = typeof value === 'string' ? value : '';
  return redact(clip(text, max).text, env);
}

/** Build the dataset row. Secrets are removed before it is stored or sent. */
export function trainingRecord(
  input: TrainingInput,
  env: Record<string, string | undefined> = process.env,
  now = new Date(),
): TrainingRecord {
  if (!KINDS.has(input.kind)) throw new Error('Training kind must be chat, inline, or agent');
  if (!ACTIONS.has(input.action)) throw new Error('Training action must be response, accept, reject, or edit');
  const edit = (input.edit ?? []).slice(0, 20).map((item) => ({
    path: field(item.path, 300, env),
    before: field(item.before, 80_000, env),
    after: field(item.after, 80_000, env),
  }));
  return {
    source: 'dawn-code',
    id: `tl_${randomBytes(8).toString('hex')}`,
    at: now.toISOString(),
    kind: input.kind,
    action: input.action,
    model: field(input.model, 80, env) || 'stand-in',
    prompt: field(input.prompt, 100_000, env),
    response: field(input.response, 100_000, env),
    paths: (input.paths ?? []).slice(0, 40).map((item) => field(item, 300, env)).filter(Boolean),
    edit,
  };
}
