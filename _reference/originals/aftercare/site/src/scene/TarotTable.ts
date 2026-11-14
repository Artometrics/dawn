import * as THREE from 'three'
import type { Card, SpreadId } from '../lib/types'
import { CARD_H, CARD_W, SPREADS, spreadBounds, type Spread } from '../lib/spreads'
import { DECK } from '../lib/deck'
import { canvasTexture, renderBackCanvas, renderFaceCanvas, shadowTexture, slotTexture } from './textures'

export type TableState = 'idle' | 'shuffling' | 'dealing' | 'ready' | 'resetting'

export interface TableEvents {
  /** Tap or click on a dealt card, or on the deck pile (positionId === 'pile'). */
  onActivate?: (positionId: string) => void
  onState?: (state: TableState) => void
  onFlip?: (positionId: string, faceUp: boolean) => void
}

type Ease = (t: number) => number
const easeInOut: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut: Ease = (t) => 1 - Math.pow(1 - t, 3)

interface Tween {
  t0: number
  delay: number
  dur: number
  ease: Ease
  update: (k: number) => void
  resolve: () => void
}

const EDGE = 0.022
const FACE_Z = EDGE / 2 + 0.0008
const PILE_Z = 0.012
const PILE_STEP = 0.0032
const DEG = Math.PI / 180

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

class CardObj {
  readonly root = new THREE.Group()
  readonly tilt = new THREE.Group()
  readonly flip = new THREE.Group()
  readonly orient = new THREE.Group()
  readonly front: THREE.Mesh
  readonly back: THREE.Mesh
  readonly edge: THREE.Mesh
  readonly shadow: THREE.Mesh
  slotId: string | null = null
  card: Card | null = null
  faceUp = false
  hover = 0
  hoverTarget = 0
  tiltX = 0
  tiltY = 0
  tiltTX = 0
  tiltTY = 0
  /** Position of the card when not lifted (kept so tweens and hover do not fight). */
  baseZ = 0

  constructor(shared: { geo: THREE.BufferGeometry; edgeGeo: THREE.BufferGeometry; edgeMat: THREE.Material; backMat: THREE.Material; blankMat: THREE.Material; shadowMat: THREE.Material; shadowGeo: THREE.BufferGeometry }) {
    this.front = new THREE.Mesh(shared.geo, shared.blankMat.clone())
    this.front.position.z = FACE_Z
    this.back = new THREE.Mesh(shared.geo, shared.backMat)
    this.back.position.z = -FACE_Z
    this.back.rotation.y = Math.PI
    this.edge = new THREE.Mesh(shared.edgeGeo, shared.edgeMat)
    this.edge.position.z = -EDGE / 2
    this.orient.add(this.front)
    this.flip.add(this.edge, this.orient, this.back)
    this.flip.rotation.y = Math.PI
    this.tilt.add(this.flip)
    this.root.add(this.tilt)
    this.shadow = new THREE.Mesh(shared.shadowGeo, shared.shadowMat)
    this.front.userData.card = this
    this.back.userData.card = this
    this.edge.userData.card = this
  }
}

export class TarotTable {
  supported = true
  state: TableState = 'idle'

