import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VALLEY_LOOKBACK_DEFAULTS } from './ridge-pine-gap.js';

export const VALLEY_BUILD_DEFAULTS = {
  anchorX: -5,
  anchorY: 2.4,
  anchorZ: -10,
  spanX: 55,
  spanZ: 42,
  houseCount: 16,
  poleCount: 7,
  valleyPineCount: 10,
  hillRadii: [18, 14, 22, 12],
  hillOffsets: [
    [-8, -4],
    [12, 6],
    [-14, 14],
    [6, -2],
  ],
  roadHalfWidth: 0.55,
  colors: {
    hill: 0x182028,
    house: 0x12161a,
    road: 0x0e1114,
    pole: 0x1a1e22,
    wire: 0x101316,
    horizon: 0x384850,
  },
};

function valleyMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.98,
    metalness: 0,
    fog: false,
  });
}

function wireMat(color) {
  return new THREE.LineBasicMaterial({ color, fog: false });
}

/**
 * Low-poly dark valley (merged meshes + optional valley pine placements).
 * Returns { group, valleyPines } where valleyPines are {x,z,s,r} in world space.
 */
export function buildDarkValley(tuning, rnd) {
  const T = {
    ...VALLEY_LOOKBACK_DEFAULTS,
    ...VALLEY_BUILD_DEFAULTS,
    ...tuning,
    colors: { ...VALLEY_BUILD_DEFAULTS.colors, ...tuning?.colors },
  };
  const { anchorX, anchorY, anchorZ, spanX, spanZ } = T;
  const group = new THREE.Group();
  group.position.set(anchorX, anchorY, anchorZ);

  const solidGeos = [];
  const C = T.colors;

  for (let i = 0; i < T.hillRadii.length; i++) {
    const [ox, oz] = T.hillOffsets[i] ?? [0, 0];
    const r = T.hillRadii[i];
    const g = new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.42);
    g.scale(1, 0.28, 1.1);
    g.translate(ox, r * 0.08, oz);
    solidGeos.push(g);
  }

  const roadLen = spanZ * 0.92;
  const road = new THREE.BoxGeometry(T.roadHalfWidth * 2, 0.08, roadLen);
  road.translate(0, 0.04, spanZ * 0.08);
  solidGeos.push(road);

  const houseGeos = [];
  for (let i = 0; i < T.houseCount; i++) {
    const hx = (rnd() - 0.5) * spanX * 0.92;
    const hz = rnd() * spanZ * 0.88 - spanZ * 0.08;
    if (Math.abs(hx) < T.roadHalfWidth + 1.2) continue;
    const w = 1.1 + rnd() * 1.8;
    const d = 0.9 + rnd() * 1.4;
    const h = 0.7 + rnd() * 1.1;
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(hx, h * 0.5, hz);
    houseGeos.push(g);
  }

  const poleXs = [];
  const poleZ0 = -spanZ * 0.05;
  const poleZ1 = spanZ * 0.75;
  for (let i = 0; i < T.poleCount; i++) {
    const t = i / Math.max(1, T.poleCount - 1);
    const pz = THREE.MathUtils.lerp(poleZ0, poleZ1, t);
    const px = T.roadHalfWidth + 1.15 + (i % 2) * 0.08;
    poleXs.push(px);
    const pole = new THREE.CylinderGeometry(0.05, 0.07, 5.2, 5);
    pole.translate(px, 2.6, pz);
    solidGeos.push(pole);
  }

  const mergedHills = mergeGeometries(
    solidGeos.map((g) => g.clone()),
    false,
  );
  const mergedHouses =
    houseGeos.length > 0 ? mergeGeometries(houseGeos, false) : null;

  group.add(new THREE.Mesh(mergedHills, valleyMat(C.hill)));
  if (mergedHouses) group.add(new THREE.Mesh(mergedHouses, valleyMat(C.house)));
  group.add(new THREE.Mesh(road, valleyMat(C.road)));

  const wirePoints = [];
  for (let i = 0; i < poleXs.length - 1; i++) {
    const zA = THREE.MathUtils.lerp(poleZ0, poleZ1, i / Math.max(1, T.poleCount - 1));
    const zB = THREE.MathUtils.lerp(poleZ0, poleZ1, (i + 1) / Math.max(1, T.poleCount - 1));
    const x = poleXs[i];
    const yTop = 4.85;
    const sag = 0.55 + rnd() * 0.35;
    const midZ = (zA + zB) * 0.5;
    wirePoints.push(x, yTop, zA, x, yTop - sag, midZ, x, yTop, zB);
  }
  if (wirePoints.length) {
    const wg = new THREE.BufferGeometry();
    wg.setAttribute('position', new THREE.Float32BufferAttribute(wirePoints, 3));
    group.add(new THREE.LineSegments(wg, wireMat(C.wire)));
  }

  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(spanX * 1.35, 8),
    valleyMat(C.horizon),
  );
  haze.position.set(0, 3.4, spanZ * 0.52);
  haze.rotation.x = -0.05;
  haze.scale.set(1.15, 1.2, 1);
  group.add(haze);

  const valleyPines = [];
  for (let i = 0; i < T.valleyPineCount; i++) {
    const px = (rnd() - 0.5) * spanX;
    const pz = rnd() * spanZ * 0.7;
    if (Math.abs(px) < 2.5 && pz < spanZ * 0.4) continue;
    valleyPines.push({
      x: anchorX + px,
      y: anchorY + 0.15 + rnd() * 0.4,
      z: anchorZ + pz,
      s: 0.45 + rnd() * 0.35,
      r: rnd() * 6.28,
    });
  }

  return { group, valleyPines };
}
