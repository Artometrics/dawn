import type { Episode, Show } from './types';

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function itunesDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(secs)}` : `${pad(minutes)}:${pad(secs)}`;
}

export function rfc822(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date(0).toUTCString();
  return date.toUTCString();
}

export type RssInput = {
  show: Show;
  episodes: Episode[];
  feedUrl: string;
  enclosureUrl: (episode: Episode) => string;
  now?: Date;
};

export function buildRss(input: RssInput): string {
  const show = input.show;
  const explicit = show.explicit ? 'true' : 'false';
  const link = show.websiteUrl || input.feedUrl;
  const image = show.artworkUrl ? `<itunes:image href="${xmlEscape(show.artworkUrl)}"/>` : '';
  const items = input.episodes
    .filter((episode) => episode.status === 'published' && episode.publishedAt && episode.audioUrl)
    .sort((a, b) => a.episodeNumber - b.episodeNumber)
    .map((episode) => {
      const enclosure = input.enclosureUrl(episode);
      const art = episode.artworkUrl || show.artworkUrl;
      const itemImage = art ? `<itunes:image href="${xmlEscape(art)}"/>` : '';
      return [
        '<item>',
        `<title>${xmlEscape(episode.title)}</title>`,
        `<description>${xmlEscape(episode.summary)}</description>`,
        `<itunes:summary>${xmlEscape(episode.summary)}</itunes:summary>`,
        `<itunes:episode>${episode.episodeNumber}</itunes:episode>`,
        `<itunes:season>${episode.season}</itunes:season>`,
        `<itunes:episodeType>full</itunes:episodeType>`,
        `<itunes:explicit>${episode.explicit ? 'true' : 'false'}</itunes:explicit>`,
        `<guid isPermaLink="false">${xmlEscape(episode.guid)}</guid>`,
        `<pubDate>${rfc822(episode.publishedAt || '')}</pubDate>`,
        `<enclosure url="${xmlEscape(enclosure)}" length="${episode.audioBytes}" type="${xmlEscape(episode.contentType || 'audio/mpeg')}"/>`,
        `<itunes:duration>${itunesDuration(episode.durationSeconds)}</itunes:duration>`,
        itemImage,
        '</item>',
      ]
        .filter(Boolean)
        .join('');
    })
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${xmlEscape(show.title)}</title>`,
    `<link>${xmlEscape(link)}</link>`,
    `<language>${xmlEscape(show.language || 'en-us')}</language>`,
    `<description>${xmlEscape(show.description)}</description>`,
    `<itunes:summary>${xmlEscape(show.description)}</itunes:summary>`,
    `<itunes:author>${xmlEscape(show.author)}</itunes:author>`,
    '<itunes:type>episodic</itunes:type>',
    `<itunes:explicit>${explicit}</itunes:explicit>`,
    `<itunes:owner><itunes:name>${xmlEscape(show.author)}</itunes:name><itunes:email>${xmlEscape(show.ownerEmail)}</itunes:email></itunes:owner>`,
    `<itunes:category text="${xmlEscape(show.category || 'Arts')}"/>`,
    image,
    `<atom:link href="${xmlEscape(input.feedUrl)}" rel="self" type="application/rss+xml"/>`,
    `<lastBuildDate>${(input.now || new Date()).toUTCString()}</lastBuildDate>`,
    items,
    '</channel>',
    '</rss>',
  ]
    .filter(Boolean)
    .join('');
}

const REQUIRED_ITUNES = ['itunes:author', 'itunes:summary', 'itunes:explicit', 'itunes:owner', 'itunes:category', 'itunes:duration', 'itunes:episode'];

/** Structural check used by the feed view and the tests. Not a full XML parser. */
export function rssProblems(xml: string): string[] {
  const problems: string[] = [];
  if (!xml.startsWith('<?xml')) problems.push('Missing XML declaration.');
  if (!xml.includes('<rss') || !xml.includes('</rss>')) problems.push('Missing rss root.');
  if (!xml.includes('<channel>') || !xml.includes('</channel>')) problems.push('Missing channel.');
  if (!xml.includes('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"')) problems.push('Missing itunes namespace.');
  for (const tag of REQUIRED_ITUNES) {
    if (!xml.includes(`<${tag}`)) problems.push(`Missing ${tag}.`);
  }
  const opens = xml.match(/<item>/g)?.length ?? 0;
  const closes = xml.match(/<\/item>/g)?.length ?? 0;
  if (opens !== closes) problems.push('Item tags are not balanced.');
  return problems;
}
