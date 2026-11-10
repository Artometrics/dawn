import * as THREE from 'three';
import { BONE_NAMES, type BoneName } from './bones';
import type { ForgeCharacter } from '../schema';

// Ported from Pantheon Forge (tools/forge/src/skeleton.js) with TypeScript types added.

export type Body = ForgeCharacter['body'];
export type Measures = ReturnType<typeof measures>;
export type Skel = ReturnType<typeof buildSkeleton>;

export function measures(body: Body) {
  const h = 0.9 + body.height * 0.22;
  const b = 0.84 + body.build * 0.4;
  const hipY = 1.0 * h;
  const drop = 0.02 * h;
  const spineH = 0.15 * h;
  const chestH = 0.17 * h;
  const neckH = 0.13 * h;
  const headLift = 0.06 * h;
  const shoulderX = 0.2 * b;
  const shoulderYOff = 0.045 * h;
  const upper = 0.29 * h;
  const fore = 0.25 * h;
  const hand = 0.07 * h;
  const hipX = 0.1 * b;
  const thigh = 0.45 * h;
  const shin = 0.43 * h;
  const headR = 0.115 * (0.96 + body.height * 0.08);
  const chestY = hipY + spineH + chestH;
  const ankleY = hipY - drop - thigh - shin;
  return {
    h, b, hipY, drop, spineH, chestH, neckH, headLift, shoulderX, shoulderYOff,
    upper, fore, hand, hipX, thigh, shin, headR, chestY, ankleY,
    armLen: upper + fore,
    legLen: thigh + shin,
  };
}

function mark(bone: THREE.Bone, axis: THREE.Vector3, length: number) {
  bone.userData.rest = bone.position.clone();
  bone.userData.axis = axis.clone();
  bone.userData.length = length;
}

export function buildSkeleton(body: Body) {
  const M = measures(body);
  const bones: THREE.Bone[] = [];
  const by = {} as Record<BoneName, THREE.Bone>;
  const index = {} as Record<BoneName, number>;
  const add = (name: BoneName, parent: THREE.Bone | null, x: number, y: number, z: number) => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    index[name] = bones.length;
    bones.push(b);
    by[name] = b;
    return b;
  };

  const root = add('root', null, 0, 0, 0);
  const hips = add('hips', root, 0, M.hipY, 0);
  const spine = add('spine', hips, 0, M.spineH, 0);
  const chest = add('chest', spine, 0, M.chestH, 0);
  const neck = add('neck', chest, 0, M.neckH, 0);
  add('head', neck, 0, M.headLift, 0);

  const shoulderL = add('shoulderL', chest, M.shoulderX, M.shoulderYOff, 0);
  const upperArmL = add('upperArmL', shoulderL, M.shoulderX * 0.12, -0.02 * M.h, 0);
  const forearmL = add('forearmL', upperArmL, M.upper, 0, 0);
  add('handL', forearmL, M.fore, 0, 0);

  const shoulderR = add('shoulderR', chest, -M.shoulderX, M.shoulderYOff, 0);
  const upperArmR = add('upperArmR', shoulderR, -M.shoulderX * 0.12, -0.02 * M.h, 0);
  const forearmR = add('forearmR', upperArmR, -M.upper, 0, 0);
  add('handR', forearmR, -M.fore, 0, 0);

  const thighL = add('thighL', hips, M.hipX, -M.drop, 0);
  const shinL = add('shinL', thighL, 0, -M.thigh, 0);
  add('footL', shinL, 0, -M.shin, 0);

  const thighR = add('thighR', hips, -M.hipX, -M.drop, 0);
  const shinR = add('shinR', thighR, 0, -M.thigh, 0);
  add('footR', shinR, 0, -M.shin, 0);

  mark(hips, new THREE.Vector3(0, 1, 0), M.spineH);
  mark(spine, new THREE.Vector3(0, 1, 0), M.chestH);
  mark(chest, new THREE.Vector3(0, 1, 0), M.neckH);
  mark(neck, new THREE.Vector3(0, 1, 0), M.headLift);
  mark(by.head, new THREE.Vector3(0, 1, 0), M.headR);
  mark(shoulderL, new THREE.Vector3(1, 0, 0), M.shoulderX * 0.12);
  mark(upperArmL, new THREE.Vector3(1, 0, 0), M.upper);
  mark(forearmL, new THREE.Vector3(1, 0, 0), M.fore);
  mark(by.handL, new THREE.Vector3(1, 0, 0), M.hand);
  mark(shoulderR, new THREE.Vector3(-1, 0, 0), M.shoulderX * 0.12);
  mark(upperArmR, new THREE.Vector3(-1, 0, 0), M.upper);
  mark(forearmR, new THREE.Vector3(-1, 0, 0), M.fore);
  mark(by.handR, new THREE.Vector3(-1, 0, 0), M.hand);
  mark(thighL, new THREE.Vector3(0, -1, 0), M.thigh);
  mark(shinL, new THREE.Vector3(0, -1, 0), M.shin);
  mark(by.footL, new THREE.Vector3(0, 0, 1), 0.12);
  mark(thighR, new THREE.Vector3(0, -1, 0), M.thigh);
  mark(shinR, new THREE.Vector3(0, -1, 0), M.shin);
  mark(by.footR, new THREE.Vector3(0, 0, 1), 0.12);
  mark(root, new THREE.Vector3(0, 1, 0), 0);

  for (const name of BONE_NAMES) {
    if (!by[name]) throw new Error(`Skeleton missing ${name}`);
  }

  const skeleton = new THREE.Skeleton(bones);
  return { root, bones, skeleton, by, index, measures: M };
}

export function resetPose(skel: Pick<Skel, 'bones' | 'root'>) {
  for (const b of skel.bones) {
    b.quaternion.identity();
    b.position.copy(b.userData.rest);
  }
  skel.root.updateMatrixWorld(true);
}
