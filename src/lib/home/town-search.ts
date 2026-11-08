export type SearchPlace = { id: string; name: string; kind: string; href: string };
export type SearchPerson = { id: string; name: string };

export type SearchHit = {
  id: string;
  title: string;
  detail: string;
  kind: 'place' | 'person';
  href?: string;
};

/** Local town search. Names and kinds only, so a single letter does not match words buried in a description. */
export function searchTown(query: string, places: SearchPlace[], people: SearchPerson[]): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];
  for (const place of places) {
    if (matches(`${place.name} ${place.kind}`, needle)) {
      hits.push({ id: place.id, title: place.name, detail: place.kind, kind: 'place', href: place.href });
    }
  }
  for (const person of people) {
    if (matches(person.name, needle)) {
      hits.push({ id: person.id, title: person.name, detail: 'Person', kind: 'person' });
    }
  }
  return hits;
}

function matches(label: string, needle: string): boolean {
  const words = label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (needle.length < 2) return words.some((word) => word.startsWith(needle));
  return label.toLowerCase().includes(needle) || words.some((word) => word.startsWith(needle));
}
