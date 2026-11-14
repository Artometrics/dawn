'use client';

import { useMemo, useState } from 'react';
import {
  CSV_COLUMNS,
  EMPTY_CRM,
  STAGES,
  addNote,
  contactsToCsv,
  dueLabel,
  importContacts,
  money,
  moveDeal,
  parseCrm,
  quickAdd,
  saveCompany,
  saveContact,
  saveDeal,
  saveTask,
  searchDesk,
  setTaskDone,
  stageLabel,
  todayLists,
  type Contact,
  type CrmData,
  type Stage,
} from '@/lib/crm/desk';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'today', label: 'Today' },
  { id: 'people', label: 'People' },
  { id: 'pipeline', label: 'Pipeline' },
];

export function ContactsDesk() {
  const desk = useDeskStore('crm', parseCrm, EMPTY_CRM);
  const [view, setView] = useState('today');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [personId, setPersonId] = useState<string | null>(null);
  const hits = useMemo(() => searchDesk(query, desk.value), [query, desk.value]);
  const note = message || desk.note;
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  function openPerson(id: string) {
    setPersonId(id);
    setView('people');
    setQuery('');
  }

  return (
    <div className="desk">
      <label className="dw-label">
        Search
        <input className="dw-field" value={query} placeholder="Name, company, phone, note" onChange={(event) => setQuery(event.target.value)} />
      </label>
      {note ? <p className="dw-alert" role="status">{note}</p> : null}
      {query.trim() ? (
        <ul className="dw-list">
          {hits.length === 0 ? <li className="dw-note">Nothing matches.</li> : null}
          {hits.map((hit) => (
            <li key={`${hit.kind}-${hit.id}`}>
              <button
                type="button"
                className="dw-row"
                onClick={() => {
                  if (hit.kind === 'person' || hit.kind === 'note') openPerson(hit.kind === 'note' ? desk.value.notes.find((item) => item.id === hit.id)?.contactId || hit.id : hit.id);
                  if (hit.kind === 'deal') setView('pipeline');
                  if (hit.kind === 'task') setView('today');
                  setQuery('');
                }}
              >
                <span>{hit.title}</span>
                <small className="dw-note">{hit.kind} · {hit.meta}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <DeskSwitch label="Contacts sections" views={VIEWS} current={view} onChange={setView} />
          {view === 'today' ? <Today data={desk.value} onChange={desk.replace} onNote={setMessage} onOpen={openPerson} /> : null}
          {view === 'people' ? (
            <People data={desk.value} personId={personId} onOpen={setPersonId} onChange={desk.replace} onNote={setMessage} />
          ) : null}
          {view === 'pipeline' ? <Pipeline data={desk.value} onChange={desk.replace} onNote={setMessage} onOpen={openPerson} /> : null}
        </>
      )}
    </div>
  );
}

function Today({
  data,
  onChange,
  onNote,
  onOpen,
}: {
  data: CrmData;
  onChange: (next: CrmData) => void;
  onNote: (note: string) => void;
  onOpen: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [follow, setFollow] = useState(true);
  const [now] = useState(() => Date.now());
  const lists = todayLists(data, now);
  const counts = STAGES.map((stage) => ({ ...stage, n: data.deals.filter((deal) => deal.stage === stage.id).length }));

  function add(event: React.FormEvent) {
    event.preventDefault();
    const result = quickAdd(data, { name, phone, companyName: company, followUp: follow }, Date.now());
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setName('');
    setPhone('');
    setCompany('');
    setFollow(true);
    onNote(result.task ? `Saved ${result.contact.name}. Follow-up is tomorrow.` : `Saved ${result.contact.name}.`);
  }

  return (
    <div className="dw-form">
      <p className="dw-note">{counts.map((stage) => `${stage.label} ${stage.n}`).join(' · ')}</p>
      <TaskGroup title="Overdue" tasks={lists.overdue} data={data} now={now} onChange={onChange} onOpen={onOpen} />
      <TaskGroup title="Today" tasks={lists.today} data={data} now={now} onChange={onChange} onOpen={onOpen} />
      {lists.overdue.length === 0 && lists.today.length === 0 ? <p className="dw-note">Clear day.</p> : null}
      {lists.proposals.length > 0 ? (
        <section>
          <h2 className="dw-h2">Proposal</h2>
          <ul className="dw-list">
            {lists.proposals.map((deal) => (
              <li key={deal.id} className="dw-row">
                <span>{deal.title}</span>
                <small className="dw-note">{deal.companyName || deal.contactName} · {money(deal.valueCents)}</small>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <form className="dw-form dw-card" onSubmit={add}>
        <h2 className="dw-card-title">Quick add</h2>
        <label className="dw-label">Name<input className="dw-field" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <label className="dw-label">Phone<input className="dw-field" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="dw-label">Company<input className="dw-field" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
        <label className="desk-check">
          <input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} />
          <span>Follow up tomorrow</span>
        </label>
        <button type="submit" className="dw-btn dw-btn--primary">Save</button>
      </form>
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  data,
  now,
  onChange,
  onOpen,
}: {
  title: string;
  tasks: CrmData['tasks'];
  data: CrmData;
  now: number;
  onChange: (next: CrmData) => void;
  onOpen: (id: string) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section>
      <h2 className="dw-h2">{title}</h2>
      <ul className="dw-list">
        {tasks.map((task) => (
          <li key={task.id} className="dw-row">
            <label className="desk-check">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => onChange(setTaskDone(data, task.id, !task.done, Date.now()))}
              />
              <span>{task.title}{task.dueAt ? ` · ${dueLabel(task.dueAt, now)}` : ''}</span>
            </label>
            {task.contactId ? (
              <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onOpen(task.contactId)}>Open</button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function People({
  data,
  personId,
  onOpen,
  onChange,
  onNote,
}: {
  data: CrmData;
  personId: string | null;
  onOpen: (id: string | null) => void;
  onChange: (next: CrmData) => void;
  onNote: (note: string) => void;
}) {
  const person = data.contacts.find((contact) => contact.id === personId) ?? null;
  const [csv, setCsv] = useState('');
  const [company, setCompany] = useState('');

  function download() {
    const blob = new Blob([contactsToCsv(data.contacts)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dw-form">
      <PersonForm
        key={person?.id ?? 'new'}
        person={person}
        onSave={(input) => {
          const result = saveContact(data, input, Date.now());
          if (!result.ok) {
            onNote(result.error);
            return;
          }
          onChange(result.data);
          onOpen(result.contact.id);
          onNote(`Saved ${result.contact.name}.`);
        }}
      />
      {person ? (
        <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onOpen(null)}>New person</button>
      ) : null}
      <ul className="dw-list">
        {data.contacts.map((contact) => (
          <li key={contact.id}>
            <button type="button" className="dw-row" onClick={() => onOpen(contact.id)}>
              <span>{contact.name}</span>
              <small className="dw-note">{contact.companyName || contact.phone || contact.email || 'Person'}</small>
            </button>
          </li>
        ))}
      </ul>
      {person ? <Notes data={data} contact={person} onChange={onChange} onNote={onNote} /> : null}
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const result = saveCompany(data, { name: company }, Date.now());
          if (!result.ok) {
            onNote(result.error);
            return;
          }
          onChange(result.data);
          setCompany('');
          onNote(`Saved ${result.company.name}.`);
        }}
      >
        <h2 className="dw-card-title">Company</h2>
        <label className="dw-label">Name<input className="dw-field" value={company} onChange={(event) => setCompany(event.target.value)} /></label>
        <button type="submit" className="dw-btn">Add company</button>
        <ul className="dw-list">
          {data.companies.map((item) => (
            <li key={item.id} className="dw-note">{item.name}</li>
          ))}
        </ul>
      </form>
      <label className="dw-label">
        Import CSV
        <textarea className="dw-field" rows={4} value={csv} placeholder={CSV_COLUMNS.join(',')} onChange={(event) => setCsv(event.target.value)} />
      </label>
      <div className="dw-actions">
        <button
          type="button"
          className="dw-btn"
          onClick={() => {
            const result = importContacts(data, csv, Date.now());
            if (!result.ok) {
              onNote(result.error);
              return;
            }
            onChange(result.data);
            setCsv('');
            onNote(`Imported ${result.imported}. Skipped ${result.skipped}.`);
          }}
        >
          Import
        </button>
        <button type="button" className="dw-btn dw-btn--ghost" onClick={download}>Export CSV</button>
      </div>
    </div>
  );
}

function PersonForm({ person, onSave }: { person: Contact | null; onSave: (input: Parameters<typeof saveContact>[1]) => void }) {
  const [name, setName] = useState(person?.name ?? '');
  const [companyName, setCompanyName] = useState(person?.companyName ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [instagram, setInstagram] = useState(person?.instagram ?? '');
  const [website, setWebsite] = useState(person?.website ?? '');
  const [tags, setTags] = useState(person?.tags.join(', ') ?? '');
  const [source, setSource] = useState(person?.source ?? '');
  return (
    <form
      className="dw-form dw-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ id: person?.id, name, companyName, email, phone, instagram, website, tags, source });
      }}
    >
      <h2 className="dw-card-title">{person ? person.name : 'New person'}</h2>
      <label className="dw-label">Name<input className="dw-field" value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <label className="dw-label">Company<input className="dw-field" value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label>
      <label className="dw-label">Email<input className="dw-field" type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="dw-label">Phone<input className="dw-field" inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <label className="dw-label">Instagram<input className="dw-field" value={instagram} onChange={(event) => setInstagram(event.target.value)} /></label>
      <label className="dw-label">Site<input className="dw-field" inputMode="url" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      <label className="dw-label">Tags<input className="dw-field" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Press, magazine" /></label>
      <label className="dw-label">Source<input className="dw-field" value={source} onChange={(event) => setSource(event.target.value)} /></label>
      <button type="submit" className="dw-btn dw-btn--primary">Save person</button>
    </form>
  );
}

function Notes({ data, contact, onChange, onNote }: { data: CrmData; contact: Contact; onChange: (next: CrmData) => void; onNote: (note: string) => void }) {
  const [body, setBody] = useState('');
  const notes = data.notes.filter((note) => note.contactId === contact.id);
  return (
    <form
      className="dw-form dw-card"
      onSubmit={(event) => {
        event.preventDefault();
        const result = addNote(data, contact.id, body, Date.now());
        if (!result.ok) {
          onNote(result.error);
          return;
        }
        onChange(result.data);
        setBody('');
      }}
    >
      <h2 className="dw-card-title">Notes</h2>
      <label className="dw-label">Note<textarea className="dw-field" rows={3} value={body} onChange={(event) => setBody(event.target.value)} /></label>
      <button type="submit" className="dw-btn">Add note</button>
      <ul className="dw-list">
        {notes.map((note) => (
          <li key={note.id} className="dw-note">{note.body}</li>
        ))}
      </ul>
    </form>
  );
}

function Pipeline({
  data,
  onChange,
  onNote,
  onOpen,
}: {
  data: CrmData;
  onChange: (next: CrmData) => void;
  onNote: (note: string) => void;
  onOpen: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<Stage>('lead');
  const [contactId, setContactId] = useState('');

  return (
    <div className="dw-form">
      <form
        className="dw-form dw-card"
        onSubmit={(event) => {
          event.preventDefault();
          const cents = Math.round((Number(value) || 0) * 100);
          const result = saveDeal(data, { title, contactId, stage, valueCents: cents }, Date.now());
          if (!result.ok) {
            onNote(result.error);
            return;
          }
          onChange(result.data);
          setTitle('');
          setValue('');
          onNote(`Added ${result.deal.title} to ${stageLabel(result.deal.stage)}.`);
        }}
      >
        <h2 className="dw-card-title">Add a deal</h2>
        <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
        <label className="dw-label">Value<input className="dw-field" inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <label className="dw-label">
          Person
          <select className="dw-field" value={contactId} onChange={(event) => setContactId(event.target.value)}>
            <option value="">None</option>
            {data.contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>{contact.name}</option>
            ))}
          </select>
        </label>
        <label className="dw-label">
          Stage
          <select className="dw-field" value={stage} onChange={(event) => setStage(event.target.value as Stage)}>
            {STAGES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="dw-btn dw-btn--primary">Add deal</button>
      </form>
      <div className="desk-board">
        {STAGES.map((item) => (
          <section key={item.id} className="dw-card desk-stage">
            <h2 className="dw-card-title">{item.label}</h2>
            {data.deals.filter((deal) => deal.stage === item.id).map((deal) => (
              <article key={deal.id}>
                <strong>{deal.title}</strong>
                <p className="dw-note">{money(deal.valueCents)}{deal.contactName ? ` · ${deal.contactName}` : ''}</p>
                <label className="dw-label">
                  Move
                  <select
                    className="dw-field"
                    value={deal.stage}
                    aria-label={`Stage for ${deal.title}`}
                    onChange={(event) => {
                      const result = moveDeal(data, deal.id, event.target.value, Date.now());
                      if (!result.ok) {
                        onNote(result.error);
                        return;
                      }
                      onChange(result.data);
                    }}
                  >
                    {STAGES.map((stageItem) => (
                      <option key={stageItem.id} value={stageItem.id}>{stageItem.label}</option>
                    ))}
                  </select>
                </label>
                {deal.contactId ? (
                  <button type="button" className="dw-btn dw-btn--ghost" onClick={() => onOpen(deal.contactId)}>Person</button>
                ) : null}
              </article>
            ))}
          </section>
        ))}
      </div>
      <TaskAdd data={data} onChange={onChange} onNote={onNote} />
    </div>
  );
}

function TaskAdd({ data, onChange, onNote }: { data: CrmData; onChange: (next: CrmData) => void; onNote: (note: string) => void }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  return (
    <form
      className="dw-form dw-card"
      onSubmit={(event) => {
        event.preventDefault();
        const dueAt = due ? new Date(`${due}T09:00:00`).getTime() : null;
        const result = saveTask(data, { title, dueAt }, Date.now());
        if (!result.ok) {
          onNote(result.error);
          return;
        }
        onChange(result.data);
        setTitle('');
        setDue('');
        onNote('Task saved.');
      }}
    >
      <h2 className="dw-card-title">Task</h2>
      <label className="dw-label">Title<input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
      <label className="dw-label">Due<input className="dw-field" type="date" value={due} onChange={(event) => setDue(event.target.value)} /></label>
      <button type="submit" className="dw-btn">Add task</button>
    </form>
  );
}
