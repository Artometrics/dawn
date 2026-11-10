'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/site/page-shell';

type Row = { name: string; text: string; where: 'desk' | 'visit' };

async function readDesk(): Promise<{ rows?: Row[]; note: string } | null> {
  try {
    const response = await fetch('/api/local-drafts', { credentials: 'include', redirect: 'manual' });
    if (response.type === 'opaqueredirect' || !response.ok) return null;
    const data = await response.json() as { files?: string[] };
    const names = data.files ?? [];
    const loaded: Row[] = [];
    for (const file of names) {
      const read = await fetch(`/api/local-drafts?file=${encodeURIComponent(file)}`, { credentials: 'include', redirect: 'manual' });
      if (!read.ok) {
        loaded.push({ name: file, text: '', where: 'desk' });
        continue;
      }
      const body = await read.json() as { text?: string };
      loaded.push({ name: file, text: body.text || '', where: 'desk' });
    }
    return { rows: loaded, note: loaded.length ? 'These names are stored on this desk.' : 'No project files on this desk yet.' };
  } catch {
    return { note: 'The desk is not answering. A file you save here stays for this visit.' };
  }
}

export default function ProjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('note.txt');
  const [text, setText] = useState('');
  const [note, setNote] = useState('Project files for Dawn. This is not the sample chat.');

  async function load() {
    const result = await readDesk();
    if (!result) return;
    if (result.rows) setRows(result.rows);
    setNote(result.note);
  }

  useEffect(() => {
    let cancelled = false;
    void readDesk().then((result) => {
      if (cancelled || !result) return;
      if (result.rows) setRows(result.rows);
      setNote(result.note);
    });
    return () => { cancelled = true; };
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const file = name.trim();
    if (!/^[a-z0-9][a-z0-9.-]{0,40}$/.test(file) || !text.trim()) {
      setNote('Use a plain file name and some text.');
      return;
    }
    try {
      const response = await fetch('/api/local-drafts', {
        method: 'POST',
        credentials: 'include',
        redirect: 'manual',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'file', name: file, text }),
      });
      if (response.ok) {
        setText('');
        await load();
        setNote(`${file} is stored on this desk.`);
        return;
      }
    } catch {
      /* visit copy below */
    }
    setRows((current) => [...current.filter((row) => row.name !== file), { name: file, text, where: 'visit' }]);
    setText('');
    setNote(`${file} is listed for this visit. The desk did not store it.`);
  }

  return (
    <PageShell title="Projects" current="/projects" lead="Project files for Dawn. This is not the sample chat.">
      <p className="dw-alert" role="status">{note}</p>
      {rows.length === 0 ? (
        <div className="dw-empty">
          <img src="/tiles/you-0.png" alt="" width={72} height={72} />
          <h2>No files yet</h2>
          <p>Save a note below. It is stored on the desk when one is connected, and listed for this visit when not.</p>
        </div>
      ) : (
        <ul className="dw-list">
          {rows.map((row) => (
            <li key={row.name} className="dw-card">
              <strong>{row.name}</strong>
              <span className="dw-note"> {row.where === 'desk' ? 'On this desk' : 'This visit'}</span>
              {row.text && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{row.text}</p>}
            </li>
          ))}
        </ul>
      )}
      <form className="dw-form dw-card" onSubmit={(event) => { void save(event); }}>
        <h2 className="dw-card-title">New file</h2>
        <label className="dw-label">
          File name
          <input className="dw-field" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="dw-label">
          Text
          <textarea className="dw-field" value={text} onChange={(event) => setText(event.target.value)} rows={5} />
        </label>
        <button type="submit" className="dw-btn dw-btn--primary">Save file</button>
      </form>
    </PageShell>
  );
}
