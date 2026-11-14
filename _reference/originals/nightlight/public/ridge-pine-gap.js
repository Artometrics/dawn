/** Defaults merged into game TUNING.valleyLookback. */
export const VALLEY_LOOKBACK_DEFAULTS = {
  gapZMin: -88,
  gapZMax: -76,
  corridorMargin: 5.5,
  /** Trees with lateralDot * gapLateralSign above this are removed in the gap z band. */
  gapLateralSign: -1,
  gapLateralMin: 0.35,
  /** Also thin pines on the far side of the gap that sit in the look-back wedge toward +z. */
  viewWedgeMaxLateral: 0.85,
  viewWedgeMinBack: 0.08,
  viewWedgeMaxDist: 32,
  viewWedgeZMax: -66,
};

function pathTAtZ(curve, z) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) * 0.5;
    if (curve.getPointAt(mid).z > z) lo = mid;
    else hi = mid;
  }
  return (lo + hi) * 0.5;
}

/**
 * Removes instanced pines in a downhill-side band so the ridge can look back at the valley.
 * Does not touch trees within the walkable corridor margin.
 */
export function filterRidgeGapTrees(trees, tuning, nearPath, curve) {
  const {
    gapZMin,
    gapZMax,
    corridorMargin,
    gapLateralSign,
    gapLateralMin,
    viewWedgeMaxLateral,
    viewWedgeMinBack,
    viewWedgeMaxDist,
    viewWedgeZMax,
  } = { ...VALLEY_LOOKBACK_DEFAULTS, ...tuning };
  return trees.filter((t) => {
    const n = nearPath(t.x, t.z);
    const tParam = pathTAtZ(curve, t.z);
    const tangent = curve.getTangentAt(tParam);
    const latX = -tangent.z;
    const latZ = tangent.x;
    const backX = -tangent.x;
    const backZ = -tangent.z;
    const fpX = t.x - n.p.x;
    const fpZ = t.z - n.p.z;
    const len = Math.hypot(fpX, fpZ);
    if (len < 1e-3) return true;
    const lat = (fpX * latX + fpZ * latZ) / len;
    const along = (fpX * backX + fpZ * backZ) / len;

    const inGapBand = t.z >= gapZMin && t.z <= gapZMax;
    const inViewBand = t.z >= gapZMin && t.z <= viewWedgeZMax;
    if (!inGapBand && !inViewBand) return true;
    if (n.d < corridorMargin) return true;

    if (inGapBand && lat * gapLateralSign > gapLateralMin) return false;
    if (
      inViewBand &&
      along > viewWedgeMinBack &&
      n.d < viewWedgeMaxDist &&
      Math.abs(lat) < viewWedgeMaxLateral
    ) {
      return false;
    }
    return true;
  });
}
