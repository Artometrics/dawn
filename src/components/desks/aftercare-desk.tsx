'use client';

import { useState } from 'react';
import { addNote, dealReading, EMPTY_AFTERCARE, MOODS, numbersFor, parseAftercare, type AftercareData, type Mood } from '@/lib/aftercare/desk';
import { NUMBER_MEANINGS, PERSONAL_YEAR_MEANINGS } from '@/lib/aftercare/numerology';
import { readingLines, REFLECTION_NOTE, summarize } from '@/lib/aftercare/reading';
import { SPREADS } from '@/lib/aftercare/spreads';
import type { SpreadId } from '@/lib/aftercare/types';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'cards', label: 'Cards' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'journal', label: 'Journal' },
];

export function AftercareDesk() {
  const desk = useDeskStore('aftercare', parseAftercare, EMPTY_AFTERCARE);
  const [view, setView] = useState('cards');
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  return (
    <div className="desk">
      <p className="dw-alert" role="status">{REFLECTION_NOTE} Nothing here is sent, and no model is called.</p>
      {desk.note ? <p className="dw-alert">{desk.note}</p> : null}
      <DeskSwitch label="Aftercare" views={VIEWS} current={view} onChange={setView} />
      {view === 'cards' ? <Cards data={desk.value} onChange={desk.replace} /> : null}
      {view === 'numbers' ? <Numbers data={desk.value} onChange={desk.replace} /> : null}
      {view === 'journal' ? <Journal data={desk.value} onChange={desk.replace} /> : null}
    </div>
  );
}

function Cards({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const [spread, setSpread] = useState<SpreadId>('one');
  const [question, setQuestion] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const latest = data.readings[0] ?? null;
  const lines = latest ? readingLines(latest.spreadId, latest.cards) : [];

  return (
    <div className="desk-stage">
      <DeskSwitch label="Spread" views={(['one', 'three', 'celtic'] as SpreadId[]).map((id) => ({ id, label: SPREADS[id].name }))} current={spread} onChange={(id) => setSpread(id as SpreadId)} />
      <p className="dw-note">{SPREADS[spread].blurb}</p>
      <label className="dw-label">
        Question
        <input className="dw-field" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Optional" />
      </label>
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
        const result = dealReading(data, spread, question, Date.now());
        if (!result.ok) {
          setNote(result.error);
          return;
        }
        onChange(result.data);
        setNote('The cards are on the table.');
      }}>Draw</button>
      {note ? <p className="dw-note">{note}</p> : null}
      {latest ? (
        <div className="desk-stack">
          {lines.map((line) => (
            <article key={line.positionId} className="dw-card">
              <p className="dw-card-title">{line.position}</p>
              <p><strong>{line.card.name}</strong> · {line.orientation}</p>
              <p className="dw-note">{line.prompt}</p>
              <p>{line.text}</p>
            </article>
          ))}
          {summarize(latest.spreadId, latest.cards).map((line) => <p key={line} className="dw-note">{line}</p>)}
        </div>
      ) : null}
    </div>
  );
}

function Numbers({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const profile = data.birthDate ? numbersFor(data.name, data.birthDate) : null;
  const meaning = profile ? NUMBER_MEANINGS[profile.lifePath.number] : null;
  return (
    <div className="desk-stage">
      <label className="dw-label">
        Name
        <input className="dw-field" value={data.name} onChange={(event) => onChange({ ...data, name: event.target.value.slice(0, 80) })} />
      </label>
      <label className="dw-label">
        Birth date
        <input className="dw-field" type="date" value={data.birthDate} onChange={(event) => onChange({ ...data, birthDate: event.target.value })} />
      </label>
      {profile && meaning ? (
        <article className="dw-card">
          <p className="dw-card-title">Life path {profile.lifePath.number} · {meaning.title}</p>
          <p>{meaning.summary}</p>
          <p className="dw-note">Birthday {profile.birthday} · personal year {profile.personalYear}: {PERSONAL_YEAR_MEANINGS[profile.personalYear]}</p>
          <p className="dw-note">Sun sign {profile.sign}. Birth cards {profile.cards.birth} and {profile.cards.soul}.</p>
          {profile.names ? <p className="dw-note">Expression {profile.names.expression} · soul urge {profile.names.soulUrge} · personality {profile.names.personality}</p> : null}
        </article>
      ) : <p className="dw-note">Add a real birth date. The arithmetic stays on this phone.</p>}
    </div>
  );
}

function Journal({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const [mood, setMood] = useState<Mood>('steady');
  const [text, setText] = useState('');
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="desk-stage">
      <DeskSwitch label="Mood" views={MOODS.map((id) => ({ id, label: id }))} current={mood} onChange={(id) => setMood(id as Mood)} />
      <label className="dw-label">
        Note
        <textarea className="dw-field" rows={4} value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="button" className="dw-btn dw-btn--primary" onClick={() => {
        const result = addNote(data, mood, text, Date.now());
        if (!result.ok) {
          setNote(result.error);
          return;
        }
        onChange(result.data);
        setText('');
        setNote('Kept on this phone.');
      }}>Keep</button>
      {note ? <p className="dw-note">{note}</p> : null}
      {data.notes.map((entry) => (
        <article key={entry.id} className="dw-card">
          <p className="dw-card-title">{entry.mood}</p>
          <p>{entry.text}</p>
        </article>
      ))}
    </div>
  );
}
