'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import '@/components/desks/desks.css';
import { PageShell } from '@/components/site/page-shell';
import {
  CONSENT_TEXT,
  confirmSubscriber,
  issueHtml,
  loadNewsletter,
  recordOpen,
  saveNewsletter,
  sentIssues,
  subscribe,
  unsubscribeSubscriber,
} from '@/lib/newsletter/desk';

type Letter = { id: string; title: string; slug: string; dek: string; html?: string; recipeId?: string | null; source: 'gateway' | 'desk' };

const READER_KEY = 'dawn-reader-id';

function readerId() {
  const existing = localStorage.getItem(READER_KEY);
  if (existing && /^r_[a-f0-9]{16}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const id = `r_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  localStorage.setItem(READER_KEY, id);
  return id;
}

function deskLetters(): Letter[] {
  return sentIssues(loadNewsletter(localStorage)).map((issue) => ({
    id: issue.id,
    title: issue.title,
    slug: issue.slug,
    dek: issue.dek,
    html: issueHtml(issue),
    source: 'desk' as const,
  }));
}

export default function LetterPage() {
  const [base, setBase] = useState('');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [current, setCurrent] = useState<Letter | null>(null);
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    let cancelled = false;
    void (async () => {
      const local = loadNewsletter(localStorage);
      if (params.get('confirm')) {
        const result = confirmSubscriber(local, params.get('confirm') || '', Date.now());
        if (result.ok) saveNewsletter(localStorage, result.data);
        if (!cancelled) setNote(result.ok ? 'You are confirmed.' : result.error);
      }
      if (params.get('unsub')) {
        const result = unsubscribeSubscriber(loadNewsletter(localStorage), params.get('unsub') || '');
        if (result.ok) saveNewsletter(localStorage, result.data);
        if (result.ok && !cancelled) setNote('You are unsubscribed.');
      }
      if (!cancelled) setLetters(deskLetters());
      const url = await gatewayBase();
      if (cancelled) return;
      setBase(url);
      const reader = readerId();
      if (params.get('confirm')) {
        const response = await fetch(`${url}/api/public/confirm`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-reader-id': reader },
          body: JSON.stringify({ token: params.get('confirm'), readerId: reader }),
        });
        if (response.ok) setNote('You are confirmed.');
      }
      if (params.get('unsub')) {
        const response = await fetch(`${url}/api/public/unsubscribe`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-reader-id': reader },
          body: JSON.stringify({ token: params.get('unsub'), readerId: reader }),
        });
        if (response.ok) setNote('You are unsubscribed.');
      }
      try {
        const list = await fetch(`${url}/api/public/letters`).then((response) => response.json()) as { letters: Letter[] };
        const remote = (list.letters || []).map((letter) => ({ ...letter, source: 'gateway' as const }));
        const localRows = deskLetters().filter((letter) => !remote.some((item) => item.slug === letter.slug));
        setLetters([...remote, ...localRows]);
      } catch {
        setLetters(deskLetters());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function open(letter: Letter) {
    if (letter.source === 'desk') {
      const data = recordOpen(loadNewsletter(localStorage), letter.id, readerId());
      saveNewsletter(localStorage, data);
      const issue = sentIssues(data).find((item) => item.id === letter.id);
      setCurrent(issue ? { ...letter, html: issueHtml(issue) } : letter);
      return;
    }
    const reader = readerId();
    const response = await fetch(`${base}/api/public/letters/${letter.slug}`, { headers: { 'x-reader-id': reader } });
    const data = (await response.json()) as { letter: Letter };
    setCurrent({ ...data.letter, source: 'gateway' });
    const send = new URLSearchParams(location.search).get('send');
    if (send) {
      await fetch(`${base}/api/public/open/${send}.gif?r=${reader}`);
    }
  }

  return (
    <PageShell title="The letter" lead="A short note from Dawn. Joining takes a confirmation step, and leaving is one click.">
      {note && <p className="dw-alert" role="status">{note}</p>}
      <form
        className="dw-form dw-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = subscribe(loadNewsletter(localStorage), { email, consent, now: Date.now() });
          if (!result.ok) {
            setNote(result.error);
            return;
          }
          saveNewsletter(localStorage, result.data);
          const reader = readerId();
          try {
            const response = await fetch(`${base}/api/public/subscribe`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-reader-id': reader },
              body: JSON.stringify({ email, readerId: reader }),
            });
            const body = (await response.json()) as { message?: string; error?: string };
            setNote(body.message || result.message);
          } catch {
            setNote(result.message);
          }
          setEmail('');
          setConsent(false);
        }}
      >
        <label className="dw-label">
          Email
          <input className="dw-field" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="desk-check">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>{CONSENT_TEXT}</span>
        </label>
        <button className="dw-btn dw-btn--primary" type="submit" disabled={!consent}>Request the letter</button>
      </form>
      {letters.length === 0 ? (
        <div className="dw-empty">
          <img src="/sprites/town/letter-carrier.png" alt="" width={72} height={72} />
          <h2>No letters yet</h2>
          <p>Letters appear here once one is sent.</p>
        </div>
      ) : (
        <ul className="dw-list">
          {letters.map((letter) => (
            <li key={`${letter.source}-${letter.id}`}>
              <button type="button" className="dw-row" onClick={() => void open(letter)}>{letter.title}</button>
            </li>
          ))}
        </ul>
      )}
      {current && (
        <article className="dw-card letter-body">
          <h2 className="dw-card-title">{current.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: current.html || '' }} />
        </article>
      )}
    </PageShell>
  );
}
