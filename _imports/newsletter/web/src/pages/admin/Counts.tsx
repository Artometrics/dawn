import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Stats = {
  subscribers: { pending: number; confirmed: number; unsubscribed: number };
  issues: Array<{
    id: string;
    title: string;
    status: string;
    sentAt: string | null;
    stats: { sent: number; uniqueOpens: number; uniqueClicks: number; unsubscribes: number };
  }>;
};

export function Counts() {
  const { user, backend } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!user || backend !== 'ready') return;
    let cancelled = false;
    user.getIdToken()
      .then((token) => api<Stats>('/stats', { token }))
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((error: Error) => {
        if (!cancelled) setProblem(error instanceof ApiError ? error.message : 'Counts could not be loaded.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, backend]);

  return (
    <section>
      <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none tracking-[-0.03em]">Counts</h1>
      {backend === 'off' ? (
        <p className="mt-6 max-w-[46ch] font-text text-xl text-ink-soft">
          Opens and clicks are recorded by Cloud Functions. Until then, sent letters on the Letters page only show what was saved with them.
        </p>
      ) : null}
      {problem ? <p className="mt-4 font-ui text-blue" role="alert">{problem}</p> : null}
      {backend === 'ready' && !stats && !problem ? <p className="mt-6 font-text text-xl">Adding the counts.</p> : null}
      {stats ? (
        <>
          <table className="mt-6 w-full max-w-md text-left font-ui text-sm">
            <tbody>
              <tr className="border-t border-line"><th className="py-2 font-medium">Confirmed</th><td className="nums">{stats.subscribers.confirmed}</td></tr>
              <tr className="border-t border-line"><th className="py-2 font-medium">Waiting to confirm</th><td className="nums">{stats.subscribers.pending}</td></tr>
              <tr className="border-t border-b border-line"><th className="py-2 font-medium">Left</th><td className="nums">{stats.subscribers.unsubscribed}</td></tr>
            </tbody>
          </table>
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left font-ui text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Letter</th>
                  <th className="py-2 font-medium">Sent</th>
                  <th className="py-2 font-medium">Opened</th>
                  <th className="py-2 font-medium">Clicked</th>
                  <th className="py-2 font-medium">Left</th>
                </tr>
              </thead>
              <tbody>
                {stats.issues.map((issue) => (
                  <tr key={issue.id} className="border-b border-line">
                    <td className="py-3">
                      <span className="block">{issue.title}</span>
                      <span className="text-ink-soft">{issue.status}{issue.sentAt ? ` · ${formatWhen(issue.sentAt)}` : ''}</span>
                    </td>
                    <td className="nums">{issue.stats?.sent || 0}</td>
                    <td className="nums">{issue.stats?.uniqueOpens || 0}</td>
                    <td className="nums">{issue.stats?.uniqueClicks || 0}</td>
                    <td className="nums">{issue.stats?.unsubscribes || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
