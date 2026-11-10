import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildBody } from './body';
import { createMaterials, paintBanner, paintFace } from './materials';
import { buildClips } from './poses';
import { buildSkeleton } from './skeleton';
import { buildWardrobe } from './wardrobe';
import type { PoseName } from './bones';
import type { ForgeCharacter } from '../schema';

// Ported from Pantheon Forge (tools/forge/src/character.js) with TypeScript types added.

export type Character = ReturnType<typeof createCharacter>;

export function createCharacter(spec: ForgeCharacter) {
  const skel = buildSkeleton(spec.body);
  const group = new THREE.Group();
  group.name = spec.id || 'legend';
  group.add(skel.root);
  skel.root.updateMatrixWorld(true);

  const mats = createMaterials(spec);
  const body = buildBody(skel, mats.skin);
  group.add(body.mesh, body.outline);
  buildWardrobe(skel, mats, spec);

  const clips = buildClips(skel, spec);
  const mixer = new THREE.AnimationMixer(skel.root);
  const actions = {
    idle: mixer.clipAction(clips.idle),
    guard: mixer.clipAction(clips.guard),
  };
  for (const action of Object.values(actions)) action.setLoop(THREE.LoopRepeat, Infinity);

  let current: THREE.AnimationAction | null = null;
  function play(name: PoseName) {
    const next = actions[name];
    if (!next || next === current) return;
    next.reset().fadeIn(0.22).play();
    if (current) current.fadeOut(0.22);
    current = next;
  }

  function setOverlay(on: boolean) {
    mats.uniforms.uPaintStrength.value = on ? 0.24 : 0;
  }

  function dispose() {
    const geos = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geos.add(mesh.geometry);
      if (mesh.material) ([] as THREE.Material[]).concat(mesh.material).forEach((mat) => materials.add(mat));
    });
    geos.forEach((geo) => geo.dispose());
    materials.forEach((mat) => mat.dispose());
    mats.owned.forEach((tex) => tex.dispose());
  }

  return { group, mixer, play, setOverlay, dispose, clips, skel, mats, get pose(): PoseName { return current === actions.guard ? 'guard' : 'idle'; } };
}

export function repaint(character: Character, spec: ForgeCharacter) {
  const mats = character.mats;
  mats.skin.color.set(spec.colors.skin);
  mats.hair.color.set(spec.colors.hair);
  mats.cloth.color.set(spec.colors.cloth);
  mats.trim.color.set(spec.colors.trim);
  const swap = (mat: THREE.MeshToonMaterial, next: THREE.Texture) => {
    if (mat.map) {
      mat.map.dispose();
      const at = mats.owned.indexOf(mat.map);
      if (at >= 0) mats.owned.splice(at, 1);
    }
    mat.map = next;
    next.needsUpdate = true;
    mats.owned.push(next);
  };
  swap(mats.face, paintFace(spec.parts.face, spec.colors.skin));
  swap(mats.banner, paintBanner(spec.colors.cloth, spec.colors.trim));
}

export function exportGLB(character: Character) {
  const hidden: THREE.Object3D[] = [];
  character.group.traverse((obj) => {
    if (obj.userData.outline) {
      hidden.push(obj);
      obj.visible = false;
    }
  });
  const exporter = new GLTFExporter();
  return exporter.parseAsync(character.group, {
    binary: true,
    animations: [character.clips.idle, character.clips.guard],
    onlyVisible: true,
  }).finally(() => {
    hidden.forEach((obj) => { obj.visible = true; });
  });
}

export function sameLook(a: ForgeCharacter, b: ForgeCharacter) {
  return a.parts.head === b.parts.head
    && a.parts.hair === b.parts.hair
    && a.parts.outfit === b.parts.outfit
    && a.parts.accessory === b.parts.accessory
    && a.body.height === b.body.height
    && a.body.build === b.body.build;
}
