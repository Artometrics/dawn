import JSZip from 'jszip';
import { chunkPassages, htmlToText, parseTranscript } from './text';
import type { Passage, SourceKind } from './types';

export function detectKind(fileName: string, contentType: string): SourceKind | null {
  const name = fileName.toLowerCase();
  const type = contentType.toLowerCase();
  if (name.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
  if (name.endsWith('.epub') || type.includes('epub')) return 'epub';
  if (name.endsWith('.vtt') || name.endsWith('.srt') || name.endsWith('.txt')) return 'transcript';
  if (name.endsWith('.html') || name.endsWith('.htm') || name.endsWith('.md') || type.includes('html')) return 'webclip';
  return null;
}

export async function extractDocument(data: Uint8Array, kind: SourceKind): Promise<Passage[]> {
  if (kind === 'pdf') return extractPdf(data);
  if (kind === 'epub') return extractEpub(data);
  if (kind === 'transcript') return parseTranscript(new TextDecoder().decode(data));
  return extractWebClip(new TextDecoder().decode(data));
}

async function extractPdf(data: Uint8Array): Promise<Passage[]> {
  const { extractText } = await import('unpdf');
  const extracted = await extractText(data, { mergePages: false });
  const pages = Array.isArray(extracted.text) ? extracted.text : [String(extracted.text ?? '')];
  const passages: Passage[] = pages
    .map((text, index) => ({
      text: text.replace(/\s+/g, ' ').trim(),
      page: index + 1,
      timestamp: null,
      startSec: null,
    }))
    .filter((page) => page.text.length > 0);
  return chunkPassages(passages);
}

async function extractEpub(data: Uint8Array): Promise<Passage[]> {
  const zip = await JSZip.loadAsync(data);
  const htmlNames = await spineOrHtml(zip);
  const passages: Passage[] = [];
  let section = 1;
  for (const name of htmlNames) {
    const file = zip.file(name);
    if (!file) continue;
    const html = await file.async('string');
    const text = htmlToText(html);
    if (!text) continue;
    passages.push({ text, page: section, timestamp: null, startSec: null });
    section += 1;
  }
  return chunkPassages(passages);
}

async function spineOrHtml(zip: JSZip): Promise<string[]> {
  const container = await zip.file('META-INF/container.xml')?.async('string');
  const opfPath = container?.match(/full-path="([^"]+)"/)?.[1];
  if (opfPath) {
    const opf = await zip.file(opfPath)?.async('string');
    if (opf) {
      const base = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
      const manifest = new Map<string, string>();
      for (const match of opf.matchAll(/<item\b[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*>/gi)) {
        manifest.set(match[1], decodeURIComponent(match[2]));
      }
      for (const match of opf.matchAll(/<item\b[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*>/gi)) {
        manifest.set(match[2], decodeURIComponent(match[1]));
      }
      const spine: string[] = [];
      for (const match of opf.matchAll(/<itemref\b[^>]*idref="([^"]+)"[^>]*\/?>/gi)) {
        const href = manifest.get(match[1]);
        if (href) spine.push(joinZip(base, href));
      }
      if (spine.length) return spine;
    }
  }
  return Object.keys(zip.files).filter((name) => /\.(x?html|htm)$/i.test(name) && !name.startsWith('META-INF/'));
}

function joinZip(base: string, href: string): string {
  if (href.startsWith('/')) return href.slice(1);
  const stack = base.split('/').filter(Boolean);
  for (const part of href.split('/')) {
    if (part === '..') stack.pop();
    else if (part !== '.') stack.push(part);
  }
  return stack.join('/');
}

function extractWebClip(raw: string): Passage[] {
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  const text = looksHtml ? htmlToText(raw) : raw.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  return chunkPassages([{ text, page: null, timestamp: null, startSec: null }]);
}
