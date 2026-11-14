import { newId } from '../cuts/text';
import { buildRss, rssProblems } from './rss';
import type { Episode, Show, ShowsData } from './types';

export const SHOW_CAP = 10;
export const EPISODE_CAP = 300;
export const SUMMARY_MAX = 4_000;
export const SLUG_PATTERN = /^[a-z0-9-]{1,40}$/;

export const EMPTY_SHOWS: ShowsData = { shows: [], episodes: [] };

export function parseShows(raw: unknown): ShowsData {
  if (!raw || typeof raw !== 'object') return EMPTY_SHOWS;
  const row = raw as Record<string, unknown>;
  const shows = Array.isArray(row.shows) ? row.shows.map(parseShow).filter((item): item is Show => item !== null) : [];
  const episodes = Array.isArray(row.episodes) ? row.episodes.map(parseEpisode).filter((item): item is Episode => item !== null) : [];
  return { shows: shows.slice(0, SHOW_CAP), episodes: episodes.slice(0, EPISODE_CAP) };
}

export function addShow(data: ShowsData, input: Partial<Show>): { ok: true; data: ShowsData; show: Show } | { ok: false; error: string } {
  if (data.shows.length >= SHOW_CAP) return { ok: false, error: `The desk holds ${SHOW_CAP} shows.` };
  const show = cleanShow({ ...blankShow(), ...input, id: input.id || newId() });
  if (!show) return { ok: false, error: 'A show needs a title and a slug of letters, numbers, and hyphens.' };
  if (data.shows.some((item) => item.slug === show.slug)) return { ok: false, error: 'That slug is already used.' };
  return { ok: true, data: { ...data, shows: [show, ...data.shows] }, show };
}

export function saveShow(data: ShowsData, show: Show): { ok: true; data: ShowsData } | { ok: false; error: string } {
  const cleaned = cleanShow(show);
  if (!cleaned) return { ok: false, error: 'A show needs a title and a slug of letters, numbers, and hyphens.' };
  if (data.shows.some((item) => item.slug === cleaned.slug && item.id !== cleaned.id)) return { ok: false, error: 'That slug is already used.' };
  const exists = data.shows.some((item) => item.id === cleaned.id);
  const shows = exists ? data.shows.map((item) => (item.id === cleaned.id ? cleaned : item)) : [cleaned, ...data.shows].slice(0, SHOW_CAP);
  return { ok: true, data: { ...data, shows } };
}

export function addEpisode(data: ShowsData, input: Partial<Episode> & { showId: string }): { ok: true; data: ShowsData; episode: Episode } | { ok: false; error: string } {
  if (data.episodes.length >= EPISODE_CAP) return { ok: false, error: `The desk holds ${EPISODE_CAP} episodes.` };
  const show = data.shows.find((item) => item.id === input.showId);
  if (!show) return { ok: false, error: 'Pick a show first.' };
  const episode = cleanEpisode({ ...blankEpisode(show), ...input, id: input.id || newId(), guid: input.guid || `dawn:${show.slug}:${newId()}` }, show.slug);
  if (!episode) return { ok: false, error: 'An episode needs a title.' };
  return { ok: true, data: { ...data, episodes: [episode, ...data.episodes] }, episode };
}

export function saveEpisode(data: ShowsData, episode: Episode): { ok: true; data: ShowsData } | { ok: false; error: string } {
  const show = data.shows.find((item) => item.id === episode.showId);
  if (!show) return { ok: false, error: 'That show is gone.' };
  const existing = data.episodes.find((item) => item.id === episode.id);
  const guid = existing?.guid || episode.guid || `dawn:${show.slug}:${newId()}`;
  const cleaned = cleanEpisode({ ...episode, guid }, show.slug);
  if (!cleaned) return { ok: false, error: 'An episode needs a title.' };
  const episodes = existing
    ? data.episodes.map((item) => (item.id === cleaned.id ? cleaned : item))
    : [cleaned, ...data.episodes].slice(0, EPISODE_CAP);
  return { ok: true, data: { ...data, episodes } };
}

export function feedUrlFor(origin: string, slug: string): string {
  return `${origin.replace(/\/$/, '')}/api/public/rss/${slug}`;
}

export function listenUrlFor(origin: string, slug: string, episodeId: string): string {
  return `${origin.replace(/\/$/, '')}/api/public/listen/${slug}/${episodeId}`;
}

export function embedSnippet(origin: string, slug: string, episodeId: string): string {
  const src = `${origin.replace(/\/$/, '')}/api/public/embed/${slug}/${episodeId}`;
  return `<iframe src="${src}" title="Episode player" width="100%" height="180" style="border:0"></iframe>`;
}

