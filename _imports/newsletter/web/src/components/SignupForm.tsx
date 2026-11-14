import { useState, type FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';
import { CONSENT_TEXT } from '@/lib/compliance';
import { useSession } from '@/lib/session';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupForm({ tone = 'inverse' }: { tone?: 'inverse' | 'paper' }) {
  const { backend } = useSession();
  const inverse = tone === 'inverse';
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setMessage('Enter the email address that should receive the letter.');
      return;
    }
    if (!consent) {
      setStatus('error');
      setMessage('Check the consent box. The list does not take an address without it.');
      return;
    }
    if (backend === 'off') {
      setStatus('error');
      setMessage('The back end is not enabled yet. Confirmation mail starts when Cloud Functions are deployed.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const result = await api<{ message: string }>('/subscribe', {
        method: 'POST',
        body: { email, consent, website, source: 'web' },
      });
      setStatus('done');
      setMessage(result.message);
      setEmail('');
      setConsent(false);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof ApiError ? error.message : 'The signup did not go through. Try again in a moment.');
    }
  }

  return (
    <form onSubmit={onSubmit} className={inverse ? 'text-white' : 'text-ink'} noValidate>
      <h2 className="font-display text-[2rem] leading-none tracking-[-0.03em]">Get the letter</h2>
      <p className={`mt-3 font-text text-lg leading-snug ${inverse ? 'text-[#e7eeff]' : 'text-ink-soft'}`}>
        A confirmation comes first. You are not on the list until you click it.
      </p>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" value={website} onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-6">
        <Label htmlFor="email" className={inverse ? 'text-white' : undefined}>Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@studio.com"
          className="mt-2"
        />
      </div>
      <label className="mt-4 flex items-start gap-3 font-ui text-base leading-snug">
        <Checkbox
          checked={consent}
          onCheckedChange={(value) => setConsent(value === true)}
          aria-required="true"
          className={inverse ? 'mt-0.5 h-11 w-11 border-white text-blue data-[state=checked]:bg-white data-[state=checked]:text-blue' : 'mt-0.5 h-11 w-11'}
          aria-describedby="consent-text"
        />
        <span id="consent-text">{CONSENT_TEXT}</span>
      </label>
      <Button type="submit" variant={inverse ? 'inverse' : 'default'} className="mt-5 w-full" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending the confirmation…' : 'Send me the confirmation'}
      </Button>
      <p className={`mt-3 min-h-6 font-ui text-sm ${status === 'error' ? (inverse ? 'text-white' : 'text-blue') : inverse ? 'text-[#e7eeff]' : 'text-ink-soft'}`} role="status">
        {message}
      </p>
    </form>
  );
}
