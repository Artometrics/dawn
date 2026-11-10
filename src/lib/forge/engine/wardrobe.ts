import * as THREE from 'three';
import { CATALOG } from '../schema';
import { outlined, type createMaterials } from './materials';
import type { Skel } from './skeleton';
import type { ForgeCharacter, PartGroup } from '../schema';

// Ported from Pantheon Forge (tools/forge/src/wardrobe.js) with TypeScript types added.

type Mats = ReturnType<typeof createMaterials>;
type Vec3 = [number, number, number];
type Put = (bone: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, pos?: Vec3 | null, rot?: Vec3 | null, width?: number) => THREE.Mesh;
type Cyl = (r0: number, r1: number, h: number, seg?: number, open?: boolean) => THREE.CylinderGeometry;
type Box = (x: number, y: number, z: number) => THREE.BoxGeometry;
type Measures = Skel['measures'];

const SHAPES: Record<string, { x: number; y: number; z: number; jaw: number; nose: number }> = {
  oval: { x: 0.92, y: 1.08, z: 0.96, jaw: 1, nose: 1 },
  round: { x: 1.05, y: 0.98, z: 1.02, jaw: 1.05, nose: 0.8 },
  square: { x: 1.06, y: 1.02, z: 0.94, jaw: 1.14, nose: 1.05 },
  long: { x: 0.88, y: 1.18, z: 0.92, jaw: 0.92, nose: 1.12 },
};

function sculptHead(radius: number, shape: string) {
  const s = SHAPES[shape] || SHAPES.oval;
  const g = new THREE.SphereGeometry(radius, 16, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) * s.x;
    const y = p.getY(i) * s.y;
    let z = p.getZ(i) * s.z;
    const ny = y / radius;
    const nx = x / radius;
    const nz = z / radius;
    if (ny < -0.1) x *= 1 + (s.jaw - 1) * Math.min(1, (-ny - 0.1) * 1.6);
    if (z > radius * 0.15) z = radius * 0.15 + (z - radius * 0.15) * 0.42;
    if (nz > 0.2 && Math.abs(nx) < 0.2 && ny > -0.35 && ny < 0.22) {
      const t = 1 - Math.abs(nx) / 0.2;
      z += radius * 0.22 * s.nose * t;
    }
    if (ny < -0.45 && nz > 0) z += radius * 0.045;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function hairShell(radius: number, thetaLen: number, gap: number) {
  const phiStart = Math.PI / 2 + gap / 2;
  const phiLen = Math.PI * 2 - gap;
  return new THREE.SphereGeometry(radius, 18, 12, phiStart, phiLen, 0.04, thetaLen);
}

export function buildWardrobe(skel: Skel, mats: Mats, spec: ForgeCharacter) {
  const m = skel.measures;
  const by = skel.by;
  const owned: THREE.BufferGeometry[] = [];
  const put: Put = (bone, geo, mat, pos, rot, width = 0.006) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    outlined(mesh, width);
    bone.add(mesh);
    owned.push(geo);
    return mesh;
  };
  const cyl: Cyl = (r0, r1, h, seg = 8, open = true) => new THREE.CylinderGeometry(r0, r1, h, seg, 1, open);
  const box: Box = (x, y, z) => new THREE.BoxGeometry(x, y, z);

  const headR = m.headR;
  const shape = spec.parts.head;
  if (!SHAPES[shape]) throw new Error(`Unknown head "${shape}"`);
  const headGeo = sculptHead(headR, shape);
  const head = put(by.head, headGeo, mats.skin, [0, headR * 0.15, 0], null, 0.008);
  head.name = 'head';

  const face = new THREE.Mesh(new THREE.CircleGeometry(1, 24), mats.face);
  face.scale.set(headR * 0.78, headR * 0.96, 1);
  face.position.set(0, headR * 0.08, headR * 0.72);
  face.name = 'face';
  face.frustumCulled = false;
  face.renderOrder = 2;
  by.head.add(face);
  owned.push(face.geometry);

  const earGeo = new THREE.SphereGeometry(headR * 0.16, 6, 5);
  earGeo.scale(0.42, 0.85, 0.4);
  put(by.head, earGeo, mats.skin, [headR * 0.98, headR * 0.05, 0.02], null, 0.004);
  put(by.head, earGeo, mats.skin, [-headR * 0.98, headR * 0.05, 0.02], null, 0.004);

  addHair(spec.parts.hair, by.head, mats.hair, headR, put);
  addOutfit(spec.parts.outfit, skel, mats, put, cyl, box);
  addAccessory(spec.parts.accessory, skel, mats, put, cyl, box);
  addHands(spec.parts.outfit, skel, mats, put, box);

  for (const group of ['hair', 'outfit', 'accessory'] as PartGroup[]) {
    const ids = CATALOG[group].map((p) => p.id);
    if (!ids.includes(spec.parts[group])) throw new Error(`Missing ${group} ${spec.parts[group]}`);
  }
  return owned;
}

