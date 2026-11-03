export type RecipeAction = 'like' | 'save' | 'skip' | 'remix';
export type LetterAction = 'open' | 'click' | 'subscribe' | 'unsubscribe';
export type EngagementAction = RecipeAction | LetterAction;

export type EngagementActor = { kind: 'owner' | 'reader'; id: string };

export type EngagementAttributes = {
  tags?: string[];
  colors?: string[];
  topic?: string;
  name?: string;
  layout?: string;
  texture?: string;
  palette?: string;
  fonts?: string;
};

export type EngagementEvent = {
  id: string;
  at: number;
  surface: 'recipes' | 'newsletter';
  action: EngagementAction;
  itemId: string;
  attributes: EngagementAttributes;
  actor: EngagementActor;
};

export type TastePair = {
  prompt: string;
  chosen: string;
  rejected: string;
  license: string;
  provenance: { source: string; collectedAt: number };
  consent: 'owner' | 'missing';
  ownerId: 'owner';
};

const RECIPE_ACTIONS = new Set<EngagementAction>(['like', 'save', 'skip', 'remix']);
const LETTER_ACTIONS = new Set<EngagementAction>(['open', 'click', 'subscribe', 'unsubscribe']);

export function validReaderId(value: string): boolean {
  return /^r_[a-f0-9]{16}$/.test(value);
}

export function eventAllowed(surface: EngagementEvent['surface'], action: EngagementAction): boolean {
  if (surface === 'recipes') return RECIPE_ACTIONS.has(action);
  return LETTER_ACTIONS.has(action);
}

export function describeItem(event: EngagementEvent): string {
  const attr = event.attributes;
  const bits = [
    attr.name || event.itemId,
    attr.topic ? `topic ${attr.topic}` : '',
    attr.tags?.length ? `tags ${attr.tags.join(', ')}` : '',
    attr.colors?.length ? `colors ${attr.colors.join(', ')}` : '',
    attr.layout ? `layout ${attr.layout}` : '',
    attr.texture ? `texture ${attr.texture}` : '',
    attr.palette ? `palette ${attr.palette}` : '',
    attr.fonts ? `type ${attr.fonts}` : '',
  ].filter(Boolean);
  return bits.join('. ');
}

/**
 * Preference pairs where a signal has both a positive and a negative.
 * Recipes: a like is chosen and a skip by the same actor is rejected.
 * Newsletter: a click is chosen and an unsubscribe by the same reader is rejected.
 * Opens, saves, remixes, and subscribes stay in the event log and the SFT export.
 */
export function tastePairs(events: EngagementEvent[]): TastePair[] {
  const groups = new Map<string, EngagementEvent[]>();
  for (const event of events) {
    const key = `${event.surface}:${event.actor.kind}:${event.actor.id}`;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  const pairs: TastePair[] = [];
  for (const [key, list] of groups) {
    const surface = key.startsWith('newsletter') ? 'newsletter' : 'recipes';
    const positive = surface === 'recipes' ? 'like' : 'click';
    const negative = surface === 'recipes' ? 'skip' : 'unsubscribe';
    const chosen = list.filter((event) => event.action === positive);
    const rejected = list.filter((event) => event.action === negative);
    const count = Math.min(chosen.length, rejected.length);
    for (let i = 0; i < count; i += 1) {
      const keep = chosen[i];
      const drop = rejected[i];
      if (keep.itemId === drop.itemId) continue;
      pairs.push({
        prompt: surface === 'recipes' ? 'Which style recipe should the studio keep?' : 'Which letter should the studio keep sending?',
        chosen: describeItem(keep),
        rejected: describeItem(drop),
        license: 'internal-owner',
        provenance: { source: `taste:${surface}`, collectedAt: Math.max(keep.at, drop.at) },
        consent: keep.actor.kind === 'owner' ? 'owner' : 'missing',
        ownerId: 'owner',
      });
    }
  }
  return pairs;
}
