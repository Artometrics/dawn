import { buildRss } from './rss';
import { SLUG_PATTERN } from './desk';
import type { Episode, PublishedShow, Show } from './types';

export type ListenMap = Record<string, number>;

export function listenKey(slug: string, episodeId: string): string {
  return `${slug}/${episodeId}`;
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export function findShow(shows: PublishedShow[], slug: string): PublishedShow | null {
  if (!SLUG_PATTERN.test(slug)) return null;
  return shows.find((item) => item.show.slug === slug && item.show.status !== 'archived') ?? null;
}

export function publishedEpisodes(episodes: Episode[]): Episode[] {
  return episodes.filter((episode) => episode.status === 'published' && episode.publishedAt && episode.audioUrl.startsWith('https://'));
}

export function renderFeed(show: Show, episodes: Episode[], origin: string, now = new Date()): string {
  const root = origin.replace(/\/$/, '');
  return buildRss({
    show,
    episodes,
    feedUrl: `${root}/api/public/rss/${show.slug}`,
    enclosureUrl: (episode) => `${root}/api/public/listen/${show.slug}/${episode.id}`,
    now,
  });
}

export function renderEmbed(show: Show, episode: Episode): string {
  const art = episode.artworkUrl || show.artworkUrl;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
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
}

/** GET counts. HEAD does not. The location is always the stored https URL, never a request parameter. */
export function listenResult(
  episode: Episode | null,
  method: string,
  acceptsJson: boolean,
  count: number,
): { status: number; location?: string; json?: { count: number; location: string }; counted: boolean; error?: string } {
  if (!episode || episode.status !== 'published' || !episode.audioUrl.startsWith('https://')) {
    return { status: 404, counted: false, error: 'Episode not found' };
  }
  if (method === 'HEAD') return { status: 302, location: episode.audioUrl, counted: false };
  if (method !== 'GET') return { status: 405, counted: false, error: 'Method not allowed' };
  if (acceptsJson) return { status: 200, json: { count, location: episode.audioUrl }, counted: true };
  return { status: 302, location: episode.audioUrl, counted: true };
}

export function publishProblems(show: Show, episodes: Episode[]): string[] {
  const problems: string[] = [];
  if (!SLUG_PATTERN.test(show.slug)) problems.push('Slug must be 1–40 letters, numbers, or hyphens.');
  for (const episode of episodes) {
    if (episode.status !== 'published') continue;
    if (!episode.audioUrl.startsWith('https://')) problems.push(`${episode.title}: published audio must be an https URL you host.`);
  }
  return problems;
}
