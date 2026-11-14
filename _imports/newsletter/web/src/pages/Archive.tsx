import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Colophon, Masthead } from '@/components/Masthead';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Row = { id: string; slug: string; title: string; dek: string; sentAt: unknown };

export function Archive() {
  const { db, phase, error } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!db) return;
    const letters = query(collection(db, 'issues'), where('status', '==', 'sent'), orderBy('sentAt', 'desc'));
    return onSnapshot(
      letters,
      (snap) => {
        setRows(snap.docs.map((doc) => {
          const data = doc.data();
          return { id: doc.id, slug: data.slug, title: data.title, dek: data.dek || '', sentAt: data.sentAt };
        }));
        setProblem('');
      },
      () => setProblem('The archive could not be opened. On the local desk, start the Firestore emulator.'),
    );
  }, [db]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Masthead />
      <main className="px-5 py-10 md:px-12">
        <h1 className="font-display text-[clamp(2.8rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em]">Archive</h1>
        {phase === 'error' ? <p className="mt-6 text-blue" role="alert">{error}</p> : null}
        {problem ? <p className="mt-6 text-blue" role="alert">{problem}</p> : null}
        {rows === null && !problem ? <p className="mt-8 font-text text-xl text-ink-soft">Opening the shelf.</p> : null}
        {rows && rows.length === 0 ? (
          <p className="mt-8 max-w-[36ch] font-text text-xl italic text-ink-soft">Nothing has been sent. The desk is clear.</p>
        ) : null}
        <ul className="mt-8">
          {rows?.map((row) => (
            <li key={row.id} className="border-t border-line py-6">
              <Link to={`/archive/${row.slug}`} className="group grid gap-2 md:grid-cols-[12rem_1fr] md:items-baseline">
                <span className="font-ui text-sm text-ink-soft">{formatWhen(row.sentAt)}</span>
                <span>
                  <span className="block font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-none tracking-[-0.03em] group-hover:text-blue">{row.title}</span>
                  {row.dek ? <span className="mt-2 block max-w-[52ch] font-text text-lg text-ink-soft">{row.dek}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <Colophon />
    </div>
  );
}
