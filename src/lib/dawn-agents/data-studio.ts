import type { EngagementEvent } from './engage';
import { describeItem, tastePairs, type TastePair } from './engage';
import { scrubPii } from './pii';
import type { TrainingRow } from './types';

export type DataTrack =
  | 'chart-story'
  | 'fact-check'
  | 'visual-taste'
  | 'agent-task'
  | 'taste-signals'
  | 'chat'
  | 'writing'
  | 'preference'
  | 'synthetic';

export type ReviewStatus = 'pending' | 'approved' | 'fixed' | 'rejected';

export type DataMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export type DataExample = {
  id: string;
  ownerId: 'owner';
  track: DataTrack;
  status: ReviewStatus;
  synthetic: boolean;
  license: string;
  consent: 'owner' | 'missing';
  provenance: { source: string; uri?: string; collectedAt: number; generator?: string };
  createdAt: number;
  messages?: DataMessage[];
  preference?: { prompt: string; chosen: string; rejected: string; reason?: string };
  fact?: { claim: string; source: string; label: 'true' | 'false' };
  visual?: { itemId: string; verdict: 'pick' | 'reject' | 'mix'; reason?: string; colors?: string[]; tags?: string[] };
  correction?: string;
};

const OWNER = 'owner' as const;

export function syntheticRoom(examples: DataExample[]): number {
  const real = examples.filter((example) => !example.synthetic && example.status !== 'rejected').length;
  const synthetic = examples.filter((example) => example.synthetic && example.status !== 'rejected').length;
  return Math.max(0, Math.floor(real / 2) - synthetic);
}

export function chartStoryExample(input: {
  id: string;
  now: number;
  sourceUrl: string;
  story: string;
  chart: string;
}): { ok: true; example: DataExample } | { ok: false; error: string } {
  const sourceUrl = input.sourceUrl.trim();
  if (!/^https?:\/\/\S+$/.test(sourceUrl)) {
    return { ok: false, error: 'Chart-to-story examples need a real http(s) source. Untraceable stats are dropped.' };
  }
  const story = input.story.trim();
  const chart = input.chart.trim();
  if (!story || !chart) return { ok: false, error: 'Add the chart and the story.' };
  return {
    ok: true,
    example: base({
      id: input.id,
      now: input.now,
      track: 'chart-story',
      license: 'source-linked',
      uri: sourceUrl,
      source: 'artometrics-chart',
      messages: [
        { role: 'user', content: `Turn this sourced chart into a story.\nSource: ${sourceUrl}\nChart: ${chart}` },
        { role: 'assistant', content: story },
      ],
    }),
  };
}

export function factExample(input: {
  id: string;
  now: number;
  claim: string;
  sourceUrl: string;
  label: 'true' | 'false';
}): { ok: true; example: DataExample } | { ok: false; error: string } {
  const sourceUrl = input.sourceUrl.trim();
  if (!/^https?:\/\/\S+$/.test(sourceUrl)) return { ok: false, error: 'A fact-check needs a source URL.' };
  const claim = input.claim.trim();
  if (!claim) return { ok: false, error: 'Add the claim.' };
  if (input.label !== 'true' && input.label !== 'false') return { ok: false, error: 'Label the claim true or false.' };
  return {
    ok: true,
    example: {
      ...base({
        id: input.id,
        now: input.now,
        track: 'fact-check',
        license: 'source-linked',
        uri: sourceUrl,
        source: 'fact-check',
        messages: [
          { role: 'user', content: `Fact-check this claim. Source: ${sourceUrl}\n${claim}` },
          { role: 'assistant', content: input.label === 'true' ? 'True.' : 'False.' },
        ],
      }),
      fact: { claim, source: sourceUrl, label: input.label },
    },
  };
}

export function preferenceExample(input: {
  id: string;
  now: number;
  prompt: string;
  chosen: string;
  rejected: string;
  reason?: string;
}): DataExample {
  return {
    ...base({
      id: input.id,
      now: input.now,
      track: 'preference',
      license: 'internal-owner',
      source: 'ab-preference',
      messages: [
        { role: 'user', content: input.prompt },
        { role: 'assistant', content: input.chosen },
      ],
    }),
    preference: {
      prompt: input.prompt,
      chosen: input.chosen,
      rejected: input.rejected,
      reason: input.reason?.trim() || undefined,
    },
  };
}

