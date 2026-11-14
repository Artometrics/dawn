'use client';

import { useEffect, useState } from 'react';
import { EMPTY_AFTERCARE, parseAftercare } from '@/lib/aftercare/desk';
import type { SelfView } from '@/lib/aftercare/second-self';
import { decodeShare } from '@/lib/aftercare/share';
import { REFLECTION_NOTE } from '@/lib/aftercare/reading';
import './desks.css';
import './aftercare/aftercare.css';
import { BirthPanel } from './aftercare/birth-panel';
import { ChartPanel } from './aftercare/chart-panel';
import { DeckPanel } from './aftercare/deck-panel';
import { JournalPanel } from './aftercare/journal-panel';
import { NumbersPanel } from './aftercare/numbers-panel';
import { SecondSelf } from './aftercare/second-self';
import { TablePanel } from './aftercare/table-panel';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'table', label: 'Table' },
  { id: 'deck', label: 'Deck' },
  { id: 'birth', label: 'Birth' },
  { id: 'numbers', label: 'Numbers' },
  { id: 'chart', label: 'Chart' },
  { id: 'journal', label: 'Journal' },
];

export function AftercareDesk() {
  const desk = useDeskStore('aftercare', parseAftercare, EMPTY_AFTERCARE);
  const [view, setView] = useState('table');
  const [opened, setOpened] = useState<Record<string, boolean>>({ table: true });
  const [shared, setShared] = useState<SelfView | null>(null);
  useEffect(() => {
    const read = () => setShared(decodeShare(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;
  return (
    <div className="desk ac-desk">
      <p className="dw-alert" role="status">{REFLECTION_NOTE} Nothing here is sent, and no model is called.</p>
      {desk.note ? <p className="dw-alert">{desk.note}</p> : null}
      {shared ? (
        <section className="dw-card desk-stage">
          <p className="dw-card-title">Shared second self</p>
          <p className="dw-note">This profile arrived in the link fragment. It is not saved on this phone.</p>
          <SecondSelf view={shared} />
          <button type="button" className="dw-btn" onClick={() => {
            history.replaceState(null, '', window.location.pathname + window.location.search);
            setShared(null);
          }}>Close shared profile</button>
        </section>
      ) : null}
      <DeskSwitch label="Aftercare" views={VIEWS} current={view} onChange={(id) => {
        setView(id);
        setOpened((current) => ({ ...current, [id]: true }));
      }} />
      {opened.table ? <div hidden={view !== 'table'}><TablePanel data={desk.value} onChange={desk.replace} /></div> : null}
      {opened.deck ? <div hidden={view !== 'deck'}><DeckPanel /></div> : null}
      {opened.birth ? <div hidden={view !== 'birth'}><BirthPanel data={desk.value} onChange={desk.replace} /></div> : null}
      {opened.numbers ? <div hidden={view !== 'numbers'}><NumbersPanel data={desk.value} /></div> : null}
      {opened.chart ? <div hidden={view !== 'chart'}><ChartPanel data={desk.value} /></div> : null}
      {opened.journal ? <div hidden={view !== 'journal'}><JournalPanel data={desk.value} onChange={desk.replace} /></div> : null}
    </div>
  );
}
