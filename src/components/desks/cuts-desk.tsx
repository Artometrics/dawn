'use client';

import { useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { applyPackage, cutMarkdown } from '@/lib/cuts/cut';
import { addCut, addShelf, archiveCut, EMPTY_CUTS, parseCuts, removeShelf, replaceCut } from '@/lib/cuts/desk';
import { DRAFT_WARNING, draftPackage } from '@/lib/cuts/draft';
import { COLUMNS, LICENSE_LABELS, LICENSES, type ColumnId, type Cut, type CutsData, type ScriptPackage } from '@/lib/cuts/types';
import { chapterBlock, matchesQuery, scriptToSrt } from '@/lib/cuts/text';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'board', label: 'Board' },
  { id: 'cut', label: 'Cut' },
  { id: 'shelf', label: 'Shelf' },
  { id: 'find', label: 'Find' },
];

export function CutsDesk() {
  const desk = useDeskStore('cuts', parseCuts, EMPTY_CUTS);
  const [view, setView] = useState('board');
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  const message = note || desk.note;

  function openCut(id: string) {
    setOpenId(id);
    setView('cut');
  }

  return (
    <div className="desk">
      <p className="dw-note">Captions and chapters are computed when you ask for them. Narration is not on this desk.</p>
      {message ? <p className="dw-alert" role="status">{message}</p> : null}
      <DeskSwitch label="Cuts sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'board' ? <Board data={desk.value} onOpen={openCut} onCreate={(next, text) => { desk.replace(next); setNote(text); }} /> : null}
      {view === 'cut' ? <CutView data={desk.value} id={openId} onChange={desk.replace} onNote={setNote} onOpen={setOpenId} /> : null}
      {view === 'shelf' ? <Shelf data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
      {view === 'find' ? <Find data={desk.value} onOpen={openCut} /> : null}
    </div>
  );
}

function Board({ data, onOpen, onCreate }: { data: CutsData; onOpen: (id: string) => void; onCreate: (next: CutsData, text: string) => void }) {
  const [topic, setTopic] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  return (
    <div className="dw-form">
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addCut(data, { topic, sourceUrl });
          if (!result.ok) {
            onCreate(data, result.error);
            return;
          }
          onCreate(result.data, 'Cut added.');
          setTopic('');
          setSourceUrl('');
        }}
      >
        <h2 className="dw-card-title">New cut</h2>
        <label className="dw-label">Topic<input className="dw-field" value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
        <label className="dw-label">Article URL<input className="dw-field" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add to the board</button>
      </form>
      <div className="desk-board">
        {COLUMNS.map((column) => {
          const cards = data.cuts.filter((cut) => cut.column === column.id);
          return (
            <section key={column.id} className="desk-stage">
              <h2 className="dw-card-title">{column.label} · {cards.length}</h2>
              {cards.map((cut) => (
                <button key={cut.id} type="button" className="dw-row" onClick={() => onOpen(cut.id)}>
                  <strong>{cut.title}</strong>
                  <small className="dw-note">{cut.topic}</small>
                </button>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CutView({ data, id, onChange, onNote, onOpen }: { data: CutsData; id: string | null; onChange: (next: CutsData) => void; onNote: (note: string) => void; onOpen: (id: string) => void }) {
  const cut = data.cuts.find((row) => row.id === id) ?? data.cuts[0] ?? null;
  const [topic, setTopic] = useState(cut?.topic ?? '');
  const [sourceUrl, setSourceUrl] = useState(cut?.sourceUrl ?? '');
  const [sourceText, setSourceText] = useState('');
  const [script, setScript] = useState(cut?.scriptText ?? '');
  const [busy, setBusy] = useState(false);
  if (!cut) return <p className="dw-note">Add a cut on the board first.</p>;

  function load(next: Cut) {
    onOpen(next.id);
    setTopic(next.topic);
    setSourceUrl(next.sourceUrl);
    setScript(next.scriptText);
  }

  async function writeScript() {
    setBusy(true);
    try {
      const base = await gatewayBase();
      const result = await api<{ package: ScriptPackage; provider: string; model: string; warning: string }>(base, '/api/cuts/generate', {
        method: 'POST',
        body: JSON.stringify({ topic: topic || cut.topic, sourceUrl, sourceText }),
      });
      const provider = result.provider === 'draft' ? 'draft' : 'gemini';
      const next = applyPackage({ ...cut, topic: topic || cut.topic, sourceUrl, scriptText: script }, result.package, {
        provider,
        model: result.model,
        warning: result.warning,
        excerpt: sourceText,
      });
      onChange(replaceCut(data, { ...next, scriptText: next.scriptText }));
      setScript(next.scriptText);
      onNote(result.warning || 'Script saved.');
    } catch {
      const pack = draftPackage(topic || cut.topic, sourceText);
      const next = applyPackage({ ...cut, topic: topic || cut.topic, sourceUrl }, pack, { provider: 'draft', model: 'local-draft', warning: DRAFT_WARNING, excerpt: sourceText });
      onChange(replaceCut(data, next));
      setScript(next.scriptText);
      onNote(DRAFT_WARNING);
    } finally {
      setBusy(false);
    }
  }

  function saveScript() {
    onChange(replaceCut(data, { ...cut, topic, sourceUrl, scriptText: script, updatedAt: Date.now() }));
    onNote('Saved on the desk.');
  }

  const chapters = chapterBlock(cut.chapters);
  const srt = scriptToSrt(script || cut.scriptText);

  return (
    <div className="dw-form">
      {data.cuts.length > 1 ? (
        <label className="dw-label">
          Open
          <select className="dw-field" value={cut.id} onChange={(event) => { const next = data.cuts.find((row) => row.id === event.target.value); if (next) load(next); }}>
            {data.cuts.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select>
        </label>
      ) : null}
      {cut.generationProvider === 'draft' ? <p className="dw-alert" role="status">{cut.generationWarning || DRAFT_WARNING}</p> : null}
      <label className="dw-label">Topic<input className="dw-field" value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
      <label className="dw-label">Source URL<input className="dw-field" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /></label>
      <label className="dw-label">Pasted source<textarea className="dw-field" rows={4} value={sourceText} onChange={(event) => setSourceText(event.target.value)} /></label>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => void writeScript()}>{busy ? 'Writing' : 'Write the script'}</button>
        <button type="button" className="dw-btn" onClick={saveScript}>Save</button>
      </div>
      <label className="dw-label">Script<textarea className="dw-field" rows={8} value={script} onChange={(event) => setScript(event.target.value)} /></label>
      <label className="dw-label">
        Column
        <select className="dw-field" value={cut.column} onChange={(event) => onChange(replaceCut(data, { ...cut, column: event.target.value as ColumnId, updatedAt: Date.now() }))}>
          {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.label}</option>)}
        </select>
      </label>
      <h2 className="dw-card-title">Titles</h2>
      <ul className="dw-list">
        {cut.titles.slice(0, 3).map((title) => (
          <li key={title}>
            <button type="button" className="dw-btn dw-btn--chip" onClick={() => void copy(title, onNote)}>{title}</button>
          </li>
        ))}
      </ul>
      <h2 className="dw-card-title">Description</h2>
      <p>{cut.description || 'No description yet.'}</p>
      <p className="dw-note">{cut.tags.join(', ')}</p>
      <h2 className="dw-card-title">Chapters</h2>
      <pre className="dw-note">{chapters || 'No chapters yet.'}</pre>
      <button type="button" className="dw-btn" onClick={() => void copy(chapters, onNote)}>Copy chapter block</button>
      <h2 className="dw-card-title">Picture notes</h2>
      <ul className="dw-list">
        {cut.visuals.map((visual, index) => <li key={`${visual.atSeconds}-${index}`}>{visual.atSeconds}s · {visual.kind} · {visual.direction}</li>)}
      </ul>
      <h2 className="dw-card-title">Thumbnail concepts</h2>
      <ul className="dw-list">
        {cut.thumbnailConcepts.map((concept) => <li key={concept.headline}><strong>{concept.headline}</strong> · {concept.layout}</li>)}
      </ul>
      <div className="dw-actions">
        <button type="button" className="dw-btn" onClick={() => downloadText(`${cut.title || 'cut'}.srt`, srt, 'application/x-subrip')}>Download SRT</button>
        <button type="button" className="dw-btn" onClick={() => downloadText(`${cut.title || 'cut'}.md`, cutMarkdown({ ...cut, scriptText: script }), 'text/markdown')}>Export cut</button>
        <button type="button" className="dw-btn dw-btn--danger" onClick={() => { onChange(archiveCut(data, cut.id)); onNote('Archived.'); }}>Archive</button>
      </div>
    </div>
  );
}

function Shelf({ data, onChange, onNote }: { data: CutsData; onChange: (next: CutsData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [creator, setCreator] = useState('');
  const [license, setLicense] = useState<string>('cc0');
  const [notes, setNotes] = useState('');
  return (
    <div className="dw-form">
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addShelf(data, { title, url, creator, license, notes });
          if (!result.ok) {
            onNote(result.error);
            return;
          }
          onChange(result.data);
          onNote('Source added.');
          setTitle('');
          setUrl('');
          setCreator('');
          setNotes('');
        }}
      >
        <h2 className="dw-card-title">License shelf</h2>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
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
            <p className="dw-note">{LICENSE_LABELS[item.license]} · {item.creator || 'No creator'}</p>
            <p className="dw-note">{item.url}</p>
            <button type="button" className="dw-btn" onClick={() => onChange(removeShelf(data, item.id))}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Find({ data, onOpen }: { data: CutsData; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const cuts = data.cuts.filter((cut) => matchesQuery([cut.title, cut.topic, cut.scriptText, cut.description, cut.tags.join(' ')].join(' '), query));
  const shelf = data.media.filter((item) => matchesQuery([item.title, item.creator, item.notes, item.url].join(' '), query));
  return (
    <div className="dw-form">
      <label className="dw-label">Find<input className="dw-field" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      <ul className="dw-list">
        {cuts.map((cut) => (
          <li key={cut.id}><button type="button" className="dw-row" onClick={() => onOpen(cut.id)}><strong>{cut.title}</strong></button></li>
        ))}
        {shelf.map((item) => (
          <li key={item.id} className="dw-note">{item.title} · {LICENSE_LABELS[item.license]}</li>
        ))}
      </ul>
    </div>
  );
}

async function copy(value: string, onNote: (note: string) => void) {
  try {
    await navigator.clipboard.writeText(value);
    onNote('Copied.');
  } catch {
    onNote('Could not copy from this browser.');
  }
}

function downloadText(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
