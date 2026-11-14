import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Masthead } from '@/components/Masthead';
import { ApiError, api } from '@/lib/api';

export function Unsubscribed() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [message, setMessage] = useState(token ? 'Taking this address off the list.' : 'Use the unsubscribe link from a letter.');
  const [done, setDone] = useState(!token);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api(`/unsubscribe?token=${encodeURIComponent(token)}`)
      .then(() => {
        if (cancelled) return;
        setDone(true);
        setMessage('This address is off the list. A later letter will not include it unless you join again.');
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setDone(true);
        setMessage(error instanceof ApiError ? error.message : 'The unsubscribe did not go through.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Masthead />
      <main className="px-5 py-12 md:px-12">
        <h1 className="max-w-[14ch] font-display text-[clamp(2.6rem,6vw,4.5rem)] leading-[0.95] tracking-[-0.03em]">
          {done && token ? 'You have left.' : 'Unsubscribe'}
        </h1>
        <p className="mt-6 max-w-[42ch] font-text text-xl" role="status">{message}</p>
      </main>
    </div>
  );
}
