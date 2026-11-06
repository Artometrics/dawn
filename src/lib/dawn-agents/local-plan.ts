/**
 * Bounded planning job for a local Dawn project.
 *
 * Provenance: original Dawn code. It does not copy OpenMausBot or NightCode.
 *
 * OpenMausBot (Apache-2.0, commit 27b57eff9fc81de649a7c6004579bc0f9c59cfef)
 * is the reference for a local machine connector. Copyright 2026 Milind Soni
 * and OpenMausBot contributors. enterprise/ is excluded. OpenMausBot does not
 * host a model. https://www.apache.org/licenses/LICENSE-2.0
 *
 * NightCode (code-with-antonio/nightcode, packages/cli/src/lib/local-tools.ts
 * blob 7330589fbcbf305edeb7678523c4d603dada699a) was read to see which tools
 * PLAN mode allows. No LICENSE file is in that repo. None of its source is
 * included here. Clerk, Polar, Prisma, and its model clients are not used.
 *
 * The cloud plan for Dawn is Cloud Run, Gemini, and Firestore (Solo Company
 * Stack Plan, section 5.2). This module does not call them.
 */

import { scrubText } from './scrub';

export const STACK_PLAN = {
  documentId: '1Sfcg1-jUl5csLe26GCz0-JgNRRzk1--ZcfJkJ5JdlOI',
  title: 'Solo Company Stack Plan',
  section: '5.2',
} as const;

export const CLOUD_TOOLS = ['crm_search', 'add_task', 'calendar_read', 'note_search', 'web_search'] as const;

export const PLAN_BOUNDS = {
  maxReads: 5,
  maxChars: 4_000,
  maxEntries: 40,
} as const;

export type CloudTool = (typeof CLOUD_TOOLS)[number];

export type LocalEntry = { name: string; type: 'file' | 'directory' };

export type LocalProjectPort = {
  list(path: string): LocalEntry[];
  read(path: string): { ok: true; content: string } | { ok: false; reason: string };
};

export type LocalPlanInput = {
  projectLabel: string;
  brief: string;
  /** Plan is the only mode this slice runs. */
  mode?: 'plan' | 'build';
  product?: string;
  readPaths?: string[];
  requestedTools?: string[];
  port: LocalProjectPort;
};

export type PlanRead = {
  path: string;
  chars: number;
  truncated: boolean;
  text: string;
};

export type RefusedStep = { tool: string; target?: string; reason: string };

export type LocalPlan = {
  ok: true;
  product: 'dawn';
  mode: 'plan';
  projectLabel: string;
  brief: string;
  listing: { path: '.'; entries: LocalEntry[] };
  reads: PlanRead[];
  refused: RefusedStep[];
  cloud: {
    loop: 'not_called';
    model: 'not_called';
    memory: 'not_written';
    schedule: 'not_called';
    tools: Record<CloudTool, 'not_called'>;
  };
  localConnector: 'mocked';
  auth: 'unchanged';
  usage: { ledgerWrites: 0; estimatedUsd: 0; capChecked: false };
  git: 'not_connected';
  githubToken: 'absent';
};

export type LocalPlanResult = LocalPlan | { ok: false; reason: string };

const READ_ONLY = new Set(['listDirectory', 'readFile']);
const BUILD_ONLY = new Set(['writeFile', 'editFile', 'bash']);
const UNPORTED = new Set(['glob', 'grep']);

function cloudTools(): Record<CloudTool, 'not_called'> {
  return {
    crm_search: 'not_called',
    add_task: 'not_called',
    calendar_read: 'not_called',
    note_search: 'not_called',
    web_search: 'not_called',
  };
}

/** Relative path with no parent segment and no hidden top. */
export function projectPath(value: string): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\\/g, '/');
  if (!text || text.length > 180 || text.includes('\0')) return null;
  if (text.startsWith('/') || /^[A-Za-z]:\//.test(text)) return null;
  const parts = text.split('/');
  if (parts.some((part) => part === '' || part === '..')) return null;
  if (parts.some((part) => part.startsWith('.') || part === 'node_modules')) return null;
  return parts.join('/');
}

function redact(value: string): string {
  return scrubText(value)
    .replace(/\bghp_[A-Za-z0-9]{8,}\b/g, '[redacted]')
    .replace(/\bgithub_pat_[A-Za-z0-9_]{8,}\b/g, '[redacted]');
}

