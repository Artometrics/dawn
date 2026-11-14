/** A show is a podcast. Audio stays at a URL Kyle already hosts. No file bytes live on the desk. */

export type Show = {
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
  status: 'active' | 'archived';
};

export type Episode = {
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
};

export type ShowsData = {
  shows: Show[];
  episodes: Episode[];
};

export type PublishedShow = {
  show: Show;
  episodes: Episode[];
};