function addHair(id: string, head: THREE.Object3D, mat: THREE.Material, r: number, put: Put) {
  if (id === 'none') return;
  if (id === 'cropped') {
    put(head, hairShell(r * 1.06, 0.82, 1.35), mat, [0, r * 0.22, -0.01], null, 0.005);
    return;
  }
  if (id === 'bob') {
    put(head, hairShell(r * 1.12, 1.55, 1.25), mat, [0, r * 0.12, 0], null, 0.008);
    return;
  }
  if (id === 'queue') {
    put(head, hairShell(r * 1.06, 1.0, 1.2), mat, [0, r * 0.16, 0], null, 0.008);
    const tail = new THREE.CylinderGeometry(0.018, 0.01, r * 1.3, 5);
    put(head, tail, mat, [0, -r * 0.15, -r * 0.82], [0.9, 0, 0], 0.004);
    return;
  }
  if (id === 'long') {
    put(head, hairShell(r * 1.08, 1.15, 1.2), mat, [0, r * 0.14, 0], null, 0.008);
    const lock = new THREE.BoxGeometry(r * 0.38, r * 2.4, 0.02);
    put(head, lock, mat, [r * 0.22, -r * 0.85, -r * 0.72], [0.15, 0, 0.04], 0.005);
    put(head, lock, mat, [-r * 0.22, -r * 0.85, -r * 0.72], [0.15, 0, -0.04], 0.005);
    return;
  }
  if (id === 'topknot') {
    put(head, hairShell(r * 1.06, 1.0, 1.15), mat, [0, r * 0.16, 0], null, 0.008);
    const knot = new THREE.SphereGeometry(r * 0.28, 8, 6);
    put(head, knot, mat, [0, r * 1.15, -r * 0.05], null, 0.005);
    const tail = new THREE.CylinderGeometry(0.016, 0.01, r * 0.9, 5);
    put(head, tail, mat, [0, r * 0.55, -r * 0.55], [1.1, 0, 0], 0.004);
    return;
  }
  throw new Error(`Unknown hair "${id}"`);
}

