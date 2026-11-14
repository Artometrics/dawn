'use client';

import { useState } from 'react';
import {
  CONSENT_TEXT,
  issueHtml,
  newsletterStats,
  recordClick,
  recordOpen,
  saveIssue,
  sendIssue,
  sentIssues,
  subscribe,
  type Issue,
  type NewsletterData,
  EMPTY_NEWSLETTER,
  parseNewsletter,
} from '@/lib/newsletter/desk';
import { renderMarkdown } from '@/lib/newsletter/markdown';
import './desks.css';
import { DeskSwitch } from './switch';
import { useDeskStore } from './use-desk-store';

const VIEWS = [
  { id: 'write', label: 'Write' },
  { id: 'list', label: 'List' },
  { id: 'archive', label: 'Archive' },
  { id: 'counts', label: 'Counts' },
];

export function NewsletterDesk() {
  const desk = useDeskStore('newsletter', parseNewsletter, EMPTY_NEWSLETTER);
  const [view, setView] = useState('write');
  const [message, setMessage] = useState('');
  const stats = newsletterStats(desk.value);
  const note = message || desk.note;
  if (!desk.ready) return <p className="dw-note">Opening the desk.</p>;

  return (
    <div className="desk">
      <p className="dw-alert" role="status">
        <strong>Sending is off.</strong> A send files the letter and counts confirmed readers. It does not email anyone.
        <code className="desk-flag">NEWSLETTER_SEND_ENABLED=true</code>
        Mail leaves only when that gateway flag is set, in batches of 50.
      </p>
      <p className="dw-note">
        {stats.confirmed} confirmed · {stats.pending} waiting · {stats.sent} sent · {stats.opens} opens · {stats.clicks} clicks
      </p>
      {note ? <p className="dw-alert">{note}</p> : null}
      <div className="desk-no-print">
        <DeskSwitch label="Newsletter sections" views={VIEWS} current={view} onChange={setView} />
      </div>
      {view === 'write' ? <Composer data={desk.value} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'list' ? <List data={desk.value} onChange={desk.replace} onNote={setMessage} /> : null}
      {view === 'archive' ? <Archive data={desk.value} onChange={desk.replace} /> : null}
      {view === 'counts' ? <Counts data={desk.value} /> : null}
    </div>
  );
}

