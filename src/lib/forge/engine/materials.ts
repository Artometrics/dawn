import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export type LookStyle = 'toon' | 'plain';

export const INK = '#15110f';
const RAMP = [96, 156, 214, 255];
const RIM = new THREE.Color('#ffd9b8');

let ramp: THREE.DataTexture | null = null;

/** Four flat light steps. NearestFilter keeps the bands hard instead of blending. */
export function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const data = new Uint8Array(RAMP.length * 4);
  RAMP.forEach((value, index) => {
    data.set([value, value, value, 255], index * 4);
  });
  const texture = new THREE.DataTexture(data, RAMP.length, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  ramp = texture;
  return texture;
}

export function makeToonMaterial(color: string): THREE.MeshToonMaterial {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp() });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: RIM };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRimColor;')
      .replace(
        '#include <opaque_fragment>',
        'float rimEdge = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 2.6);\n' +
          'outgoingLight += uRimColor * rimEdge * 0.42;\n' +
          '#include <opaque_fragment>',
      );
  };
  material.customProgramCacheKey = () => 'dawn-forge-toon-rim';
  return material;
}

export function makePlainMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
}

const OUTLINE_WIDTH = 0.0085;

export function makeOutlineMaterial(): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: OUTLINE_WIDTH };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutline;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += normalize(normal) * uOutline;');
  };
  material.customProgramCacheKey = () => 'dawn-forge-outline';
  return material;
}

/**
 * Faceted and boxy parts have a normal per face, so pushing the hull out along
 * them would open gaps at every edge. The hull uses welded, smoothed normals.
 */
export function hullGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const copy = source.clone();
  copy.deleteAttribute('normal');
  copy.deleteAttribute('uv');
  const welded = mergeVertices(copy, 1e-4);
  welded.computeVertexNormals();
  copy.dispose();
  return welded;
}
