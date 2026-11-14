import { INTEREST_CAP, INTEREST_RATE, MAX_LEVEL, SELL_RATE, START_GOLD, START_LIVES, TOWERS, type TowerKind } from './config';

function share(amount: number, rate: number): number {
  return Math.floor(Math.round(amount * rate * 1e6) / 1e6);
}

export function interestFor(gold: number): number {
  if (gold <= 0) return 0;
  return Math.min(INTEREST_CAP, share(gold, INTEREST_RATE));
}

export function totalCost(kind: TowerKind, level: number): number {
  let sum = 0;
  for (let i = 0; i < Math.min(level, MAX_LEVEL); i++) sum += TOWERS[kind].levels[i].cost;
  return sum;
}

export function upgradeCost(kind: TowerKind, level: number): number | null {
  return level >= MAX_LEVEL ? null : TOWERS[kind].levels[level].cost;
}

export function sellValue(spent: number): number {
  return share(spent, SELL_RATE);
}

export class Economy {
  gold = START_GOLD;
  lives = START_LIVES;

  canAfford(cost: number): boolean {
    return this.gold >= cost;
  }

  spend(cost: number): boolean {
    if (cost < 0 || this.gold < cost) return false;
    this.gold -= cost;
    return true;
  }

  earn(amount: number): void {
    this.gold += Math.max(0, Math.floor(amount));
  }

  payInterest(): number {
    const paid = interestFor(this.gold);
    this.gold += paid;
    return paid;
  }

  loseLives(n: number): void {
    this.lives = Math.max(0, this.lives - n);
  }

  get dead(): boolean {
    return this.lives <= 0;
  }
}
