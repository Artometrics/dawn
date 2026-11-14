import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Person = {
  id: string;
  email: string;
  status: string;
  consentAt: string | null;
  confirmedAt: string | null;
};

type Count = { pending: number; confirmed: number; unsubscribed: number; total: number };

export function Subscribers() {
  const { user, backend } = useSession();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [count, setCount] = useState<Count | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!user || backend !== 'ready') return;
    let cancelled = false;
    user.getIdToken().then(async (token) => {
      try {
        const [list, totals] = await Promise.all([
          api<{ subscribers: Person[] }>('/subscribers', { token }),
          api<Count>('/subscribers/count', { token }),
        ]);
        if (cancelled) return;
        setPeople(list.subscribers);
        setCount(totals);
      } catch (error) {
        if (!cancelled) setProblem(error instanceof ApiError ? error.message : 'The list could not be loaded.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, backend]);

  return (
    <section>
      <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none tracking-[-0.03em]">The list</h1>
      {backend === 'off' ? (
        <p className="mt-6 max-w-[46ch] font-text text-xl text-ink-soft">
          Subscriber rows live behind the API, so this page stays empty until Cloud Functions are deployed.
        </p>
      ) : null}
      {problem ? <p className="mt-4 font-ui text-blue" role="alert">{problem}</p> : null}
      {count ? (
        <p className="mt-4 font-ui text-sm text-ink-soft nums">
          {count.confirmed} confirmed · {count.pending} waiting · {count.unsubscribed} left
        </p>
      ) : null}
      {backend === 'ready' && people === null && !problem ? <p className="mt-6 font-text text-xl">Counting the list.</p> : null}
      {people && people.length === 0 ? <p className="mt-6 font-text text-xl italic">Nobody has asked for the letter yet.</p> : null}
      {people && people.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left font-ui text-sm">
            <thead className="text-ink-soft">
              <tr className="border-b border-line">
                <th className="py-2 font-medium">Email</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Consented</th>
                <th className="py-2 font-medium">Confirmed</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-b border-line">
                  <td className="py-3">{person.email}</td>
                  <td className="py-3 capitalize">{person.status}</td>
                  <td className="py-3 nums">{formatWhen(person.consentAt)}</td>
                  <td className="py-3 nums">{formatWhen(person.confirmedAt) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="mt-8 font-ui text-sm"><Link to="/admin/log" className="text-blue">Open the dry-run log</Link></p>
    </section>
  );
}
