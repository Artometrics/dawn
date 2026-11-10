import * as THREE from 'three';
import { outlineMaterial } from './materials';
import type { Skel } from './skeleton';

// Ported from Pantheon Forge (tools/forge/src/body.js) with TypeScript types added.

type TubeOpts = { sides?: number; sx?: number; sz?: number };

class SkinBuf {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  idx: number[] = [];
  si: number[] = [];
  sw: number[] = [];
  get count() { return this.pos.length / 3; }
  vert(p: THREE.Vector3, n: THREE.Vector3, u: number, v: number, i0: number, i1: number | null, w0: number) {
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(n.x, n.y, n.z);
    this.uv.push(u, v);
    const w = Math.min(1, Math.max(0, w0));
    this.si.push(i0, i1 ?? 0, 0, 0);
    this.sw.push(w, i1 == null ? 0 : 1 - w, 0, 0);
    return this.count - 1;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    return g;
  }
}

function tube(buf: SkinBuf, from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, bone: number, tip: number | null, opts: TubeOpts = {}) {
  const sides = opts.sides ?? 8;
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.001) return;
  dir.multiplyScalar(1 / len);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const rings = 2;
  const sx = opts.sx ?? 1;
  const sz = opts.sz ?? 1;
  const base = buf.count;
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const c = new THREE.Vector3().lerpVectors(from, to, t);
    const r = r0 + (r1 - r0) * t;
    const w = tip == null ? 1 : 1 - THREE.MathUtils.smoothstep(t, 0.62, 0.92);
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2;
      const local = new THREE.Vector3(Math.cos(a) * r * sx, 0, Math.sin(a) * r * sz);
      const nLocal = new THREE.Vector3(Math.cos(a) * sx, 0, Math.sin(a) * sz).normalize();
      buf.vert(local.applyQuaternion(quat).add(c), nLocal.applyQuaternion(quat), s / sides, t, bone, tip, w);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      const a = base + i * sides + s;
      const b = base + i * sides + s2;
      const d = base + (i + 1) * sides + s;
      const c = base + (i + 1) * sides + s2;
      buf.idx.push(a, b, d, b, c, d);
    }
  }
  const cap = (ring: number, outward: number) => {
    const center = new THREE.Vector3().lerpVectors(from, to, ring === 0 ? 0 : 1);
    const n = dir.clone().multiplyScalar(outward);
    const boneHere = ring === 0 || tip == null ? bone : tip;
    const ci = buf.vert(center, n, 0.5, ring === 0 ? 0 : 1, boneHere, null, 1);
    const start = base + (ring === 0 ? 0 : rings * sides);
    for (let s = 0; s < sides; s++) {
      const s2 = (s + 1) % sides;
      if (outward > 0) buf.idx.push(ci, start + s, start + s2);
      else buf.idx.push(ci, start + s2, start + s);
    }
  };
  cap(0, -1);
  cap(1, 1);
}

function world(bone: THREE.Bone) {
  return bone.getWorldPosition(new THREE.Vector3());
}

export function buildBody(skel: Skel, material: THREE.Material) {
  const m = skel.measures;
  const id = skel.index as Record<string, number>;
  const P = {} as Record<string, THREE.Vector3>;
  for (const b of skel.bones) P[b.name] = world(b);
  const buf = new SkinBuf();
  const torso = 0.145 * m.b;
  const arm = 0.048 * m.b;
  const leg = 0.072 * m.b;

  tube(buf, P.hips, P.spine, torso * 1.05, torso * 0.95, id.hips, id.spine, { sx: 1.05, sz: 0.86 });
  tube(buf, P.spine, P.chest, torso * 0.95, torso * 1.2, id.spine, id.chest, { sx: 1.15, sz: 0.82 });
  tube(buf, P.chest, P.neck, torso * 1.05, 0.055 * m.b, id.chest, id.neck, { sx: 1.2, sz: 0.78 });
  tube(buf, P.neck, P.head, 0.05 * m.b, 0.055 * m.b, id.neck, id.head);

  const armChain = (side: 'L' | 'R', sign: number) => {
    const s = side;
    tube(buf, P[`shoulder${s}`], P[`upperArm${s}`], arm * 1.15, arm, id[`shoulder${s}`], id[`upperArm${s}`]);
    tube(buf, P[`upperArm${s}`], P[`forearm${s}`], arm, arm * 0.86, id[`upperArm${s}`], id[`forearm${s}`]);
    tube(buf, P[`forearm${s}`], P[`hand${s}`], arm * 0.82, arm * 0.7, id[`forearm${s}`], id[`hand${s}`]);
    const tip = P[`hand${s}`].clone();
    tip.x += sign * m.hand;
    tube(buf, P[`hand${s}`], tip, arm * 0.62, arm * 0.5, id[`hand${s}`], null);
  };
  armChain('L', 1);
  armChain('R', -1);

  const legChain = (side: 'L' | 'R') => {
    tube(buf, P[`thigh${side}`], P[`shin${side}`], leg, leg * 0.78, id[`thigh${side}`], id[`shin${side}`]);
    tube(buf, P[`shin${side}`], P[`foot${side}`], leg * 0.72, leg * 0.55, id[`shin${side}`], id[`foot${side}`]);
    const toe = P[`foot${side}`].clone();
    toe.z += 0.14 * m.h;
    toe.y -= 0.045;
    tube(buf, P[`foot${side}`], toe, 0.045 * m.b, 0.032 * m.b, id[`foot${side}`], null, { sx: 1.15, sz: 0.85 });
  };
  legChain('L');
  legChain('R');

  const geo = buf.geometry();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = 'body';
  mesh.frustumCulled = false;
  mesh.bind(skel.skeleton);

  const ol = new THREE.SkinnedMesh(geo, outlineMaterial(0.0055));
  ol.name = 'body_ol';
  ol.userData.outline = true;
  ol.frustumCulled = false;
  ol.raycast = () => {};
  ol.bind(skel.skeleton);
  return { mesh, outline: ol, geometry: geo };
}
