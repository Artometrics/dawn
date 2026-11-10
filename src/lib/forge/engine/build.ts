import * as THREE from 'three';
import type { ForgeCharacter } from '../schema';
import { INK, hullGeometry, makeOutlineMaterial, makePlainMaterial, makeToonMaterial, type LookStyle } from './materials';

export const BONE_NAMES = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shoulder_l', 'upperArm_l', 'foreArm_l', 'hand_l',
  'shoulder_r', 'upperArm_r', 'foreArm_r', 'hand_r',
  'thigh_l', 'shin_l', 'foot_l',
  'thigh_r', 'shin_r', 'foot_r',
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

export type BuiltCharacter = {
  root: THREE.Group;
  bones: Record<BoneName, THREE.Bone>;
  skeleton: THREE.Skeleton;
  /** The skeleton overlay is created lazily by the viewport. */
  dispose: () => void;
};

const HEAD_DIMS: Record<string, [number, number, number]> = {
  round: [0.12, 0.126, 0.12],
  square: [0.112, 0.12, 0.112],
  long: [0.106, 0.152, 0.114],
  narrow: [0.094, 0.134, 0.108],
};

const BOOT = '#2a211c';

function shade(hex: string, amount: number): string {
  const color = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  color.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amount)));
  return `#${color.getHexString()}`;
}

type Bank = {
  material: (hex: string) => THREE.Material;
  outline: THREE.Material | null;
  all: Set<THREE.Material>;
};

function makeBank(style: LookStyle): Bank {
  const cache = new Map<string, THREE.Material>();
  const all = new Set<THREE.Material>();
  const outline = style === 'toon' ? makeOutlineMaterial() : null;
  if (outline) all.add(outline);
  return {
    outline,
    all,
    material(hex) {
      const found = cache.get(hex);
      if (found) return found;
      const made = style === 'toon' ? makeToonMaterial(hex) : makePlainMaterial(hex);
      cache.set(hex, made);
      all.add(made);
      return made;
    },
  };
}

