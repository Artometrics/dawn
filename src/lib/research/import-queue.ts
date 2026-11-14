import JSZip from 'jszip';
import { detectKind } from './files';
import type { SourceKind } from './types';

export type ImportableEntry = {
  path: string;
  name: string;
  kind: SourceKind;
  bytes: Uint8Array;
};

export function classifyImportPath(path: string): { name: string; kind: SourceKind } | null {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.endsWith('/')) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '__MACOSX' || part.startsWith('.'))) return null;
  const name = parts[parts.length - 1] ?? normalized;
  if (/^-wm\.[a-z0-9]+$/i.test(name) || /-wm\.[a-z0-9]+$/i.test(name)) return null;
  const kind = detectKind(name, '');
  if (!kind) return null;
  return { name, kind };
}

export async function importableZipEntries(data: Uint8Array | ArrayBuffer): Promise<ImportableEntry[]> {
  const zip = await JSZip.loadAsync(data);
  const out: ImportableEntry[] = [];
  for (const path of Object.keys(zip.files).sort()) {
    const entry = zip.files[path];
    if (!entry || entry.dir) continue;
    const classified = classifyImportPath(path);
    if (!classified) continue;
    out.push({ path, name: classified.name, kind: classified.kind, bytes: await entry.async('uint8array') });
  }
  return out;
}
