/**
 * Pantheon Towers simulation from Artometrics/pantheon `games/towers`.
 * The three.js courtyard stays in that repo. This class is the rules.
 */
import {
  ENEMIES,
  FIXED_STEP,
  HERO,
  MAX_LEVEL,
  MAX_WAVE,
  PROJECTILE_SPEED,
  TOWERS,
  type EnemyDef,
  type EnemyKind,
  type TowerDef,
  type TowerKind,
  type TowerLevel,
} from './config';
import { Economy, sellValue, totalCost, upgradeCost } from './economy';
import { AIR_ROUTE, BOUNDS, HERO_START, PATH, SLOTS } from './map';
import type { Route } from './pathing';
import { mulberry32 } from './rng';
import { pickTarget, pickTargets } from './targeting';
import { WAVES, enemyHp, schedule, type Spawn } from './waves';

export type Phase = 'build' | 'wave' | 'won' | 'lost';

export type Enemy = {
  id: number;
  kind: EnemyKind;
  def: EnemyDef;
  route: Route;
  hp: number;
  maxHp: number;
  d: number;
  x: number;
  z: number;
  flying: boolean;
  progress: number;
  slowLeft: number;
  slowAmount: number;
  alive: boolean;
};

export type Tower = {
  id: number;
  kind: TowerKind;
  slot: number;
  level: number;
  spent: number;
  x: number;
  z: number;
  cooldown: number;
  aim: number;
  buffDamage: number;
  buffRange: number;
};

type Projectile = {
  id: number;
  kind: 'arrow' | 'orb';
  x: number;
  z: number;
  tx: number;
  tz: number;
  targetId: number;
  damage: number;
  splash: number;
  air: boolean;
  ground: boolean;
  slow: { amount: number; duration: number } | null;
};

type Shell = { time: number; x: number; z: number };

export type Hero = {
  x: number;
  z: number;
  goalX: number | null;
  goalZ: number | null;
  facing: number;
  attackCooldown: number;
  abilityCooldown: number;
};

export type Result = { ok: true } | { ok: false; reason: string };
const ok: Result = { ok: true };
const no = (reason: string): Result => ({ ok: false, reason });
const MAX_CHUNK = 60;

export class Game {
  readonly economy = new Economy();
  phase: Phase = 'build';
  wave = 0;
  best: number;
  speed: 1 | 2 = 1;
  paused = false;
  kills = 0;
  enemies: Enemy[] = [];
  towers: Tower[] = [];
  hero: Hero = {
    x: HERO_START.x,
    z: HERO_START.z,
    goalX: null,
    goalZ: null,
    facing: 0,
    attackCooldown: 0,
    abilityCooldown: 0,
  };

  private projectiles: Projectile[] = [];
  private shells: Shell[] = [];
  private queue: Spawn[] = [];
  private queueIndex = 0;
  private waveTime = 0;
  private nextId = 1;
  private acc = 0;
  private readonly rand: () => number;

  constructor(options: { seed?: number; best?: number } = {}) {
    this.rand = mulberry32(options.seed ?? 1);
    this.best = options.best ?? 0;
  }

  get gold(): number { return this.economy.gold; }
  get lives(): number { return this.economy.lives; }
  get over(): boolean { return this.phase === 'won' || this.phase === 'lost'; }
  get remaining(): number { return this.queue.length - this.queueIndex + this.enemies.length; }

  towerAt(slot: number): Tower | undefined {
    return this.towers.find((tower) => tower.slot === slot);
  }

