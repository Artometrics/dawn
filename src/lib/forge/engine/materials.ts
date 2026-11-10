import * as THREE from 'three';
import { ShaderChunk } from 'three';
import type { ForgeCharacter } from '../schema';

// Ported from Pantheon Forge (tools/forge/src/materials.js) with TypeScript types added.
// The shader injection and ramps are unchanged; Forge targeted three r170, Dawn runs r185.


const OUTLINE = 0x140c08;

function ctx2d(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D canvas is unavailable.');
  return g;
}

type Stop = [number, string];
type RampName = 'skin' | 'cloth' | 'hair' | 'metal' | 'gold';
type Uniforms = {
  uPaint: THREE.IUniform<THREE.Texture>;
  uPaintStrength: THREE.IUniform<number>;
  uRimColor: THREE.IUniform<THREE.Color>;
  uRimPower: THREE.IUniform<number>;
  uWobble: THREE.IUniform<number>;
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(canvas: HTMLCanvasElement, colorSpace: string) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

export function makeBrush() {
  const rand = mulberry32(0x50e7);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = ctx2d(c);
  g.fillStyle = '#d5c6b2';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = rand() * 256;
    const y = rand() * 256;
    const len = 40 + rand() * 110;
    const ang = rand() * Math.PI;
    g.strokeStyle = `rgba(${70 + rand() * 90}, ${48 + rand() * 50}, ${36 + rand() * 30}, ${0.08 + rand() * 0.18})`;
    g.lineWidth = 1 + rand() * 3.2;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.3, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    g.fillStyle = `rgba(255, 236, 210, ${0.03 + rand() * 0.06})`;
    g.fillRect(rand() * 256, rand() * 256, 30 + rand() * 80, 2);
  }
  const tex = canvasTex(c, THREE.NoColorSpace);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function ramp(stops: Stop[]) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 4;
  const g = ctx2d(c);
  const grd = g.createLinearGradient(0, 0, 256, 0);
  for (const [t, color] of stops) grd.addColorStop(t, color);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 4);
  const tex = canvasTex(c, THREE.NoColorSpace);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

// MeshToonMaterial in three r170 reads only the ramp's red channel.
const RAMPS: Record<RampName, Stop[]> = {
  skin: [[0, '#2a2a2a'], [0.32, '#3a3a3a'], [0.42, '#6e6e6e'], [0.58, '#b5b5b5'], [0.78, '#f0f0f0'], [1, '#ffffff']],
  cloth: [[0, '#242424'], [0.3, '#383838'], [0.44, '#727272'], [0.6, '#bdbdbd'], [0.8, '#f4f4f4'], [1, '#ffffff']],
  hair: [[0, '#2e2e2e'], [0.62, '#3a3a3a'], [0.84, '#8a8a8a'], [0.94, '#f0f0f0'], [1, '#ffffff']],
  metal: [[0, '#2a2a2a'], [0.38, '#333333'], [0.5, '#e4e4e4'], [0.62, '#5a5a5a'], [0.84, '#f4f4f4'], [1, '#ffffff']],
  gold: [[0, '#3a3a3a'], [0.36, '#555555'], [0.5, '#f0f0f0'], [0.64, '#6a6a6a'], [0.86, '#fff6e8'], [1, '#ffffff']],
};

type Shared = { brush: THREE.CanvasTexture; ramps: Record<RampName, THREE.CanvasTexture> };
let shared: Shared | null = null;

export function sharedTextures() {
  if (shared) return shared;
  shared = {
    brush: makeBrush(),
    ramps: {
      skin: ramp(RAMPS.skin),
      cloth: ramp(RAMPS.cloth),
      hair: ramp(RAMPS.hair),
      metal: ramp(RAMPS.metal),
      gold: ramp(RAMPS.gold),
    },
  };
  return shared;
}

