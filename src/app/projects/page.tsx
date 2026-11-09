'use client';

import { useEffect, useState } from 'react';
import '../agents/agents.css';

type Row = { name: string; text: string; where: 'desk' | 'visit' };

export default function ProjectsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState('note.txt');
  const [text, setText] = useState('');
  const [note, setNote] = useState('Project files for Dawn. This is not the sample chat.');

  async function load() {
    try {
      const response = await fetch('/api/local-drafts', { credentials: 'include', redirect: 'manual' });
      if (response.type === 'opaqueredirect' || !response.ok) return;
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
      setRows(loaded);
      setNote(loaded.length ? 'These names are stored on this desk.' : 'No project files on this desk yet.');
    } catch {
      setNote('The desk is not answering. A file you save here stays for this visit.');
    }
  }

  useEffect(() => { void load(); }, []);

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
    <main className="dawn-agents" style={{ minHeight: '100dvh', padding: '16px 16px 32px' }}>
      <div style={{ width: 'min(720px, 100%)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <a href="/" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', fontSize: 16 }}>Town</a>
        <p className="word">DAWN</p>
        <h1>Projects</h1>
        <p className="note" role="status">{note}</p>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.length === 0 && <li>No files yet.</li>}
          {rows.map((row) => (
            <li key={row.name} style={{ padding: 12, borderRadius: 12, background: '#141824' }}>
              <strong>{row.name}</strong>
              <span className="note"> {row.where === 'desk' ? 'On this desk' : 'This visit'}</span>
              {row.text && <p style={{ margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>{row.text}</p>}
            </li>
          ))}
        </ul>
        <form onSubmit={(event) => { void save(event); }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label>
            File name
            <input value={name} onChange={(event) => setName(event.target.value)} style={{ width: '100%', fontSize: 16, minHeight: 44 }} />
          </label>
          <label>
            Text
            <textarea value={text} onChange={(event) => setText(event.target.value)} rows={5} style={{ width: '100%', fontSize: 16 }} />
          </label>
          <button type="submit" className="primary">Save file</button>
        </form>
      </div>
    </main>
  );
}
