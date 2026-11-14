import type { CollectionRecord } from './types';

/** Dawn's own projects. Not the ceramics placeholders from the old vault. */
export const SEED_COLLECTIONS: CollectionRecord[] = [
  { id: 'cardinal', name: 'Cardinal', blurb: 'The Cardinal book, the podcast, and the notes beside them.', sort: 0 },
  { id: 'pantheon', name: 'Pantheon', blurb: 'Family history and the people in it.', sort: 1 },
  { id: 'artometrics', name: 'Artometrics', blurb: 'Studio notes, client work, and the practice.', sort: 2 },
  { id: 'prism-pollen', name: 'Prism & Pollen', blurb: 'Notes for the Prism & Pollen project.', sort: 3 },
  { id: 'dawn', name: 'Dawn', blurb: 'How Dawn is built and what it is for.', sort: 4 },
];

export function collectionName(id: string, collections: { id: string; name: string }[] = SEED_COLLECTIONS): string {
  if (id === 'everything') return 'Everything';
  const list = collections.length ? collections : SEED_COLLECTIONS;
  return list.find((item) => item.id === id)?.name ?? id;
}
