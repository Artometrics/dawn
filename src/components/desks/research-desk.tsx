'use client';

import { useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { toBibtex, toMarkdown } from '@/lib/research/citations';
import { addCollection, addSource, deleteCollection, EMPTY_RESEARCH, parseResearch, removeSource, saveAnswer, setSourceStatus } from '@/lib/research/desk';
import { LOCAL_NOTE } from '@/lib/research/answer';
import type { AnswerRecord, DeskSource, ResearchDesk, SourceKind } from '@/lib/research/types';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';
import './desks.css';

const VIEWS = [
  { id: 'collections', label: 'Collections' },
  { id: 'sources', label: 'Sources' },
  { id: 'ask', label: 'Ask' },
  { id: 'export', label: 'Export' },
];

export function ResearchDesk() {
  const desk = useDeskStore('research', parseResearch, EMPTY_RESEARCH);
  const [view, setView] = useState('sources');
  const [message, setMessage] = useState('');
  const [noteMode, setNoteMode] = useState(LOCAL_NOTE);
  const note = message || desk.note;
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  return (
    <div className="desk">
      <p className="dw-alert" role="status">{noteMode} Chunks and embeddings stay on the gateway. This desk keeps titles, status, and saved answers.</p>
      {note ? <p className="dw-note">{note}</p> : null}
      <DeskSwitch label="Research sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'collections' ? <Collections data={desk.value} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'sources' ? <Sources data={desk.value} onChange={desk.replace} onNote={setMessage} onMode={setNoteMode} /> : null}
      {view === 'ask' ? <Ask data={desk.value} onChange={desk.replace} onNote={setMessage} onMode={setNoteMode} /> : null}
      {view === 'export' ? <Export data={desk.value} /> : null}
    </div>
  );
}

function Collections({ data, onChange, onNote }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void }) {
  const [name, setName] = useState('');
  const [blurb, setBlurb] = useState('');

  async function add() {
    const result = addCollection(data, name, blurb);
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    await sync(result.data);
    setName('');
    setBlurb('');
    onNote('Collection added.');
  }

  return (
    <div>
      <ul className="dw-list">
        {data.collections.map((collection) => (
          <li key={collection.id} className="dw-card">
            <strong>{collection.name}</strong>
            <p>{collection.blurb}</p>
            <button type="button" className="dw-btn" onClick={() => { const next = deleteCollection(data, collection.id); onChange(next); void sync(next); }}>Delete</button>
          </li>
        ))}
      </ul>
      <form className="dw-form" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <label className="dw-label">Name<input className="dw-field" value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="dw-label">Blurb<input className="dw-field" value={blurb} onChange={(event) => setBlurb(event.target.value)} /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add collection</button>
      </form>
    </div>
  );
}

