'use client';

import { useEffect, useRef, useState } from 'react';
import { requireCard } from '@/lib/aftercare/deck';
import { removeReading, setReadingNote, storeReading, type AftercareData } from '@/lib/aftercare/desk';
import { newReading, readingLines, REFLECTION_NOTE, summarize } from '@/lib/aftercare/reading';
import { drawSpread, SPREADS } from '@/lib/aftercare/spreads';
import { secureRng } from '@/lib/aftercare/shuffle';
import type { DrawnCard, SpreadId } from '@/lib/aftercare/types';
import { DeskSwitch } from '../switch';
import { CardBack, CardFace } from './card-face';
import type { TarotTable } from './tarot-scene';

export function TablePanel({ data, onChange }: { data: AftercareData; onChange: (next: AftercareData) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<TarotTable | null>(null);
  const drawnRef = useRef<DrawnCard[] | null>(null);
  const spreadRef = useRef<SpreadId>('three');
  const busyRef = useRef(false);
  const actions = useRef<{ onActivate: (id: string) => void }>({ onActivate: () => undefined });
  const [spread, setSpread] = useState<SpreadId>('three');
  const [question, setQuestion] = useState('');
  const [drawn, setDrawn] = useState<DrawnCard[] | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState('Pick a spread, then shuffle and deal.');
  const [note, setNote] = useState('');
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const markBusy = (value: boolean) => {
    busyRef.current = value;
    setBusy(value);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let dead = false;
    let table: TarotTable | null = null;
    void import('./tarot-scene')
      .then(({ TarotTable: Table }) => {
        if (dead || !hostRef.current) return;
        table = new Table(hostRef.current, { onActivate: (id) => actions.current.onActivate(id) });
        tableRef.current = table;
        setSupported(table.supported);
        if (!table.supported) return;
        if (spreadRef.current !== 'three') table.setSpread(spreadRef.current);
        const pending = drawnRef.current;
        if (pending) {
          void table.deal(pending.map((card) => ({ positionId: card.positionId, card: requireCard(card.cardId), reversed: card.reversed })));
        }
      })
      .catch(() => {
        if (!dead) setSupported(false);
      });
    return () => {
      dead = true;
      table?.dispose();
      tableRef.current = null;
    };
  }, []);

  async function turn(positionId: string) {
    if (!drawnRef.current) return;
    if (!drawnRef.current.some((card) => card.positionId === positionId)) return;
    setSelected(positionId);
    tableRef.current?.setSelected(positionId);
    if (revealed.includes(positionId) || busyRef.current) return;
    markBusy(true);
    if (tableRef.current?.supported) await tableRef.current.flip(positionId);
    setRevealed((current) => (current.includes(positionId) ? current : [...current, positionId]));
    const left = (drawnRef.current?.length ?? 0) - (revealed.length + 1);
    setStatus(left > 0 ? `${left} still face down.` : 'All cards are up. Save the reading if you want to keep it.');
    markBusy(false);
  }

  async function deal() {
    if (busyRef.current) return;
    markBusy(true);
    setSaveMsg(null);
    setNote('');
    const cards = drawSpread(spreadRef.current, secureRng);
    setDrawn(cards);
    drawnRef.current = cards;
    setRevealed([]);
    setSelected(null);
    const table = tableRef.current;
    if (table?.supported) {
      setStatus('Shuffling.');
      if (table.state !== 'idle') await table.reset();
      await table.shuffle();
      setStatus('Dealing.');
      await table.deal(cards.map((card) => ({ positionId: card.positionId, card: requireCard(card.cardId), reversed: card.reversed })));
      setStatus('Dealt. Tap a card, or turn it over in the list.');
    } else {
      setStatus('Dealt in the list. Turn each card over.');
    }
    markBusy(false);
  }

  async function shuffleOnly() {
    if (busyRef.current || !tableRef.current?.supported) return;
    markBusy(true);
    setStatus('Shuffling.');
    if (drawnRef.current) {
      await tableRef.current.reset();
      setDrawn(null);
      drawnRef.current = null;
      setRevealed([]);
      setSelected(null);
    }
    await tableRef.current.shuffle();
    setStatus('Shuffled. Deal when you are ready.');
    markBusy(false);
  }

  async function revealAll() {
    if (busyRef.current || !drawnRef.current) return;
    markBusy(true);
    if (tableRef.current?.supported) await tableRef.current.flipAll();
    setRevealed(drawnRef.current.map((card) => card.positionId));
    setStatus('All cards are up. Save the reading if you want to keep it.');
    markBusy(false);
  }

  async function gather() {
    if (busyRef.current) return;
    markBusy(true);
    await tableRef.current?.reset();
    setDrawn(null);
    drawnRef.current = null;
    setRevealed([]);
    setSelected(null);
    setStatus('Cards are back on the pile.');
    markBusy(false);
  }

  useEffect(() => {
    drawnRef.current = drawn;
    spreadRef.current = spread;
    actions.current.onActivate = (id) => {
      if (id === 'pile') void deal();
      else void turn(id);
    };
  });

  function changeSpread(id: SpreadId) {
    if (busyRef.current || id === spread) return;
    setSpread(id);
    spreadRef.current = id;
    setDrawn(null);
    drawnRef.current = null;
    setRevealed([]);
    setSelected(null);
    tableRef.current?.setSpread(id);
    setStatus(SPREADS[id].blurb);
  }

  function save() {
    if (!drawn || revealed.length < drawn.length) return;
    const reading = newReading(spread, drawn, question, new Date(), `r-${Date.now().toString(36)}`);
    if (note.trim()) reading.note = note.trim().slice(0, 2000);
    const result = storeReading(data, reading);
    if (!result.ok) {
      setSaveMsg(result.error);
      return;
    }
    onChange(result.data);
    setSaveMsg('Kept on this phone.');
  }

  const lines = drawn ? readingLines(spread, drawn) : [];
  const focus = lines.find((line) => line.positionId === selected && revealed.includes(line.positionId));
  const done = !!drawn && revealed.length === drawn.length;

  return (
    <div className="ac-split">
      <div className="desk-stage">
        <DeskSwitch label="Spread" views={(['one', 'three', 'celtic'] as SpreadId[]).map((id) => ({ id, label: SPREADS[id].name }))} current={spread} onChange={(id) => changeSpread(id as SpreadId)} />
        <p className="dw-note">{SPREADS[spread].blurb}</p>
        <div ref={hostRef} className="ac-table" data-spread={spread}>
          {supported === false ? <p className="ac-fallback">This browser has no WebGL. Use the list to turn the cards over.</p> : null}
        </div>
        <p className="dw-note" role="status">{status}</p>
        <label className="dw-label">
          Question
          <input className="dw-field" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Optional" maxLength={240} />
        </label>
        <div className="dw-actions">
          <button type="button" className="dw-btn" disabled={busy || supported === false} onClick={() => void shuffleOnly()}>Shuffle</button>
          <button type="button" className="dw-btn dw-btn--primary" disabled={busy} onClick={() => void deal()}>Shuffle and deal</button>
          <button type="button" className="dw-btn" disabled={busy || !drawn || done} onClick={() => void revealAll()}>Reveal</button>
          <button type="button" className="dw-btn dw-btn--ghost" disabled={busy || !drawn} onClick={() => void gather()}>Gather</button>
        </div>
        <p className="dw-note">Hover tilts a card. A tap turns it over. The crossing card in the Celtic Cross lies sideways.</p>
      </div>
      <div className="desk-stage">
        {focus ? (
          <article className="dw-card ac-focus">
            <CardFace card={focus.card} uid={`focus-${focus.card.id}`} reversed={focus.reversed} />
            <div>
              <p className="dw-card-title">{focus.position}</p>
              <p><strong>{focus.card.name}</strong> · {focus.orientation}</p>
              <p>{focus.text}</p>
              <p className="dw-note">{focus.card.reflect}</p>
            </div>
          </article>
        ) : null}
        {lines.map((line, index) => {
          const up = revealed.includes(line.positionId);
          return (
            <article key={line.positionId} className={selected === line.positionId ? 'dw-card ac-reading is-on' : 'dw-card ac-reading'}>
              {up ? <CardFace card={line.card} uid={`read-${line.positionId}`} reversed={line.reversed} /> : <CardBack />}
              <div>
                <p className="dw-card-title">{index + 1}. {line.position}</p>
                {up ? (
                  <>
                    <p><strong>{line.card.name}</strong> · {line.orientation}</p>
                    <p>{line.text}</p>
                    <p className="dw-note">{line.keywords.slice(0, 3).join(' · ')}</p>
                  </>
                ) : (
                  <>
                    <p className="dw-note">{line.prompt}.</p>
                    <button type="button" className="dw-btn" disabled={busy} onClick={() => void turn(line.positionId)}>Turn it over</button>
                  </>
                )}
              </div>
            </article>
          );
        })}
        {done ? (
          <>
            {summarize(spread, drawn!).map((line) => <p key={line} className="dw-note">{line}</p>)}
            <label className="dw-label">
              Note for this reading
              <textarea className="dw-field" rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} />
            </label>
            <button type="button" className="dw-btn dw-btn--primary" onClick={save}>Save reading</button>
          </>
        ) : null}
        {saveMsg ? <p className="dw-note">{saveMsg}</p> : null}
        <p className="dw-note">{REFLECTION_NOTE}</p>
        {data.readings.length ? (
          <div className="desk-stack">
            <p className="dw-card-title">Saved readings</p>
            {data.readings.map((reading) => (
              <SavedReading key={reading.id} reading={reading} data={data} onChange={onChange} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SavedReading({ reading, data, onChange }: { reading: AftercareData['readings'][number]; data: AftercareData; onChange: (next: AftercareData) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(reading.note ?? '');
  const lines = readingLines(reading.spreadId, reading.cards);
  return (
    <article className="dw-card">
      <p className="dw-card-title">{SPREADS[reading.spreadId].name}</p>
      {reading.question ? <p>{reading.question}</p> : null}
      <ul className="dw-list">
        {lines.map((line) => (
          <li key={line.positionId}><strong>{line.card.name}</strong> · {line.orientation} · {line.position}</li>
        ))}
      </ul>
      {editing ? (
        <label className="dw-label">
          Note
          <textarea className="dw-field" rows={3} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} />
        </label>
      ) : reading.note ? <p>{reading.note}</p> : <p className="dw-note">No note yet.</p>}
      <div className="dw-actions">
        {editing ? (
          <button type="button" className="dw-btn dw-btn--primary" onClick={() => { onChange(setReadingNote(data, reading.id, draft)); setEditing(false); }}>Save note</button>
        ) : (
          <button type="button" className="dw-btn" onClick={() => { setDraft(reading.note ?? ''); setEditing(true); }}>Edit note</button>
        )}
        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onChange(removeReading(data, reading.id))}>Delete</button>
      </div>
    </article>
  );
}
