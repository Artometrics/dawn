import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Row = {
  id: string;
  title: string;
  status: string;
  updatedAt: unknown;
  sentAt: unknown;
  stats?: { sent?: number; uniqueOpens?: number; uniqueClicks?: number };
};

export function Letters() {
  const { db } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!db) return;
    return onSnapshot(
      query(collection(db, 'issues'), orderBy('updatedAt', 'desc')),
      (snap) => {
        setRows(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Row));
        setProblem('');
      },
      () => setProblem('The letters could not be loaded. Sign in again if the session dropped.'),
    );
  }, [db]);

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none tracking-[-0.03em]">Letters</h1>
        <Link to="/admin/write" className="inline-flex min-h-11 items-center bg-blue px-4 font-ui text-white">New letter</Link>
      </div>
      {problem ? <p className="mt-4 font-ui text-blue" role="alert">{problem}</p> : null}
      {rows === null && !problem ? <p className="mt-6 font-text text-xl">Opening the drawer.</p> : null}
      {rows && rows.length === 0 ? <p className="mt-6 font-text text-xl italic">No letters yet.</p> : null}
      <ul className="mt-6">
        {rows?.map((row) => (
          <li key={row.id} className="grid gap-1 border-t border-line py-4 md:grid-cols-[1fr_8rem_8rem] md:items-baseline">
            <Link to={`/admin/write/${row.id}`} className="font-display text-3xl tracking-[-0.03em] hover:text-blue">{row.title}</Link>
            <span className="font-ui text-sm capitalize text-ink-soft">{row.status}</span>
            <span className="font-ui text-sm text-ink-soft nums">
              {row.status === 'sent'
                ? `${row.stats?.sent || 0} sent · ${row.stats?.uniqueOpens || 0} opened`
                : formatWhen(row.updatedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