export function validateShow(data: ShowsData, showId: string, origin = 'https://dawn.local'): string[] {
  const show = data.shows.find((item) => item.id === showId);
  if (!show) return ['That show is not on the desk.'];
  const episodes = data.episodes.filter((item) => item.showId === show.id);
  const problems: string[] = [];
  if (!show.artworkUrl) problems.push('Missing artwork.');
  if (show.artworkUrl && !show.artworkUrl.startsWith('https://')) problems.push('Artwork URL is not https.');
  const guids = new Map<string, number>();
  for (const episode of episodes) {
    guids.set(episode.guid, (guids.get(episode.guid) ?? 0) + 1);
    if (episode.status !== 'published') continue;
    if (!episode.audioUrl) problems.push(`${episode.title}: missing audio URL.`);
    else if (!episode.audioUrl.startsWith('https://')) problems.push(`${episode.title}: audio URL is not https.`);
    if (!episode.durationSeconds) problems.push(`${episode.title}: duration is 0.`);
  }
  for (const [guid, count] of guids) {
    if (count > 1) problems.push(`GUID ${guid} is used ${count} times.`);
  }
  const xml = buildRss({
    show,
    episodes,
    feedUrl: feedUrlFor(origin, show.slug),
    enclosureUrl: (episode) => listenUrlFor(origin, show.slug, episode.id),
  });
  if (episodes.some((episode) => episode.status === 'published' && episode.audioUrl && episode.publishedAt)) {
    problems.push(...rssProblems(xml));
  }
  return problems;
}

function blankShow(): Show {
  return {
    id: '',
    title: '',
    slug: '',
    description: '',
    author: '',
    ownerEmail: '',
    language: 'en-us',
    category: 'Arts',
    explicit: false,
    artworkUrl: '',
    websiteUrl: '',
    status: 'active',
  };
}

function blankEpisode(show: Show): Episode {
  return {
    id: '',
    showId: show.id,
    title: '',
    summary: '',
    audioUrl: '',
    audioBytes: 0,
    contentType: 'audio/mpeg',
    durationSeconds: 0,
    episodeNumber: 1,
    season: 1,
    explicit: false,
    status: 'draft',
    publishedAt: null,
    guid: '',
    artworkUrl: '',
  };
}

function cleanShow(input: Partial<Show> & { id?: string }): Show | null {
  const title = String(input.title || '').trim().slice(0, 180);
  const slug = String(input.slug || '').trim().toLowerCase();
  if (!title || !SLUG_PATTERN.test(slug)) return null;
  return {
    id: String(input.id || newId()),
    title,
    slug,
    description: String(input.description || '').slice(0, SUMMARY_MAX),
    author: String(input.author || '').slice(0, 180),
    ownerEmail: String(input.ownerEmail || '').slice(0, 180),
    language: String(input.language || 'en-us').slice(0, 16),
    category: String(input.category || 'Arts').slice(0, 80),
    explicit: Boolean(input.explicit),
    artworkUrl: String(input.artworkUrl || '').slice(0, 500),
    websiteUrl: String(input.websiteUrl || '').slice(0, 500),
    status: input.status === 'archived' ? 'archived' : 'active',
  };
}

function cleanEpisode(input: Partial<Episode> & { showId: string; guid: string }, slug: string): Episode | null {
  const title = String(input.title || '').trim().slice(0, 180);
  if (!title) return null;
  const guid = String(input.guid || `dawn:${slug}:${newId()}`).slice(0, 180);
  return {
    id: String(input.id || newId()),
    showId: input.showId,
    title,
    summary: String(input.summary || '').slice(0, SUMMARY_MAX),
    audioUrl: String(input.audioUrl || '').slice(0, 500),
    audioBytes: Math.max(0, Math.round(Number(input.audioBytes) || 0)),
    contentType: String(input.contentType || 'audio/mpeg').slice(0, 80),
    durationSeconds: Math.max(0, Math.round(Number(input.durationSeconds) || 0)),
    episodeNumber: Math.max(1, Math.round(Number(input.episodeNumber) || 1)),
    season: Math.max(1, Math.round(Number(input.season) || 1)),
    explicit: Boolean(input.explicit),
    status: input.status === 'published' ? 'published' : 'draft',
    publishedAt: typeof input.publishedAt === 'string' ? input.publishedAt : null,
    guid,
    artworkUrl: String(input.artworkUrl || '').slice(0, 500),
  };
}

function parseShow(raw: unknown): Show | null {
  if (!raw || typeof raw !== 'object') return null;
  return cleanShow(raw as Partial<Show> & { id?: string });
}

function parseEpisode(raw: unknown): Episode | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Episode>;
  if (!row.showId || !row.guid) return null;
  return cleanEpisode({ ...row, showId: row.showId, guid: row.guid }, 'show');
}
