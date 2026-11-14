/** Shared walk types. Positions are `[longitude, latitude]`, matching MapLibre. */

export type LngLat = [number, number];

export type QuestType = 'visit' | 'kind' | 'chain' | 'boss';

export type Quest = {
  id: string;
  ty: QuestType;
  /** Place id, kind label, or boss place id. */
  tg: string;
  tg2?: string;
  n?: number;
  t: string;
  ic: string;
  xp: number;
  g: number;
};

export type WalkRpg = {
  hp: number;
  streak: number;
  best: number;
  /** Pacific day the streak was last counted, `YYYY-MM-DD`. */
  day: string;
  eq: string[];
  bosses: number;
};

export type FirstSteps = {
  j?: 1;
  v?: 1;
  w?: 1;
  all?: 1;
};

/** Persistent character. Stored at `dawn.walk.v1`. Never sent off the phone. */
export type WalkState = {
  xp: number;
  gold: number;
  metres: number;
  wins: number;
  loot: string[];
  seen: string[];
  sprite: string;
  name: string;
  rpg: WalkRpg;
  fs: FirstSteps;
};

/** Resets each Pacific day. Stored at `dawn.walk.day.v1`. */
export type DayState = {
  day: string;
  /** Place ids visited today. */
  dv: string[];
  dm: number;
  dw: number;
  /** Boss place ids beaten today. */
  db: string[];
  dxp: number;
  q: Quest[];
  /** Geohash of the area the quests were rolled for. */
  qa: string;
  /** How many places were in view when the board was rolled. A later scan can refresh it. */
  qn: number;
  qc: string[];
};

export type PoiSeed = {
  id: string;
  lat: number;
  lon: number;
  tags: { amenity: string; name: string };
  boss?: boolean;
};

export type Place = {
  id: string;
  ll: LngLat;
  /** Sprite file (no extension) and the in-game kind name. */
  kind: [string, string];
  name: string;
  boss: boolean;
  bossKind: [string, string];
  amenity: string;
};

export type TileFeature = {
  id?: string | number;
  properties?: { class?: string; subclass?: string; name?: string };
  geometry?: { type?: string; coordinates?: number[] };
};
