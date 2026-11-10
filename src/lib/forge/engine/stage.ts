import * as THREE from 'three';
import type { ClipId } from '../catalog';
import type { ForgeCharacter } from '../schema';
import { buildCharacter, type BuiltCharacter } from './build';
import { POSE_TIME, makeClips } from './clips';

export function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#fff1e0', '#3a3028', 1.15));
  const key = new THREE.DirectionalLight('#fff4e6', 2.3);
  key.position.set(1.6, 2.6, 2.4);
  scene.add(key);
  const back = new THREE.DirectionalLight('#9fb8ff', 0.7);
  back.position.set(-2, 1.4, -2);
  scene.add(back);
}

export type StageOptions = { reducedMotion: boolean };

/**
 * One WebGL view of one character. It owns the renderer, the camera, the
 * animation mixer and the pointer orbit. The React panel only calls these methods.
 */
export class ForgeStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
  private built: BuiltCharacter | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private clipSet: ReturnType<typeof makeClips> | null = null;
  private helper: THREE.SkeletonHelper | null = null;
  private clock = new THREE.Clock();
  private frame = 0;
  private running = false;
  private visible = true;
  private clip: ClipId = 'idle';
  private skeletonOn = false;
  private yaw = 0.35;
  private pitch = 0.08;
  private distance = 4.4;
  private drag: { id: number; x: number; y: number } | null = null;
  private observer: ResizeObserver | null = null;
  private seen: IntersectionObserver | null = null;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement, private options: StageOptions) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    addLights(this.scene);

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.seen = new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible) this.start();
    });
    this.seen.observe(canvas);
    this.resize();
  }

  setCharacter(spec: ForgeCharacter) {
    this.clearCharacter();
    const built = buildCharacter(spec, 'toon');
    this.built = built;
    this.scene.add(built.root);
    const clips = makeClips(built.bones);
    this.mixer = new THREE.AnimationMixer(built.root);
    this.clipSet = clips;
    this.play(spec.clip);
    this.applySkeleton();
    this.frameCamera(spec.height);
    this.renderOnce();
    this.start();
  }


  setClip(id: ClipId) {
    this.play(id);
    this.renderOnce();
  }

  setSkeletonVisible(on: boolean) {
    this.skeletonOn = on;
    this.applySkeleton();
    this.renderOnce();
  }

  resetView() {
    this.yaw = 0.35;
    this.pitch = 0.08;
    this.renderOnce();
  }

  private play(id: ClipId) {
    this.clip = id;
    if (!this.mixer || !this.clipSet) return;
    this.mixer.stopAllAction();
    const action = this.mixer.clipAction(this.clipSet[id]);
    action.reset().play();
    if (this.options.reducedMotion) {
      action.paused = true;
      this.mixer.setTime(POSE_TIME[id]);
    }
  }

  private applySkeleton() {
    if (this.helper) {
      this.scene.remove(this.helper);
      this.helper.dispose();
      this.helper = null;
    }
    if (this.skeletonOn && this.built) {
      this.helper = new THREE.SkeletonHelper(this.built.root);
      const material = this.helper.material as THREE.LineBasicMaterial;
      material.depthTest = false;
      material.color.set('#4cb7ff');
      this.helper.renderOrder = 10;
      this.scene.add(this.helper);
    }
  }

  private clearCharacter() {
    if (this.built) {
      this.scene.remove(this.built.root);
      this.built.dispose();
      this.built = null;
    }
    this.mixer?.stopAllAction();
    this.mixer = null;
  }

  private frameCamera(height: number) {
    this.distance = 4.3 + (height - 1) * 1.8;
  }

  private resize() {
    if (this.disposed) return;
    const width = Math.max(1, this.canvas.clientWidth);
    const height = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }

  private placeCamera() {
    const target = new THREE.Vector3(0, 0.92 * (this.built?.root.scale.y ?? 1), 0);
    const cos = Math.cos(this.pitch);
    this.camera.position.set(
      Math.sin(this.yaw) * cos * this.distance,
      target.y + Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * cos * this.distance,
    );
    this.camera.lookAt(target);
  }

  private renderOnce() {
    if (this.disposed) return;
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private start() {
    if (this.running || this.disposed || this.options.reducedMotion) return;
    this.running = true;
    this.clock.getDelta();
    const tick = () => {
      if (this.disposed || !this.visible || document.hidden) {
        this.running = false;
        return;
      }
      this.mixer?.update(this.clock.getDelta());
      this.renderOnce();
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private onDown = (event: PointerEvent) => {
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    this.yaw -= (event.clientX - this.drag.x) * 0.012;
    this.pitch = Math.min(0.6, Math.max(-0.2, this.pitch + (event.clientY - this.drag.y) * 0.004));
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
    if (!this.running) this.renderOnce();
  };

  private onUp = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) this.drag = null;
  };

  private onWheel = (event: WheelEvent) => {
    event.preventDefault();
    this.distance = Math.min(7, Math.max(2.6, this.distance + event.deltaY * 0.004));
    if (!this.running) this.renderOnce();
  };

  /** Current clip, for the panel to read back after a preset swap. */
  get activeClip(): ClipId {
    return this.clip;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer?.disconnect();
    this.seen?.disconnect();
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    if (this.helper) this.helper.dispose();
    this.clearCharacter();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
