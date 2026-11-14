#!/usr/bin/env node
/**
 * Samples the player camera along the path every 2 m (default yaw/pitch)
 * and raycasts toward the cabin window centre through terrain + instanced pines.
 * Uses tree seed 7 and the same rules as public/game.js.
 *
 * Set APPLY_WINDOW_REVEAL=0 to check the base forest only (before reveal pines).
 */
import * as THREE from '../public/vendor/build/three.module.js';
import { WINDOW_REVEAL_PINES } from '../public/pine-window-reveal.js';
import { filterRidgeGapTrees } from '../public/ridge-pine-gap.js';
import { pathToFileURL } from 'node:url';

const applyReveal = process.env.APPLY_WINDOW_REVEAL !== '0';

const PATH = [[0, 0], [0, -14], [5, -28], [3, -42], [-4, -54], [-5, -66], [0, -80], [6, -92], [4, -104], [0, -114]].map(
  ([x, z]) => new THREE.Vector3(x, 0, z),
);
const curve = new THREE.CatmullRomCurve3(PATH);
const samples = curve.getSpacedPoints(400);
const STAIR0 = -62;
const STAIR1 = -70;
const RISE = 2.4;
const hAt = (z) => {
  const t = THREE.MathUtils.clamp((STAIR0 - z) / (STAIR0 - STAIR1), 0, 1);
  return t * RISE;
};
function nearPath(x, z) {
  let best = 1e9;
  let bi = 0;
  for (let i = 0; i < samples.length; i += 2) {
    const s = samples[i];
    const d = (s.x - x) ** 2 + (s.z - z) ** 2;
    if (d < best) {
      best = d;
      bi = i;
    }
  }
  return { d: Math.sqrt(best), p: samples[bi], i: bi };
}
function cabinPos() {
  return new THREE.Vector3(-3, 0, -120);
}

function buildTrees() {
  const trees = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600 && trees.length < 520; i++) {
    const x = (rnd() - 0.5) * 88;
    const z = 10 - rnd() * 150;
    const n = nearPath(x, z);
    if (n.d < 3.6) continue;
    if (Math.hypot(x - cabinPos().x, z - cabinPos().z) < 8) continue;
    if (trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 4)) continue;
    trees.push({ x, z, s: 0.7 + rnd() * 0.8, r: rnd() * 6.28 });
  }
  if (applyReveal) {
    for (const t of WINDOW_REVEAL_PINES) {
      if (trees.some((u) => (u.x - t.x) ** 2 + (u.z - t.z) ** 2 < 4)) continue;
      trees.push({ ...t });
    }
  }
  return filterRidgeGapTrees(trees, {}, nearPath, curve);
}

const trunkG = new THREE.CylinderGeometry(0.18, 0.32, 14, 7);
trunkG.translate(0, 7, 0);
const coneGs = [0, 1, 2, 3, 4].map((k) => {
  const r = 2.4 - k * 0.42;
  const h = 3.6 - k * 0.3;
  const g = new THREE.ConeGeometry(r, h, 8, 3, true);
  const pa = g.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    pa.setX(i, pa.getX(i) * (1 + Math.sin(i * 12.9) * 0.12));
    pa.setZ(i, pa.getZ(i) * (1 + Math.cos(i * 7.1) * 0.12));
  }
  g.translate(0, 4.2 + k * 2.1, 0);
  g.computeVertexNormals();
  return g;
});

