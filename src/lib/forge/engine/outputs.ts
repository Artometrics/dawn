import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import type { ForgeCharacter } from '../schema';
import { buildCharacter } from './build';
import { POSE_TIME, makeClips } from './clips';
import { addLights } from './stage';

type Shot = { portrait: string; sprite: string };

function posed(spec: ForgeCharacter) {
  const built = buildCharacter(spec, 'toon');
  const clips = makeClips(built.bones);
  const mixer = new THREE.AnimationMixer(built.root);
  mixer.clipAction(clips[spec.clip]).play();
  mixer.setTime(POSE_TIME[spec.clip]);
  built.root.updateMatrixWorld(true);
  return built;
}

function shoot(
  spec: ForgeCharacter,
  size: number,
  frame: 'portrait' | 'full',
  antialias: boolean,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  addLights(scene);
  const built = posed(spec);
  scene.add(built.root);

  const scale = spec.height;
  const camera = new THREE.PerspectiveCamera(frame === 'portrait' ? 22 : 24, 1, 0.1, 40);
  if (frame === 'portrait') {
    const target = new THREE.Vector3(0, 1.6 * scale, 0);
    camera.position.set(0.55, target.y + 0.08, 2.3);
    camera.lookAt(target);
  } else {
    const target = new THREE.Vector3(0, 0.98 * scale, 0);
    camera.position.set(0.9 * scale, target.y + 0.35, 4.6 + (scale - 1) * 2);
    camera.lookAt(target);
  }
  renderer.render(scene, camera);
  const url = canvas.toDataURL('image/png');
  built.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return url;
}

/** Head-and-shoulders portrait for lists and the agent sheet, plus a small full-body sprite for the Village. */
export function renderShots(spec: ForgeCharacter): Shot {
  return {
    portrait: shoot(spec, 192, 'portrait', true),
    sprite: shoot(spec, 48, 'full', false),
  };
}

export function renderPortraitPng(spec: ForgeCharacter, size = 512): string {
  return shoot(spec, size, 'portrait', true);
}

/** Binary glTF with the skeleton, both clips, and plain PBR materials. The ink hulls are not exported. */
export async function exportGlb(spec: ForgeCharacter): Promise<ArrayBuffer> {
  const built = buildCharacter(spec, 'plain');
  const clips = Object.values(makeClips(built.bones));
  const exporter = new GLTFExporter();
  try {
    const result = await exporter.parseAsync(built.root, { binary: true, animations: clips, onlyVisible: true });
    if (!(result instanceof ArrayBuffer)) throw new Error('glTF export returned JSON');
    return result;
  } finally {
    built.dispose();
  }
}