export function collectDesk(input: {
  now: number;
  training: TrainingRow[];
  articles: { id: string; title: string; body: string; updatedAt: number }[];
  events: EngagementEvent[];
  examples: DataExample[];
  secrets?: string[];
  id: (prefix: string) => string;
}): DataExample[] {
  const seen = new Set(input.examples.map((example) => example.provenance.uri).filter(Boolean));
  const created: DataExample[] = [];
  const secrets = input.secrets ?? [];
  for (const row of input.training) {
    const uri = `training:${row.id}`;
    if (seen.has(uri)) continue;
    seen.add(uri);
    const messages = [
      ...(row.system ? [{ role: 'system' as const, content: scrubPii(row.system, secrets) }] : []),
      ...row.messages.map((message) => ({ role: message.role, content: scrubPii(message.content, secrets) })),
      { role: 'assistant' as const, content: scrubPii(row.correction?.trim() || row.response, secrets) },
    ].filter((message) => message.content.trim());
    created.push(
      base({
        id: input.id('ex'),
        now: input.now,
        track: 'chat',
        license: 'internal-owner',
        source: 'training-log',
        uri,
        messages,
      }),
    );
  }
  for (const article of input.articles) {
    const uri = `writing:${article.id}:${article.updatedAt}`;
    if (seen.has(uri) || !article.body.trim()) continue;
    seen.add(uri);
    created.push(
      base({
        id: input.id('ex'),
        now: input.now,
        track: 'writing',
        license: 'internal-owner',
        source: 'publish',
        uri,
        messages: [
          { role: 'user', content: `Draft the letter “${article.title}”.` },
          { role: 'assistant', content: scrubPii(article.body, secrets) },
        ],
      }),
    );
  }
  for (const event of input.events) {
    const uri = `event:${event.id}`;
    if (seen.has(uri)) continue;
    seen.add(uri);
    const text = `${event.action} ${describeItem(event)}`;
    created.push({
      ...base({
        id: input.id('ex'),
        now: event.at,
        track: 'taste-signals',
        license: 'internal-owner',
        source: `engage:${event.surface}`,
        uri,
        messages: [
          { role: 'user', content: 'Record this taste signal.' },
          { role: 'assistant', content: text },
        ],
      }),
      consent: event.actor.kind === 'owner' ? 'owner' : 'missing',
    });
    if (event.surface === 'recipes' && (event.action === 'like' || event.action === 'skip' || event.action === 'remix')) {
      const visualUri = `visual:${event.id}`;
      if (!seen.has(visualUri)) {
        seen.add(visualUri);
        created.push({
          ...base({
            id: input.id('ex'),
            now: event.at,
            track: 'visual-taste',
            license: 'internal-owner',
            source: 'style-recipes',
            uri: visualUri,
            messages: [
              { role: 'user', content: 'Rate this style recipe.' },
              { role: 'assistant', content: text },
            ],
          }),
          visual: {
            itemId: event.itemId,
            verdict: event.action === 'like' ? 'pick' : event.action === 'skip' ? 'reject' : 'mix',
            colors: event.attributes.colors,
            tags: event.attributes.tags,
          },
        });
      }
    }
  }
  return created;
}

export function reviewExample(example: DataExample, action: 'approve' | 'fix' | 'reject', correction?: string): DataExample {
  if (action === 'approve') return { ...example, status: 'approved' };
  if (action === 'reject') return { ...example, status: 'rejected' };
  const text = correction?.trim() || '';
  return { ...example, status: 'fixed', correction: text, messages: text ? replaceAssistant(example.messages, text) : example.messages };
}

export function countsByTrack(examples: DataExample[]): Record<DataTrack, number> {
  const counts: Record<DataTrack, number> = {
    'chart-story': 0,
    'fact-check': 0,
    'visual-taste': 0,
    'agent-task': 0,
    'taste-signals': 0,
    chat: 0,
    writing: 0,
    preference: 0,
    synthetic: 0,
  };
  for (const example of examples) {
    if (example.synthetic) counts.synthetic += 1;
    else counts[example.track] += 1;
  }
  return counts;
}

