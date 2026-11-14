/** Extra instanced pines (seed 7 base forest) to occlude the cabin window until ~z −88. */
export const WINDOW_REVEAL_PINES = [
  { x: 2.397256442501641, z: -58.43223314821073, s: 0.85, r: 0 },
  { x: -2.2519096981387587, z: -91.73370334990071, s: 0.93, r: 0.73 },
  { x: -2.60381859719233, z: -94.42182331482107, s: 1, r: 0 },
  { x: 0.48997968233442, z: -60.894603906108, s: 1, r: 0 },
];

export function applyWindowRevealPines(trees) {
  for (const t of WINDOW_REVEAL_PINES) {
    if (trees.some((u) => (u.x - t.x) ** 2 + (u.z - t.z) ** 2 < 4)) continue;
    trees.push({ ...t });
  }
}
