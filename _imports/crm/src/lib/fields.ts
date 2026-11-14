const TAG_RE = /^[A-Za-z0-9 _.+#&/-]{1,24}$/
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
const HANDLE_RE = /^[A-Za-z0-9._]{0,40}$/
const PHONE_RE = /^[0-9+() ._-]{0,40}$/

export type ContactDraft = {
  name: string
  companyName: string
  email: string
  phone: string
  instagram: string
  website: string
  tags: string
  source: string
}

export function cleanTags(raw: string[] | string): string[] {
  const parts = Array.isArray(raw) ? raw : raw.split(',')
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    const tag = part.trim().replace(/^#/, '')
    if (!TAG_RE.test(tag)) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(tag)
    if (out.length === 8) break
  }
  return out
}

export function cleanHandle(value: string): string {
  let next = value.trim()
  const fromUrl = next.match(/instagram\.com\/([A-Za-z0-9._]+)/i)
  if (fromUrl?.[1]) next = fromUrl[1]
  return next.replace(/^@/, '').slice(0, 40)
}

export function cleanWebsite(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed.slice(0, 300)
  return `https://${trimmed}`.slice(0, 300)
}

export function cleanPhone(value: string): string {
  return value.trim().replace(/[^\d+() .-]/g, '').slice(0, 40)
}

export function problemForContact(draft: ContactDraft): string | null {
  const name = draft.name.trim()
  if (!name) return 'Name is required.'
  if (name.length > 120) return 'Name is too long.'
  if (draft.companyName.trim().length > 160) return 'Company name is too long.'
  const email = draft.email.trim()
  if (email && !EMAIL_RE.test(email)) return 'Email looks wrong.'
  const phone = cleanPhone(draft.phone)
  if (!PHONE_RE.test(phone)) return 'Phone looks wrong.'
  const handle = cleanHandle(draft.instagram)
  if (!HANDLE_RE.test(handle)) return 'Instagram handle only.'
  const website = cleanWebsite(draft.website)
  if (website && !/^https?:\/\/.{3,290}$/.test(website)) return 'Website needs a full link.'
  const tags = draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
  if (tags.length > 8) return 'Eight tags max.'
  for (const tag of tags) {
    const cleaned = tag.replace(/^#/, '')
    if (!TAG_RE.test(cleaned)) return `Tag “${tag}” is too odd or too long.`
  }
  if (draft.source.trim().length > 80) return 'Source is too long.'
  return null
}

export function safeStorageName(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? 'file').replace(/[^A-Za-z0-9._-]/g, '')
  const trimmed = base.replace(/^[^A-Za-z0-9]+/, '').slice(0, 80)
  return `${Date.now().toString(36)}-${trimmed || 'file'}`
}

export function allowedContentType(type: string, name: string): string | null {
  const known: Record<string, string> = {
    'image/jpeg': 'image/jpeg',
    'image/jpg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
    'image/gif': 'image/gif',
    'image/heic': 'image/heic',
    'image/heif': 'image/heif',
    'application/pdf': 'application/pdf',
    'text/plain': 'text/plain',
  }
  if (known[type]) return known[type]
  const ext = name.split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'
  if (ext === 'heic') return 'image/heic'
  if (ext === 'heif') return 'image/heif'
  if (ext === 'pdf') return 'application/pdf'
  if (ext === 'txt') return 'text/plain'
  return null
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024