function inject(material: THREE.Material, uniforms: Uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaint = uniforms.uPaint;
    shader.uniforms.uPaintStrength = uniforms.uPaintStrength;
    shader.uniforms.uRimColor = uniforms.uRimColor;
    shader.uniforms.uRimPower = uniforms.uRimPower;
    shader.uniforms.uWobble = uniforms.uWobble;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uPaint;
        uniform float uPaintStrength;
        uniform vec3 uRimColor;
        uniform float uRimPower;
        uniform float uWobble;`
      )
      .replace(
        '#include <gradientmap_pars_fragment>',
        ShaderChunk.gradientmap_pars_fragment.replace(
          'float dotNL = dot( normal, lightDirection );',
          `float dotNL = dot( normal, lightDirection );
           dotNL += (texture2D(uPaint, gl_FragCoord.xy * 0.0045).g - 0.5) * uWobble;`
        )
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          float ndl = dot(normalize(normal), normalize(vec3(-0.32, 0.72, 0.5)));
          ndl += (texture2D(uPaint, gl_FragCoord.xy * 0.0045).g - 0.5) * uWobble;
          float band = clamp(ndl * 0.5 + 0.5, 0.0, 1.0);
          float shade = 0.32;
          shade = mix(shade, 0.58, smoothstep(0.2, 0.38, band));
          shade = mix(shade, 0.84, smoothstep(0.42, 0.62, band));
          shade = mix(shade, 1.08, smoothstep(0.78, 0.94, band));
          vec3 col = diffuseColor.rgb * shade;
          col *= mix(vec3(0.84, 0.88, 1.04), vec3(1.06, 0.98, 0.9), smoothstep(0.4, 0.85, shade));
          float rim = pow(1.0 - saturate(dot(normalize(normal), normalize(-vViewPosition))), uRimPower);
          col += uRimColor * rim * 0.38;
          vec3 brush = texture2D(uPaint, gl_FragCoord.xy * 0.0032).rgb;
          col *= mix(vec3(1.0), brush, uPaintStrength);
          outgoingLight = col;
        }
        #include <opaque_fragment>`
      );
  };
  material.customProgramCacheKey = () => 'pantheon-forge-toon-v1';
}

export function createMaterials(spec: ForgeCharacter) {
  const tex = sharedTextures();
  const uniforms: Uniforms = {
    uPaint: { value: tex.brush },
    uPaintStrength: { value: spec.paintOverlay ? 0.24 : 0 },
    uRimColor: { value: new THREE.Color(0xffe2b0) },
    uRimPower: { value: 2.35 },
    uWobble: { value: 0.1 },
  };
  const toon = (color: string, rampName: RampName, extra?: THREE.MeshToonMaterialParameters) => {
    const m = new THREE.MeshToonMaterial({
      color,
      gradientMap: tex.ramps[rampName],
      ...extra,
    });
    inject(m, uniforms);
    return m;
  };
  const owned: THREE.Texture[] = [];
  const mats = {
    skin: toon(spec.colors.skin, 'skin'),
    hair: toon(spec.colors.hair, 'hair'),
    cloth: toon(spec.colors.cloth, 'cloth'),
    trim: toon(spec.colors.trim, 'gold'),
    steel: toon('#9aa3ad', 'metal'),
    leather: toon('#3a2a1c', 'cloth'),
    cream: toon('#f3eee4', 'cloth'),
    black: toon('#161311', 'cloth'),
    wood: toon('#6b4a2a', 'cloth'),
    uniforms,
    owned,
    face: toon('#ffffff', 'skin', { map: paintFace(spec.parts.face, spec.colors.skin), side: THREE.DoubleSide }),
    banner: toon('#ffffff', 'cloth', {
      map: paintBanner(spec.colors.cloth, spec.colors.trim),
      side: THREE.DoubleSide,
    }),
  };
  mats.face.polygonOffset = true;
  mats.face.polygonOffsetFactor = -2;
  mats.face.polygonOffsetUnits = -2;
  owned.push(mats.face.map as THREE.Texture);
  owned.push(mats.banner.map as THREE.Texture);
  return mats;
}

export function outlineMaterial(width: number) {
  const m = new THREE.MeshBasicMaterial({
    color: OUTLINE,
    side: THREE.BackSide,
    toneMapped: false,
  });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uOutline = { value: width };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uOutline;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed += normalize(normal) * uOutline;'
      );
  };
  m.userData.outline = true;
  return m;
}

export function outlined<T extends THREE.Mesh>(mesh: T, width = 0.012): T {
  const line = new THREE.Mesh(mesh.geometry, outlineMaterial(width));
  line.name = `${mesh.name || 'part'}_ol`;
  line.userData.outline = true;
  line.raycast = () => {};
  mesh.add(line);
  return mesh;
}

function lipColor(hex: string) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0.01, 0.08, -0.12);
  return `#${c.getHexString()}`;
}

