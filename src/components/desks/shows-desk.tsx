'use client';

import { useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { addEpisode, addShow, embedSnippet, EMPTY_SHOWS, feedUrlFor, parseShows, saveEpisode, saveShow, validateShow } from '@/lib/shows/desk';
import type { Episode, Show, ShowsData } from '@/lib/shows/types';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';
import './desks.css';

const VIEWS = [
  { id: 'shows', label: 'Shows' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'feed', label: 'Feed' },
];

export function ShowsDesk() {
  const desk = useDeskStore('shows', parseShows, EMPTY_SHOWS);
  const [view, setView] = useState('shows');
  const [showId, setShowId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const note = message || desk.note;
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  const current = desk.value.shows.find((show) => show.id === showId) ?? desk.value.shows[0] ?? null;

  return (
    <div className="desk">
      <p className="dw-note">Audio stays at an https URL you already host. The feed, the player, and the download counter live on the gateway.</p>
      {note ? <p className="dw-alert">{note}</p> : null}
      <DeskSwitch label="Shows sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'shows' ? <Shows data={desk.value} onChange={desk.replace} onNote={setMessage} onOpen={(id) => { setShowId(id); setView('episodes'); }} /> : null}
      {view === 'episodes' ? <Episodes data={desk.value} show={current} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'feed' ? <Feed data={desk.value} show={current} onNote={setMessage} /> : null}
    </div>
  );
}

function Shows({ data, onChange, onNote, onOpen }: { data: ShowsData; onChange: (next: ShowsData) => void; onNote: (note: string) => void; onOpen: (id: string) => void }) {
  const [title, setTitle] = useState('Cardinal');
  const [slug, setSlug] = useState('cardinal');
  const [author, setAuthor] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [category, setCategory] = useState('Arts');
  const [explicit, setExplicit] = useState(false);
  const [artworkUrl, setArtworkUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  function add() {
    const result = addShow(data, { title, slug, author, ownerEmail, category, explicit, artworkUrl, websiteUrl, description });
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    onNote('Show kept on the desk.');
    onOpen(result.show.id);
  }

  return (
    <div>
      <form className="dw-form" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="dw-label">Slug<input className="dw-field" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
        <label className="dw-label">Author<input className="dw-field" value={author} onChange={(event) => setAuthor(event.target.value)} /></label>
        <label className="dw-label">Owner email<input className="dw-field" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} /></label>
        <label className="dw-label">Category<input className="dw-field" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
        <label className="dw-label">Artwork URL<input className="dw-field" value={artworkUrl} onChange={(event) => setArtworkUrl(event.target.value)} placeholder="https://" /></label>
        <label className="dw-label">Website URL<input className="dw-field" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://" /></label>
        <label className="dw-label">Description<textarea className="dw-field" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="desk-check"><input type="checkbox" checked={explicit} onChange={(event) => setExplicit(event.target.checked)} /><span>Explicit</span></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add show</button>
      </form>
      <ul className="dw-list">
        {data.shows.map((show) => (
          <li key={show.id}><button type="button" className="dw-row" onClick={() => onOpen(show.id)}><span>{show.title}</span><small className="dw-note">{show.slug}</small></button></li>
        ))}
      </ul>
    </div>
  );
}

function Episodes({ data, show, onChange, onNote }: { data: ShowsData; show: Show | null; onChange: (next: ShowsData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [number, setNumber] = useState(1);
  const [season, setSeason] = useState(1);
  const [audioUrl, setAudioUrl] = useState('');
  const [bytes, setBytes] = useState(0);
  const [contentType, setContentType] = useState('audio/mpeg');
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  if (!show) return <p className="dw-empty">Add a show first.</p>;
  const current = show;
  const episodes = data.episodes.filter((episode) => episode.showId === current.id);

  function add() {
    const result = addEpisode(data, {
      showId: current.id,
      title,
      summary,
      episodeNumber: number,
      season,
      audioUrl,
      audioBytes: bytes,
      contentType,
      durationSeconds: duration,
      status,
      publishedAt: status === 'published' ? new Date().toISOString() : null,
    });
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setTitle('');
    setSummary('');
    onNote('Episode kept. Its GUID will not change.');
  }

  function edit(episode: Episode, patch: Partial<Episode>) {
    const saved = saveEpisode(data, { ...episode, ...patch, guid: episode.guid });
    if (!saved.ok) {
      onNote(saved.error);
      return;
    }
    onChange(saved.data);
  }

  return (
    <div>
      <h2 className="dw-h2">{current.title}</h2>
      <form className="dw-form" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="dw-label">Summary<textarea className="dw-field" rows={4} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <label className="dw-label">Number<input className="dw-field" type="number" value={number} onChange={(event) => setNumber(Number(event.target.value))} /></label>
        <label className="dw-label">Season<input className="dw-field" type="number" value={season} onChange={(event) => setSeason(Number(event.target.value))} /></label>
        <label className="dw-label">Audio URL<input className="dw-field" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https://" /></label>
        <label className="dw-label">Bytes<input className="dw-field" type="number" value={bytes} onChange={(event) => setBytes(Number(event.target.value))} /></label>
        <label className="dw-label">Content type<input className="dw-field" value={contentType} onChange={(event) => setContentType(event.target.value)} /></label>
        <label className="dw-label">Duration (seconds)<input className="dw-field" type="number" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
        <label className="dw-label">Status
          <select className="dw-field" value={status} onChange={(event) => setStatus(event.target.value as 'draft' | 'published')}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <button type="submit" className="dw-btn dw-btn--primary">Add episode</button>
      </form>
      <ul className="dw-list">
        {episodes.map((episode) => (
          <li key={episode.id} className="dw-card">
            <strong>{episode.title}</strong>
            <p className="dw-note">{episode.status} · GUID {episode.guid}</p>
            <button type="button" className="dw-btn" onClick={() => edit(episode, { status: episode.status === 'published' ? 'draft' : 'published', publishedAt: episode.publishedAt || new Date().toISOString() })}>
              {episode.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Feed({ data, show, onNote }: { data: ShowsData; show: Show | null; onNote: (note: string) => void }) {
  const [problems, setProblems] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  if (!show) return <p className="dw-empty">Add a show first.</p>;
  const current = show;
  const origin = typeof location === 'undefined' ? '' : location.origin;
  const episodes = data.episodes.filter((episode) => episode.showId === current.id);
  const feed = feedUrlFor(origin, current.slug);

  async function publish() {
    try {
      const base = await gatewayBase();
      const saved = saveShow(data, current);
      if (!saved.ok) {
        onNote(saved.error);
        return;
      }
      await api(base, '/api/shows/publish', { method: 'POST', body: JSON.stringify({ show, episodes }) });
      onNote('Feed published on the gateway.');
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'The gateway did not publish the feed.');
    }
  }

  async function loadCounts() {
    try {
      const base = await gatewayBase();
      const stats = await api<{ shows: { slug: string; episodes: { id: string; downloads: number }[] }[] }>(base, '/api/shows/stats');
      const row = stats.shows.find((item) => item.slug === current.slug);
      const next: Record<string, number> = {};
      for (const episode of row?.episodes ?? []) next[episode.id] = episode.downloads;
      setCounts(next);
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'Counts are not available.');
    }
  }

  return (
    <div className="dw-form">
      <p>Feed URL</p>
      <p className="dw-card"><code>{feed}</code></p>
      <button type="button" className="dw-btn" onClick={() => setProblems(validateShow(data, current.id, origin || 'https://dawn.local'))}>Validate</button>
      {problems.length ? <ul className="dw-list">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => void publish()}>Publish feed</button>
      <button type="button" className="dw-btn" onClick={() => void loadCounts()}>Download counts</button>
      <ul className="dw-list">
        {episodes.map((episode) => (
          <li key={episode.id} className="dw-card">
            <strong>{episode.title}</strong>
            <p className="dw-note">{counts[episode.id] ?? 0} downloads</p>
            <code>{embedSnippet(origin, current.slug, episode.id)}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}
