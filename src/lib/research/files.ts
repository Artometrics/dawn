import type { SourceKind } from './types';

export function safeFileName(name: string, fallbackExt: string) {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 160);
  const base = cleaned || `file.${fallbackExt}`;
  return /\.[A-Za-z0-9]+$/.test(base) ? base : `${base}.${fallbackExt}`;
}

export function detectKind(fileName: string, contentType: string): SourceKind | null {
  const name = fileName.toLowerCase();
  const type = contentType.toLowerCase();
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (name.endsWith('.epub') || type.includes('epub')) return 'epub';
  if (name.endsWith('.vtt') || name.endsWith('.srt') || name.endsWith('.txt')) return 'transcript';
  if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.md') || type.includes('html')) return 'webclip';
  return null;
}