function addOutfit(id: string, skel: Skel, mats: Mats, put: Put, cyl: Cyl, box: Box) {
  const m = skel.measures;
  const by = skel.by;
  const boot = (side: 'L' | 'R') => {
    put(by[`shin${side}`], cyl(0.055 * m.b, 0.048 * m.b, m.shin * 0.92, 7), mats.leather, [0, -m.shin * 0.48, 0], null, 0.008);
    put(by[`foot${side}`], box(0.09 * m.b, 0.05, 0.18 * m.h), mats.leather, [0, -0.02, 0.05], null, 0.006);
  };
  if (id === 'tunic') {
    put(by.chest, cyl(0.17 * m.b, 0.16 * m.b, 0.34 * m.h, 8), mats.cloth, [0, -0.02 * m.h, 0], null, 0.01);
    put(by.hips, cyl(0.16 * m.b, 0.18 * m.b, 0.22 * m.h, 8), mats.cloth, [0, -0.08 * m.h, 0], null, 0.01);
    put(by.hips, cyl(0.155 * m.b, 0.155 * m.b, 0.035 * m.h, 10), mats.trim, [0, 0.02 * m.h, 0], null, 0.006);
    sleeve(by, m, mats.cloth, put, cyl, 0.075);
    boot('L');
    boot('R');
    return;
  }
  if (id === 'plate') {
    put(by.chest, cyl(0.175 * m.b, 0.16 * m.b, 0.32 * m.h, 7), mats.cloth, [0, 0.02 * m.h, 0.02], null, 0.01);
    put(by.hips, cyl(0.17 * m.b, 0.24 * m.b, 0.34 * m.h, 8), mats.cloth, [0, -0.12 * m.h, 0], null, 0.01);
    const crossV = box(0.028 * m.b, 0.16 * m.h, 0.012);
    const crossH = box(0.12 * m.b, 0.028 * m.h, 0.012);
    put(by.chest, crossV, mats.trim, [0, 0.05 * m.h, 0.2 * m.b], null, 0.003);
    put(by.chest, crossH, mats.trim, [0, 0.08 * m.h, 0.2 * m.b], null, 0.003);
    const pauldron = new THREE.SphereGeometry(1, 8, 6);
    pauldron.scale(0.11 * m.b, 0.055 * m.b, 0.1 * m.b);
    put(by.shoulderL, pauldron, mats.steel, [0.02, 0.02, 0], null, 0.006);
    put(by.shoulderR, pauldron, mats.steel, [-0.02, 0.02, 0], null, 0.006);
    put(by.forearmL, cyl(0.06 * m.b, 0.05 * m.b, m.fore * 0.7, 6), mats.steel, [m.fore * 0.45, 0, 0], [0, 0, Math.PI / 2], 0.006);
    put(by.forearmR, cyl(0.06 * m.b, 0.05 * m.b, m.fore * 0.7, 6), mats.steel, [-m.fore * 0.45, 0, 0], [0, 0, Math.PI / 2], 0.006);
    put(by.thighL, cyl(0.085 * m.b, 0.07 * m.b, m.thigh * 0.72, 6), mats.steel, [0, -m.thigh * 0.42, 0], null, 0.006);
    put(by.thighR, cyl(0.085 * m.b, 0.07 * m.b, m.thigh * 0.72, 6), mats.steel, [0, -m.thigh * 0.42, 0], null, 0.006);
    put(by.shinL, cyl(0.07 * m.b, 0.055 * m.b, m.shin * 0.85, 6), mats.steel, [0, -m.shin * 0.45, 0.01], null, 0.007);
    put(by.shinR, cyl(0.07 * m.b, 0.055 * m.b, m.shin * 0.85, 6), mats.steel, [0, -m.shin * 0.45, 0.01], null, 0.007);
    put(by.footL, box(0.1 * m.b, 0.045, 0.18 * m.h), mats.steel, [0, -0.02, 0.05], null, 0.005);
    put(by.footR, box(0.1 * m.b, 0.045, 0.18 * m.h), mats.steel, [0, -0.02, 0.05], null, 0.005);
    return;
  }
  if (id === 'greatcoat') {
    put(by.chest, box(0.16 * m.b, 0.28 * m.h, 0.08 * m.b), mats.cream, [0, -0.02 * m.h, 0.06 * m.b], null, 0.008);
    put(by.chest, box(0.34 * m.b, 0.46 * m.h, 0.06 * m.b), mats.cloth, [0, -0.08 * m.h, -0.1 * m.b], null, 0.01);
    put(by.chest, box(0.14 * m.b, 0.44 * m.h, 0.05 * m.b), mats.cloth, [0.1 * m.b, -0.08 * m.h, 0.08 * m.b], [0, 0.22, 0], 0.006);
    put(by.chest, box(0.14 * m.b, 0.44 * m.h, 0.05 * m.b), mats.cloth, [-0.1 * m.b, -0.08 * m.h, 0.08 * m.b], [0, -0.22, 0], 0.006);
    const tail = box(0.13 * m.b, m.thigh * 0.95, 0.035);
    put(by.thighL, tail, mats.cloth, [0.02, -m.thigh * 0.42, -0.07], null, 0.008);
    put(by.thighR, tail, mats.cloth, [-0.02, -m.thigh * 0.42, -0.07], null, 0.008);
    put(by.thighL, cyl(0.075 * m.b, 0.065 * m.b, m.thigh * 0.85, 7), mats.cream, [0, -m.thigh * 0.45, 0], null, 0.007);
    put(by.thighR, cyl(0.075 * m.b, 0.065 * m.b, m.thigh * 0.85, 7), mats.cream, [0, -m.thigh * 0.45, 0], null, 0.007);
    const ep = box(0.14 * m.b, 0.025 * m.h, 0.08 * m.b);
    put(by.shoulderL, ep, mats.trim, [0.04, 0.02, 0], null, 0.004);
    put(by.shoulderR, ep, mats.trim, [-0.04, 0.02, 0], null, 0.004);
    put(by.neck, new THREE.TorusGeometry(0.07 * m.b, 0.016, 6, 10), mats.cloth, [0, 0.02, 0], [Math.PI / 2, 0, 0], 0.004);
    sleeve(by, m, mats.cloth, put, cyl, 0.08);
    put(by.forearmL, cyl(0.055 * m.b, 0.055 * m.b, 0.06 * m.h, 7), mats.trim, [m.fore * 0.85, 0, 0], [0, 0, Math.PI / 2], 0.004);
    put(by.forearmR, cyl(0.055 * m.b, 0.055 * m.b, 0.06 * m.h, 7), mats.trim, [-m.fore * 0.85, 0, 0], [0, 0, Math.PI / 2], 0.004);
    boot('L');
    boot('R');
    put(by.hips, box(0.02, 0.42 * m.h, 0.012), mats.black, [m.hipX + 0.06 * m.b, -0.16 * m.h, 0.05], [0.2, 0, 0.45], 0.004);
    put(by.hips, new THREE.TorusGeometry(0.028, 0.005, 4, 8), mats.trim, [m.hipX + 0.08 * m.b, 0.02 * m.h, 0.07], [Math.PI / 2, 0, 0.45], 0.003);
    return;
  }
  if (id === 'robe') {
    put(by.chest, cyl(0.2 * m.b, 0.22 * m.b, 0.36 * m.h, 8), mats.cloth, [0, -0.04 * m.h, 0], null, 0.01);
    put(by.hips, cyl(0.2 * m.b, 0.26 * m.b, 0.62 * m.h, 8), mats.cloth, [0, -0.22 * m.h, 0], null, 0.01);
    put(by.hips, cyl(0.21 * m.b, 0.21 * m.b, 0.05 * m.h, 8), mats.trim, [0, 0.04 * m.h, 0], null, 0.006);
    put(by.neck, new THREE.TorusGeometry(0.075 * m.b, 0.014, 5, 10), mats.trim, [0, 0.01, 0], [Math.PI / 2, 0, 0], 0.004);
    sleeve(by, m, mats.cloth, put, cyl, 0.095);
    put(by.forearmL, cyl(0.085 * m.b, 0.07 * m.b, m.fore * 0.85, 7), mats.cloth, [m.fore * 0.4, 0, 0], [0, 0, Math.PI / 2], 0.008);
    put(by.forearmR, cyl(0.085 * m.b, 0.07 * m.b, m.fore * 0.85, 7), mats.cloth, [-m.fore * 0.4, 0, 0], [0, 0, Math.PI / 2], 0.008);
    put(by.footL, box(0.09 * m.b, 0.04, 0.16 * m.h), mats.black, [0, -0.015, 0.04], null, 0.005);
    put(by.footR, box(0.09 * m.b, 0.04, 0.16 * m.h), mats.black, [0, -0.015, 0.04], null, 0.005);
    return;
  }
  throw new Error(`Unknown outfit "${id}"`);
}

