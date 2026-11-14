const MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/** Escape text for use in HTML (text nodes and quoted attributes). */
export function esc(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c])
}
