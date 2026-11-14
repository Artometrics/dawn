'use client';

import { useState } from 'react';
import { addNote, editNote, MOODS, removeNote, type AftercareData, type Mood } from '@/lib/aftercare/desk';
import { DeskSwitch } from '../switch';

export function JournalPanel({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const [mood, setMood] = useState<Mood>('steady');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="desk-stage">
      <p className="dw-note">Entries stay on this phone. Edit any of them later. Nothing is sent.</p>
      <DeskSwitch label="Mood" views={MOODS.map((id) => ({ id, label: id }))} current={mood} onChange={(id) => setMood(id as Mood)} />
      <label className="dw-label">
        Title, optional
        <input className="dw-field" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="dw-label">
        Entry
        <textarea className="dw-field" rows={5} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
        const result = addNote(data, mood, text, Date.now(), title);
        if (!result.ok) {
          setNote(result.error);
          return;
        }
        onChange(result.data);
        setText('');
        setTitle('');
        setNote('Kept on this phone.');
      }}>Save entry</button>
      {note ? <p className="dw-note" role="status">{note}</p> : null}
      {data.notes.length === 0 ? <p className="dw-note">The journal is empty.</p> : null}
      {data.notes.map((entry) => (
        <JournalEntry
          key={entry.id}
          entry={entry}
          data={data}
          onChange={onChange}
          editing={editing === entry.id}
          pending={pending === entry.id}
          onEdit={() => { setEditing(entry.id); setPending(null); }}
          onClose={() => setEditing(null)}
          onAskRemove={() => setPending(entry.id)}
          onCancelRemove={() => setPending(null)}
        />
      ))}
    </div>
  );
}

function JournalEntry({
  entry,
  data,
  onChange,
  editing,
  pending,
  onEdit,
  onClose,
  onAskRemove,
  onCancelRemove,
}: {
  entry: AftercareData['notes'][number];
  data: AftercareData;
  onChange: (next: AftercareData) => void;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onClose: () => void;
  onAskRemove: () => void;
  onCancelRemove: () => void;
}) {
  const [mood, setMood] = useState<Mood>(entry.mood);
  const [title, setTitle] = useState(entry.title ?? '');
  const [text, setText] = useState(entry.text);
  const [error, setError] = useState<string | null>(null);
  const when = new Date(entry.at);
  const stamp = Number.isNaN(when.getTime()) ? '' : when.toLocaleString();
  return (
    <article className="dw-card">
      <p className="dw-card-title">{entry.title || entry.mood}</p>
      <p className="dw-note">{entry.mood}{stamp ? ` · ${stamp}` : ''}{entry.editedAt ? ' · edited' : ''}</p>
      {editing ? (
        <>
          <DeskSwitch label="Mood" views={MOODS.map((id) => ({ id, label: id }))} current={mood} onChange={(id) => setMood(id as Mood)} />
          <label className="dw-label">
            Title
            <input className="dw-field" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="dw-label">
            Entry
            <textarea className="dw-field" rows={4} value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} />
          </label>
          {error ? <p className="dw-note">{error}</p> : null}
          <div className="dw-actions">
            <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
              const result = editNote(data, entry.id, mood, text, Date.now(), title);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onChange(result.data);
              onClose();
            }}>Save</button>
            <button type="button" className="dw-btn dw-btn--ghost" onClick={onClose}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p>{entry.text}</p>
          <div className="dw-actions">
            <button type="button" className="dw-btn" onClick={onEdit}>Edit</button>
            {pending ? (
              <>
                <button type="button" className="dw-btn dw-btn--danger" onClick={() => onChange(removeNote(data, entry.id))}>Remove it</button>
                <button type="button" className="dw-btn dw-btn--ghost" onClick={onCancelRemove}>Keep</button>
              </>
            ) : (
              <button type="button" className="dw-btn dw-btn--ghost" onClick={onAskRemove}>Delete</button>
            )}
          </div>
        </>
      )}
    </article>
  );
}