function sleeve(by: Skel['by'], m: Measures, mat: THREE.Material, put: Put, cyl: Cyl, radius: number) {
  put(by.upperArmL, cyl(radius * m.b, radius * 0.9 * m.b, m.upper * 0.82, 7), mat, [m.upper * 0.48, 0, 0], [0, 0, Math.PI / 2], 0.008);
  put(by.upperArmR, cyl(radius * m.b, radius * 0.9 * m.b, m.upper * 0.82, 7), mat, [-m.upper * 0.48, 0, 0], [0, 0, Math.PI / 2], 0.008);
}

function addHands(outfit: string, skel: Skel, mats: Mats, put: Put, box: Box) {
  const mat = outfit === 'plate' ? mats.steel : outfit === 'greatcoat' ? mats.black : mats.skin;
  const geo = box(0.055 * skel.measures.b, 0.05, 0.045);
  put(skel.by.handL, geo, mat, [0, 0, 0], null, 0.004);
  put(skel.by.handR, geo, mat, [0, 0, 0], null, 0.004);
}

function addAccessory(id: string, skel: Skel, mats: Mats, put: Put, cyl: Cyl, box: Box) {
  const m = skel.measures;
  const by = skel.by;
  const r = m.headR;
  if (id === 'none') return;
  if (id === 'banner') {
    const pole = cyl(0.012, 0.012, 1.15 * m.h, 6, false);
    put(by.handL, pole, mats.wood, [0, 0.52 * m.h, 0], null, 0.004);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.42 * m.h, 0.3 * m.h), mats.banner);
    flag.position.set(0.22 * m.h, 0.95 * m.h, 0);
    flag.name = 'banner';
    flag.frustumCulled = false;
    outlined(flag, 0.006);
    by.handL.add(flag);
    return;
  }
  if (id === 'bicorne') {
    const horn = box(0.26 * m.b, 0.055, 0.18 * m.b);
    put(by.head, horn, mats.black, [-0.14 * m.b, r * 0.62, 0.02], [0.08, 0, 0.28], 0.003);
    put(by.head, horn, mats.black, [0.14 * m.b, r * 0.62, 0.02], [0.08, 0, -0.28], 0.003);
    put(by.head, box(0.14 * m.b, 0.07, 0.16 * m.b), mats.black, [0, r * 0.5, 0.02], null, 0.003);
    const cockade = new THREE.SphereGeometry(0.018 * m.b, 6, 5);
    put(by.head, cockade, mats.trim, [0.16 * m.b, r * 0.78, 0.06], null, 0.003);
    return;
  }
  if (id === 'saber' || id === 'sword') {
    const hilt = cyl(0.012, 0.012, 0.14, 6, false);
    put(by.handR, hilt, mats.leather, [0, 0.02, 0], null, 0.003);
    const guard = new THREE.TorusGeometry(0.032, 0.005, 4, 8);
    put(by.handR, guard, mats.trim, [0, 0.09, 0], [Math.PI / 2, 0, 0], 0.003);
    if (id === 'sword') {
      put(by.handR, box(0.012, 0.62 * m.h, 0.004), mats.steel, [0, 0.42 * m.h, 0], null, 0.003);
    } else {
      put(by.handR, box(0.012, 0.34 * m.h, 0.004), mats.steel, [0.01, 0.28 * m.h, 0], [0, 0, 0.18], 0.003);
      put(by.handR, box(0.01, 0.28 * m.h, 0.004), mats.steel, [0.06, 0.52 * m.h, 0], [0, 0, 0.45], 0.003);
    }
    return;
  }
  if (id === 'laurel') {
    const ring = new THREE.TorusGeometry(r * 0.78, 0.012, 4, 14);
    put(by.head, ring, mats.trim, [0, r * 0.35, 0], [Math.PI / 2.4, 0, 0], 0.003);
    return;
  }
  throw new Error(`Unknown accessory "${id}"`);
}