export function buildCharacter(spec: ForgeCharacter, style: LookStyle = 'toon'): BuiltCharacter {
  const bank = makeBank(style);
  const geometries: THREE.BufferGeometry[] = [];
  const wide = 0.86 + 0.44 * spec.build;
  const deep = 0.92 + 0.28 * spec.build;
  const limb = 0.88 + 0.36 * spec.build;
  const { skin, hair, primary, secondary, accent } = spec.colors;

  const root = new THREE.Group();
  root.name = 'character';
  const bones = {} as Record<BoneName, THREE.Bone>;

  function bone(name: BoneName, parent: THREE.Object3D, x: number, y: number, z: number): THREE.Bone {
    const made = new THREE.Bone();
    made.name = name;
    made.position.set(x, y, z);
    parent.add(made);
    bones[name] = made;
    return made;
  }

  function add(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    hex: string,
    at: [number, number, number] = [0, 0, 0],
    options: { scale?: [number, number, number]; rotate?: [number, number, number]; outline?: boolean; name?: string } = {},
  ): THREE.Mesh {
    geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, bank.material(hex));
    mesh.position.set(...at);
    if (options.scale) mesh.scale.set(...options.scale);
    if (options.rotate) mesh.rotation.set(...options.rotate);
    if (options.name) mesh.name = options.name;
    parent.add(mesh);
    if (bank.outline && options.outline !== false) {
      const hullGeo = hullGeometry(geometry);
      geometries.push(hullGeo);
      const hull = new THREE.Mesh(hullGeo, bank.outline);
      hull.name = 'outline';
      hull.userData.outline = true;
      mesh.add(hull);
    }
    return mesh;
  }

  const cyl = (top: number, bottom: number, height: number, sides = 8) => new THREE.CylinderGeometry(top, bottom, height, sides, 1);
  const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
  const ico = (radius: number, detail = 1) => new THREE.IcosahedronGeometry(radius, detail);

  // Skeleton. The character faces +Z and hangs down -Y from every limb bone.
  const hips = bone('hips', root, 0, 0.93, 0);
  const spine = bone('spine', hips, 0, 0.08, 0);
  const chest = bone('chest', spine, 0, 0.22, 0);
  const neck = bone('neck', chest, 0, 0.23, 0);
  const head = bone('head', neck, 0, 0.07, 0);
  const shoulderX = 0.19 * wide;
  const upperArmLen = 0.27;
  const foreArmLen = 0.25;
  const legX = 0.085 * wide;
  const thighLen = 0.44;
  const shinLen = 0.42;

  const sides = [
    { s: 'l', sign: 1 },
    { s: 'r', sign: -1 },
  ] as const;
  for (const { s, sign } of sides) {
    const shoulder = bone(`shoulder_${s}`, chest, sign * shoulderX, 0.17, 0);
    const upper = bone(`upperArm_${s}`, shoulder, 0, 0, 0);
    const fore = bone(`foreArm_${s}`, upper, 0, -upperArmLen, 0);
    bone(`hand_${s}`, fore, 0, -foreArmLen, 0);
    const thigh = bone(`thigh_${s}`, hips, sign * legX, -0.03, 0);
    const shin = bone(`shin_${s}`, thigh, 0, -thighLen, 0);
    bone(`foot_${s}`, shin, 0, -shinLen, 0);
  }

  const skeleton = new THREE.Skeleton(BONE_NAMES.map((name) => bones[name]));

  const armor = spec.outfit === 'armor';
  const coat = spec.outfit === 'coat';
  const robe = spec.outfit === 'robe';
  const legColor = armor ? shade(primary, -0.28) : coat ? secondary : robe ? shade(primary, -0.2) : shade(secondary, -0.2);
  const sleeve = robe ? primary : armor ? shade(primary, -0.06) : coat ? primary : primary;
  const foreColor = armor ? primary : robe ? primary : coat ? primary : skin;
  const handColor = coat ? secondary : skin;

  // Body
  add(hips, box(0.23 * wide, 0.1, 0.15 * deep), legColor, [0, -0.04, 0]);
  add(chest, cyl(0.165 * wide, 0.135 * wide, 0.52, 8), primary, [0, -0.04, 0], { scale: [1, 1, 0.78 * deep], name: 'torso' });
  add(neck, cyl(0.045, 0.05, 0.1, 6), skin, [0, 0.02, 0]);

  for (const { s, sign } of sides) {
    add(bones[`upperArm_${s}` as BoneName], cyl(0.047 * limb, 0.04 * limb, upperArmLen, 6), sleeve, [0, -upperArmLen / 2, 0]);
    add(bones[`foreArm_${s}` as BoneName], cyl(0.04 * limb, 0.033 * limb, foreArmLen, 6), foreColor, [0, -foreArmLen / 2, 0]);
    add(bones[`hand_${s}` as BoneName], ico(0.04, 0), handColor, [0, -0.03, 0]);
    add(bones[`thigh_${s}` as BoneName], cyl(0.062 * limb, 0.05 * limb, thighLen, 6), legColor, [0, -thighLen / 2, 0]);
    add(bones[`shin_${s}` as BoneName], cyl(0.05 * limb, 0.038 * limb, shinLen, 6), armor ? primary : legColor, [0, -shinLen / 2, 0]);
    add(bones[`foot_${s}` as BoneName], box(0.09, 0.07, 0.19), BOOT, [0, -0.015, 0.045]);
    if (armor) {
      add(bones[`shoulder_${s}` as BoneName], ico(0.075 * limb, 1), primary, [sign * 0.025, 0.01, 0], { scale: [1.2, 0.8, 1.1] });
      add(bones[`foreArm_${s}` as BoneName], cyl(0.046 * limb, 0.04 * limb, 0.09, 6), secondary, [0, -foreArmLen + 0.04, 0], { outline: false });
    }
    if (coat) {
      add(bones[`foreArm_${s}` as BoneName], cyl(0.043 * limb, 0.043 * limb, 0.05, 6), accent, [0, -foreArmLen + 0.03, 0], { outline: false });
    }
  }

  // Outfit extras
  if (spec.outfit === 'tunic') {
    add(hips, cyl(0.17 * wide, 0.22 * wide, 0.26, 8), primary, [0, -0.1, 0], { scale: [1, 1, 0.85 * deep] });
    add(chest, cyl(0.168 * wide, 0.16 * wide, 0.05, 8), secondary, [0, -0.2, 0], { scale: [1, 1, 0.8 * deep], outline: false });
  }
  if (armor) {
    add(chest, box(0.3 * wide, 0.34, 0.03), secondary, [0, 0.02, 0.1 * deep], { scale: [1, 1, 1], outline: false });
    add(neck, cyl(0.075, 0.09, 0.07, 8), primary, [0, -0.02, 0]);
    add(hips, cyl(0.17 * wide, 0.21 * wide, 0.2, 8), primary, [0, -0.1, 0], { scale: [1, 1, 0.85 * deep] });
    add(hips, cyl(0.176 * wide, 0.176 * wide, 0.04, 8), accent, [0, 0.07, 0], { scale: [1, 1, 0.82 * deep], outline: false });
  }
  if (coat) {
    add(hips, cyl(0.17 * wide, 0.25 * wide, 0.5, 8), primary, [0, -0.2, 0], { scale: [1, 1, 0.82 * deep] });
    add(chest, box(0.07 * wide, 0.3, 0.03), secondary, [0.06 * wide, 0.04, 0.11 * deep], { rotate: [0, 0, -0.18], outline: false });
    add(chest, box(0.07 * wide, 0.3, 0.03), secondary, [-0.06 * wide, 0.04, 0.11 * deep], { rotate: [0, 0, 0.18], outline: false });
    add(chest, cyl(0.17 * wide, 0.17 * wide, 0.05, 8), accent, [0, -0.2, 0], { scale: [1, 1, 0.8 * deep], outline: false });
  }
  if (robe) {
    add(hips, cyl(0.17 * wide, 0.27 * wide, 0.98, 8), primary, [0, -0.43, 0], { scale: [1, 1, 0.86 * deep] });
    add(chest, cyl(0.17 * wide, 0.16 * wide, 0.06, 8), secondary, [0, -0.2, 0], { scale: [1, 1, 0.8 * deep], outline: false });
    for (const { s, sign } of sides) {
      add(bones[`upperArm_${s}` as BoneName], cyl(0.06 * limb, 0.075 * limb, upperArmLen, 6), primary, [sign * 0.01, -upperArmLen / 2, 0], { outline: false });
    }
  }

  // Head, face, hair
  const dims = HEAD_DIMS[spec.head] ?? HEAD_DIMS.round;
  const [rx, ry, rz] = dims;
  const headY = 0.12;
  if (spec.head === 'square') {
    add(head, box(rx * 2, ry * 2, rz * 2), skin, [0, headY, 0], { name: 'skull' });
  } else {
    add(head, ico(1, 1), skin, [0, headY, 0], { scale: [rx, ry, rz], name: 'skull' });
  }

  const faceZ = rz - 0.004;
  const eyeX = rx * 0.42;
  const eyeY = headY + ry * 0.12;
  const ink = INK;
  const eye = (x: number, scaleY = 1) => add(head, ico(0.014, 0), ink, [x, eyeY, faceZ], { scale: [1, scaleY, 0.6], outline: false });
  const brow = (x: number, tilt: number) =>
    add(head, box(0.04, 0.008, 0.008), shade(hair, -0.05), [x, eyeY + 0.032, faceZ + 0.002], { rotate: [0, 0, tilt], outline: false });
  const mouthY = headY - ry * 0.42;
  switch (spec.face) {
    case 'stern':
      eye(eyeX, 0.8);
      eye(-eyeX, 0.8);
      brow(eyeX, -0.35);
      brow(-eyeX, 0.35);
      add(head, box(0.05, 0.007, 0.008), ink, [0, mouthY, faceZ], { outline: false });
      break;
    case 'smile': {
      eye(eyeX);
      eye(-eyeX);
      const smile = new THREE.TorusGeometry(0.03, 0.0045, 4, 8, Math.PI);
      add(head, smile, ink, [0, mouthY + 0.02, faceZ], { rotate: [0, 0, Math.PI], outline: false });
      break;
    }
    case 'sly':
      eye(eyeX, 0.45);
      eye(-eyeX, 0.45);
      brow(eyeX, 0.18);
      brow(-eyeX, -0.05);
      add(head, box(0.045, 0.007, 0.008), ink, [0.012, mouthY, faceZ], { rotate: [0, 0, 0.22], outline: false });
      break;
    default:
      eye(eyeX);
      eye(-eyeX);
      add(head, box(0.04, 0.007, 0.008), ink, [0, mouthY, faceZ], { outline: false });
  }

  const cap = (thetaLength: number, grow = 1.07) =>
    new THREE.SphereGeometry(1, 10, 7, 0, Math.PI * 2, 0, thetaLength).scale(rx * grow, ry * grow, rz * grow);
  switch (spec.hair) {
    case 'crop':
      add(head, cap(Math.PI * 0.5), hair, [0, headY + 0.004, -0.012], { rotate: [-0.4, 0, 0] });
      break;
    case 'bob':
      add(head, cap(Math.PI * 0.56), hair, [0, headY + 0.004, -0.01], { rotate: [-0.32, 0, 0] });
      add(head, box(rx * 2.2, 0.17, 0.09), hair, [0, headY - 0.04, -rz * 0.8]);
      add(head, box(0.05, 0.14, rz * 1.2), hair, [rx * 1.02, headY - 0.04, -0.025], { outline: false });
      add(head, box(0.05, 0.14, rz * 1.2), hair, [-rx * 1.02, headY - 0.04, -0.025], { outline: false });
      break;
    case 'long':
      add(head, cap(Math.PI * 0.54), hair, [0, headY + 0.004, -0.012], { rotate: [-0.34, 0, 0] });
      add(head, box(rx * 2.15, 0.46, 0.08), hair, [0, headY - 0.17, -rz * 0.82]);
      add(head, box(0.045, 0.2, rz * 1.15), hair, [rx * 1.02, headY - 0.06, -0.03], { outline: false });
      add(head, box(0.045, 0.2, rz * 1.15), hair, [-rx * 1.02, headY - 0.06, -0.03], { outline: false });
      break;
    case 'topknot':
      add(head, cap(Math.PI * 0.46), hair, [0, headY + 0.006, -0.012], { rotate: [-0.38, 0, 0] });
      add(head, cyl(0.02, 0.026, 0.04, 6), hair, [0, headY + ry * 0.95, -0.02]);
      add(head, ico(0.04, 1), hair, [0, headY + ry + 0.05, -0.02]);
      break;
    default:
      break;
  }

  // Accessories
  const handR = bones.hand_r;
  const handL = bones.hand_l;
  const crownY = headY + ry * 0.9;
  switch (spec.accessory) {
    case 'sword':
      add(handR, box(0.034, 0.72, 0.012), '#c9ced6', [0, -0.46, 0.0]);
      add(handR, box(0.17, 0.028, 0.03), accent, [0, -0.1, 0]);
      add(handR, cyl(0.016, 0.016, 0.09, 6), shade(accent, -0.25), [0, 0.0, 0], { outline: false });
      break;
    case 'bicorne':
      add(head, cyl(0.14, 0.19, 0.1, 3), shade(primary, -0.18), [0, headY + ry * 0.9, 0], { scale: [1.35, 1, 0.9], rotate: [0, Math.PI / 2, 0] });
      add(head, ico(0.02, 0), accent, [0, headY + ry * 0.92, rz * 0.62], { outline: false });
      break;
    case 'scroll':
      add(handR, cyl(0.026, 0.026, 0.32, 8), '#e9dcc0', [0, -0.03, 0], { rotate: [0, 0, Math.PI / 2] });
      add(handR, cyl(0.032, 0.032, 0.03, 8), accent, [0.16, -0.03, 0], { rotate: [0, 0, Math.PI / 2], outline: false });
      add(handR, cyl(0.032, 0.032, 0.03, 8), accent, [-0.16, -0.03, 0], { rotate: [0, 0, Math.PI / 2], outline: false });
      break;
    case 'crown': {
      add(head, cyl(0.12, 0.115, 0.05, 8), accent, [0, crownY, 0], { scale: [rx / 0.12, 1, rz / 0.12] });
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        add(head, new THREE.ConeGeometry(0.018, 0.06, 4), accent, [Math.sin(angle) * rx * 0.95, crownY + 0.05, Math.cos(angle) * rz * 0.95], { outline: false });
      }
      break;
    }
    case 'banner': {
      add(handL, cyl(0.012, 0.012, 1.7, 6), '#6b4a2f', [0, 0.35, 0.0]);
      add(handL, box(0.34, 0.24, 0.008), accent, [0.17, 1.05, 0], { outline: false });
      add(handL, box(0.34, 0.07, 0.01), secondary, [0.17, 1.05, 0.002], { outline: false });
      break;
    }
    default:
      break;
  }

  // Rest pose. The animation clips override these every frame; they keep a still glTF sensible.
  bones.shoulder_l.rotation.z = 0.08;
  bones.shoulder_r.rotation.z = -0.08;

  root.scale.setScalar(spec.height);
  root.updateMatrixWorld(true);

  return {
    root,
    bones,
    skeleton,
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      bank.all.forEach((material) => material.dispose());
    },
  };
}