  placeTower(slot: number, kind: TowerKind): Result {
    if (this.over) return no('The run is over.');
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS.length) return no('No such slot.');
    if (this.towerAt(slot)) return no('That slot is taken.');
    const cost = TOWERS[kind].levels[0].cost;
    if (!this.economy.spend(cost)) return no('Not enough gold.');
    const pos = SLOTS[slot];
    this.towers.push({
      id: this.nextId++, kind, slot, level: 1, spent: cost, x: pos.x, z: pos.z,
      cooldown: 0.4, aim: 0, buffDamage: 0, buffRange: 0,
    });
    return ok;
  }

  upgradeTower(id: number): Result {
    if (this.over) return no('The run is over.');
    const tower = this.towers.find((row) => row.id === id);
    if (!tower) return no('No such tower.');
    const cost = upgradeCost(tower.kind, tower.level);
    if (cost === null) return no('Already at the top level.');
    if (!this.economy.spend(cost)) return no('Not enough gold.');
    tower.level += 1;
    tower.spent += cost;
    return ok;
  }

  sellTower(id: number): Result {
    if (this.over) return no('The run is over.');
    const index = this.towers.findIndex((row) => row.id === id);
    if (index < 0) return no('No such tower.');
    const tower = this.towers[index];
    this.economy.earn(sellValue(tower.spent));
    this.towers.splice(index, 1);
    return ok;
  }

  startWave(): Result {
    if (this.phase !== 'build') return no('A wave is already running.');
    if (this.wave >= MAX_WAVE) return no('No more waves.');
    this.wave += 1;
    this.queue = schedule(WAVES[this.wave - 1]);
    this.queueIndex = 0;
    this.waveTime = 0;
    this.phase = 'wave';
    if (this.wave > this.best) this.best = this.wave;
    return ok;
  }

  moveHero(x: number, z: number): void {
    this.hero.goalX = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
    this.hero.goalZ = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));
  }

  castAbility(x: number, z: number): Result {
    if (this.over) return no('The run is over.');
    if (this.hero.abilityCooldown > 0) return no('Still recharging.');
    const ability = HERO.ability;
    const cx = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
    const cz = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));
    this.hero.abilityCooldown = ability.cooldown;
    for (let i = 0; i < ability.shells; i += 1) {
      let sx = cx;
      let sz = cz;
      if (i > 0) {
        const ang = this.rand() * Math.PI * 2;
        const dist = Math.sqrt(this.rand()) * (ability.radius - 0.4);
        sx += Math.cos(ang) * dist;
        sz += Math.sin(ang) * dist;
      }
      this.shells.push({ time: ability.firstDelay + i * ability.shellGap, x: sx, z: sz });
    }
    return ok;
  }

  update(realDt: number): void {
    if (this.paused || this.over) return;
    this.acc += Math.min(realDt, 0.1) * this.speed;
    let steps = 0;
    while (this.acc >= FIXED_STEP && steps < MAX_CHUNK && !this.over) {
      this.step(FIXED_STEP);
      this.acc -= FIXED_STEP;
      steps += 1;
    }
    if (steps === MAX_CHUNK) this.acc = 0;
  }

  step(dt: number): void {
    if (this.over) return;
    this.spawnDue(dt);
    this.moveEnemies(dt);
    if (this.over) return;
    this.computeBuffs();
    for (const tower of this.towers) this.runTower(tower, dt);
    this.runHero(dt);
    this.runProjectiles(dt);
    this.runShells(dt);
    this.enemies = this.enemies.filter((enemy) => enemy.alive);
    this.checkWaveEnd();
  }

  private spawnDue(dt: number): void {
    if (this.phase !== 'wave') return;
    this.waveTime += dt;
    const def = WAVES[this.wave - 1];
    while (this.queueIndex < this.queue.length && this.queue[this.queueIndex].time <= this.waveTime) {
      this.spawn(this.queue[this.queueIndex].kind, enemyHp(this.queue[this.queueIndex].kind, def));
      this.queueIndex += 1;
    }
  }

  spawn(kind: EnemyKind, hp: number = ENEMIES[kind].hp): Enemy {
    const def = ENEMIES[kind];
    const route: Route = def.flying ? AIR_ROUTE : PATH;
    const start = route.at(0);
    const enemy: Enemy = {
      id: this.nextId++, kind, def, route, hp, maxHp: hp, d: 0,
      x: start.x, z: start.z, flying: def.flying, progress: 0,
      slowLeft: 0, slowAmount: 0, alive: true,
    };
    this.enemies.push(enemy);
    return enemy;
  }

  private moveEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      let speed = enemy.def.speed;
      if (enemy.slowLeft > 0) {
        enemy.slowLeft -= dt;
        speed *= 1 - enemy.slowAmount;
        if (enemy.slowLeft <= 0) enemy.slowAmount = 0;
      }
      enemy.d += speed * dt;
      const point = enemy.route.at(enemy.d);
      enemy.x = point.x;
      enemy.z = point.z;
      enemy.progress = enemy.d / enemy.route.length;
      if (enemy.d >= enemy.route.length) {
        enemy.alive = false;
        this.economy.loseLives(enemy.def.leak);
        if (this.economy.dead) this.phase = 'lost';
      }
    }
  }

  private computeBuffs(): void {
    for (const tower of this.towers) {
      tower.buffDamage = 0;
      tower.buffRange = 0;
    }
    for (const support of this.towers) {
      if (support.kind !== 'support') continue;
      const buff = TOWERS.support.levels[support.level - 1].buff;
      if (!buff) continue;
      for (const tower of this.towers) {
        if (tower === support || tower.kind === 'support') continue;
        if (Math.hypot(tower.x - support.x, tower.z - support.z) <= buff.radius) {
          tower.buffDamage = Math.max(tower.buffDamage, buff.damage);
          tower.buffRange = Math.max(tower.buffRange, buff.range);
        }
      }
    }
  }

  stats(tower: Tower): TowerLevel & { effDamage: number; effRange: number } {
    const level = TOWERS[tower.kind].levels[tower.level - 1];
    return { ...level, effDamage: level.damage * (1 + tower.buffDamage), effRange: level.range * (1 + tower.buffRange) };
  }

  private runTower(tower: Tower, dt: number): void {
    const def: TowerDef = TOWERS[tower.kind];
    if (tower.kind === 'support') return;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    const stats = this.stats(tower);
    const opts = { air: def.hitsAir, ground: def.hitsGround, splash: stats.splash };
    if (tower.kind === 'slow') {
      const any = this.enemies.some((enemy) => enemy.alive && Math.hypot(enemy.x - tower.x, enemy.z - tower.z) <= stats.effRange);
      if (!any) return;
      tower.cooldown = stats.cooldown;
      for (const enemy of this.enemies) {
        if (!enemy.alive || Math.hypot(enemy.x - tower.x, enemy.z - tower.z) > stats.effRange) continue;
        if (stats.slow) this.applySlow(enemy, stats.slow.amount, stats.slow.duration);
        this.damage(enemy, stats.effDamage);
      }
      return;
    }
    const targets = pickTargets(def.mode, tower, stats.effRange, this.enemies, opts, stats.shots);
    if (targets.length === 0) return;
    tower.cooldown = stats.cooldown;
    tower.aim = Math.atan2(targets[0].x - tower.x, targets[0].z - tower.z);
    for (const target of targets) {
      this.projectiles.push({
        id: this.nextId++,
        kind: tower.kind === 'mage' ? 'orb' : 'arrow',
        x: tower.x, z: tower.z, tx: target.x, tz: target.z, targetId: target.id,
        damage: stats.effDamage, splash: stats.splash, air: def.hitsAir, ground: def.hitsGround, slow: null,
      });
    }
  }

  private runHero(dt: number): void {
    const hero = this.hero;
    hero.attackCooldown -= dt;
    hero.abilityCooldown = Math.max(0, hero.abilityCooldown - dt);
    if (hero.goalX !== null && hero.goalZ !== null) {
      const dx = hero.goalX - hero.x;
      const dz = hero.goalZ - hero.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        hero.goalX = null;
        hero.goalZ = null;
      } else {
        const step = Math.min(dist, HERO.speed * dt);
        hero.x += (dx / dist) * step;
        hero.z += (dz / dist) * step;
        hero.facing = Math.atan2(dx, dz);
      }
    }
    if (hero.attackCooldown > 0) return;
    const target = pickTarget('closest', hero, HERO.attackRange, this.enemies, { air: true, ground: true });
    if (!target) return;
    hero.attackCooldown = HERO.attackCooldown;
    this.projectiles.push({
      id: this.nextId++, kind: 'arrow', x: hero.x, z: hero.z, tx: target.x, tz: target.z,
      targetId: target.id, damage: HERO.attackDamage, splash: 0, air: true, ground: true, slow: null,
    });
  }

  private runProjectiles(dt: number): void {
    const keep: Projectile[] = [];
    for (const shot of this.projectiles) {
      const target = this.enemies.find((enemy) => enemy.id === shot.targetId && enemy.alive);
      if (target) {
        shot.tx = target.x;
        shot.tz = target.z;
      }
      const speed = PROJECTILE_SPEED[shot.kind];
      const dx = shot.tx - shot.x;
      const dz = shot.tz - shot.z;
      const dist = Math.hypot(dx, dz);
      const move = speed * dt;
      if (dist <= move) {
        this.land(shot, target);
        continue;
      }
      shot.x += (dx / dist) * move;
      shot.z += (dz / dist) * move;
      keep.push(shot);
    }
    this.projectiles = keep;
  }

  private land(shot: Projectile, target: Enemy | undefined): void {
    if (shot.splash > 0) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || (enemy.flying ? !shot.air : !shot.ground)) continue;
        if (Math.hypot(enemy.x - shot.tx, enemy.z - shot.tz) <= shot.splash + enemy.def.radius * 0.5) this.damage(enemy, shot.damage);
      }
      return;
    }
    if (target?.alive) {
      if (shot.slow) this.applySlow(target, shot.slow.amount, shot.slow.duration);
      this.damage(target, shot.damage);
    }
  }

  private runShells(dt: number): void {
    const ability = HERO.ability;
    const keep: Shell[] = [];
    for (const shell of this.shells) {
      shell.time -= dt;
      if (shell.time > 0) {
        keep.push(shell);
        continue;
      }
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (Math.hypot(enemy.x - shell.x, enemy.z - shell.z) <= ability.shellSplash + enemy.def.radius * 0.5) {
          this.applySlow(enemy, ability.slow.amount, ability.slow.duration);
          this.damage(enemy, ability.shellDamage);
        }
      }
    }
    this.shells = keep;
  }

  private applySlow(enemy: Enemy, amount: number, duration: number): void {
    const effective = amount * (1 - enemy.def.slowResist);
    if (enemy.slowLeft > 0 && enemy.slowAmount > effective) {
      enemy.slowLeft = Math.max(enemy.slowLeft, duration);
      return;
    }
    enemy.slowAmount = effective;
    enemy.slowLeft = duration;
  }

  private damage(enemy: Enemy, amount: number): void {
    if (!enemy.alive || amount <= 0) return;
    enemy.hp -= Math.max(amount * 0.25, amount - enemy.def.armor);
    if (enemy.hp <= 0) {
      enemy.alive = false;
      this.kills += 1;
      this.economy.earn(enemy.def.bounty);
    }
  }

  private checkWaveEnd(): void {
    if (this.phase !== 'wave') return;
    if (this.queueIndex < this.queue.length || this.enemies.length > 0) return;
    const def = WAVES[this.wave - 1];
    this.economy.earn(def?.bonus ?? 0);
    this.economy.payInterest();
    this.phase = this.wave >= MAX_WAVE ? 'won' : 'build';
  }

  static totalCost(kind: TowerKind, level: number): number {
    return totalCost(kind, Math.min(level, MAX_LEVEL));
  }
}
