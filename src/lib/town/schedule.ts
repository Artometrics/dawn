type AgentId = 'trinity' | 'kali' | 'nimbus';

type Spot = { x: number; y: number };

function chebyshev(a: Spot, b: Spot): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** What the current hour asks the agent to do. */
export type Intent = 'work' | 'meet';

export type DayBlock = {
  startHour: number;
  endHour: number;
  activity: string;
  intent: Intent;
};

/**
 * A short day plan in the shape of Generative Agents' daily schedule.
 * Hours are local, 0–24. Work keeps them at their spot. Meet sends them to talk.
 */
export const DAILY_SCHEDULE: Record<AgentId, DayBlock[]> = {
  trinity: [
    { startHour: 0, endHour: 11, activity: 'planning the day', intent: 'work' },
    { startHour: 11, endHour: 15, activity: 'checking in with the team', intent: 'meet' },
    { startHour: 15, endHour: 19, activity: 'writing the recap', intent: 'work' },
    { startHour: 19, endHour: 22, activity: 'the evening check-in', intent: 'meet' },
    { startHour: 22, endHour: 24, activity: 'closing the day', intent: 'work' },
  ],
  kali: [
    { startHour: 0, endHour: 12, activity: 'reading a book', intent: 'work' },
    { startHour: 12, endHour: 17, activity: 'sharing a finding', intent: 'meet' },
    { startHour: 17, endHour: 19, activity: 'sorting notes', intent: 'work' },
    { startHour: 19, endHour: 22, activity: 'the evening check-in', intent: 'meet' },
    { startHour: 22, endHour: 24, activity: 'putting the books away', intent: 'work' },
  ],
  nimbus: [
    { startHour: 0, endHour: 13, activity: 'sketching a plan', intent: 'work' },
    { startHour: 13, endHour: 18, activity: 'showing the build', intent: 'meet' },
    { startHour: 18, endHour: 19, activity: 'sorting the crates', intent: 'work' },
    { startHour: 19, endHour: 22, activity: 'the evening check-in', intent: 'meet' },
    { startHour: 22, endHour: 24, activity: 'putting tools away', intent: 'work' },
  ],
};

export type NextAct = {
  kind: 'work' | 'walk' | 'talk';
  activity: string;
  targetId?: string;
};

export function blockAt(blocks: DayBlock[], hour: number): DayBlock {
  const wrapped = ((Math.floor(hour) % 24) + 24) % 24;
  return blocks.find((block) => wrapped >= block.startHour && wrapped < block.endHour) ?? blocks[0];
}

/** Names within a few tiles. That is the observation for this tick. */
export function observeNearby(self: Spot & { id: string }, others: Array<Spot & { id: string; name: string }>, reach = 3): string[] {
  return others
    .filter((other) => other.id !== self.id && chebyshev(self, other) <= reach)
    .map((other) => other.name);
}

/**
 * Plan the next act from the day's block.
 * A meet block walks until someone is close enough to talk. Work stays put.
 */
export function planAct(input: {
  intent: Intent;
  activity: string;
  nearestId?: string;
  distance?: number;
  talkDistance: number;
}): NextAct {
  if (input.intent === 'meet' && input.nearestId) {
    if ((input.distance ?? Number.POSITIVE_INFINITY) <= input.talkDistance) {
      return { kind: 'talk', activity: input.activity, targetId: input.nearestId };
    }
    return { kind: 'walk', activity: input.activity, targetId: input.nearestId };
  }
  return { kind: 'work', activity: input.activity };
}

export function observationText(name: string, activity: string, nearby: string[]): string {
  const who = nearby.length ? ` Nearby: ${nearby.join(', ')}.` : '';
  return `${name} is ${activity}.${who}`;
}
