import { buildRss } from './rss';
import { SLUG_RE, type Episode, type PublishedShow, type Show } from './types';

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export type ListenMap = Record<string, number>;

export function listenKey(slug: string, episodeId: string): string {
  return `${slug}/${episodeId}`;
}

export function findPublished(shows: PublishedShow[], slug: string): PublishedShow | null {
  if (!SLUG_RE.test(slug)) return null;
  return shows.find((row) => row.show.slug === slug && row.show.status !== 'archived') ?? null;
}

export function publishedEpisode(row: PublishedShow, episodeId: string): Episode | null {
  const episode = row.episodes.find((item) => item.id === episodeId) ?? null;
  if (!episode || episode.status !== 'published' || !episode.audioUrl) return null;
  if (!episode.audioUrl.startsWith('https://')) return null;
  return episode;
}

export type PublicBody =
  | { status: number; headers: Record<string, string>; body: string }
  | { status: number; headers: Record<string, string>; json: unknown };

export function rssResult(row: PublishedShow | null, origin: string, now = new Date()): PublicBody {
  if (!row) return { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: 'Show not found' };
  const feedUrl = `${origin}/api/public/rss/${row.show.slug}`;
  const xml = buildRss({
    show: row.show,
    episodes: row.episodes,
    feedUrl,
    now,
    enclosureUrl: (episode) => `${origin}/api/public/listen/${row.show.slug}/${episode.id}`,
  });
  return {
    status: 200,
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=300' },
    body: xml,
  };
}

export function listenResult(
  row: PublishedShow | null,
  episodeId: string,
  method: string,
  wantsJson: boolean,
  listens: ListenMap,
): { result: PublicBody; listens: ListenMap } {
  const episode = row ? publishedEpisode(row, episodeId) : null;
  if (!row || !episode) {
    return { listens, result: { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: 'Episode not found' } };
  }
  const location = episode.audioUrl;
  if (method === 'HEAD') {
    return {
      listens,
      result: { status: 302, headers: { location, 'cache-control': 'no-store' }, body: '' },
    };
  }
  const key = listenKey(row.show.slug, episode.id);
  const next = { ...listens, [key]: (listens[key] ?? 0) + 1 };
  const count = next[key];
  if (wantsJson) {
    return {
      listens: next,
      result: { status: 200, headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' }, json: { count, location } },
    };
  }
  return {
    listens: next,
    result: { status: 302, headers: { location, 'cache-control': 'no-store', 'x-dawn-downloads': String(count) }, body: '' },
  };
}

export function embedResult(row: PublishedShow | null, episodeId: string): PublicBody {
  const episode = row ? publishedEpisode(row, episodeId) : null;
  if (!row || !episode) return { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' }, body: 'Episode not found' };
  const show: Show = row.show;
  const art = episode.artworkUrl || show.artworkUrl;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${escapeHtml(episode.title)} — ${escapeHtml(show.title)}</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; background: #191716; color: #f3e6d0; font-family: Georgia, serif; }
  body { padding: 16px 18px 14px; }
  h1 { font-weight: 500; font-size: 22px; margin: 0 0 4px; }
  p { margin: 0 0 12px; }
  audio { width: 100%; margin-top: 12px; }
</style>
</head>
<body>
  <h1>${escapeHtml(episode.title)}</h1>
  <p>${escapeHtml(show.title)} · ${escapeHtml(show.author)}</p>
  ${art ? `<img src="${escapeAttr(art)}" alt="" width="72" height="72"/>` : ''}
  <audio controls preload="none" src="${escapeAttr(episode.audioUrl)}"></audio>
</body>
</html>`;
  return { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': 'frame-ancestors *' }, body: html };
}

export function feedProblems(show: Show, episodes: Episode[]): string[] {
  const problems: string[] = [];
  if (!show.artworkUrl) problems.push('The show has no artwork URL.');
  else if (!show.artworkUrl.startsWith('https://')) problems.push('Artwork must be an https URL.');
  const guids = new Map<string, number>();
  for (const episode of episodes) {
    guids.set(episode.guid, (guids.get(episode.guid) ?? 0) + 1);
    if (episode.status !== 'published') continue;
    if (!episode.audioUrl) problems.push(`${episode.title}: published without an audio URL.`);
    else if (!episode.audioUrl.startsWith('https://')) problems.push(`${episode.title}: audio must be https on a host you control.`);
    if (!episode.durationSeconds) problems.push(`${episode.title}: duration is 0.`);
  }
  for (const [guid, count] of guids) {
    if (guid && count > 1) problems.push(`GUID ${guid} is used ${count} times.`);
  }
  if (!episodes.some((episode) => episode.status === 'published')) problems.push('Nothing is published, so the feed has no episodes.');
  return problems;
}