export function paintFace(style: string, skinHex: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = ctx2d(c);
  g.fillStyle = skinHex;
  g.fillRect(0, 0, 256, 256);
  const shade = g.createLinearGradient(0, 0, 180, 0);
  shade.addColorStop(0, 'rgba(48, 28, 36, 0.28)');
  shade.addColorStop(0.55, 'rgba(48, 28, 36, 0)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 256, 256);
  const warm = g.createRadialGradient(168, 150, 10, 168, 150, 70);
  warm.addColorStop(0, 'rgba(255, 186, 140, 0.18)');
  warm.addColorStop(1, 'rgba(255, 186, 140, 0)');
  g.fillStyle = warm;
  g.fillRect(0, 0, 256, 256);

  const young = style === 'youthful';
  const eyeY = young ? 118 : 122;
  const eyeRx = young ? 22 : 20;
  const eyeRy = young ? 14 : 12;
  const drawEye = (x: number) => {
    g.fillStyle = '#f6f1ea';
    g.beginPath();
    g.ellipse(x, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#241910';
    g.beginPath();
    g.arc(x, eyeY + 0.5, young ? 6.5 : 5.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#0c0908';
    g.beginPath();
    g.arc(x, eyeY + 0.5, 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255, 250, 240, 0.95)';
    g.beginPath();
    g.arc(x - 2.5, eyeY - 2.2, 1.7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#1a120e';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x - eyeRx, eyeY - 1);
    g.quadraticCurveTo(x, eyeY - eyeRy - 3, x + eyeRx, eyeY - 1);
    g.stroke();
  };
  drawEye(104);
  drawEye(152);

  g.strokeStyle = '#1a120e';
  g.lineCap = 'round';
  g.lineWidth = style === 'calm' || young ? 3 : 4.5;
  const brow = (x0: number, y0: number, x1: number, y1: number, arch: number) => {
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - arch, x1, y1);
    g.stroke();
  };
  if (style === 'stern') {
    brow(78, 96, 124, 108, 0);
    brow(178, 96, 132, 108, 0);
  } else if (style === 'calm') {
    brow(80, 100, 124, 98, 6);
    brow(176, 100, 132, 98, 6);
  } else if (young) {
    brow(82, 96, 124, 98, 5);
    brow(174, 96, 132, 98, 5);
  } else {
    brow(78, 100, 124, 102, 1);
    brow(178, 100, 132, 102, 1);
  }

  g.strokeStyle = 'rgba(90, 48, 40, 0.45)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(128, 128);
  g.quadraticCurveTo(122, 148, 128, 158);
  g.stroke();
  g.fillStyle = 'rgba(70, 36, 32, 0.35)';
  g.beginPath();
  g.ellipse(118, 160, 5, 3, 0, 0, Math.PI * 2);
  g.ellipse(138, 160, 5, 3, 0, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = lipColor(skinHex);
  g.lineWidth = style === 'stern' ? 2.5 : 3.5;
  g.beginPath();
  const my = 184;
  if (young) {
    g.moveTo(112, my);
    g.quadraticCurveTo(128, my + 5, 144, my);
  } else if (style === 'calm') {
    g.moveTo(116, my);
    g.quadraticCurveTo(128, my + 2, 140, my);
  } else {
    g.moveTo(114, my);
    g.lineTo(142, my);
  }
  g.stroke();

  const tex = canvasTex(c, THREE.SRGBColorSpace);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function paintBanner(cloth: string, trim: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 192;
  const g = ctx2d(c);
  g.fillStyle = cloth;
  g.fillRect(0, 0, 256, 192);
  g.strokeStyle = trim;
  g.lineWidth = 14;
  g.strokeRect(10, 10, 236, 172);
  g.fillStyle = trim;
  g.fillRect(118, 28, 20, 136);
  g.fillRect(48, 86, 160, 20);
  const tex = canvasTex(c, THREE.SRGBColorSpace);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function paintHall() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = ctx2d(c);
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#12060a');
  sky.addColorStop(0.38, '#6a3018');
  sky.addColorStop(0.52, '#f0a15a');
  sky.addColorStop(0.68, '#3a1a10');
  sky.addColorStop(1, '#0c0808');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);
  const glow = g.createRadialGradient(300, 230, 10, 320, 250, 260);
  glow.addColorStop(0, 'rgba(255, 214, 150, 0.9)');
  glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 1024, 512);
  g.fillStyle = '#14080c';
  g.fillRect(0, 390, 1024, 130);
  g.fillRect(0, 0, 70, 512);
  g.fillRect(954, 0, 70, 512);
  for (const x of [150, 310, 700, 860]) g.fillRect(x, 70, 26, 330);
  g.fillRect(0, 0, 1024, 48);
  const tex = canvasTex(c, THREE.SRGBColorSpace);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function paintFloor() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = ctx2d(c);
  const rad = g.createRadialGradient(256, 256, 16, 256, 256, 250);
  rad.addColorStop(0, '#4a3224');
  rad.addColorStop(0.5, '#24140e');
  rad.addColorStop(1, '#0c0808');
  g.fillStyle = rad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(232, 195, 106, 0.55)';
  g.lineWidth = 4;
  g.beginPath();
  g.arc(256, 256, 150, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(90, 74, 42, 0.9)';
  g.lineWidth = 8;
  g.beginPath();
  g.arc(256, 256, 214, 0, Math.PI * 2);
  g.stroke();
  const tex = canvasTex(c, THREE.SRGBColorSpace);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}
