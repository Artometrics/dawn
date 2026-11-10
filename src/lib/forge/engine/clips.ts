import * as THREE from 'three';
import type { ClipId } from '../catalog';
import type { BoneName } from './build';

type Pose = Partial<Record<BoneName, [number, number, number]>>;

const STEPS = 16;
const TAU = Math.PI * 2;

/** Swing a limb toward the front (-x) or the side (z). Positive x swings a hanging limb back. */
function idle(phase: number): { pose: Pose; hipsY: number } {
  const breathe = Math.sin(phase * TAU);
  const sway = Math.sin(phase * TAU + 0.8);
  return {
    hipsY: breathe * 0.006,
    pose: {
      spine: [breathe * 0.018, sway * 0.02, 0],
      chest: [breathe * 0.025, 0, sway * 0.012],
      neck: [-breathe * 0.015, 0, 0],
      head: [breathe * 0.02 - 0.02, sway * 0.07, 0],
      shoulder_l: [0, 0, 0.08 + breathe * 0.012],
      shoulder_r: [0, 0, -0.08 - breathe * 0.012],
      upperArm_l: [sway * 0.04, 0, 0.05],
      upperArm_r: [-sway * 0.04, 0, -0.05],
      foreArm_l: [-0.12 - breathe * 0.03, 0, 0],
      foreArm_r: [-0.12 - breathe * 0.03, 0, 0],
      thigh_l: [0, 0, 0.03],
      thigh_r: [0, 0, -0.03],
    },
  };
}

function guard(phase: number): { pose: Pose; hipsY: number } {
  const breathe = Math.sin(phase * TAU);
  const bob = Math.sin(phase * TAU * 2);
  return {
    hipsY: -0.05 + bob * 0.006,
    pose: {
      spine: [0.12 + breathe * 0.015, -0.18, 0],
      chest: [0.05 + breathe * 0.02, 0, 0],
      neck: [-0.1, 0.1, 0],
      head: [-0.04, 0.12 + breathe * 0.02, 0],
      shoulder_l: [0, 0, 0.1],
      shoulder_r: [0, 0, -0.1],
      upperArm_l: [-0.75 + breathe * 0.03, 0, 0.18],
      foreArm_l: [-1.15 - breathe * 0.04, 0, 0],
      upperArm_r: [-0.55 - breathe * 0.03, 0, -0.32],
      foreArm_r: [-1.3, 0, 0],
      thigh_l: [-0.42, 0, 0.2],
      shin_l: [0.62, 0, 0],
      foot_l: [-0.2, 0, 0],
      thigh_r: [-0.12, 0, -0.26],
      shin_r: [0.3, 0, 0],
      foot_r: [-0.18, 0, 0],
    },
  };
}

const MAKERS: Record<ClipId, { duration: number; sample: (phase: number) => { pose: Pose; hipsY: number } }> = {
  idle: { duration: 3.2, sample: idle },
  guard: { duration: 2.0, sample: guard },
};

const euler = new THREE.Euler();
const quat = new THREE.Quaternion();

/** One looping clip per id, sampled at 16 steps. The last key equals the first so it loops cleanly. */
export function makeClip(id: ClipId, bones: Record<BoneName, THREE.Bone>): THREE.AnimationClip {
  const { duration, sample } = MAKERS[id];
  const times: number[] = [];
  const perBone = new Map<BoneName, number[]>();
  const hips: number[] = [];
  const restY = bones.hips.position.y;

  for (let step = 0; step <= STEPS; step += 1) {
    const phase = (step % STEPS) / STEPS;
    times.push((step / STEPS) * duration);
    const { pose, hipsY } = sample(phase);
    hips.push(bones.hips.position.x, restY + hipsY, bones.hips.position.z);
    for (const name of Object.keys(bones) as BoneName[]) {
      const angles = pose[name] ?? [0, 0, 0];
      euler.set(angles[0], angles[1], angles[2], 'XYZ');
      quat.setFromEuler(euler);
      const list = perBone.get(name) ?? [];
      list.push(quat.x, quat.y, quat.z, quat.w);
      perBone.set(name, list);
    }
  }

  const tracks: THREE.KeyframeTrack[] = [new THREE.VectorKeyframeTrack('hips.position', times, hips)];
  for (const [name, values] of perBone) tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values));
  return new THREE.AnimationClip(id, duration, tracks);
}

export function makeClips(bones: Record<BoneName, THREE.Bone>): Record<ClipId, THREE.AnimationClip> {
  return { idle: makeClip('idle', bones), guard: makeClip('guard', bones) };
}

/** A calm still frame for portraits and sprites. */
export const POSE_TIME: Record<ClipId, number> = { idle: 0.55, guard: 0.5 };