  private host: HTMLElement
  private events: TableEvents
  private renderer!: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100)
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private cards: CardObj[] = []
  private pile: CardObj[] = []
  private pileAt: { x: number; y: number } = { x: 0, y: 0 }
  private dealt = new Map<string, CardObj>()
  private slots: THREE.Mesh[] = []
  private slotMat!: THREE.MeshBasicMaterial
  private glow!: THREE.Mesh
  private labels: HTMLElement
  private labelEls = new Map<string, HTMLElement>()
  private tweens: Tween[] = []
  private raf = 0
  private last = 0
  private dirty = true
  private spread: Spread = SPREADS.three
  private hovered: CardObj | null = null
  private reduceMotion = false
  private ro?: ResizeObserver
  private disposed = false
  private textures = new Map<string, THREE.Texture>()
  private textureOrder: string[] = []
  private backTexture?: THREE.Texture
  private shared!: ConstructorParameters<typeof CardObj>[0]
  private down: { x: number; y: number; t: number; hit: string | null } | null = null
  private maxAniso = 1

  constructor(host: HTMLElement, events: TableEvents = {}) {
    this.host = host
    this.events = events
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    this.labels = document.createElement('div')
    this.labels.className = 'table-labels'
    this.labels.setAttribute('aria-hidden', 'true')

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      this.supported = false
      return
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.maxAniso = this.renderer.capabilities.getMaxAnisotropy()
    const canvas = this.renderer.domElement
    canvas.className = 'table-canvas'
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'Tarot table. Use the buttons below the table to shuffle, deal and reveal cards.')
    host.append(canvas, this.labels)
    host.dataset.webgl = 'true'

    this.buildShared()
    this.buildCards()
    this.setSpread('three', true)
    this.bind()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(host)
    this.resize()
    this.loop(performance.now())
    void this.loadBack()
  }

  /* ---------------- setup ---------------- */
  private buildShared() {
    const shape = roundedRect(CARD_W, CARD_H, 0.075)
    const geo = new THREE.ShapeGeometry(shape, 8)
    const pos = geo.attributes.position
    const uv = geo.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / CARD_W + 0.5, pos.getY(i) / CARD_H + 0.5)
    uv.needsUpdate = true
    const edgeGeo = new THREE.ExtrudeGeometry(shape, { depth: EDGE, bevelEnabled: false, curveSegments: 6 })
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xe6d9bb })
    const backMat = new THREE.MeshBasicMaterial({ color: 0x0f2321 })
    const blankMat = new THREE.MeshBasicMaterial({ color: 0xf3ead9 })
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.5, depthWrite: false })
    const shadowGeo = new THREE.PlaneGeometry(CARD_W * 1.25, CARD_H * 1.25)
    this.shared = { geo, edgeGeo, edgeMat, backMat, blankMat, shadowMat, shadowGeo }
    this.slotMat = new THREE.MeshBasicMaterial({ map: slotTexture(), transparent: true, depthWrite: false, opacity: 0.8 })
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xd99a2b, transparent: true, opacity: 0.9, depthWrite: false })
    this.glow = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(CARD_W + 0.12, CARD_H + 0.12, 0.1), 8), glowMat)
    this.glow.visible = false
    this.glow.renderOrder = 1
    this.scene.add(this.glow)
  }

  private async loadBack() {
    const canvas = await renderBackCanvas()
    if (this.disposed) return
    this.backTexture = canvasTexture(canvas, this.maxAniso)
    ;(this.shared.backMat as THREE.MeshBasicMaterial).map = this.backTexture
    ;(this.shared.backMat as THREE.MeshBasicMaterial).color.set(0xffffff)
    ;(this.shared.backMat as THREE.MeshBasicMaterial).needsUpdate = true
    this.dirty = true
  }

  private buildCards() {
    for (let i = 0; i < DECK.length; i++) {
      const c = new CardObj(this.shared)
      this.cards.push(c)
      this.scene.add(c.root)
      c.shadow.visible = false
      c.shadow.renderOrder = -1
      this.scene.add(c.shadow)
    }
  }

  /* ---------------- layout ---------------- */
  setSpread(id: SpreadId, initial = false) {
    if (!this.supported) return
    this.spread = SPREADS[id]
    const aspect = this.host.clientWidth / Math.max(this.host.clientHeight, 1)
    this.pileAt = this.spread.pileWide && aspect > 1.6 ? this.spread.pileWide : this.spread.pile
    this.tweens = []
    this.dealt.clear()
    this.glow.visible = false
    this.pile = [...this.cards]
    this.pile.forEach((c, i) => this.placeOnPile(c, i))
    this.slots.forEach((s) => this.scene.remove(s))
    this.slots = this.spread.positions.map((p) => {
      const m = new THREE.Mesh(this.shared.geo, this.slotMat)
      m.position.set(p.x, p.y, 0.002 + (p.z ?? 0) * 0.001)
      m.rotation.z = (p.rot ?? 0) * DEG
      m.renderOrder = 0
      this.scene.add(m)
      return m
    })
    this.host.dataset.spread = id
    this.buildLabels()
    this.setState('idle')
    if (!initial) this.fit()
    this.dirty = true
  }

  private placeOnPile(c: CardObj, index: number) {
    const p = this.pileAt
    const j = ((index * 9301 + 49297) % 233280) / 233280 - 0.5
    const k = ((index * 7919 + 1103) % 233280) / 233280 - 0.5
    c.slotId = null
    c.card = null
    c.faceUp = false
    c.hoverTarget = 0
    c.hover = 0
    c.root.position.set(p.x + j * 0.03, p.y + k * 0.03, PILE_Z + index * PILE_STEP)
    c.root.rotation.z = j * 0.05
    c.tilt.rotation.set(0, 0, 0)
    c.tilt.position.z = 0
    c.tilt.scale.setScalar(1)
    c.flip.rotation.y = Math.PI
    c.orient.rotation.z = 0
    c.baseZ = c.root.position.z
    c.shadow.visible = index === 0
    c.shadow.position.set(c.root.position.x + 0.05, c.root.position.y - 0.07, 0.001)
    c.shadow.scale.set(1.08, 1.04 + (this.cards.length * PILE_STEP) * 0.1, 1)
    c.shadow.material = this.shared.shadowMat
  }

  private buildLabels() {
    this.labels.replaceChildren()
    this.labelEls.clear()
    this.spread.positions.forEach((p, i) => {
      const el = document.createElement('span')
      el.className = 'pos-label'
      el.dataset.pos = p.id
      const n = document.createElement('b')
      n.textContent = String(i + 1)
      el.append(n)
      if (this.spread.id !== 'celtic') {
        const t = document.createElement('em')
        t.textContent = p.label
        el.append(t)
      }
      this.labels.append(el)
      this.labelEls.set(p.id, el)
    })
    this.host.dataset.labelMode = this.spread.id === 'celtic' ? 'badge' : 'below'
  }

  private updateLabels() {
    const rect = this.host.getBoundingClientRect()
    const v = new THREE.Vector3()
    const celtic = this.spread.id === 'celtic'
    for (const p of this.spread.positions) {
      const el = this.labelEls.get(p.id)
      if (!el) continue
      const rot = (p.rot ?? 0) % 180 !== 0
      if (celtic) v.set(p.x + (rot ? CARD_H / 2 : -CARD_W / 2), p.y + (rot ? CARD_W / 2 : CARD_H / 2), 0.1)
      else v.set(p.x, p.y - CARD_H / 2 - 0.2, 0)
      v.project(this.camera)
      el.style.left = `${((v.x + 1) / 2) * rect.width}px`
      el.style.top = `${((1 - v.y) / 2) * rect.height}px`
    }
  }

  private fit() {
    const w = this.host.clientWidth || 1
    const h = this.host.clientHeight || 1
    const b = spreadBounds(this.spread.id, this.pileAt)
    const labelRoom = this.spread.id === 'celtic' ? 0.25 : 0.55
    const needW = b.width + 0.5
    const needH = b.height + 0.3 + labelRoom
    const aspect = w / h
    const tan = Math.tan((this.camera.fov * DEG) / 2)
    const dH = needH / 2 / tan
    const dW = needW / 2 / (tan * aspect)
    const d = Math.max(dH, dW)
    this.camera.aspect = aspect
    this.camera.position.set(b.cx, b.cy - labelRoom / 2, d)
    this.camera.lookAt(b.cx, b.cy - labelRoom / 2, 0)
    this.camera.updateProjectionMatrix()
    this.camera.updateMatrixWorld()
    this.updateLabels()
    this.dirty = true
  }

  private resize() {
    if (this.disposed) return
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.fit()
  }

  /* ---------------- tweens & loop ---------------- */
  private tween(dur: number, update: (k: number) => void, opts: { delay?: number; ease?: Ease } = {}): Promise<void> {
    const rm = this.reduceMotion
    return new Promise((resolve) => {
      this.tweens.push({ t0: performance.now(), delay: rm ? 0 : (opts.delay ?? 0) * 1000, dur: Math.max(rm ? 0.01 : dur, 0.01) * 1000 * (rm ? 0.2 : 1), ease: opts.ease ?? easeInOut, update, resolve })
    })
  }

  private loop = (now: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min((now - (this.last || now)) / 1000, 0.05)
    this.last = now
    let active = this.tweens.length > 0
    if (active) {
      const done: Tween[] = []
      for (const t of this.tweens) {
        const e = now - t.t0 - t.delay
        if (e < 0) continue
        const k = Math.min(e / t.dur, 1)
        t.update(t.ease(k))
        if (k >= 1) done.push(t)
      }
      if (done.length) {
        this.tweens = this.tweens.filter((t) => !done.includes(t))
        done.forEach((t) => t.resolve())
      }
    }
    const damp = 1 - Math.exp(-12 * dt)
    for (const c of this.dealt.values()) {
      const dh = c.hoverTarget - c.hover
      const dx = c.tiltTX - c.tiltX
      const dy = c.tiltTY - c.tiltY
      if (Math.abs(dh) > 0.002 || Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
        c.hover += dh * damp
        c.tiltX += dx * damp
        c.tiltY += dy * damp
        active = true
        this.applyHover(c)
      }
    }
    if (active || this.dirty) {
      this.renderer.render(this.scene, this.camera)
      this.dirty = false
    }
  }

  private applyHover(c: CardObj) {
    c.tilt.rotation.x = c.tiltX
    c.tilt.rotation.y = c.tiltY
    c.tilt.position.z = c.hover * 0.22
    c.tilt.scale.setScalar(1 + c.hover * 0.045)
    c.shadow.position.set(c.root.position.x + 0.05 + c.hover * 0.06, c.root.position.y - 0.07 - c.hover * 0.1, 0.001)
    this.dirty = true
  }

  private setState(s: TableState) {
    this.state = s
    this.host.dataset.state = s
    this.events.onState?.(s)
  }

  /* ---------------- textures ---------------- */
  private async faceTexture(card: Card): Promise<THREE.Texture> {
    const hit = this.textures.get(card.id)
    if (hit) return hit
    const tex = canvasTexture(await renderFaceCanvas(card), this.maxAniso)
    this.textures.set(card.id, tex)
    this.textureOrder.push(card.id)
    const inUse = new Set([...this.dealt.values()].map((c) => c.card?.id))
    while (this.textureOrder.length > 16) {
      const idx = this.textureOrder.findIndex((id) => !inUse.has(id) && id !== card.id)
      if (idx < 0) break
      const [old] = this.textureOrder.splice(idx, 1)
      this.textures.get(old)?.dispose()
      this.textures.delete(old)
    }
    return tex
  }

  /* ---------------- actions ---------------- */
  async shuffle(): Promise<void> {
    if (!this.supported || (this.state !== 'idle' && this.state !== 'ready')) return
    if (this.dealt.size) await this.reset()
    this.setState('shuffling')
    const P = this.pileAt
    const rounds = 2
    for (let r = 0; r < rounds; r++) {
      const n = this.pile.length
      const half = Math.floor(n / 2)
      const left = this.pile.slice(0, half)
      const right = this.pile.slice(half)
      const apart: Promise<void>[] = []
      const spreadX = 1.25
      for (const [group, dir] of [[left, -1], [right, 1]] as const) {
        for (const c of group) {
          const x0 = c.root.position.x
          const y0 = c.root.position.y
          const r0 = c.root.rotation.z
          apart.push(
            this.tween(0.3, (k) => {
              c.root.position.x = x0 + (P.x + dir * spreadX - x0) * k
              c.root.position.y = y0 + (P.y - y0) * k
              c.root.rotation.z = r0 + (dir * 7 * DEG - r0) * k
            }, { ease: easeOut }),
          )
        }
      }
      await Promise.all(apart)
      const order: CardObj[] = []
      for (let i = 0; i < half; i++) {
        order.push(left[i])
        if (right[i]) order.push(right[i])
      }
      for (let i = half; i < right.length; i++) order.push(right[i])
      const together: Promise<void>[] = []
      order.forEach((c, i) => {
        const x0 = c.root.position.x
        const r0 = c.root.rotation.z
        const jx = (((i * 9301 + r * 31) % 233280) / 233280 - 0.5) * 0.03
        const zEnd = PILE_Z + i * PILE_STEP
        together.push(
          this.tween(0.28, (k) => {
            c.root.position.x = x0 + (P.x + jx - x0) * k
            c.root.rotation.z = r0 + (jx * 1.5 - r0) * k
            c.root.position.z = zEnd + Math.sin(k * Math.PI) * 0.55
          }, { delay: i * 0.0075 }),
        )
      })
      await Promise.all(together)
      this.pile = order
      this.pile.forEach((c, i) => {
        c.root.position.z = PILE_Z + i * PILE_STEP
        c.baseZ = c.root.position.z
        c.shadow.visible = i === 0
      })
    }
    this.setState('idle')
  }

  /** Deals `assignments` (positionId + card + reversed) from the top of the pile into the spread. Cards stay face down. */
  async deal(assignments: Array<{ positionId: string; card: Card; reversed: boolean }>): Promise<void> {
    if (!this.supported || this.state === 'dealing' || this.state === 'shuffling') return
    if (this.dealt.size) await this.reset()
    this.setState('dealing')
    const taken = assignments.map((a, i) => ({ ...a, obj: this.pile[this.pile.length - 1 - i] }))
    this.pile = this.pile.slice(0, this.pile.length - assignments.length)
    const textures = await Promise.all(assignments.map((a) => this.faceTexture(a.card)))
    const moves: Promise<void>[] = []
    taken.forEach((t, i) => {
      const slot = this.spread.positions.find((p) => p.id === t.positionId)!
      const c = t.obj
      const mat = c.front.material as THREE.MeshBasicMaterial
      mat.map = textures[i]
      mat.color.set(0xffffff)
      mat.needsUpdate = true
      c.card = t.card
      c.slotId = slot.id
      c.orient.rotation.z = t.reversed ? Math.PI : 0
      c.faceUp = false
      this.dealt.set(slot.id, c)
      c.shadow.visible = true
      const { x: x0, y: y0, z: z0 } = c.root.position
      const r0 = c.root.rotation.z
      const zEnd = 0.02 + (slot.z ?? 0) * 0.03
      c.baseZ = zEnd
      moves.push(
        this.tween(0.62, (k) => {
          c.root.position.x = x0 + (slot.x - x0) * k
          c.root.position.y = y0 + (slot.y - y0) * k
          c.root.position.z = z0 + (zEnd - z0) * k + Math.sin(k * Math.PI) * 0.7
          c.root.rotation.z = r0 + ((slot.rot ?? 0) * DEG - r0) * k
          c.shadow.position.set(c.root.position.x + 0.05, c.root.position.y - 0.07, 0.001)
          const s = 1.08 - 0.08 * k
          c.shadow.scale.set(s, s, 1)
        }, { delay: i * 0.17 }),
      )
    })
    await Promise.all(moves)
    this.pile.forEach((c, i) => { c.shadow.visible = i === 0 })
    this.setState('ready')
  }

  isFaceUp(positionId: string) {
    return this.dealt.get(positionId)?.faceUp ?? false
  }

  async flip(positionId: string): Promise<void> {
    const c = this.dealt.get(positionId)
    if (!c || c.faceUp) return
    c.faceUp = true
    c.hoverTarget = 0
    const lift0 = 0
    await this.tween(0.78, (k) => {
      c.flip.rotation.y = Math.PI * (1 - k)
      c.root.position.z = c.baseZ + Math.sin(k * Math.PI) * 0.8 + lift0
    })
    c.root.position.z = c.baseZ
    this.events.onFlip?.(positionId, true)
    this.dirty = true
  }

  async flipAll(): Promise<void> {
    const ids = [...this.dealt.keys()].filter((id) => !this.dealt.get(id)!.faceUp)
    const spreadPos = this.spread.positions.map((p) => p.id)
    ids.sort((a, b) => spreadPos.indexOf(a) - spreadPos.indexOf(b))
    await Promise.all(ids.map((id, i) => new Promise<void>((res) => setTimeout(() => this.flip(id).then(res), this.reduceMotion ? 0 : i * 140))))
  }

  /** Puts all dealt cards back on the pile, face down. */
  async reset(): Promise<void> {
    if (!this.supported) return
    if (!this.dealt.size) { this.setSelected(null); return }
    this.setState('resetting')
    this.setSelected(null)
    const cards = [...this.dealt.values()]
    const base = this.pile.length
    const moves = cards.map((c, i) => {
      const P = this.pileAt
      const { x: x0, y: y0, z: z0 } = c.root.position
      const r0 = c.root.rotation.z
      const f0 = c.flip.rotation.y
      const zEnd = PILE_Z + (base + i) * PILE_STEP
      c.hoverTarget = 0
      c.hover = 0
      c.tilt.rotation.set(0, 0, 0)
      c.tilt.position.z = 0
      c.tilt.scale.setScalar(1)
      return this.tween(0.5, (k) => {
        c.root.position.x = x0 + (P.x - x0) * k
        c.root.position.y = y0 + (P.y - y0) * k
        c.root.position.z = z0 + (zEnd - z0) * k + Math.sin(k * Math.PI) * 0.4
        c.root.rotation.z = r0 * (1 - k)
        c.flip.rotation.y = f0 + (Math.PI - f0) * k
      }, { delay: i * 0.05 })
    })
    await Promise.all(moves)
    cards.forEach((c, i) => {
      this.pile.push(c)
      c.faceUp = false
      c.slotId = null
      c.card = null
      c.shadow.visible = false
      c.baseZ = PILE_Z + (base + i) * PILE_STEP
      ;(c.front.material as THREE.MeshBasicMaterial).map = null
      ;(c.front.material as THREE.MeshBasicMaterial).color.set(0xf3ead9)
      ;(c.front.material as THREE.MeshBasicMaterial).needsUpdate = true
    })
    this.dealt.clear()
    this.pile.forEach((c, i) => { c.shadow.visible = i === 0 })
    this.setState('idle')
  }

  setSelected(positionId: string | null) {
    const c = positionId ? this.dealt.get(positionId) : null
    if (c) {
      this.glow.visible = true
      this.glow.position.set(c.root.position.x, c.root.position.y, c.root.position.z - 0.02)
      this.glow.rotation.z = c.root.rotation.z
    } else this.glow.visible = false
    this.dirty = true
  }

  /* ---------------- pointer ---------------- */
  private bind() {
    const el = this.renderer.domElement
    el.style.touchAction = 'pan-y'
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointercancel', this.onLeave)
  }

  private pick(ev: PointerEvent): { obj: CardObj | 'pile' | null; point?: THREE.Vector3 } {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const targets: THREE.Object3D[] = []
    for (const c of this.dealt.values()) targets.push(c.front, c.back, c.edge)
    const top = this.pile[this.pile.length - 1]
    if (top) targets.push(top.back, top.edge)
    const hits = this.raycaster.intersectObjects(targets, false)
    if (!hits.length) return { obj: null }
    const obj = hits[0].object.userData.card as CardObj
    if (top && obj === top && !this.dealt.has(obj.slotId ?? '')) return { obj: 'pile', point: hits[0].point }
    return { obj, point: hits[0].point }
  }

  private setHover(c: CardObj | null, point?: THREE.Vector3) {
    if (this.hovered && this.hovered !== c) {
      this.hovered.hoverTarget = 0
      this.hovered.tiltTX = 0
      this.hovered.tiltTY = 0
    }
    this.hovered = c
    if (c && point) {
      const dx = (point.x - c.root.position.x) / (CARD_W / 2)
      const dy = (point.y - c.root.position.y) / (CARD_H / 2)
      const r = c.root.rotation.z
      const lx = dx * Math.cos(r) + dy * Math.sin(r)
      const ly = -dx * Math.sin(r) + dy * Math.cos(r)
      c.hoverTarget = 1
      c.tiltTY = Math.max(-1, Math.min(1, lx)) * 0.3
      c.tiltTX = -Math.max(-1, Math.min(1, ly)) * 0.3
    }
    this.renderer.domElement.style.cursor = c || this.hoverPile ? 'pointer' : 'default'
  }
  private hoverPile = false

  private onMove = (ev: PointerEvent) => {
    if (this.state === 'shuffling' || this.state === 'dealing' || this.state === 'resetting') return
    if (ev.pointerType === 'touch' && !this.down) return
    const p = this.pick(ev)
    this.hoverPile = p.obj === 'pile'
    if (p.obj && p.obj !== 'pile' && p.obj.card && !p.obj.slotId) return
    this.setHover(p.obj && p.obj !== 'pile' ? p.obj : null, p.point)
  }

  private onLeave = () => {
    this.hoverPile = false
    this.down = null
    this.setHover(null)
  }

  private onDown = (ev: PointerEvent) => {
    const p = this.pick(ev)
    this.down = { x: ev.clientX, y: ev.clientY, t: performance.now(), hit: p.obj === 'pile' ? 'pile' : p.obj?.slotId ?? null }
  }

  private onUp = (ev: PointerEvent) => {
    const d = this.down
    this.down = null
    if (ev.pointerType === 'touch') this.setHover(null)
    if (!d) return
    const moved = Math.hypot(ev.clientX - d.x, ev.clientY - d.y)
    if (moved > 12 || performance.now() - d.t > 700) return
    const p = this.pick(ev)
    const id = p.obj === 'pile' ? 'pile' : p.obj?.slotId ?? null
    if (id && id === d.hit) this.events.onActivate?.(id)
  }

  /* ---------------- teardown ---------------- */
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro?.disconnect()
    if (!this.supported) return
    const el = this.renderer.domElement
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointercancel', this.onLeave)
    this.textures.forEach((t) => t.dispose())
    this.backTexture?.dispose()
    this.slotMat.map?.dispose()
    this.shared.geo.dispose()
    this.shared.edgeGeo.dispose()
    this.renderer.dispose()
    el.remove()
    this.labels.remove()
  }
}
