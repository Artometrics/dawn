/** Tuning numbers from Pantheon Towers (`games/towers`). Tests pin the rules that matter. */

export const START_GOLD = 150;
export const START_LIVES = 20;
export const MAX_WAVE = 10;
export const INTEREST_RATE = 0.05;
export const INTEREST_CAP = 40;
export const SELL_RATE = 0.7;
export const FIXED_STEP = 1 / 60;

export type EnemyKind = 'smudge' | 'blotter' | 'moth' | 'eraser';
export type TowerKind = 'archer' | 'mage' | 'slow' | 'support';
export const TOWER_KINDS: readonly TowerKind[] = ['archer', 'mage', 'slow', 'support'];

export type EnemyDef = {
  kind: EnemyKind;
  name: string;
  hp: number;
  speed: number;
  bounty: number;
  flying: boolean;
  leak: number;
  slowResist: number;
  armor: number;
  radius: number;
  fixedHp?: boolean;
};

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  smudge: { kind: 'smudge', name: 'Minion', hp: 40, speed: 3.0, bounty: 4, flying: false, leak: 1, slowResist: 0, armor: 0, radius: 0.38 },
  blotter: { kind: 'blotter', name: 'Warrior', hp: 240, speed: 1.1, bounty: 14, flying: false, leak: 1, slowResist: 0.5, armor: 6, radius: 0.62 },
  moth: { kind: 'moth', name: 'Floating Mage', hp: 80, speed: 2.2, bounty: 8, flying: true, leak: 1, slowResist: 0, armor: 0, radius: 0.42 },
  eraser: { kind: 'eraser', name: 'The Bone King', hp: 3200, speed: 0.85, bounty: 120, flying: false, leak: 5, slowResist: 0.6, armor: 10, radius: 1.1, fixedHp: true },
};

export type TargetMode = 'first' | 'strongest' | 'densest' | 'closest';

export type TowerLevel = {
  cost: number;
  damage: number;
  cooldown: number;
  range: number;
  splash: number;
  slow: { amount: number; duration: number } | null;
  shots: number;
  buff: { damage: number; range: number; radius: number } | null;
};

export type TowerDef = {
  kind: TowerKind;
  name: string;
  blurb: string;
  mode: TargetMode;
  hitsAir: boolean;
  hitsGround: boolean;
  levels: readonly [TowerLevel, TowerLevel, TowerLevel];
};

const none = { splash: 0, slow: null, shots: 1, buff: null } as const;

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: 'archer',
    name: 'Ranger',
    blurb: 'Fast arrows. Hits ground and air. Level 3 fires two arrows.',
    mode: 'first',
    hitsAir: true,
    hitsGround: true,
    levels: [
      { ...none, cost: 60, damage: 9, cooldown: 0.6, range: 4.2 },
      { ...none, cost: 40, damage: 15, cooldown: 0.55, range: 4.6 },
      { ...none, cost: 70, damage: 21, cooldown: 0.5, range: 5.0, shots: 2 },
    ],
  },
  mage: {
    kind: 'mage',
    name: 'Arcanist',
    blurb: 'Arcane blast with splash. Ground only.',
    mode: 'densest',
    hitsAir: false,
    hitsGround: true,
    levels: [
      { ...none, cost: 90, damage: 48, cooldown: 1.6, range: 3.6, splash: 1.4 },
      { ...none, cost: 60, damage: 82, cooldown: 1.5, range: 3.9, splash: 1.6 },
      { ...none, cost: 100, damage: 136, cooldown: 1.4, range: 4.2, splash: 1.9 },
    ],
  },
  slow: {
    kind: 'slow',
    name: 'Warden',
    blurb: 'A shield slam slows everything in range, ground and air.',
    mode: 'first',
    hitsAir: true,
    hitsGround: true,
    levels: [
      { ...none, cost: 70, damage: 2, cooldown: 1.2, range: 2.8, slow: { amount: 0.35, duration: 1.5 } },
      { ...none, cost: 45, damage: 4, cooldown: 1.2, range: 3.2, slow: { amount: 0.45, duration: 1.5 } },
      { ...none, cost: 80, damage: 7, cooldown: 1.2, range: 3.6, slow: { amount: 0.55, duration: 1.5 } },
    ],
  },
  support: {
    kind: 'support',
    name: 'Spotter',
    blurb: 'Marks targets so nearby towers hit harder and reach farther. Bonuses do not stack.',
    mode: 'first',
    hitsAir: false,
    hitsGround: false,
    levels: [
      { ...none, cost: 100, damage: 0, cooldown: 1, range: 3.4, buff: { damage: 0.2, range: 0, radius: 3.4 } },
      { ...none, cost: 60, damage: 0, cooldown: 1, range: 3.8, buff: { damage: 0.35, range: 0.1, radius: 3.8 } },
      { ...none, cost: 100, damage: 0, cooldown: 1, range: 4.2, buff: { damage: 0.5, range: 0.2, radius: 4.2 } },
    ],
  },
};

export const MAX_LEVEL = 3;

export const HERO = {
  name: 'Barbarian',
  speed: 4.6,
  attackDamage: 10,
  attackCooldown: 0.8,
  attackRange: 3.0,
  ability: {
    name: 'Axe Storm',
    cooldown: 18,
    radius: 2.4,
    shells: 6,
    firstDelay: 0.7,
    shellGap: 0.16,
    shellDamage: 55,
    shellSplash: 1.5,
    slow: { amount: 0.4, duration: 1.5 },
  },
} as const;

export const PROJECTILE_SPEED: Record<'arrow' | 'orb', number> = { arrow: 16, orb: 11 };