export function toSftJsonl(examples: DataExample[]): string {
  return lines(
    examples
      .filter((example) => example.status !== 'rejected' && example.messages?.length)
      .map((example) => ({
        messages: example.messages,
        license: example.license,
        provenance: example.provenance,
        consent: example.consent,
        ownerId: example.ownerId,
        track: example.track,
        synthetic: example.synthetic,
      })),
  );
}

export function toDpoJsonl(examples: DataExample[], pairs: TastePair[] = []): string {
  const fromExamples = examples
    .filter((example) => example.status !== 'rejected' && example.preference)
    .map((example) => ({
      prompt: example.preference?.prompt,
      chosen: example.correction?.trim() || example.preference?.chosen,
      rejected: example.preference?.rejected,
      reason: example.preference?.reason,
      license: example.license,
      provenance: example.provenance,
      consent: example.consent,
      ownerId: example.ownerId,
      track: example.track,
      synthetic: example.synthetic,
    }));
  const fromTaste = pairs.map((pair) => ({ ...pair, track: 'taste-signals', synthetic: false }));
  return lines([...fromExamples, ...fromTaste]);
}

export function parseBackfill(jsonl: string, now: number, id: (prefix: string) => string): { examples: DataExample[]; errors: string[] } {
  const examples: DataExample[] = [];
  const errors: string[] = [];
  const rows = jsonl.split('\n');
  rows.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      errors.push(`Line ${index + 1} is not JSON.`);
      return;
    }
    const record = parsed as { messages?: DataMessage[]; metadata?: Record<string, unknown> };
    if (!Array.isArray(record.messages) || record.messages.some((message) => !message || !message.role || typeof message.content !== 'string')) {
      errors.push(`Line ${index + 1} needs messages[{role,content}].`);
      return;
    }
    const meta = record.metadata ?? {};
    const license = typeof meta.license === 'string' && meta.license.trim() ? meta.license.trim() : 'unknown';
    const source = typeof meta.source === 'string' ? meta.source : 'backfill';
    const provenanceText = typeof meta.provenance === 'string' ? meta.provenance : source;
    examples.push({
      ...base({
        id: id('ex'),
        now,
        track: 'chat',
        license,
        source,
        uri: typeof meta.id === 'string' ? `backfill:${meta.id}` : undefined,
        messages: record.messages.map((message) => ({
          role: message.role,
          content: scrubPii(message.content),
        })),
      }),
      consent: 'missing',
      status: 'pending',
      provenance: {
        source: provenanceText,
        uri: typeof meta.id === 'string' ? `backfill:${meta.id}` : undefined,
        collectedAt: now,
      },
    });
  });
  return { examples, errors };
}

export function collectSlot(now: number): string | null {
  const date = new Date(now);
  const hour = date.getUTCHours();
  const slot = hour < 8 ? null : hour < 14 ? 8 : hour < 20 ? 14 : 20;
  if (slot === null) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}-${day}-${slot}`;
}

function replaceAssistant(messages: DataMessage[] | undefined, text: string): DataMessage[] {
  const next = [...(messages ?? [])];
  const index = next.findLastIndex((message) => message.role === 'assistant');
  if (index >= 0) next[index] = { role: 'assistant', content: text };
  else next.push({ role: 'assistant', content: text });
  return next;
}

function base(input: {
  id: string;
  now: number;
  track: DataTrack;
  license: string;
  source: string;
  uri?: string;
  messages?: DataMessage[];
}): DataExample {
  return {
    id: input.id,
    ownerId: OWNER,
    track: input.track,
    status: 'pending',
    synthetic: input.track === 'synthetic',
    license: input.license,
    consent: 'owner',
    provenance: { source: input.source, uri: input.uri, collectedAt: input.now },
    createdAt: input.now,
    messages: input.messages,
  };
}

function lines(rows: unknown[]): string {
  if (!rows.length) return '';
  return `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;
}
