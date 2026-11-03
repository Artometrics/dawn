const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.next', 'coverage']);

/** Workspace-relative path with no traversal. Null when it must not be written. */
export function safeRelativePath(input: string): string | null {
  if (!input || input.includes('\0')) return null;
  const normalized = input.replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!normalized || normalized.startsWith('/') || /^[a-zA-Z]:/.test(normalized)) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '' || part === '.')) return null;
  if (parts.some((part) => SKIP_DIRS.has(part))) return null;
  return parts.join('/');
}

export function clip(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  return { text: text.slice(0, max), truncated: true };
}
