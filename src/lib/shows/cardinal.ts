import type { Episode, Show } from './types';

/**
 * Episode titles already filed on the Cardinal map.
 * They are drafts: no audio URL, and the gateway store does not publish them.
 * The Ledger audio file is not in this repo.
 */
export const CARDINAL_TITLES = [
  'Ep 1, 01. The Tall Stick',
  'Ep 1, 08. The Rancho',
  'Ep 1, 10. Prove It',
  'Ep 4, 02. Florence',
  'Ep 4, 05',
  'Ep 4, 05. A Supermission',
  'Ep 4, 06. Two Widows',
  'Ep 4, 07. The Story of Our Streets',
  'Ep 4, 08',
  'Ep 4, 08. Opening Day',
  'Ep 4, 11',
  'Ep 4, 12. The Church of One',
  'Ep 5, 01. The Spire and the Plank',
  'Ep 5, 05. Feeding Belgium',
  'Ep 5, 06. The Myth Machine',
  'Ep 5, 09. The Garage',
  'Ep 6, 01. The Lease',
  'Ep 6, 02. Why Here',
  'Ep 6, 07. Across the Creek',
  'Ep 6, 08. Three Landings',
  'Ep 6, 10. April Third',
  'Ep 6, 11. Off the Books',
  'Ep 7, 01. Sand Hill',
  'Ep 7, 02. The Ticket Booth',
  'Ep 7, 06. The Story of Our Streets',
  'Ep 7, 07. Bayh-Dole',
  'Ep 7, 08. The Bechtel Cabinet',
  'Ep 7, 10. BackRub',
  'Ep 7, 10. BackRub (garage mention)',
  'Ep 8, 09',
  'Ep 8, 11',
  'Ep 8, 11. The Aura',
  'Ep 8, 12. The Freshman',
  'Ep 8, 15',
  'Ep 8, 15. The Pattern',
] as const;

export const CARDINAL_SHOW: Show = {
  id: 'cardinal',
  title: 'Cardinal',
  slug: 'cardinal',
  description: 'The Cardinal podcast. Episodes are listed from the Atlas catalog. No audio is hosted here, and the feed is not published.',
  author: 'Artometrics',
  ownerEmail: '',
  language: 'en-us',
  category: 'Society & Culture',
  explicit: false,
  artworkUrl: '',
  websiteUrl: '',
  status: 'active',
};

function slugPart(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

export function cardinalEpisodes(): Episode[] {
  return CARDINAL_TITLES.map((title, index) => {
    const match = title.match(/Ep\s+(\d+),\s*(\d+)/);
    const season = match ? Number(match[1]) : 1;
    const episodeNumber = match ? Number(match[2]) : index + 1;
    return {
      id: `cardinal-${slugPart(title)}`,
      showId: CARDINAL_SHOW.id,
      title,
      summary: 'Listed from the Cardinal catalog. Audio is not attached.',
      audioUrl: '',
      audioBytes: 0,
      contentType: 'audio/mpeg',
      durationSeconds: 0,
      episodeNumber,
      season,
      explicit: false,
      status: 'draft',
      publishedAt: null,
      guid: `dawn:cardinal:${slugPart(title)}`,
      artworkUrl: '',
    };
  });
}
