import * as THREE from 'three';
import { basisFeet, basisFromUp, orientBasis, solveLimb, wp } from './ik';
import { resetPose, type Skel } from './skeleton';
import type { PoseName } from './bones';
import type { ForgeCharacter } from '../schema';

// Ported from Pantheon Forge (tools/forge/src/poses.js) with TypeScript types added.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

function poseTargets(skel: Skel, name: PoseName) {
  const m = skel.measures;
  const by = skel.by;
  const sL = wp(by.upperArmL);
  const sR = wp(by.upperArmR);
  const hL = wp(by.thighL);
  const hR = wp(by.thighR);
  const kneeL = hL.clone().add(new THREE.Vector3(0.12, -0.15, 0.85));
  const kneeR = hR.clone().add(new THREE.Vector3(-0.12, -0.15, 0.85));
  if (name === 'guard') {
    return {
      handL: sL.clone().add(new THREE.Vector3(-0.02, -0.02 * m.h, 0.26 * m.h)),
      handR: sR.clone().add(new THREE.Vector3(0.06, -0.06 * m.h, 0.2 * m.h)),
      footL: new THREE.Vector3(hL.x * 0.9, m.ankleY, hL.z + 0.14 * m.h),
      footR: new THREE.Vector3(hR.x * 0.95, m.ankleY, hR.z - 0.06 * m.h),
      poleL: sL.clone().add(new THREE.Vector3(0.5, -0.45, -0.2)),
      poleR: sR.clone().add(new THREE.Vector3(-0.5, -0.4, -0.2)),
      kneeL, kneeR,
    };
  }
  return {
    handL: sL.clone().add(new THREE.Vector3(0.04 * m.b, -m.armLen * 0.72, 0.1 * m.h)),
    handR: sR.clone().add(new THREE.Vector3(-0.04 * m.b, -m.armLen * 0.72, 0.08 * m.h)),
    footL: new THREE.Vector3(hL.x, m.ankleY, hL.z + 0.04 * m.h),
    footR: new THREE.Vector3(hR.x, m.ankleY, hR.z + 0.02 * m.h),
    poleL: sL.clone().add(new THREE.Vector3(0.35, -0.25, -0.45)),
    poleR: sR.clone().add(new THREE.Vector3(-0.35, -0.25, -0.45)),
    kneeL, kneeR,
  };
}

export function applyPose(skel: Skel, name: PoseName, time: number, spec: ForgeCharacter) {
  resetPose(skel);
  const m = skel.measures;
  const by = skel.by;
  const breath = Math.sin((time / 3.2) * Math.PI * 2);
  by.spine.rotation.y = breath * 0.025;
  by.chest.rotation.x = -0.04 + breath * 0.03;
  by.head.rotation.x = 0.08;
  by.head.rotation.y = -breath * 0.015;
  if (name === 'guard') {
    by.hips.position.y = by.hips.userData.rest.y - 0.07 * m.h;
    by.chest.rotation.y = 0.12;
    by.chest.rotation.x = 0.06;
    by.head.rotation.y = -0.18;
    by.head.rotation.x = 0.04;
  } else {
    by.hips.position.y = by.hips.userData.rest.y - 0.035 * m.h;
  }
  skel.root.updateMatrixWorld(true);

  const t = poseTargets(skel, name);
  solveLimb(by.thighL, by.shinL, t.footL, t.kneeL);
  solveLimb(by.thighR, by.shinR, t.footR, t.kneeR);
  solveLimb(by.upperArmL, by.forearmL, t.handL, t.poleL);
  solveLimb(by.upperArmR, by.forearmR, t.handR, t.poleR);

  orientBasis(by.footL, ...basisFeet(V(0.18, 0, 1)));
  orientBasis(by.footR, ...basisFeet(V(-0.18, 0, 1)));

  const acc = spec.parts.accessory;
  if (acc === 'banner' || name === 'guard') {
    orientBasis(by.handL, ...basisFromUp(V(0, 1, 0.08), V(0, 0, 1)));
  }
  if (acc === 'saber' || acc === 'sword') {
    orientBasis(by.handR, ...basisFromUp(V(0.05, 0.45, 1), V(-1, 0, 0)));
  } else if (name === 'guard') {
    orientBasis(by.handR, ...basisFromUp(V(0, 0.2, 1), V(-1, 0, 0.2)));
  }
}

function sampleClip(skel: Skel, name: PoseName, spec: ForgeCharacter) {
  const duration = 3.2;
  const frames = 16;
  const times: number[] = [];
  const q: Record<string, number[]> = {};
  const p: Record<string, number[]> = {};
  for (const b of skel.bones) {
    q[b.name] = [];
    p[b.name] = [];
  }
  const prev: Record<string, THREE.Quaternion> = {};
  for (let i = 0; i <= frames; i++) {
    const t = (i / frames) * duration;
    times.push(t);
    applyPose(skel, name, t, spec);
    for (const b of skel.bones) {
      const quat = b.quaternion.clone();
      if (prev[b.name] && prev[b.name].dot(quat) < 0) quat.set(-quat.x, -quat.y, -quat.z, -quat.w);
      prev[b.name] = quat;
      q[b.name].push(quat.x, quat.y, quat.z, quat.w);
      p[b.name].push(b.position.x, b.position.y, b.position.z);
    }
  }
  const tracks: THREE.KeyframeTrack[] = [];
  for (const b of skel.bones) {
    tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, q[b.name]));
    tracks.push(new THREE.VectorKeyframeTrack(`${b.name}.position`, times, p[b.name]));
  }
  resetPose(skel);
  return new THREE.AnimationClip(name, duration, tracks);
}

export function buildClips(skel: Skel, spec: ForgeCharacter) {
  return {
    idle: sampleClip(skel, 'idle', spec),
    guard: sampleClip(skel, 'guard', spec),
  };
}