export function filesPort(files: { path: string; content: string }[]): LocalProjectPort {
  const kept = files.flatMap((file) => {
    const path = projectPath(file.path);
    return path ? [{ path, content: file.content }] : [];
  });

  return {
    list(path: string) {
      const dir = path === '.' ? '' : projectPath(path);
      if (path !== '.' && !dir) return [];
      const prefix = dir ? `${dir}/` : '';
      const entries = new Map<string, LocalEntry>();
      for (const file of kept) {
        if (prefix && !file.path.startsWith(prefix)) continue;
        if (!prefix && file.path === dir) continue;
        const rest = prefix ? file.path.slice(prefix.length) : file.path;
        const [name, ...more] = rest.split('/');
        if (!name || name.startsWith('.') || name === 'node_modules') continue;
        const type = more.length ? 'directory' : 'file';
        const current = entries.get(name);
        if (!current || type === 'directory') entries.set(name, { name, type });
      }
      return [...entries.values()]
        .sort((left, right) => (left.type === right.type ? left.name.localeCompare(right.name) : left.type === 'directory' ? -1 : 1))
        .slice(0, PLAN_BOUNDS.maxEntries);
    },
    read(path: string) {
      const safe = projectPath(path);
      if (!safe) return { ok: false, reason: 'That path stays out of the plan.' };
      const file = kept.find((item) => item.path === safe);
      if (!file) return { ok: false, reason: 'No file at that path.' };
      return { ok: true, content: file.content };
    },
  };
}

export function planLocalProject(input: LocalPlanInput): LocalPlanResult {
  if (input.product && input.product !== 'dawn') {
    return { ok: false, reason: 'This planner is for Dawn.' };
  }
  if (input.mode === 'build') {
    return { ok: false, reason: 'Build mode is not connected. Plan mode only lists and reads.' };
  }
  const projectLabel = input.projectLabel.trim();
  if (!projectLabel || projectLabel.length > 40 || /[\\/]/.test(projectLabel)) {
    return { ok: false, reason: 'The project label is a short name, not a path.' };
  }
  const brief = redact(input.brief).trim();
  if (!brief) return { ok: false, reason: 'A brief is required.' };

  const refused: RefusedStep[] = [];
  for (const tool of input.requestedTools ?? []) {
    if (READ_ONLY.has(tool)) continue;
    if (BUILD_ONLY.has(tool)) {
      refused.push({ tool, reason: 'Plan mode does not write files or run a shell.' });
      continue;
    }
    if (UNPORTED.has(tool)) {
      refused.push({ tool, reason: 'Search tools are not connected. This slice does not spawn a process.' });
      continue;
    }
    refused.push({ tool, reason: 'Unknown tool.' });
  }

  let entries: LocalEntry[] = [];
  try {
    entries = input.port.list('.').slice(0, PLAN_BOUNDS.maxEntries);
  } catch {
    return { ok: false, reason: 'The local project port failed while listing.' };
  }

  const reads: PlanRead[] = [];
  for (const target of input.readPaths ?? []) {
    const safe = projectPath(target);
    if (!safe) {
      refused.push({ tool: 'readFile', target, reason: 'That path stays out of the plan.' });
      continue;
    }
    if (reads.length >= PLAN_BOUNDS.maxReads) {
      refused.push({ tool: 'readFile', target: safe, reason: `Read budget is ${PLAN_BOUNDS.maxReads}.` });
      continue;
    }
    let loaded: ReturnType<LocalProjectPort['read']>;
    try {
      loaded = input.port.read(safe);
    } catch {
      return { ok: false, reason: 'The local project port failed while reading.' };
    }
    if (!loaded.ok) {
      refused.push({ tool: 'readFile', target: safe, reason: loaded.reason });
      continue;
    }
    const text = redact(loaded.content);
    const truncated = text.length > PLAN_BOUNDS.maxChars;
    reads.push({
      path: safe,
      chars: Math.min(text.length, PLAN_BOUNDS.maxChars),
      truncated,
      text: truncated ? text.slice(0, PLAN_BOUNDS.maxChars) : text,
    });
  }

  return {
    ok: true,
    product: 'dawn',
    mode: 'plan',
    projectLabel,
    brief,
    listing: { path: '.', entries },
    reads,
    refused,
    cloud: {
      loop: 'not_called',
      model: 'not_called',
      memory: 'not_written',
      schedule: 'not_called',
      tools: cloudTools(),
    },
    localConnector: 'mocked',
    auth: 'unchanged',
    usage: { ledgerWrites: 0, estimatedUsd: 0, capChecked: false },
    git: 'not_connected',
    githubToken: 'absent',
  };
}
