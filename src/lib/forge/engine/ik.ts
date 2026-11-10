import * as THREE from 'three';

// Ported from Pantheon Forge (tools/forge/src/ik.js) with TypeScript types added.


const _q = new THREE.Quaternion();
const _p = new THREE.Quaternion();

export function wp(bone: THREE.Object3D, target = new THREE.Vector3()) {
  return bone.getWorldPosition(target);
}

export function setWorldDirection(bone: THREE.Bone, worldDir: THREE.Vector3) {
  const axis = bone.userData.axis as THREE.Vector3;
  const parent = bone.parent as THREE.Object3D;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(_p);
  const desired = worldDir.clone().normalize().applyQuaternion(_p.clone().invert());
  if (axis.dot(desired) > 0.999) bone.quaternion.identity();
  else if (axis.dot(desired) < -0.999) bone.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
  else bone.quaternion.setFromUnitVectors(axis, desired);
  bone.updateMatrixWorld(true);
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function solveLimb(upper: THREE.Bone, lower: THREE.Bone, target: THREE.Vector3, pole: THREE.Vector3) {
  const aLen = upper.userData.length as number;
  const bLen = lower.userData.length as number;
  const origin = wp(upper);
  const to = target.clone().sub(origin);
  const dist = clamp(to.length(), 0.02, aLen + bLen - 0.001);
  to.multiplyScalar(1 / (to.length() || 1));

  const cosUpper = clamp((aLen * aLen + dist * dist - bLen * bLen) / (2 * aLen * dist), -1, 1);
  const upperAngle = Math.acos(cosUpper);
  const poleFlat = pole.clone().sub(origin);
  poleFlat.addScaledVector(to, -poleFlat.dot(to));
  if (poleFlat.lengthSq() < 1e-6) poleFlat.set(0, 0, 1);
  poleFlat.normalize();

  const upperDir = to.clone().multiplyScalar(Math.cos(upperAngle)).addScaledVector(poleFlat, Math.sin(upperAngle)).normalize();
  setWorldDirection(upper, upperDir);

  const elbow = origin.clone().addScaledVector(upperDir, aLen);
  const lowerDir = target.clone().sub(elbow);
  if (lowerDir.lengthSq() < 1e-8) lowerDir.copy(upperDir);
  setWorldDirection(lower, lowerDir);
}

export function orientBasis(bone: THREE.Bone, x: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3) {
  const m = new THREE.Matrix4().makeBasis(x.clone().normalize(), y.clone().normalize(), z.clone().normalize());
  _q.setFromRotationMatrix(m);
  const parent = bone.parent as THREE.Object3D;
  parent.updateWorldMatrix(true, false);
  parent.getWorldQuaternion(_p);
  bone.quaternion.copy(_p.invert()).multiply(_q);
  bone.updateMatrixWorld(true);
}

export function basisFromUp(up: THREE.Vector3, hint: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const y = up.clone().normalize();
  const x = new THREE.Vector3().crossVectors(y, hint);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  return [x, y, z];
}

export function basisFeet(forward: THREE.Vector3): [THREE.Vector3, THREE.Vector3, THREE.Vector3] {
  const y = new THREE.Vector3(0, 1, 0);
  const z = forward.clone();
  z.y = 0;
  if (z.lengthSq() < 1e-6) z.set(0, 0, 1);
  z.normalize();
  const x = new THREE.Vector3().crossVectors(y, z).normalize();
  return [x, y, z];
}
