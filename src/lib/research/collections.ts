import type { CollectionRecord } from './types';

/** Dawn's own projects. Names only, with a one-line blurb. Not the ceramics placeholders. */
export const DAWN_COLLECTIONS: CollectionRecord[] = [
  { id: 'cardinal', name: 'Cardinal', blurb: 'The campus book and podcast, the places Atlas already maps.', createdAt: '2026-11-14T00:00:00.000Z' },
  { id: 'pantheon', name: 'Pantheon', blurb: 'Games and characters that sit beside Dawn.', createdAt: '2026-11-14T00:00:00.000Z' },
  { id: 'artometrics', name: 'Artometrics', blurb: 'The studio name on the letters, invoices, and this desk.', createdAt: '2026-11-14T00:00:00.000Z' },
  { id: 'prism-pollen', name: 'Prism & Pollen', blurb: 'Notes filed under Prism & Pollen.', createdAt: '2026-11-14T00:00:00.000Z' },
  { id: 'dawn', name: 'Dawn', blurb: 'Agents, kits, and the desks on this machine.', createdAt: '2026-11-14T00:00:00.000Z' },
];

export function collectionName(id: string, collections: { id: string; name: string }[] = DAWN_COLLECTIONS): string {
  if (id === 'everything') return 'Everything';
  return collections.find((item) => item.id === id)?.name ?? id;
}
