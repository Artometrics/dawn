export interface Show {
  id: string;
  title: string;
  slug: string;
  description: string;
  author: string;
  ownerEmail: string;
  language: string;
  category: string;
  explicit: boolean;
  artworkUrl: string;
  websiteUrl: string;
  status: string;
}

export interface Episode {
  id: string;
  showId: string;
  title: string;
  summary: string;
  audioUrl: string;
  audioBytes: number;
  contentType: string;
  durationSeconds: number;
  episodeNumber: number;
  season: number;
  explicit: boolean;
  status: 'draft' | 'published';
  publishedAt: string | null;
  guid: string;
  artworkUrl: string;
}

export interface ShowsData {
  shows: Show[];
  episodes: Episode[];
}

export interface PublishedShow {
  show: Show;
  episodes: Episode[];
}

export const SLUG_RE = /^[a-z0-9-]{1,40}$/;
