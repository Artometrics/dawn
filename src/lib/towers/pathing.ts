/** Paths and routes. A route is anything an enemy can walk or fly along. */

export type Pt = { x: number; z: number };

export interface Route {
  readonly length: number;
  /** Position after travelling `d` world units, clamped to the route. */
  at(d: number): Pt & { dx: number; dz: number };
}

export class Path implements Route {
  readonly points: readonly Pt[];
  readonly cum: readonly number[];
  readonly length: number;

  constructor(points: readonly Pt[]) {
    if (points.length < 2) throw new Error('A path needs at least two points.');
    this.points = points;
    const cum = [0];
    for (let i = 1; i < points.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
    }
    this.cum = cum;
    this.length = cum[cum.length - 1];
  }

  at(d: number): Pt & { dx: number; dz: number } {
    const clamped = Math.max(0, Math.min(this.length, d));
    let i = 1;
    while (i < this.cum.length - 1 && this.cum[i] < clamped) i++;
    const a = this.points[i - 1];
    const b = this.points[i];
    const seg = this.cum[i] - this.cum[i - 1];
    const t = seg === 0 ? 0 : (clamped - this.cum[i - 1]) / seg;
    const dx = seg === 0 ? 1 : (b.x - a.x) / seg;
    const dz = seg === 0 ? 0 : (b.z - a.z) / seg;
    return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx, dz };
  }
}
