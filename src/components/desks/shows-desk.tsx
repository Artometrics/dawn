'use client';

import { useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { buildRss } from '@/lib/shows/rss';
import { EMPTY_SHOWS, parseShows, saveEpisode, showProblems, upsertShow } from '@/lib/shows/desk';
import type { Episode, Show, ShowsData } from '@/lib/shows/types';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'shows', label: 'Shows' },
  { id: 'episodes', label: 'Episodes' },
  { id: 'feed', label: 'Feed' },
];

export function ShowsDesk() {
  const desk = useDeskStore('shows', parseShows, EMPTY_SHOWS);
  const [view, setView] = useState('episodes');
  const [note, setNote] = useState('');
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  return (
    <div className="desk">
      <p className="dw-alert" role="status">
        <strong>Nothing is published.</strong> Cardinal episodes are listed so you can file them. No audio is hosted here, and the public feed stays empty until you mark an episode published.
      </p>
      {note || desk.note ? <p className="dw-note">{note || desk.note}</p> : null}
      <DeskSwitch label="Shows sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'shows' ? <Shows data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
      {view === 'episodes' ? <Episodes data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
      {view === 'feed' ? <Feed data={desk.value} onNote={setNote} /> : null}
    </div>
  );
}

function Shows({ data, onChange, onNote }: { data: ShowsData; onChange: (next: ShowsData) => void; onNote: (note: string) => void }) {
  const current = data.shows[0];
  const [title, setTitle] = useState(current?.title ?? '');
  const [slug, setSlug] = useState(current?.slug ?? '');
  const [author, setAuthor] = useState(current?.author ?? '');
  const [ownerEmail, setOwnerEmail] = useState(current?.ownerEmail ?? '');
  const [category, setCategory] = useState(current?.category ?? 'Arts');
  const [explicit, setExplicit] = useState(current?.explicit ?? false);
  const [artworkUrl, setArtworkUrl] = useState(current?.artworkUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(current?.websiteUrl ?? '');
  const [id, setId] = useState(current?.id ?? '');

  function load(show: Show) {
    setId(show.id);
    setTitle(show.title);
    setSlug(show.slug);
    setAuthor(show.author);
    setOwnerEmail(show.ownerEmail);
    setCategory(show.category);
    setExplicit(show.explicit);
    setArtworkUrl(show.artworkUrl);
    setWebsiteUrl(show.websiteUrl);
  }

  return (
    <form
      className="dw-form"
      onSubmit={(event) => {
        event.preventDefault();
        const result = upsertShow(data, { id, title, slug, author, ownerEmail, category, explicit, artworkUrl, websiteUrl, description: current?.description ?? '' });
        if (!result.ok) {
          onNote(result.error);
          return;
        }
        onChange(result.data);
        setId(result.show.id);
        onNote('Show saved.');
      }}
    >
      <label className="dw-label">
        Show
        <select className="dw-field" value={id} onChange={(event) => { const show = data.shows.find((row) => row.id === event.target.value); if (show) load(show); }}>
          {data.shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
        </select>
      </label>
      <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="dw-label">Slug<input className="dw-field" value={slug} onChange={(event) => setSlug(event.target.value)} /></label>
      <label className="dw-label">Author<input className="dw-field" value={author} onChange={(event) => setAuthor(event.target.value)} /></label>
      <label className="dw-label">Owner email<input className="dw-field" type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} /></label>
      <label className="dw-label">Category<input className="dw-field" value={category} onChange={(event) => setCategory(event.target.value)} /></label>
      <label className="desk-check"><input type="checkbox" checked={explicit} onChange={(event) => setExplicit(event.target.checked)} /> Explicit</label>
      <label className="dw-label">Artwork URL<input className="dw-field" value={artworkUrl} onChange={(event) => setArtworkUrl(event.target.value)} placeholder="https://" /></label>
      <label className="dw-label">Website URL<input className="dw-field" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://" /></label>
      <button type="submit" className="dw-btn dw-btn--primary">Save show</button>
    </form>
  );
}

function Episodes({ data, onChange, onNote }: { data: ShowsData; onChange: (next: ShowsData) => void; onNote: (note: string) => void }) {
  const [showId, setShowId] = useState(data.shows[0]?.id ?? '');
  const rows = data.episodes.filter((episode) => episode.showId === showId);
  return (
    <div className="dw-form">
      <label className="dw-label">
        Show
        <select className="dw-field" value={showId} onChange={(event) => setShowId(event.target.value)}>
          {data.shows.map((show) => <option key={show.id} value={show.id}>{show.title}</option>)}
        </select>
      </label>
      <p className="dw-note">{rows.length} episodes. Drafts are not in the feed.</p>
      <ul className="dw-list">
        {rows.map((episode) => (
          <li key={episode.id} className="dw-card">
            <EpisodeRow episode={episode} data={data} onChange={onChange} onNote={onNote} />
          </li>
        ))}
      </ul>
      <NewEpisode showId={showId} data={data} onChange={onChange} onNote={onNote} />
    </div>
  );
}

function EpisodeRow({ episode, data, onChange, onNote }: { episode: Episode; data: ShowsData; onChange: (next: ShowsData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState(episode.title);
  const [summary, setSummary] = useState(episode.summary);
  const [audioUrl, setAudioUrl] = useState(episode.audioUrl);
  const [status, setStatus] = useState(episode.status);
  return (
    <form
      className="dw-form"
      onSubmit={(event) => {
        event.preventDefault();
        const result = saveEpisode(data, { ...episode, title, summary, audioUrl, status, audioBytes: episode.audioBytes, durationSeconds: episode.durationSeconds });
        if (!result.ok) {
          onNote(result.error);
          return;
        }
        onChange(result.data);
        onNote('Episode saved. The GUID stays the same.');
      }}
    >
      <strong>{episode.season}:{String(episode.episodeNumber).padStart(2, '0')} · {episode.status}</strong>
      <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="dw-label">Summary<textarea className="dw-field" rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
      <label className="dw-label">Audio URL<input className="dw-field" value={audioUrl} onChange={(event) => setAudioUrl(event.target.value)} placeholder="https:// — not a Drive link" /></label>
      <p className="dw-note">GUID {episode.guid}</p>
      <label className="dw-label">
        Status
        <select className="dw-field" value={status} onChange={(event) => setStatus(event.target.value === 'published' ? 'published' : 'draft')}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>
      <button type="submit" className="dw-btn">Save episode</button>
    </form>
  );
}

function NewEpisode({ showId, data, onChange, onNote }: { showId: string; data: ShowsData; onChange: (next: ShowsData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState('');
  return (
    <form
      className="dw-form dw-card"
      onSubmit={(event) => {
        event.preventDefault();
        const result = saveEpisode(data, { showId, title, status: 'draft' });
        if (!result.ok) {
          onNote(result.error);
          return;
        }
        onChange(result.data);
        setTitle('');
        onNote('Episode added as a draft.');
      }}
    >
      <h2 className="dw-card-title">Add an episode</h2>
      <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <button type="submit" className="dw-btn dw-btn--primary">Add draft</button>
    </form>
  );
}

function Feed({ data, onNote }: { data: ShowsData; onNote: (note: string) => void }) {
  const show = data.shows[0];
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [problems, setProblems] = useState<string[]>([]);
  if (!show) return <p className="dw-note">Add a show first.</p>;
  const episodes = data.episodes.filter((episode) => episode.showId === show.id);
  const feedPath = `/api/public/rss/${show.slug}`;
  return (
    <div className="dw-form">
      <p className="dw-note">Feed URL {feedPath}</p>
      <ul className="dw-list">
        {episodes.filter((episode) => episode.status === 'published').map((episode) => (
          <li key={episode.id}>
            <code className="desk-flag">{`<iframe src="/api/public/embed/${show.slug}/${episode.id}" title="${episode.title}"></iframe>`}</code>
            <p className="dw-note">Downloads {counts[`${show.slug}/${episode.id}`] ?? 0}</p>
          </li>
        ))}
      </ul>
      <div className="dw-actions">
        <button
          type="button"
          className="dw-btn"
          onClick={() => {
            const found = showProblems(data, show.id);
            setProblems(found);
            const xml = buildRss({ show, episodes, feedUrl: feedPath, enclosureUrl: (episode) => `/api/public/listen/${show.slug}/${episode.id}` });
            onNote(xml.includes('<item>') ? 'Feed has items.' : 'Feed has no published episodes.');
          }}
        >
          Validate
        </button>
        <button
          type="button"
          className="dw-btn"
          onClick={() => {
            void (async () => {
              try {
                const base = await gatewayBase();
                const stats = await api<{ listens: Record<string, number> }>(base, '/api/shows/stats');
                setCounts(stats.listens);
                onNote('Counts loaded.');
              } catch {
                onNote('Counts appear when the gateway is open.');
              }
            })();
          }}
        >
          Load counts
        </button>
        <button
          type="button"
          className="dw-btn dw-btn--primary"
          onClick={() => {
            void (async () => {
              try {
                const base = await gatewayBase();
                await api(base, '/api/shows/publish', { method: 'POST', body: JSON.stringify({ show, episodes }) });
                onNote('Published episodes were sent to the gateway. Drafts stay off the feed.');
              } catch (error) {
                onNote(error instanceof Error ? error.message : 'The gateway is offline.');
              }
            })();
          }}
        >
          Publish feed
        </button>
      </div>
      {problems.length ? <ul className="dw-list">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul> : null}
    </div>
  );
}
