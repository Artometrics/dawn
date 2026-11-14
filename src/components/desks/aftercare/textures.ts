import * as THREE from 'three'
import type { Card } from '@/lib/aftercare/types'
import { ART_H, ART_W, cardArtSvg, cardBackSvg } from '@/lib/aftercare/card-art'

export const TEX_W = 512
export const TEX_H = Math.round((TEX_W * ART_H) / ART_W)

const INK = '#0f2321'
const OX = '#7b2d3a'

function svgToImage(svg: string, w: number, h: number): Promise<HTMLImageElement> {
  const sized = svg.replace('<svg ', `<svg width="${w}" height="${h}" `)
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml;charset=utf-8' }))
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not rasterise card art'))
    }
    img.src = url
  })
}

async function ensureFonts() {
  if (!('fonts' in document)) return
  try {
    await Promise.all([document.fonts.load('600 25px "Source Serif 4"'), document.fonts.load('500 14px Geist')])
  } catch {
    /* fall back to system serif */
  }
}

/** Draws the art, then the name and numeral with the page's web fonts (SVG-as-image cannot load them). */
function resolvedFamily(variable: string, fallback: string): string {
  const probe = document.createElement('span')
  probe.style.fontFamily = `var(${variable}), ${fallback}`
  document.body.append(probe)
  const family = getComputedStyle(probe).fontFamily || fallback
  probe.remove()
  return family
}

export async function renderFaceCanvas(card: Card): Promise<HTMLCanvasElement> {
  await ensureFonts()
  const displayFont = resolvedFamily('--font-serif', 'Georgia, serif')
  const uiFont = resolvedFamily('--font-geist-sans', 'system-ui, sans-serif')
  const img = await svgToImage(cardArtSvg(card, { labels: false }), TEX_W, TEX_H)
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, TEX_W, TEX_H)
  const k = TEX_W / ART_W
  const size = (card.name.length <= 12 ? 25 : card.name.length <= 16 ? 22 : 19) * k
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  ctx.font = `600 ${size}px ${displayFont}`
  ctx.fillText(card.name, TEX_W / 2, 468 * k)
  ctx.fillStyle = OX
  ctx.font = `500 ${11 * k}px ${uiFont}`
  ;(ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${4 * k}px`
  ctx.fillText(card.arcana === 'major' ? card.label : card.label.toUpperCase(), TEX_W / 2 + 2 * k, 490 * k)
  return canvas
}

export async function renderBackCanvas(): Promise<HTMLCanvasElement> {
  const img = await svgToImage(cardBackSvg(), TEX_W, TEX_H)
  const canvas = document.createElement('canvas')
  canvas.width = TEX_W
  canvas.height = TEX_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, TEX_W, TEX_H)
  return canvas
}

export function canvasTexture(canvas: HTMLCanvasElement, maxAniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = Math.min(4, maxAniso)
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  t.needsUpdate = true
  return t
}

/** Soft rounded-rect shadow texture. */
export function shadowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 224
  const ctx = c.getContext('2d')!
  ctx.filter = 'blur(9px)'
  ctx.fillStyle = 'rgba(0,0,0,0.9)'
  ctx.beginPath()
  ctx.roundRect(18, 18, 92, 188, 10)
  ctx.fill()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Dashed rounded outline marking an empty slot on the table. */
export function slotTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 224
  const ctx = c.getContext('2d')!
  ctx.strokeStyle = 'rgba(243,234,217,0.55)'
  ctx.lineWidth = 3
  ctx.setLineDash([9, 8])
  ctx.beginPath()
  ctx.roundRect(5, 5, 118, 214, 12)
  ctx.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
