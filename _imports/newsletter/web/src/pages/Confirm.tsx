import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Masthead } from '@/components/Masthead';
import { ApiError, api } from '@/lib/api';

export function Confirm() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [message, setMessage] = useState(token ? 'Confirming this address.' : 'This page needs the confirmation link from the email.');
  const [tone, setTone] = useState<'wait' | 'ok' | 'bad'>(token ? 'wait' : 'bad');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ status: string; email?: string }>(`/confirm?token=${encodeURIComponent(token)}`)
      .then((result) => {
        if (cancelled) return;
        setTone('ok');
        setMessage(`${result.email || 'This address'} is on the list. The next letter can find you.`);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setTone('bad');
        setMessage(error instanceof ApiError ? error.message : 'The confirmation did not go through.');
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
          {tone === 'ok' ? 'You are confirmed.' : tone === 'bad' ? 'Not confirmed.' : 'One moment.'}
        </h1>
        <p className="mt-6 max-w-[42ch] font-text text-xl" role="status">{message}</p>
      </main>
    </div>
  );
}
