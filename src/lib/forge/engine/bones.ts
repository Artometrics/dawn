// Shared skeleton contract. Every legend uses these bones so one clip set
// plays on all of them. Names avoid dots: AnimationMixer treats "." as a path.
// Ported from Pantheon Forge (tools/forge/src/bones.js).

export const BONE_NAMES = [
  'root',
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'upperArmL',
  'forearmL',
  'handL',
  'shoulderR',
  'upperArmR',
  'forearmR',
  'handR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

export const POSES = ['idle', 'guard'] as const;
export type PoseName = (typeof POSES)[number];

// Mixamo's downloadable humanoid, for a later retarget. Root has no Mixamo twin.
export const MIXAMO_MAP: Record<Exclude<BoneName, 'root'>, string> = {
  hips: 'mixamorigHips',
  spine: 'mixamorigSpine',
  chest: 'mixamorigSpine2',
  neck: 'mixamorigNeck',
  head: 'mixamorigHead',
  shoulderL: 'mixamorigLeftShoulder',
  upperArmL: 'mixamorigLeftArm',
  forearmL: 'mixamorigLeftForeArm',
  handL: 'mixamorigLeftHand',
  shoulderR: 'mixamorigRightShoulder',
  upperArmR: 'mixamorigRightArm',
  forearmR: 'mixamorigRightForeArm',
  handR: 'mixamorigRightHand',
  thighL: 'mixamorigLeftUpLeg',
  shinL: 'mixamorigLeftLeg',
  footL: 'mixamorigLeftFoot',
  thighR: 'mixamorigRightUpLeg',
  shinR: 'mixamorigRightLeg',
  footR: 'mixamorigRightFoot',
};

// The 17-bone humanoid described in docs/RIGGING.md (rig2.py).
export const GAME_RIG_MAP: Record<Exclude<BoneName, 'root'>, string> = {
  hips: 'hips',
  spine: 'spine',
  chest: 'chest',
  neck: 'neck',
  head: 'head',
  shoulderL: 'shoulderL',
  upperArmL: 'upperarmL',
  forearmL: 'forearmL',
  handL: 'handL',
  shoulderR: 'shoulderR',
  upperArmR: 'upperarmR',
  forearmR: 'forearmR',
  handR: 'handR',
  thighL: 'thighL',
  shinL: 'shinL',
  footL: 'footL',
  thighR: 'thighR',
  shinR: 'shinR',
  footR: 'footR',
};
