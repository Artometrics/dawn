/**
 * Demonstration state for the unlisted /preview pages.
 * Nothing here calls a model, a worker, or a gateway.
 */

export type SampleId = 'billboard' | 'brief' | 'stop';
export type HabitId = 'line' | 'stop' | 'idea';

export type PreviewIdea = { id: string; text: string };

export type PreviewCheck = { id: string; label: string; done: boolean };

export type PreviewState = {
  sampleId: SampleId | null;
  ideas: PreviewIdea[];
  checks: PreviewCheck[];
  verified: boolean;
  habitId: HabitId | null;
  habitDone: Record<HabitId, boolean>;
  steps: number;
};

export const SAMPLES: { id: SampleId; title: string; detail: string; sprite: string; spriteName: string }[] = [
  {
    id: 'billboard',
    title: 'Pixel billboard',
    detail: 'A sample header. It is not a published recipe and no agent wrote it.',
    sprite: '/sprites/town/code-mage.png',
    spriteName: 'Code Mage',
  },
  {
    id: 'brief',
    title: 'Morning line',
    detail: 'One sample sentence for a brief. The desk is not sending mail.',
    sprite: '/sprites/town/letter-carrier.png',
    spriteName: 'Letter Carrier',
  },
  {
    id: 'stop',
    title: 'Campus stop card',
    detail: 'A sample card. Atlas still says the Cardinal note is coming soon.',
    sprite: '/sprites/town/atlas-scout.png',
    spriteName: 'Atlas Scout',
  },
];

export const HABITS: { id: HabitId; title: string; detail: string }[] = [
  { id: 'line', title: 'Write one sample line', detail: 'A sentence you invent on this page.' },
  { id: 'stop', title: 'Name one campus stop', detail: 'El Palo Alto is already on the Atlas list. This check does not walk it.' },
  { id: 'idea', title: 'Keep one idea', detail: 'Save it on the bench. It stays in this browser.' },
];

export const SAMPLE_CHECKS: PreviewCheck[] = [
  { id: 'read', label: 'Read the sample', done: false },
  { id: 'save', label: 'Save one idea', done: false },
  { id: 'mark', label: 'Mark the sample checked', done: false },
];

export const STUCK_STEPS = 3;

export const PREVIEW_KEY = 'dawn.preview.demo.v1';

export function emptyPreview(): PreviewState {
  return {
    sampleId: null,
    ideas: [],
    checks: SAMPLE_CHECKS.map((check) => ({ ...check })),
    verified: false,
    habitId: null,
    habitDone: { line: false, stop: false, idea: false },
    steps: 0,
  };
}

export function sampleById(id: SampleId) {
  return SAMPLES.find((sample) => sample.id === id) ?? null;
}

export function selectSample(state: PreviewState, id: SampleId): PreviewState {
  if (!sampleById(id)) return state;
  if (state.sampleId === id) return state;
  return {
    ...state,
    sampleId: id,
    checks: SAMPLE_CHECKS.map((check) => ({ ...check })),
    verified: false,
  };
}

export function saveIdea(state: PreviewState, text: string, id: string): { state: PreviewState; error: string | null } {
  const clean = text.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (clean.length < 2) return { state, error: 'Write a little more, then save.' };
  if (!state.sampleId) return { state, error: 'Choose one sample first.' };
  return {
    error: null,
    state: {
      ...state,
      ideas: [{ id, text: clean }, ...state.ideas].slice(0, 12),
      verified: false,
    },
  };
}

export function toggleCheck(state: PreviewState, checkId: string): PreviewState {
  if (!state.sampleId) return state;
  return {
    ...state,
    verified: false,
    checks: state.checks.map((check) => (check.id === checkId ? { ...check, done: !check.done } : check)),
  };
}

export function canVerify(state: PreviewState): boolean {
  return Boolean(state.sampleId) && state.ideas.length > 0 && state.checks.every((check) => check.done);
}

export function verifySample(state: PreviewState): { state: PreviewState; error: string | null } {
  if (!canVerify(state)) {
    return { state, error: 'Save an idea and mark every check. You do that. No agent does.' };
  }
  return { state: { ...state, verified: true }, error: null };
}

export function selectHabit(state: PreviewState, id: HabitId): PreviewState {
  if (!HABITS.some((habit) => habit.id === id)) return state;
  return { ...state, habitId: id };
}

export function toggleHabit(state: PreviewState, id: HabitId): PreviewState {
  if (state.habitId !== id) return state;
  return {
    ...state,
    habitDone: { ...state.habitDone, [id]: !state.habitDone[id] },
  };
}

export function stepRound(steps: number): number {
  if (!Number.isFinite(steps) || steps < 0) return 1;
  return Math.min(STUCK_STEPS, Math.floor(steps) + 1);
}

export function normalizePreview(value: unknown): PreviewState {
  const base = emptyPreview();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Partial<PreviewState>;
  const sampleId = SAMPLES.some((sample) => sample.id === raw.sampleId) ? raw.sampleId ?? null : null;
  const ideas = Array.isArray(raw.ideas)
    ? raw.ideas.flatMap((idea) => {
        if (!idea || typeof idea !== 'object') return [];
        const text = String((idea as PreviewIdea).text ?? '').trim().slice(0, 80);
        const id = String((idea as PreviewIdea).id ?? '').slice(0, 40);
        if (text.length < 2 || !id) return [];
        return [{ id, text }];
      }).slice(0, 12)
    : [];
  const checks = SAMPLE_CHECKS.map((check) => {
    const found = Array.isArray(raw.checks) ? raw.checks.find((item) => item && item.id === check.id) : null;
    return { ...check, done: Boolean(found?.done) };
  });
  const habitId = HABITS.some((habit) => habit.id === raw.habitId) ? raw.habitId ?? null : null;
  const done = raw.habitDone && typeof raw.habitDone === 'object' ? raw.habitDone : base.habitDone;
  return {
    sampleId,
    ideas,
    checks,
    verified: Boolean(raw.verified) && ideas.length > 0 && checks.every((check) => check.done),
    habitId,
    habitDone: {
      line: Boolean(done.line),
      stop: Boolean(done.stop),
      idea: Boolean(done.idea),
    },
    steps: Math.max(0, Math.min(STUCK_STEPS, Math.floor(Number(raw.steps) || 0))),
  };
}
