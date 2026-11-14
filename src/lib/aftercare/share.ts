import type { SelfView } from './second-self'

const MAX_HASH = 12_000

function toBase64Url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): Uint8Array {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : ''
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** The whole shared profile lives in the URL fragment, which browsers never send to a server. */
export function encodeShare(view: SelfView): string {
  const json = JSON.stringify({ v: 1, view })
  return 'd=' + toBase64Url(new TextEncoder().encode(json))
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const KINDS = ['movie', 'book', 'thing'] as const

/** Defensive decode: anything unexpected is dropped, and all text is length limited (the page escapes it on render). */
export function decodeShare(fragment: string): SelfView | null {
  try {
    const raw = fragment.replace(/^#/, '')
    if (!raw.startsWith('d=') || raw.length > MAX_HASH) return null
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(raw.slice(2))))
    if (!parsed || parsed.v !== 1 || typeof parsed.view !== 'object' || !parsed.view) return null
    const v = parsed.view as Record<string, unknown>
    const name = str(v.name, 80).trim()
    if (!name) return null
    const out: SelfView = { name }
    if (typeof v.birthDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.birthDate)) out.birthDate = v.birthDate
    if (Array.isArray(v.facts)) out.facts = v.facts.slice(0, 6).map((f) => str(f, 160)).filter(Boolean)
    const n = v.numbers as Record<string, unknown> | undefined
    if (n && typeof n === 'object') {
      const lifePath = num(n.lifePath)
      const birthday = num(n.birthday)
      const personalYear = num(n.personalYear)
      const year = num(n.year)
      if (lifePath !== undefined && birthday !== undefined && personalYear !== undefined && year !== undefined) {
        out.numbers = {
          lifePath,
          lifePathTitle: str(n.lifePathTitle, 60),
          lifePathSummary: str(n.lifePathSummary, 600),
          birthday,
          personalYear,
          personalYearNote: str(n.personalYearNote, 200),
          year,
          expression: num(n.expression),
          soulUrge: num(n.soulUrge),
          personality: num(n.personality),
          birthCard: str(n.birthCard, 40),
          soulCard: str(n.soulCard, 40),
          signId: typeof n.signId === 'string' ? str(n.signId, 20) : undefined,
        }
      }
    }
    if (Array.isArray(v.pins)) {
      out.pins = []
      for (const p of v.pins.slice(0, 80)) {
        const o = p as Record<string, unknown>
        const lat = num(o?.lat)
        const lng = num(o?.lng)
        const kind = o?.kind === 'birth' ? 'birth' : KINDS.find((k) => k === o?.kind)
        if (lat === undefined || lng === undefined || !kind || Math.abs(lat) > 90 || Math.abs(lng) > 180) continue
        out.pins.push({ label: str(o.label, 120), lat, lng, kind, title: o.title ? str(o.title, 100) : undefined })
      }
    }
    if (Array.isArray(v.favorites)) {
      out.favorites = []
      for (const f of v.favorites.slice(0, 60)) {
        const o = f as Record<string, unknown>
        const kind = KINDS.find((k) => k === o?.kind)
        const title = str(o?.title, 100)
        if (kind && title) out.favorites.push({ kind, title, themeId: str(o.themeId, 20) })
      }
    }
    if (Array.isArray(v.links)) {
      out.links = []
      for (const l of v.links.slice(0, 40)) {
        const o = l as Record<string, unknown>
        const kind = o?.kind === 'echo' || o?.kind === 'kindred' || o?.kind === 'place' ? o.kind : null
        if (!kind) continue
        out.links.push({ kind, title: str(o.title, 160), why: str(o.why, 400), cards: Array.isArray(o.cards) ? o.cards.slice(0, 3).map((c) => str(c, 40)) : undefined })
      }
    }
    return out
  } catch {
    return null
  }
}

export function shareUrl(origin: string, view: SelfView): string {
  return `${origin}/aftercare#${encodeShare(view)}`
}
