import * as THREE from 'three';
import { createCharacter, exportGLB, repaint, sameLook, type Character } from './character';
import { paintFloor, paintHall } from './materials';
import type { PoseName } from './bones';
import type { ForgeCharacter } from '../schema';

// The hall, floor, lights, camera and turntable from Pantheon Forge (tools/forge/src/main.js),
// wrapped as a class so React can own the canvas. Scene numbers are Forge's.

export type StageOptions = {
  /** Start with the turntable off and skip the idle motion catch-up. */
  reducedMotion?: boolean;
  /** Run the render loop. Off for the throwaway stage that draws roster images. */
  live?: boolean;
  onTurntable?: (on: boolean) => void;
};

const HALL_BG = 0x12080c;
const DEFAULT_YAW = -0.6;

function copyToCanvas(source: HTMLCanvasElement, width: number, height: number) {
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas: out, ctx };
}

export class ForgeStage {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(32, 1, 0.08, 40);
  private pivot = new THREE.Group();
  private hall: THREE.Mesh;
  private floor: THREE.Mesh;
  private shadow: THREE.Mesh;
  private character: Character | null = null;
  private spec: ForgeCharacter | null = null;
  private pose: PoseName = 'idle';
  private turn: boolean;
  private skeleton = false;
  private dragging = false;
  private lastX = 0;
  private raf = 0;
  private clock = new THREE.Clock();
  private observer: ResizeObserver | null = null;
  private disposed = false;
  private readonly onTurntable?: (on: boolean) => void;
  private readonly ownedTextures: THREE.Texture[] = [];
  private readonly handlers: Array<[string, (event: PointerEvent) => void]> = [];