function Sources({ data, onChange, onNote, onMode }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void; onMode: (note: string) => void }) {
  const [collectionId, setCollectionId] = useState(data.collections[0]?.id ?? 'cardinal');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await sync(data);
      const base = await gatewayBase();
      const result = await api<{ sources: { id: string; title: string; kind: SourceKind; status: DeskSource['status']; size: number; collectionId: string; createdAt: string }[]; note?: string }>(base, '/api/research/sources', {
        method: 'POST',
        body: JSON.stringify({ collectionId, title, ...body }),
      });
      if (result.note) onMode(result.note);
      let next = data;
      for (const source of result.sources) {
        const added = addSource(next, source);
        if (!added.ok) {
          onNote(added.error);
          return;
        }
        next = added.data;
      }
      onChange(next);
      onNote(`${result.sources.length} source${result.sources.length === 1 ? '' : 's'} filed.`);
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'The gateway did not take that file.');
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    await send({ fileName: file.name, contentType: file.type || 'application/octet-stream', dataBase64: btoa(binary), title: title || file.name });
  }

  async function process(id: string) {
    try {
      const base = await gatewayBase();
      const result = await api<{ source: { status: DeskSource['status'] }; error?: string }>(base, `/api/research/sources/${id}/process`, { method: 'POST', body: '{}' });
      onChange(setSourceStatus(data, id, result.source.status));
      onNote(result.error || 'Source is ready.');
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'Could not read that file.');
    }
  }

  return (
    <div className="dw-form">
      <label className="dw-label">Collection
        <select className="dw-field" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
          {data.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
        </select>
      </label>
      <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <label className="dw-label">Transcript or web clip<textarea className="dw-field" rows={6} value={text} onChange={(event) => setText(event.target.value)} placeholder="[00:12] …" /></label>
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => void send({ text, fileName: 'note.txt', contentType: 'text/plain' })}>Add text</button>
        <label className="dw-btn">PDF or zip<input className="dw-field" type="file" accept=".pdf,.epub,.txt,.vtt,.srt,.html,.md,.zip,application/pdf" onChange={(event) => void onFile(event.target.files?.[0])} /></label>
      </div>
      <ul className="dw-list">
        {data.sources.map((source) => (
          <li key={source.id} className="dw-card">
            <strong>{source.title}</strong>
            <p className="dw-note">{source.kind} · {source.status} · {source.size} bytes</p>
            <div className="dw-actions">
              <button type="button" className="dw-btn" onClick={() => void process(source.id)}>Read</button>
              <button type="button" className="dw-btn" onClick={() => { onChange(removeSource(data, source.id)); void apiRemove(source.id); }}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ask({ data, onChange, onNote, onMode }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void; onMode: (note: string) => void }) {
  const [collectionId, setCollectionId] = useState('everything');
  const [question, setQuestion] = useState('');
  const [latest, setLatest] = useState<AnswerRecord | null>(null);

  async function ask() {
    try {
      const base = await gatewayBase();
      const result = await api<{ answer: AnswerRecord; note?: string }>(base, '/api/research/ask', { method: 'POST', body: JSON.stringify({ collectionId, question }) });
      if (result.note) onMode(result.note);
      setLatest(result.answer);
      const saved = saveAnswer(data, result.answer);
      if (!saved.ok) {
        onNote(saved.error);
        return;
      }
      onChange(saved.data);
      onNote('Answer saved on the desk.');
    } catch (error) {
      onNote(error instanceof Error ? error.message : 'No answer.');
    }
  }

  return (
    <div className="dw-form">
      <label className="dw-label">Collection
        <select className="dw-field" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
          <option value="everything">Everything</option>
          {data.collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
        </select>
      </label>
      <label className="dw-label">Question<textarea className="dw-field" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => void ask()}>Ask</button>
      {latest ? (
        <article className="dw-card">
          <h2 className="dw-card-title">{latest.question}</h2>
          <p style={{ whiteSpace: 'pre-wrap' }}>{latest.answer}</p>
          <ul className="dw-list">
            {latest.citations.map((citation) => (
              <li key={citation.chunkId}><strong>{citation.sourceTitle}</strong> · {citation.timestamp || (citation.page ? `p. ${citation.page}` : 'note')}<p>{citation.excerpt}</p></li>
            ))}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function Export({ data }: { data: ResearchDesk }) {
  function download(filename: string, contents: string, mime: string) {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="dw-actions">
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => download('research.md', toMarkdown(data.answers, 'Dawn', data.collections), 'text/markdown')}>Export Markdown</button>
      <button type="button" className="dw-btn" onClick={() => download('research.bib', toBibtex(data.answers, data.collections), 'application/x-bibtex')}>Export BibTeX</button>
    </div>
  );
}

async function sync(data: ResearchDesk) {
  try {
    const base = await gatewayBase();
    await api(base, '/api/research/collections', { method: 'POST', body: JSON.stringify({ collections: data.collections }) });
  } catch {
    /* the next ask still uses the seeded names */
  }
}

async function apiRemove(id: string) {
  try {
    const base = await gatewayBase();
    await api(base, `/api/research/sources/${id}`, { method: 'DELETE' });
  } catch {
    /* the desk row is already gone */
  }
}
