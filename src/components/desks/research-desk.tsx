'use client';

import { useState } from 'react';
import { api, gatewayBase } from '@/components/dawn-agents/api';
import { downloadText, toBibtex, toMarkdown } from '@/lib/research/citations';
import { detectKind } from '@/lib/research/files';
import { addCollection, deleteCollection, EMPTY_RESEARCH, forgetSource, parseResearch, rememberAnswer, rememberSource, renameCollection } from '@/lib/research/desk';
import type { AnswerRecord, DeskSource, ResearchDesk, SourceRecord } from '@/lib/research/types';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'collections', label: 'Collections' },
  { id: 'sources', label: 'Sources' },
  { id: 'ask', label: 'Ask' },
];

export function ResearchDesk() {
  const desk = useDeskStore('research', parseResearch, EMPTY_RESEARCH);
  const [view, setView] = useState('collections');
  const [note, setNote] = useState('Model embeddings are off. Matching stays on this machine.');
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  return (
    <div className="desk">
      <p className="dw-alert" role="status">
        <strong>Embeddings are off.</strong> The gateway uses local matching until <code className="desk-flag">DAWN_EMBEDDINGS_ENABLED=true</code> and the embeddings setting are both on. Calls then count against the $20 cap.
      </p>
      {note || desk.note ? <p className="dw-note">{note || desk.note}</p> : null}
      <DeskSwitch label="Research sections" views={VIEWS} current={view} onChange={setView} />
      {view === 'collections' ? <Collections data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
      {view === 'sources' ? <Sources data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
      {view === 'ask' ? <Ask data={desk.value} onChange={desk.replace} onNote={setNote} /> : null}
    </div>
  );
}

function Collections({ data, onChange, onNote }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void }) {
  const [name, setName] = useState('');
  const [blurb, setBlurb] = useState('');
  return (
    <div className="dw-form">
      <ul className="dw-list">
        {data.collections.map((row) => (
          <li key={row.id} className="dw-card">
            <CollectionRow
              id={row.id}
              name={row.name}
              blurb={row.blurb}
              onSave={(nextName, nextBlurb) => {
                onChange(renameCollection(data, row.id, nextName, nextBlurb));
                onNote('Collection renamed.');
              }}
              onDelete={() => {
                onChange(deleteCollection(data, row.id));
                onNote('Collection removed from this phone. Files on the gateway stay until you delete them.');
              }}
            />
          </li>
        ))}
      </ul>
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const result = addCollection(data, name, blurb);
          if (!result.ok) {
            onNote(result.error);
            return;
          }
          onChange(result.data);
          setName('');
          setBlurb('');
          onNote('Collection added.');
        }}
      >
        <h2 className="dw-card-title">Add a collection</h2>
        <label className="dw-label">Name<input className="dw-field" value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="dw-label">Blurb<input className="dw-field" value={blurb} onChange={(event) => setBlurb(event.target.value)} /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Add</button>
      </form>
    </div>
  );
}

function CollectionRow({ id, name, blurb, onSave, onDelete }: { id: string; name: string; blurb: string; onSave: (name: string, blurb: string) => void; onDelete: () => void }) {
  const [nextName, setNextName] = useState(name);
  const [nextBlurb, setNextBlurb] = useState(blurb);
  return (
    <form className="dw-form" onSubmit={(event) => { event.preventDefault(); onSave(nextName, nextBlurb); }}>
      <p className="dw-note">{id}</p>
      <label className="dw-label">Name<input className="dw-field" value={nextName} onChange={(event) => setNextName(event.target.value)} /></label>
      <label className="dw-label">Blurb<input className="dw-field" value={nextBlurb} onChange={(event) => setNextBlurb(event.target.value)} /></label>
      <div className="dw-actions">
        <button type="submit" className="dw-btn">Save</button>
        <button type="button" className="dw-btn dw-btn--danger" onClick={onDelete}>Delete</button>
      </div>
    </form>
  );
}