function Composer({ data, onChange, onNote }: { data: NewsletterData; onChange: (next: NewsletterData) => void; onNote: (note: string) => void }) {
  const drafts = data.issues.filter((issue) => issue.status === 'draft');
  const [current, setCurrent] = useState<Issue | null>(drafts[0] ?? null);
  const [title, setTitle] = useState(current?.title ?? '');
  const [subject, setSubject] = useState(current?.subject ?? '');
  const [dek, setDek] = useState(current?.dek ?? '');
  const [body, setBody] = useState(current?.body ?? '');
  const [confirmSend, setConfirmSend] = useState(false);

  function load(issue: Issue) {
    setCurrent(issue);
    setTitle(issue.title);
    setSubject(issue.subject);
    setDek(issue.dek);
    setBody(issue.body);
    setConfirmSend(false);
  }

  function save() {
    const result = saveIssue(data, { id: current?.id, title, subject, dek, body }, Date.now());
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setCurrent(result.issue);
    onNote('Saved on the desk.');
  }

  function send() {
    const saved = saveIssue(data, { id: current?.id, title, subject, dek, body }, Date.now());
    if (!saved.ok) {
      onNote(saved.error);
      return;
    }
    const result = sendIssue(saved.data, saved.issue.id, Date.now());
    if (!result.ok) {
      onChange(saved.data);
      setCurrent(saved.issue);
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setCurrent(null);
    setTitle('');
    setSubject('');
    setDek('');
    setBody('');
    setConfirmSend(false);
    const held = result.send.heldBack ? ` ${result.send.heldBack} stayed for a later batch.` : '';
    onNote(`Filed a dry run for ${result.send.recipients} confirmed readers. Nobody was emailed.${held}`);
  }

  return (
    <div className="dw-form">
      <label className="dw-label">
        Title
        <input className="dw-field" value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="dw-label">
        Subject
        <input className="dw-field" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </label>
      <label className="dw-label">
        Dek
        <input className="dw-field" value={dek} onChange={(event) => setDek(event.target.value)} />
      </label>
      <label className="dw-label">
        Letter
        <textarea className="dw-field" rows={8} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Markdown" />
      </label>
      {body.trim() ? (
        <article className="dw-card letter-body" aria-label="Preview">
          <h2 className="dw-card-title">{title || 'Untitled'}</h2>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        </article>
      ) : null}
      <div className="dw-actions">
        <button type="button" className="dw-btn dw-btn--primary" onClick={save}>Save draft</button>
      </div>
      <label className="desk-check">
        <input type="checkbox" checked={confirmSend} onChange={(event) => setConfirmSend(event.target.checked)} />
        <span>File this send. It does not email anyone.</span>
      </label>
      <button type="button" className="dw-btn" disabled={!confirmSend} onClick={send}>File send</button>
      {drafts.length > 0 ? (
        <ul className="dw-list">
          {drafts.map((issue) => (
            <li key={issue.id}>
              <button type="button" className="dw-row" onClick={() => load(issue)}>
                <span>{issue.title}</span>
                <small className="dw-note">Draft</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function List({ data, onChange, onNote }: { data: NewsletterData; onChange: (next: NewsletterData) => void; onNote: (note: string) => void }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);

  function add(event: React.FormEvent) {
    event.preventDefault();
    const result = subscribe(data, { email, consent, now: Date.now() });
    if (!result.ok) {
      onNote(result.error);
      return;
    }
    onChange(result.data);
    setEmail('');
    setConsent(false);
    onNote(result.message);
  }

  return (
    <div className="dw-form">
      <form className="dw-form dw-card" onSubmit={add}>
        <h2 className="dw-card-title">Add an address</h2>
        <label className="dw-label">
          Email
          <input className="dw-field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="desk-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>{CONSENT_TEXT}</span>
        </label>
        <button type="submit" className="dw-btn dw-btn--primary" disabled={!consent}>Add as pending</button>
      </form>
      {data.subscribers.length === 0 ? <p className="dw-note">Nobody on the list yet.</p> : (
        <ul className="dw-list">
          {data.subscribers.map((row) => (
            <li key={row.id} className="dw-card">
              <strong>{row.email}</strong>
              <p className="dw-note">{row.status}{row.consentAt ? ` · consent ${new Date(row.consentAt).toLocaleDateString('en-US')}` : ''}</p>
              {row.status === 'pending' ? (
                <label className="dw-label">
                  Confirmation link
                  <input className="dw-field" readOnly value={link('confirm', row.confirmToken)} />
                </label>
              ) : null}
              {row.status === 'confirmed' ? (
                <label className="dw-label">
                  One-click unsubscribe
                  <input className="dw-field" readOnly value={link('unsub', row.unsubToken)} />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Archive({ data, onChange }: { data: NewsletterData; onChange: (next: NewsletterData) => void }) {
  const issues = sentIssues(data);
  const [openId, setOpenId] = useState<string | null>(issues[0]?.id ?? null);
  const issue = issues.find((item) => item.id === openId) ?? null;
  if (issues.length === 0) return <p className="dw-note">Nothing has been sent. The archive is clear.</p>;
  return (
    <div className="dw-form">
      <ul className="dw-list">
        {issues.map((item) => (
          <li key={item.id}>
            <button type="button" className="dw-row" onClick={() => {
              setOpenId(item.id);
              onChange(recordOpen(data, item.id, readerId()));
            }}>
              <span>{item.title}</span>
              <small className="dw-note">{item.sentAt ? new Date(item.sentAt).toLocaleDateString('en-US') : 'Sent'}</small>
            </button>
          </li>
        ))}
      </ul>
      {issue ? (
        <article
          className="dw-card letter-body"
          onClick={(event) => {
            const target = event.target;
            if (target instanceof HTMLAnchorElement) onChange(recordClick(data, issue.id, readerId()));
          }}
        >
          <p className="dw-eyebrow">{issue.dek || 'A studio letter'}</p>
          <h2 className="dw-card-title">{issue.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: issueHtml(issue) }} />
        </article>
      ) : null}
    </div>
  );
}

function Counts({ data }: { data: NewsletterData }) {
  const stats = newsletterStats(data);
  return (
    <div className="dw-grid">
      <Stat label="Pending" value={stats.pending} />
      <Stat label="Confirmed" value={stats.confirmed} />
      <Stat label="Unsubscribed" value={stats.unsubscribed} />
      <Stat label="Recipients filed" value={stats.recipients} />
      <Stat label="Opens" value={stats.opens} />
      <Stat label="Clicks" value={stats.clicks} />
      <ul className="dw-list">
        {data.sends.map((send) => (
          <li key={send.id} className="dw-card">
            <strong>{data.issues.find((issue) => issue.id === send.issueId)?.title || 'Letter'}</strong>
            <p className="dw-note">{send.recipients} filed · {send.opens} opens · {send.clicks} clicks · dry run</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="dw-card">
      <p className="dw-eyebrow">{label}</p>
      <p className="dw-card-title">{value}</p>
    </div>
  );
}

function link(key: 'confirm' | 'unsub', token: string): string {
  if (typeof window === 'undefined') return `/letter?${key}=${token}`;
  return `${window.location.origin}/letter?${key}=${token}`;
}

function readerId(): string {
  const key = 'dawn-reader-id';
  const existing = localStorage.getItem(key);
  if (existing && /^r_[a-f0-9]{16}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const id = `r_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  localStorage.setItem(key, id);
  return id;
}
