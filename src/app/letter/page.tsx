'use client';

import { useEffect, useState } from 'react';
import { gatewayBase } from '@/components/dawn-agents/api';
import '../agents/agents.css';

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
      if (!url) return;
      const reader = readerId();
      if (params.get('confirm')) {
        const response = await fetch(`${url}/api/public/confirm`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ token: params.get('confirm'), readerId: reader }) });
        setNote(response.ok ? 'You are confirmed.' : 'That confirmation did not work.');
      }
      if (params.get('unsub')) {
        await fetch(`${url}/api/public/unsubscribe`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ token: params.get('unsub'), readerId: reader }) });
        setNote('You are unsubscribed.');
      }
      const list = await fetch(`${url}/api/public/letters`).then((response) => response.json()) as { letters: Letter[] };
      setLetters(list.letters || []);
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
    <div className="dawn-agents">
      <main className="sheet-view" style={{ maxWidth: 680, margin: '0 auto' }}>
        <p className="word">DAWN</p>
        <h1>The letter</h1>
        <p className="note">{note}</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const reader = readerId();
            const response = await fetch(`${base}/api/public/subscribe`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-reader-id': reader }, body: JSON.stringify({ email, readerId: reader }) });
            const body = (await response.json()) as { message?: string; error?: string };
            setNote(body.message || body.error || 'Request received.');
          }}
        >
          <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button className="primary" type="submit">Request the letter</button>
        </form>
        <ul className="list">
          {letters.map((letter) => (
            <li key={letter.id}><button type="button" className="row" onClick={() => open(letter.slug)}>{letter.title}</button></li>
          ))}
        </ul>
        {current && (
          <article>
            <h2>{current.title}</h2>
            <div dangerouslySetInnerHTML={{ __html: current.html || '' }} />
          </article>
        )}
        <p className="note"><a href="/credits">Credits & licenses</a></p>
      </main>
    </div>
  );
}
