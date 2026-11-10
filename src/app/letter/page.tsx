'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import { PageShell } from '@/components/site/page-shell';

type Letter = { id: string; title: string; slug: string; dek: string; html?: string; recipeId?: string | null };

const READER_KEY = 'dawn-reader-id';

function readerId() {
  const existing = localStorage.getItem(READER_KEY);
  if (existing && /^r_[a-f0-9]{16}$/.test(existing)) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const id = `r_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  localStorage.setItem(READER_KEY, id);
  return id;
}

export default function LetterPage() {
  const [base, setBase] = useState('');
  const [letters, setLetters] = useState<Letter[]>([]);
  const [current, setCurrent] = useState<Letter | null>(null);
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('A confirmation comes first. You are not on the list until it is confirmed.');
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    void (async () => {
      const url = await gatewayBase();
      setBase(url);
      const reader = readerId();
      if (params.get('confirm')) {
        const response = await fetch(`${url}/api/public/confirm`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ token: params.get('confirm'), readerId: reader }) });
        setNote(response.ok ? 'You are confirmed.' : 'That confirmation did not work.');
      }
      if (params.get('unsub')) {
        await fetch(`${url}/api/public/unsubscribe`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ token: params.get('unsub'), readerId: reader }) });
        setNote('You are unsubscribed.');
      }
      try {
        const list = await fetch(`${url}/api/public/letters`).then((response) => response.json()) as { letters: Letter[] };
        setLetters(list.letters || []);
      } catch {
        setLetters([]);
      }
    })();
  }, []);
  async function open(slug: string) {
    const reader = readerId();
    const response = await fetch(`${base}/api/public/letters/${slug}`, { headers: { 'x-reader-id': reader } });
    const data = (await response.json()) as { letter: Letter };
    setCurrent(data.letter);
    const send = new URLSearchParams(location.search).get('send');
    if (send) {
      await fetch(`${base}/api/public/open/${send}.gif?r=${reader}`);
    }
  }
  return (
    <PageShell title="The letter" current="/letter" lead="A short note from Dawn. Subscribing needs the desk; on a static host the form cannot reach it.">
      <p className="dw-alert" role="status">{note}</p>
      <form
        className="dw-form dw-card"
        onSubmit={async (event) => {
          event.preventDefault();
          const reader = readerId();
          try {
            const response = await fetch(`${base}/api/public/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ email, readerId: reader }) });
            const body = (await response.json()) as { message?: string; error?: string };
            setNote(body.message || body.error || 'Request received.');
          } catch {
            setNote('The letter desk is not connected on this host, so nothing was requested.');
          }
        }}
      >
        <label className="dw-label">Email<input className="dw-field" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="dw-btn dw-btn--primary" type="submit">Request the letter</button>
      </form>
      {letters.length === 0 ? (
        <div className="dw-empty">
          <img src="/sprites/town/letter-carrier.png" alt="" width={72} height={72} />
          <h2>No letters yet</h2>
          <p>Published letters list here once the desk is connected and one has been sent.</p>
        </div>
      ) : (
        <ul className="dw-list">
          {letters.map((letter) => (
            <li key={letter.id}><button type="button" className="dw-row" onClick={() => open(letter.slug)}>{letter.title}</button></li>
          ))}
        </ul>
      )}
      {current && (
        <article className="dw-card">
          <h2 className="dw-card-title">{current.title}</h2>
          <div dangerouslySetInnerHTML={{ __html: current.html || '' }} />
        </article>
      )}
    </PageShell>
  );
}
