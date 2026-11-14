/**
 * Walk, trail run, and the capped run used on the wooden stairs and inside the station room.
 * Speeds are metres per second. Stair bounds come from the flight already built in the scene.
 */

export function movePlan(move, { mag, runIntent, confined }) {
  const m = Math.min(1, Math.max(0, mag));
  if (!(m > 0.08)) return { moving: false, speed: 0, clip: 'idle' };
  const capped = !!(runIntent && confined);
  const rate = runIntent ? (capped ? move.confinedRun : move.run) : move.walk;
  return { moving: true, speed: rate * m, clip: runIntent && !capped ? 'run' : 'walk' };
}

/** True when (x, z) is on the 12-tread flight. pathX is the tread centre at this z. */
export function onWoodenStairs(x, z, stairs) {
  const pad = stairs.zPad;
  if (z > stairs.z0 + pad || z < stairs.z1 - pad) return false;
  return Math.abs(x - stairs.pathX) <= stairs.halfWidth + stairs.edge;
}

/** Stairs, or the station room. The porch is not a confined zone unless inRoom says so. */
export function confinedRunZone(x, z, ctx) {
  if (onWoodenStairs(x, z, ctx.stairs)) return true;
  return !!ctx.inRoom;
}

/** Metres between steps. The span is the trail run speed, so a capped run lands between walk and run. */
export function stepStride(speed, runSpeed) {
  const span = runSpeed - 0.4;
  const t = span > 0 ? Math.min(1, Math.max(0, (speed - 0.4) / span)) : 1;
  return 0.72 + (1.35 - 0.72) * t;
}

/** One footstep tick. Standing still (under 0.12 m/s) clears the carry and stays silent. */
export function noteStep(state, dist, speed, runSpeed) {
  if (!(speed >= 0.12)) {
    state.carry = 0;
    return false;
  }
  const stride = stepStride(speed, runSpeed);
  state.carry += dist;
  if (state.carry < stride) return false;
  state.carry = Math.min(state.carry - stride, stride * 0.35);
  return true;
}
