'use client';

import { useMemo, useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { cutCaptions, cutChapters, cutMarkdown } from '@/lib/cuts/cut';
import { addCut, addMedia, archiveCut, EMPTY_CUTS, moveCut, parseCuts, removeMedia, updateCut, writePackage } from '@/lib/cuts/desk';
import { DRAFT_WARNING, draftPackage } from '@/lib/cuts/draft';
import { NARRATION_OFF } from '@/lib/cuts/policy';
import { COLUMNS, LICENSE_LABELS, LICENSES, type ColumnId, type Cut, type CutsData } from '@/lib/cuts/types';
import { matchesQuery } from '@/lib/cuts/text';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';
import './desks.css';

const VIEWS = [
  { id: 'board', label: 'Board' },
  { id: 'cut', label: 'Cut' },
  { id: 'shelf', label: 'Shelf' },
  { id: 'find', label: 'Find' },
];

export function CutsDesk() {
  const desk = useDeskStore('cuts', parseCuts, EMPTY_CUTS);
  const [view, setView] = useState('board');
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const current = desk.value.cuts.find((cut) => cut.id === currentId) ?? desk.value.cuts[0] ?? null;
  const note = message || desk.note;
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  function open(id: string) {
    setCurrentId(id);
    setView('cut');
  }

  return (
    <div className="desk">
      <p className="dw-alert" role="status">
        <strong>Narration is not enabled.</strong> Scripts, chapters, captions, and the license shelf stay on this desk. Voice and transcription stay off unless the gateway flag is set.
        <code className="desk-flag">DAWN_MEDIA_ENABLED=true</code>
      </p>
      {note ? <p className="dw-alert">{note}</p> : null}
      <DeskSwitch label="Cuts sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'board' ? <Board data={desk.value} onOpen={open} onAdd={(next, id) => { desk.replace(next); open(id); }} onNote={setMessage} /> : null}
      {view === 'cut' ? <CutView data={desk.value} cut={current} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'shelf' ? <Shelf data={desk.value} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'find' ? <Find data={desk.value} onOpen={open} /> : null}
    </div>
  );
}

function Board({ data, onOpen, onAdd, onNote }: { data: CutsData; onOpen: (id: string) => void; onAdd: (next: CutsData, id: string) => void; onNote: (note: string) => void }) {
  const [topic, setTopic] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  function create() {
    const result = addCut(data, { topic, sourceUrl });
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    setTopic('');
    setSourceUrl('');
    onNote('Cut added.');
    onAdd(result.data, result.cut.id);
  }

  return (
    <div>
      <form className="dw-form" onSubmit={(event) => { event.preventDefault(); create(); }}>
        <label className="dw-label">Topic<input className="dw-field" value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
        <label className="dw-label">Article URL<input className="dw-field" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add cut</button>
      </form>
      <div className="desk-board desk-board--cuts">
        {COLUMNS.map((column) => {
          const cuts = data.cuts.filter((cut) => cut.column === column.id);
          return (
            <section key={column.id} className="desk-stage dw-card">
              <h2 className="dw-card-title">{column.label} <span className="dw-note">{cuts.length}</span></h2>
              {cuts.length === 0 ? <p className="dw-note">Empty</p> : null}
              <ul className="dw-list">
                {cuts.map((cut) => (
                  <li key={cut.id}>
                    <button type="button" className="dw-row" onClick={() => onOpen(cut.id)}>
                      <span>{cut.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CutView({ data, cut, onChange, onNote }: { data: CutsData; cut: Cut | null; onChange: (next: CutsData) => void; onNote: (note: string) => void }) {
  const [topic, setTopic] = useState(cut?.topic ?? '');
  const [sourceUrl, setSourceUrl] = useState(cut?.sourceUrl ?? '');
  const [sourceText, setSourceText] = useState('');
  const [script, setScript] = useState(cut?.scriptText ?? '');
  const [busy, setBusy] = useState(false);
  const found = data.cuts.find((item) => item.id === cut?.id) ?? cut;

  if (!found) return <p className="dw-empty">Add a cut on the board.</p>;
  const row: Cut = found;

  async function write() {
    setBusy(true);
    try {
      const base = await gatewayBase();
      const result = await api<{ package: Parameters<typeof writePackage>[2]; provider: 'model' | 'draft'; model: string; warning: string; excerpt?: string }>(base, '/api/cuts/generate', {
        method: 'POST',
        body: JSON.stringify({ topic: topic || row.topic, sourceUrl: sourceUrl || row.sourceUrl, sourceText }),
      });
      const saved = writePackage(data, row.id, result.package, { provider: result.provider, model: result.model, warning: result.warning, excerpt: result.excerpt });
      if (!saved.ok) {
        onNote(saved.error);
        return;
      }
      onChange(saved.data);
      setScript(saved.cut.scriptText);
      onNote(result.provider === 'draft' ? 'Draft kept on the desk.' : 'Script written.');
    } catch (error) {
      const pack = draftPackage(topic || row.topic, sourceText);
      const saved = writePackage(data, row.id, pack, { provider: 'draft', model: 'local-draft', warning: DRAFT_WARNING });
      if (saved.ok) {
        onChange(saved.data);
        setScript(saved.cut.scriptText);
      }
      onNote(error instanceof Error ? `${error.message} ${DRAFT_WARNING}` : DRAFT_WARNING);
    } finally {
      setBusy(false);
    }
  }

  function saveScript() {
    onChange(updateCut(data, row.id, { scriptText: script, topic }));
    onNote('Script kept on the desk.');
  }

  function download(name: string, contents: string, type: string) {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function narrate() {
    try {
      const base = await gatewayBase();
      await api(base, '/api/cuts/narrate', { method: 'POST', body: JSON.stringify({ text: script, voice: 'Kore' }) });
      onNote('Narration file is ready to download from the gateway.');
    } catch (error) {
      onNote(error instanceof Error ? error.message : NARRATION_OFF);
    }
  }

  const chapters = cutChapters({ ...row, scriptText: script });
  const draft = row.generationProvider === 'draft';

  return (
    <div className="dw-form">
      {draft ? <p className="dw-alert">{row.generationWarning || DRAFT_WARNING}</p> : null}
      <label className="dw-label">Topic<input className="dw-field" value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
      <label className="dw-label">Source URL<input className="dw-field" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label>
      <label className="dw-label">Pasted source<textarea className="dw-field" rows={4} value={sourceText} onChange={(event) => setSourceText(event.target.value)} /></label>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => void write()}>Write the script</button>
        <button type="button" className="dw-btn" onClick={saveScript}>Keep script</button>
      </div>
      <label className="dw-label">Script<textarea className="dw-field" rows={10} value={script} onChange={(event) => setScript(event.target.value)} /></label>
      <h2 className="dw-h2">Chapters</h2>
      <pre className="dw-card">{chapters || 'Chapters appear after a script.'}</pre>
      <button type="button" className="dw-btn" onClick={() => void navigator.clipboard.writeText(chapters).then(() => onNote('Chapter block copied.'))}>Copy chapter block</button>
      <h2 className="dw-h2">Titles</h2>
      <ul className="dw-list">
        {row.titles.map((title, index) => (
          <li key={`${title}-${index}`}>
            <button type="button" className="dw-row" onClick={() => void navigator.clipboard.writeText(title).then(() => onNote('Title copied.'))}>
              <span>{title}</span>
              <small className="dw-note">Copy</small>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="dw-h2">Description</h2>
      <p>{row.description || 'No description yet.'}</p>
      <p className="dw-note">{row.tags.join(' · ')}</p>
      <h2 className="dw-h2">Picture notes</h2>
      <ul className="dw-list">
        {row.visuals.map((visual, index) => (
          <li key={`${visual.atSeconds}-${index}`} className="dw-card"><strong>{visual.kind}</strong> {visual.direction}</li>
        ))}
      </ul>
      <h2 className="dw-h2">Thumbnail concepts</h2>
      <ul className="dw-list">
        {row.thumbnailConcepts.map((concept, index) => (
          <li key={`${concept.headline}-${index}`} className="dw-card"><strong>{concept.headline}</strong><p>{concept.layout}</p></li>
        ))}
      </ul>
      <div className="dw-actions">
        <button type="button" className="dw-btn" onClick={() => download(`${row.title || 'cut'}.srt`, cutCaptions({ ...row, scriptText: script }), 'application/x-subrip')}>Download SRT</button>
        <button type="button" className="dw-btn" onClick={() => download(`${row.title || 'cut'}.md`, cutMarkdown({ ...row, scriptText: script }), 'text/markdown')}>Export cut</button>
        <button type="button" className="dw-btn" onClick={() => void narrate()}>Narrate</button>
        <button type="button" className="dw-btn dw-btn--danger" onClick={() => { onChange(archiveCut(data, row.id)); onNote('Archived. The cut left the desk.'); }}>Archive</button>
      </div>
      <label className="dw-label">
        Column
        <select className="dw-field" value={row.column} onChange={(event) => onChange(moveCut(data, row.id, event.target.value as ColumnId))}>
          {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function Shelf({ data, onChange, onNote }: { data: CutsData; onChange: (next: CutsData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [license, setLicense] = useState<string>('cc0');
  const [creator, setCreator] = useState('');
  const [notes, setNotes] = useState('');

  function add() {
    const result = addMedia(data, { title, url, license, creator, notes });
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setTitle('');
    setUrl('');
    setNotes('');
    onNote('Source kept on the shelf.');
  }

  return (
    <div>
      <form className="dw-form" onSubmit={(event) => { event.preventDefault(); add(); }}>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="dw-label">URL<input className="dw-field" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        <label className="dw-label">Creator<input className="dw-field" value={creator} onChange={(event) => setCreator(event.target.value)} /></label>
        <label className="dw-label">
          License
          <select className="dw-field" value={license} onChange={(event) => setLicense(event.target.value)}>
            {LICENSES.map((id) => <option key={id} value={id}>{LICENSE_LABELS[id]}</option>)}
          </select>
        </label>
        <label className="dw-label">Notes<textarea className="dw-field" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add source</button>
      </form>
      <ul className="dw-list">
        {data.media.map((item) => (
          <li key={item.id} className="dw-card">
            <strong>{item.title}</strong>
            <p>{LICENSE_LABELS[item.license]} · {item.creator || 'No creator'}</p>
            <p className="dw-note">{item.url}</p>
            <button type="button" className="dw-btn" onClick={() => onChange(removeMedia(data, item.id))}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Find({ data, onOpen }: { data: CutsData; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const cuts = useMemo(() => data.cuts.filter((cut) => matchesQuery([cut.title, cut.topic, cut.scriptText, cut.description, cut.tags.join(' ')].join(' '), query)), [data.cuts, query]);
  const media = useMemo(() => data.media.filter((item) => matchesQuery([item.title, item.url, item.creator, item.notes].join(' '), query)), [data.media, query]);
  return (
    <div>
      <label className="dw-label">Search<input className="dw-field" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul className="dw-list">
        {cuts.map((cut) => (
          <li key={cut.id}><button type="button" className="dw-row" onClick={() => onOpen(cut.id)}><span>{cut.title}</span></button></li>
        ))}
        {media.map((item) => (
          <li key={item.id} className="dw-card"><strong>{item.title}</strong><p className="dw-note">{item.license}</p></li>
        ))}
      </ul>
    </div>
  );
}
