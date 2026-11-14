import { useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Entry = {
  id: string;
  to: string;
  subject: string;
  kind: string;
  createdAt: string | null;
  transport: string;
  text: string;
  html: string;
  headers: Record<string, string>;
};

export function Log() {
  const { user, backend } = useSession();
  const [rows, setRows] = useState<Entry[] | null>(null);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!user || backend !== 'ready') return;
    let cancelled = false;
    user.getIdToken()
      .then((token) => api<{ dryRuns: Entry[] }>('/dry-runs', { token }))
      .then((data) => {
        if (!cancelled) setRows(data.dryRuns);
      })
      .catch((error: Error) => {
        if (!cancelled) setProblem(error instanceof ApiError ? error.message : 'The log could not be opened.');
      });
    return () => {
      cancelled = true;
    };
  }, [user, backend]);

  return (
    <section>
      <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none tracking-[-0.03em]">Dry-run log</h1>
      <p className="mt-4 max-w-[48ch] font-text text-lg text-ink-soft">
        When Resend is not configured, every confirmation and letter lands here instead of in a mailbox.
      </p>
      {backend === 'off' ? <p className="mt-4 font-ui text-blue">The back end is not enabled yet.</p> : null}
      {problem ? <p className="mt-4 font-ui text-blue" role="alert">{problem}</p> : null}
      {backend === 'ready' && rows === null && !problem ? <p className="mt-6 font-text text-xl">Opening the log.</p> : null}
      {rows && rows.length === 0 ? <p className="mt-6 font-text text-xl italic">Nothing has been logged.</p> : null}
      <ul className="mt-6">
        {rows?.map((row) => (
          <li key={row.id} className="border-t border-line py-4">
            <details>
              <summary className="cursor-pointer font-ui">
                <span className="text-ink">{row.subject}</span>
                <span className="mt-1 block text-sm text-ink-soft">{row.to} · {row.kind} · {formatWhen(row.createdAt)} · {row.transport}</span>
              </summary>
              <p className="mt-3 font-ui text-sm text-ink-soft">List-Unsubscribe: {row.headers?.['List-Unsubscribe'] || 'missing'}</p>
              <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap font-text text-sm text-ink">{row.text}</pre>
              <iframe title={`Preview ${row.subject}`} sandbox="" srcDoc={row.html} className="mt-3 h-80 w-full border border-line bg-white" />
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