function buildBlockers(trees) {
  const gGeo = new THREE.PlaneGeometry(90, 160, 90, 160);
  gGeo.rotateX(-Math.PI / 2);
  gGeo.translate(0, 0, -60);
  {
    const pa = gGeo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i);
      const z = pa.getZ(i);
      const n = nearPath(x, z);
      let y = hAt(z);
      if (n.d > 3) y += Math.sin(x * 0.7) * Math.cos(z * 0.5) * 0.25 + (n.d - 3) * 0.04;
      pa.setY(i, y);
    }
    gGeo.computeVertexNormals();
  }
  const ground = new THREE.Mesh(gGeo, new THREE.MeshBasicMaterial());
  const blockers = [ground];
  const M = new THREE.Matrix4();
  const Q = new THREE.Quaternion();
  const tr = new THREE.InstancedMesh(trunkG, new THREE.MeshBasicMaterial(), trees.length);
  const cones = coneGs.map((g) => new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial(), trees.length));
  trees.forEach((t, i) => {
    M.compose(
      new THREE.Vector3(t.x, hAt(t.z) - 0.1, t.z),
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.r),
      new THREE.Vector3(t.s, t.s * (0.9 + (i % 5) * 0.06), t.s),
    );
    tr.setMatrixAt(i, M);
    cones.forEach((c) => c.setMatrixAt(i, M));
  });
  blockers.push(tr, ...cones);
  const cabin = new THREE.Group();
  const c = cabinPos();
  cabin.position.set(c.x, hAt(c.z), c.z);
  cabin.rotation.y = -0.15;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(7, 3.4, 5), new THREE.MeshBasicMaterial());
  walls.position.y = 1.7;
  cabin.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2.2, 4), new THREE.MeshBasicMaterial());
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 0.75;
  roof.position.y = 4.5;
  cabin.add(roof);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 14, 5), new THREE.MeshBasicMaterial());
  mast.position.set(-4.5, 7, -1);
  cabin.add(mast);
  blockers.push(cabin);
  return blockers;
}

const trees = buildTrees();
const blockers = buildBlockers(trees);

const cabin = new THREE.Group();
cabin.position.set(-3, hAt(-120), -120);
cabin.rotation.y = -0.15;
const windowWorld = new THREE.Vector3(1.6, 1.9, 2.62);
cabin.localToWorld(windowWorld);

const YAW = Math.PI;
const PITCH = -0.08;
const fwd = new THREE.Vector3();
const right = new THREE.Vector3();
const camPos = new THREE.Vector3();
const rayDir = new THREE.Vector3();
const raycaster = new THREE.Raycaster();

function cameraAtPlayer(playerPos) {
  fwd.set(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
  right.set(-Math.cos(YAW), 0, Math.sin(YAW));
  camPos.copy(playerPos).addScaledVector(right, 0.62).add(new THREE.Vector3(0, 1.62, 0)).addScaledVector(fwd, -2.7);
  return camPos;
}

function sightlineBlocked(from) {
  rayDir.copy(windowWorld).sub(from);
  const distWin = rayDir.length();
  if (distWin < 1e-4) return false;
  rayDir.multiplyScalar(1 / distWin);
  raycaster.set(from, rayDir);
  raycaster.far = distWin - 0.05;
  return raycaster.intersectObjects(blockers, true).length > 0;
}

function samplePointsEvery2m() {
  const pts = [];
  const len = curve.getLength();
  for (let d = 0; d <= len + 1e-6; d += 2) {
    const t = d / len;
    const p = curve.getPointAt(Math.min(t, 1));
    p.y = hAt(p.z);
    pts.push(p);
  }
  return pts;
}

export function runWindowSightlineCheck() {
  const lines = [
    `Window sightline check (camera yaw=π, pitch=-0.08, tree seed=7, reveal pines=${applyReveal ? 'on' : 'off'})`,
    '',
  ];
  let failEarly = 0;
  let failLate = 0;
  for (const p of samplePointsEvery2m()) {
    const cam = cameraAtPlayer(p);
    const blocked = sightlineBlocked(cam);
    lines.push(`z=${p.z.toFixed(1).padStart(7)}  x=${p.x.toFixed(1).padStart(5)}  ${blocked ? 'blocked' : 'VISIBLE'}`);
    if (p.z > -88 && !blocked) failEarly++;
    if (p.z <= -92 && blocked) failLate++;
  }
  lines.push('');
  lines.push(
    `Summary: ${failEarly} sample(s) with z>-88 not blocked; ${failLate} sample(s) with z<=-92 still blocked.`,
  );
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(runWindowSightlineCheck());
}