  constructor(canvas: HTMLCanvasElement, options: StageOptions = {}) {
    this.canvas = canvas;
    this.turn = !options.reducedMotion;
    this.onTurntable = options.onTurntable;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.setClearColor(HALL_BG, 1);

    this.scene.background = new THREE.Color(HALL_BG);
    this.camera.position.set(0.2, 1.2, 4.15);
    this.camera.lookAt(0, 1.05, 0);

    const hallMap = paintHall();
    const floorMap = paintFloor();
    this.ownedTextures.push(hallMap, floorMap);
    this.hall = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.2, 5.2, 28, 1, true),
      new THREE.MeshBasicMaterial({ map: hallMap, side: THREE.BackSide }),
    );
    this.hall.position.y = 2.15;
    this.scene.add(this.hall);

    this.floor = new THREE.Mesh(new THREE.CircleGeometry(3.4, 48), new THREE.MeshBasicMaterial({ map: floorMap }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.48, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.012;
    this.scene.add(this.shadow);

    this.scene.add(new THREE.HemisphereLight(0xffe6cf, 0x1a1216, 0.05));
    const key = new THREE.DirectionalLight(0xfff4e2, 0.92);
    key.position.set(-2.6, 4.4, 3.2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb9cfff, 0.08);
    fill.position.set(3.2, 2.4, -2.6);
    this.scene.add(fill);

    this.pivot.rotation.y = DEFAULT_YAW;
    this.scene.add(this.pivot);

    this.bindPointer();
    const host = canvas.parentElement;
    if (host && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(host);
    }
    this.resize();
    if (options.live !== false) {
      this.clock.start();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  get turntable() {
    return this.turn;
  }

  get currentPose() {
    return this.pose;
  }

  private bindPointer() {
    const down = (event: PointerEvent) => {
      this.dragging = true;
      this.lastX = event.clientX;
      this.canvas.setPointerCapture?.(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!this.dragging) return;
      const dx = event.clientX - this.lastX;
      this.lastX = event.clientX;
      if (Math.abs(dx) < 0.5) return;
      this.pivot.rotation.y += dx * 0.01;
      if (this.turn) this.setTurntable(false);
    };
    const up = () => {
      this.dragging = false;
    };
    this.handlers.push(['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]);
    for (const [name, fn] of this.handlers) this.canvas.addEventListener(name, fn as EventListener);
  }

  private resize() {
    const host = this.canvas.parentElement;
    const w = Math.max(1, host?.clientWidth ?? this.canvas.clientWidth ?? 1);
    const h = Math.max(1, host?.clientHeight ?? this.canvas.clientHeight ?? 1);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame = () => {
    if (this.disposed) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.turn && !this.dragging) this.pivot.rotation.y += dt * 0.35;
    this.character?.mixer.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.frame);
  };

  private mount(spec: ForgeCharacter) {
    if (this.character) {
      this.pivot.remove(this.character.group);
      this.character.dispose();
    }
    this.character = createCharacter(spec);
    this.pivot.add(this.character.group);
    this.character.play(this.pose);
    this.character.setOverlay(spec.paintOverlay);
    this.applySkeleton();
  }

  private applySkeleton() {
    if (!this.character) return;
    for (const bone of this.character.skel.bones) {
      const existing = bone.getObjectByName('bone-axes');
      if (this.skeleton && !existing) {
        const axes = new THREE.AxesHelper(0.08);
        axes.name = 'bone-axes';
        bone.add(axes);
      } else if (!this.skeleton && existing) {
        bone.remove(existing);
        (existing as THREE.AxesHelper).dispose();
      }
    }
  }

  /** Repaints in place when only colors, face or overlay changed; rebuilds when the shape changed. */
  setCharacter(spec: ForgeCharacter) {
    const prev = this.spec;
    this.spec = spec;
    if (this.character && prev && sameLook(prev, spec) && prev.parts.face === spec.parts.face) {
      repaint(this.character, spec);
      this.character.setOverlay(spec.paintOverlay);
    } else {
      this.mount(spec);
    }
  }

  setPose(name: PoseName) {
    this.pose = name;
    this.character?.play(name);
  }

  setTurntable(on: boolean) {
    if (this.turn === on) return;
    this.turn = on;
    this.onTurntable?.(on);
  }

  setSkeletonVisible(on: boolean) {
    this.skeleton = on;
    this.applySkeleton();
  }

  resetView() {
    this.pivot.rotation.y = DEFAULT_YAW;
  }

  /** Lets the fade-in finish so a still frame shows the pose, not the T-pose. */
  private settle() {
    this.character?.mixer.update(0.5);
  }

  private shoot(width: number, height: number, draw: () => void): HTMLCanvasElement {
    const prev = {
      w: this.canvas.clientWidth,
      h: this.canvas.clientHeight,
      pr: this.renderer.getPixelRatio(),
      yaw: this.pivot.rotation.y,
    };
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    try {
      draw();
      return copyToCanvas(this.renderer.domElement, width, height).canvas;
    } finally {
      this.renderer.setPixelRatio(prev.pr);
      this.renderer.setSize(prev.w || 1, prev.h || 1, false);
      this.pivot.rotation.y = prev.yaw;
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Forge's portrait: 3/4 view in the hall. With `plate`, the name and epithet are set at the foot. */
  portrait(width = 900, height = 1200, plate = true): HTMLCanvasElement {
    const spec = this.spec;
    if (!spec) throw new Error('No character on the stage.');
    this.settle();
    const cam = this.camera.clone();
    cam.aspect = width / height;
    cam.position.set(0.42, 1.32, 2.85);
    cam.lookAt(0.02, 1.22, 0);
    cam.updateProjectionMatrix();
    const shot = this.shoot(width, height, () => {
      this.pivot.rotation.y = -0.7;
      this.renderer.render(this.scene, cam);
    });
    if (!plate) return shot;
    const ctx = shot.getContext('2d');
    if (!ctx) return shot;
    const scale = width / 900;
    const fade = ctx.createLinearGradient(0, height * 0.78, 0, height);
    fade.addColorStop(0, 'rgba(8, 4, 8, 0)');
    fade.addColorStop(1, 'rgba(8, 4, 8, 0.82)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.fillStyle = '#f4e6c4';
    ctx.font = `${64 * scale}px Georgia, "Liberation Serif", serif`;
    ctx.fillText(spec.name, 48 * scale, height - 108 * scale, width - 96 * scale);
    ctx.fillStyle = '#e8c36a';
    ctx.font = `${28 * scale}px Georgia, "Liberation Serif", serif`;
    ctx.fillText(spec.epithet.toUpperCase(), 48 * scale, height - 64 * scale, width - 96 * scale);
    return shot;
  }

  /** Full body on a clear background, for the Village. No hall, floor or shadow. */
  sprite(size = 64): HTMLCanvasElement {
    this.settle();
    const supersample = size * 3;
    const cam = new THREE.PerspectiveCamera(32, 1, 0.08, 40);
    cam.position.set(0, 1.0, 4.2);
    cam.lookAt(0, 1.0, 0);
    const hidden = [this.hall, this.floor, this.shadow];
    const visible = hidden.map((mesh) => mesh.visible);
    const background = this.scene.background;
    hidden.forEach((mesh) => (mesh.visible = false));
    this.scene.background = null;
    this.renderer.setClearColor(0x000000, 0);
    try {
      const big = this.shoot(supersample, supersample, () => {
        this.pivot.rotation.y = -0.35;
        this.renderer.render(this.scene, cam);
      });
      return copyToCanvas(big, size, size).canvas;
    } finally {
      hidden.forEach((mesh, i) => (mesh.visible = visible[i]));
      this.scene.background = background;
      this.renderer.setClearColor(HALL_BG, 1);
    }
  }

  glb(): Promise<ArrayBuffer> {
    if (!this.character) return Promise.reject(new Error('No character on the stage.'));
    return exportGLB(this.character) as Promise<ArrayBuffer>;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer?.disconnect();
    for (const [name, fn] of this.handlers) this.canvas.removeEventListener(name, fn as EventListener);
    if (this.character) {
      this.pivot.remove(this.character.group);
      this.character.dispose();
      this.character = null;
    }
    for (const mesh of [this.hall, this.floor, this.shadow]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.ownedTextures.forEach((tex) => tex.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