function Sources({ data, onChange, onNote }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void }) {
  const [collectionId, setCollectionId] = useState(data.collections[0]?.id ?? 'cardinal');
  const [title, setTitle] = useState('');
  return (
    <div className="dw-form">
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem('file') as HTMLInputElement;
          const file = input.files?.[0];
          if (!file) {
            onNote('Choose a PDF, EPUB, transcript, or zip.');
            return;
          }
          void upload(file, collectionId, title || file.name, data, onChange, onNote);
          input.value = '';
        }}
      >
        <h2 className="dw-card-title">File a source</h2>
        <label className="dw-label">
          Collection
          <select className="dw-field" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
            {data.collections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="dw-label">File<input className="dw-field" name="file" type="file" accept=".pdf,.epub,.txt,.vtt,.srt,.html,.md,.zip,application/pdf" /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Upload</button>
      </form>
      <ul className="dw-list">
        {data.sources.map((source) => (
          <li key={source.id} className="dw-card">
            <strong>{source.title}</strong>
            <p className="dw-note">{source.kind} · {source.status} · {source.size} bytes</p>
            {source.error ? <p className="dw-note">{source.error}</p> : null}
            <div className="dw-actions">
              <button type="button" className="dw-btn" onClick={() => void process(source, data, onChange, onNote)}>Read it</button>
              <button type="button" className="dw-btn dw-btn--danger" onClick={() => void remove(source, data, onChange, onNote)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Ask({ data, onChange, onNote }: { data: ResearchDesk; onChange: (next: ResearchDesk) => void; onNote: (note: string) => void }) {
  const [collectionId, setCollectionId] = useState('everything');
  const [question, setQuestion] = useState('');
  const names = data.collections.map((row) => ({ id: row.id, name: row.name }));
  return (
    <div className="dw-form">
      <form
        className="dw-form"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(collectionId, question, names, data, onChange, onNote);
        }}
      >
        <label className="dw-label">
          Collection
          <select className="dw-field" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
            <option value="everything">Everything</option>
            {data.collections.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
        </label>
        <label className="dw-label">Question<textarea className="dw-field" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} required /></label>
        <button type="submit" className="dw-btn dw-btn--primary">Ask</button>
      </form>
      {data.answers.map((answer) => (
        <article key={answer.id} className="dw-card">
          <h2 className="dw-card-title">{answer.question}</h2>
          <p>{answer.answer}</p>
          <ul className="dw-list">
            {answer.citations.map((citation) => (
              <li key={`${citation.chunkId}-${citation.excerpt.slice(0, 24)}`}>
                {citation.sourceTitle} · {citation.timestamp || (citation.page ? `p. ${citation.page}` : 'note')}
                <p className="dw-note">{citation.excerpt}</p>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <div className="dw-actions">
        <button type="button" className="dw-btn" onClick={() => downloadText('research.md', toMarkdown(data.answers, 'Dawn', names), 'text/markdown')}>Export Markdown</button>
        <button type="button" className="dw-btn" onClick={() => downloadText('research.bib', toBibtex(data.answers, names), 'application/x-bibtex')}>Export BibTeX</button>
      </div>
    </div>
  );
}

async function upload(file: File, collectionId: string, title: string, data: ResearchDesk, onChange: (next: ResearchDesk) => void, onNote: (note: string) => void) {
  const kind = file.name.toLowerCase().endsWith('.zip') ? 'transcript' : detectKind(file.name, file.type);
  if (!kind && !file.name.toLowerCase().endsWith('.zip')) {
    onNote('Use a PDF, EPUB, transcript, or web clip.');
    return;
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  try {
    const base = await gatewayBase();
    const result = await api<{ source?: SourceRecord; sources?: SourceRecord[] }>(base, '/api/research/sources', {
      method: 'POST',
      body: JSON.stringify({ fileName: file.name, contentType: file.type, collectionId, title, dataBase64: btoa(binary) }),
    });
    const rows = result.sources ?? (result.source ? [result.source] : []);
    let next = data;
    for (const row of rows) {
      const saved = rememberSource(next, { id: row.id, title: row.title, kind: row.kind, status: row.status, size: row.size, collectionId: row.collectionId, createdAt: row.createdAt, error: row.error });
      if (!saved.ok) {
        onNote(saved.error);
        return;
      }
      next = saved.data;
    }
    onChange(next);
    onNote(rows.length ? 'Filed on the gateway.' : 'Nothing readable was in that zip.');
  } catch (error) {
    onNote(error instanceof Error ? error.message : 'The gateway is offline. The file was not stored.');
  }
}

async function process(source: DeskSource, data: ResearchDesk, onChange: (next: ResearchDesk) => void, onNote: (note: string) => void) {
  try {
    const base = await gatewayBase();
    const result = await api<{ source: SourceRecord }>(base, `/api/research/sources/${source.id}/process`, { method: 'POST', body: '{}' });
    const saved = rememberSource(data, { ...source, status: result.source.status, error: result.source.error });
    if (saved.ok) onChange(saved.data);
    onNote(result.source.status === 'ready' ? 'Ready to ask.' : result.source.error || result.source.status);
  } catch (error) {
    onNote(error instanceof Error ? error.message : 'Could not read that file.');
  }
}

async function remove(source: DeskSource, data: ResearchDesk, onChange: (next: ResearchDesk) => void, onNote: (note: string) => void) {
  try {
    const base = await gatewayBase();
    await api(base, `/api/research/sources/${source.id}`, { method: 'DELETE', body: '{}' });
  } catch {
    /* the phone copy still goes */
  }
  onChange(forgetSource(data, source.id));
  onNote('Source removed.');
}

async function ask(
  collectionId: string,
  question: string,
  names: { id: string; name: string }[],
  data: ResearchDesk,
  onChange: (next: ResearchDesk) => void,
  onNote: (note: string) => void,
) {
  try {
    const base = await gatewayBase();
    const result = await api<{ answer: AnswerRecord; note?: string }>(base, '/api/research/ask', {
      method: 'POST',
      body: JSON.stringify({ collectionId, question, names }),
    });
    const saved = rememberAnswer(data, {
      id: result.answer.id,
      collectionId: result.answer.collectionId,
      question: result.answer.question,
      answer: result.answer.answer,
      citations: result.answer.citations,
      createdAt: result.answer.createdAt,
    });
    if (!saved.ok) {
      onNote(saved.error);
      return;
    }
    onChange(saved.data);
    onNote(result.note || (result.answer.mode === 'local' ? 'Local matching, no model key.' : 'Answer saved.'));
  } catch (error) {
    onNote(error instanceof Error ? error.message : 'The gateway is offline.');
  }
}
