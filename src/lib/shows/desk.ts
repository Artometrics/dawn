import { cardinalEpisodes, CARDINAL_SHOW } from './cardinal';
import { feedProblems } from './public';
import { SLUG_RE, type Episode, type Show, type ShowsData } from './types';

export const SHOW_CAP = 10;
export const EPISODE_CAP = 300;
export const SUMMARY_MAX = 4_000;

export const EMPTY_SHOWS: ShowsData = { shows: [CARDINAL_SHOW], episodes: cardinalEpisodes() };

export function parseShows(raw: unknown): ShowsData {
  if (!raw || typeof raw !== 'object') return EMPTY_SHOWS;
  const row = raw as { shows?: unknown; episodes?: unknown };
  if (!Array.isArray(row.shows) && !Array.isArray(row.episodes)) return EMPTY_SHOWS;
  const shows = (Array.isArray(row.shows) ? row.shows : []).map(parseShow).filter((show): show is Show => Boolean(show)).slice(0, SHOW_CAP);
  const episodes = (Array.isArray(row.episodes) ? row.episodes : []).map(parseEpisode).filter((episode): episode is Episode => Boolean(episode)).slice(0, EPISODE_CAP);
  return { shows, episodes };
}

export function upsertShow(data: ShowsData, input: Partial<Show> & { title: string }): { ok: true; data: ShowsData; show: Show } | { ok: false; error: string } {
  const slug = (input.slug || slugify(input.title)).slice(0, 40);
  if (!SLUG_RE.test(slug)) return { ok: false, error: 'Use a short slug: lowercase letters, numbers, and hyphens.' };
  const existing = input.id ? data.shows.find((show) => show.id === input.id) : data.shows.find((show) => show.slug === slug);
  if (!existing && data.shows.length >= SHOW_CAP) return { ok: false, error: `The desk holds ${SHOW_CAP} shows.` };
  const show: Show = {
    id: existing?.id || slug,
    title: input.title.trim().slice(0, 180),
    slug,
    description: str(input.description).slice(0, SUMMARY_MAX),
    author: str(input.author).slice(0, 180),
    ownerEmail: str(input.ownerEmail).slice(0, 180),
    language: str(input.language) || 'en-us',
    category: str(input.category) || 'Arts',
    explicit: Boolean(input.explicit),
    artworkUrl: httpsOrEmpty(str(input.artworkUrl)),
    websiteUrl: httpsOrEmpty(str(input.websiteUrl)),
    status: str(input.status) || 'active',
  };
  const shows = existing ? data.shows.map((row) => (row.id === show.id ? show : row)) : [show, ...data.shows];
  return { ok: true, data: { ...data, shows }, show };
}

export function saveEpisode(data: ShowsData, input: Partial<Episode> & { showId: string; title: string }): { ok: true; data: ShowsData; episode: Episode } | { ok: false; error: string } {
  if (!data.shows.some((show) => show.id === input.showId)) return { ok: false, error: 'Pick a show first.' };
  const existing = input.id ? data.episodes.find((episode) => episode.id === input.id) : undefined;
  if (!existing && data.episodes.length >= EPISODE_CAP) return { ok: false, error: `The desk holds ${EPISODE_CAP} episodes.` };
  const audio = str(input.audioUrl).trim();
  if (audio && !audio.startsWith('https://')) return { ok: false, error: 'Audio must be an https URL on a host you control.' };
  const episode: Episode = {
    id: existing?.id || newEpisodeId(),
    showId: input.showId,
    title: input.title.trim().slice(0, 180),
    summary: str(input.summary).slice(0, SUMMARY_MAX),
    audioUrl: audio,
    audioBytes: Math.max(0, Math.floor(Number(input.audioBytes) || 0)),
    contentType: str(input.contentType) || 'audio/mpeg',
    durationSeconds: Math.max(0, Math.floor(Number(input.durationSeconds) || 0)),
    episodeNumber: Math.max(1, Math.floor(Number(input.episodeNumber) || existing?.episodeNumber || data.episodes.length + 1)),
    season: Math.max(1, Math.floor(Number(input.season) || existing?.season || 1)),
    explicit: Boolean(input.explicit),
    status: input.status === 'published' ? 'published' : 'draft',
    publishedAt: input.status === 'published' ? existing?.publishedAt || new Date().toISOString() : null,
    guid: existing?.guid || `dawn:${input.showId}:${newEpisodeId()}`,
    artworkUrl: httpsOrEmpty(str(input.artworkUrl)),
  };
  const episodes = existing ? data.episodes.map((row) => (row.id === episode.id ? episode : row)) : [episode, ...data.episodes];
  return { ok: true, data: { ...data, episodes }, episode };
}

export function showProblems(data: ShowsData, showId: string): string[] {
  const show = data.shows.find((row) => row.id === showId);
  if (!show) return ['That show is not on the desk.'];
  return feedProblems(show, data.episodes.filter((episode) => episode.showId === showId));
}

function parseShow(raw: unknown): Show | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Show>;
  if (typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  const slug = (str(row.slug) || slugify(row.title)).slice(0, 40);
  if (!SLUG_RE.test(slug)) return null;
  return {
    id: row.id,
    title: row.title.slice(0, 180),
    slug,
    description: str(row.description).slice(0, SUMMARY_MAX),
    author: str(row.author).slice(0, 180),
    ownerEmail: str(row.ownerEmail).slice(0, 180),
    language: str(row.language) || 'en-us',
    category: str(row.category) || 'Arts',
    explicit: Boolean(row.explicit),
    artworkUrl: httpsOrEmpty(str(row.artworkUrl)),
    websiteUrl: httpsOrEmpty(str(row.websiteUrl)),
    status: str(row.status) || 'active',
  };
}

function parseEpisode(raw: unknown): Episode | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Partial<Episode>;
  if (typeof row.id !== 'string' || typeof row.showId !== 'string' || typeof row.title !== 'string') return null;
  const audio = str(row.audioUrl);
  return {
    id: row.id,
    showId: row.showId,
    title: row.title.slice(0, 180),
    summary: str(row.summary).slice(0, SUMMARY_MAX),
    audioUrl: audio.startsWith('https://') ? audio : '',
    audioBytes: Math.max(0, Math.floor(Number(row.audioBytes) || 0)),
    contentType: str(row.contentType) || 'audio/mpeg',
    durationSeconds: Math.max(0, Math.floor(Number(row.durationSeconds) || 0)),
    episodeNumber: Math.max(0, Math.floor(Number(row.episodeNumber) || 0)),
    season: Math.max(1, Math.floor(Number(row.season) || 1)),
    explicit: Boolean(row.explicit),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : null,
    guid: str(row.guid) || `dawn:${row.showId}:${row.id}`,
    artworkUrl: str(row.artworkUrl).startsWith('https://') ? str(row.artworkUrl) : '',
  };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function httpsOrEmpty(value: string): string {
  return value.startsWith('https://') ? value.slice(0, 2000) : '';
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function newEpisodeId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
