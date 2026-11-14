import { slugify } from '@newsletter/markdown';
import { Timestamp, collection, doc, getDoc, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LetterBody } from '@/components/LetterBody';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, api } from '@/lib/api';
import { ADDRESS_LINES } from '@/lib/compliance';
import { useSession } from '@/lib/session';
import { ZERO_STATS } from '@/lib/utils';

type Fields = {
  title: string;
  slug: string;
  subject: string;
  preheader: string;
  dek: string;
  bodyMarkdown: string;
};

const empty: Fields = { title: '', slug: '', subject: '', preheader: '', dek: '', bodyMarkdown: '' };

export function Compose() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { db, user, backend, health } = useSession();
  const [fields, setFields] = useState<Fields>(empty);
  const [status, setStatus] = useState('draft');
  const [slugLocked, setSlugLocked] = useState(false);
  const [notes, setNotes] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [when, setWhen] = useState('');
  const [pane, setPane] = useState<'write' | 'preview'>('write');
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    if (!db || !id) return;
    let cancelled = false;
    getDoc(doc(db, 'issues', id))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setProblem('That letter is not on the desk.');
          return;
        }
        const data = snap.data();
        setFields({
          title: data.title || '',
          slug: data.slug || '',
          subject: data.subject || '',
          preheader: data.preheader || '',
          dek: data.dek || '',
          bodyMarkdown: data.bodyMarkdown || '',
        });
        setStatus(data.status || 'draft');
        setSlugLocked(true);
      })
      .catch(() => {
        if (!cancelled) setProblem('The letter could not be opened.');
      });
    return () => {
      cancelled = true;
    };
  }, [db, id]);

  function patch(partial: Partial<Fields>) {
    setFields((current) => {
      const next = { ...current, ...partial };
      if (!slugLocked && partial.title !== undefined && partial.slug === undefined) {
        next.slug = slugify(partial.title);
      }
      return next;
    });
  }

  async function save() {
    if (!db || !user) return;
    if (!fields.title.trim()) {
      setProblem('Give the letter a title.');
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      if (!id) {
        const slug = slugify(fields.slug || fields.title);
        const issueRef = doc(collection(db, 'issues'));
        const slugRef = doc(db, 'slugs', slug);
        await runTransaction(db, async (tx) => {
          const taken = await tx.get(slugRef);
          if (taken.exists()) throw new Error('That slug is already on a letter.');
          tx.set(issueRef, {
            title: fields.title.trim().slice(0, 180),
            slug,
            subject: (fields.subject || fields.title).trim().slice(0, 240),
            preheader: fields.preheader.slice(0, 240),
            dek: fields.dek.slice(0, 400),
            bodyMarkdown: fields.bodyMarkdown.slice(0, 100000),
            status: 'draft',
            createdBy: (user.email || '').toLowerCase(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            scheduledAt: null,
            sentAt: null,
            gemini: null,
            physicalAddress: ADDRESS_LINES,
            stats: { ...ZERO_STATS },
          });
          tx.set(slugRef, { issueId: issueRef.id });
        });
        setMessage('Saved on the desk.');
        navigate(`/admin/write/${issueRef.id}`, { replace: true });
      } else {
        await updateDoc(doc(db, 'issues', id), {
          title: fields.title.trim().slice(0, 180),
          subject: (fields.subject || fields.title).trim().slice(0, 240),
          preheader: fields.preheader.slice(0, 240),
          dek: fields.dek.slice(0, 400),
          bodyMarkdown: fields.bodyMarkdown.slice(0, 100000),
          updatedAt: serverTimestamp(),
        });
        setMessage('Saved.');
      }
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The save was refused.');
    } finally {
      setBusy(false);
    }
  }

  async function draftFromNotes() {
    if (!user) return;
    if (backend !== 'ready') {
      setProblem('The back end is not enabled yet. Drafting from notes needs Cloud Functions.');
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const token = await user.getIdToken();
      const result = await api<{ draft: Fields & { generator: string } }>('/draft', {
        method: 'POST',
        token,
        body: { notes, url: sourceUrl, save: false },
      });
      setFields((current) => ({
        title: result.draft.title,
        slug: slugLocked ? current.slug : result.draft.slug,
        subject: result.draft.subject,
        preheader: result.draft.preheader,
        dek: result.draft.dek,
        bodyMarkdown: result.draft.bodyMarkdown,
      }));
      setMessage(result.draft.generator === 'local-fallback' ? 'Drafted on the desk without a model.' : 'Drafted with Gemini.');
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'The draft did not come back.');
    } finally {
      setBusy(false);
    }
  }

  async function schedule() {
    if (!id || !db || !user) {
      setProblem('Save the letter before scheduling it.');
      return;
    }
    const date = new Date(when);
    if (Number.isNaN(date.getTime())) {
      setProblem('Choose a date and time.');
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      if (backend === 'ready') {
        const token = await user.getIdToken();
        await api(`/issues/${id}/schedule`, { method: 'POST', token, body: { scheduledAt: date.toISOString() } });
      } else {
        await updateDoc(doc(db, 'issues', id), {
          status: 'scheduled',
          scheduledAt: Timestamp.fromDate(date),
          updatedAt: serverTimestamp(),
        });
      }
      setStatus('scheduled');
      setMessage(backend === 'ready'
        ? 'Scheduled. Due letters go out every five minutes once functions are deployed.'
        : 'The time is saved. It will not send until Cloud Functions are deployed.');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The letter was not scheduled.');
    } finally {
      setBusy(false);
    }
  }

  async function sendNow() {
    if (!id || !user) return;
    setConfirmSend(false);
    if (backend !== 'ready') {
      setProblem('The back end is not enabled yet. Sending starts when Cloud Functions are deployed.');
      return;
    }
    if (!db) return;
    setBusy(true);
    setProblem('');
    try {
      await updateDoc(doc(db, 'issues', id), {
        title: fields.title.trim().slice(0, 180),
        subject: (fields.subject || fields.title).trim().slice(0, 240),
        preheader: fields.preheader.slice(0, 240),
        dek: fields.dek.slice(0, 400),
        bodyMarkdown: fields.bodyMarkdown.slice(0, 100000),
        updatedAt: serverTimestamp(),
      });
      const token = await user.getIdToken();
      const result = await api<{ sent: number; transport: string; status: string }>(`/issues/${id}/send`, {
        method: 'POST',
        token,
      });
      setStatus(result.status);
      setMessage(result.transport === 'dry-run'
        ? `Logged ${result.sent} ${result.sent === 1 ? 'letter' : 'letters'}. Nobody was mailed.`
        : `Sent to ${result.sent}.`);
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'The send did not finish.');
    } finally {
      setBusy(false);
    }
  }

  const locked = status === 'sent' || status === 'sending';

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-[clamp(2.4rem,5vw,3.5rem)] leading-none tracking-[-0.03em]">
          {id ? 'Edit the letter' : 'New letter'}
        </h1>
        <p className="font-ui text-sm capitalize text-ink-soft">{status}</p>
      </div>
      <div className="mt-4 flex gap-4 md:hidden">
        <button type="button" className={`min-h-11 font-ui ${pane === 'write' ? 'text-blue' : 'text-ink'}`} onClick={() => setPane('write')}>Write</button>
        <button type="button" className={`min-h-11 font-ui ${pane === 'preview' ? 'text-blue' : 'text-ink'}`} onClick={() => setPane('preview')}>Preview</button>
      </div>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className={pane === 'preview' ? 'hidden md:block' : ''}>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={fields.title} disabled={locked} onChange={(event) => patch({ title: event.target.value })} className="mt-1 font-display text-2xl" />
          <Label htmlFor="subject" className="mt-4 block">Subject</Label>
          <Input id="subject" value={fields.subject} disabled={locked} onChange={(event) => patch({ subject: event.target.value })} className="mt-1" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={fields.slug} disabled={locked || slugLocked} onChange={(event) => patch({ slug: event.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="preheader">Preheader</Label>
              <Input id="preheader" value={fields.preheader} disabled={locked} onChange={(event) => patch({ preheader: event.target.value })} className="mt-1" />
            </div>
          </div>
          <Label htmlFor="dek" className="mt-4 block">Dek</Label>
          <Input id="dek" value={fields.dek} disabled={locked} onChange={(event) => patch({ dek: event.target.value })} className="mt-1" />
          <Label htmlFor="body" className="mt-4 block">Body</Label>
          <Textarea id="body" value={fields.bodyMarkdown} disabled={locked} onChange={(event) => patch({ bodyMarkdown: event.target.value })} className="mt-1" />
          {!locked ? (
            <div className="mt-6 border-t border-line pt-4">
              <Label htmlFor="notes">Notes for a draft</Label>
              <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 min-h-24" />
              <Label htmlFor="source" className="mt-3 block">Or a public link</Label>
              <Input id="source" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://" className="mt-1" />
              <Button variant="line" className="mt-3" disabled={busy} onClick={() => void draftFromNotes()}>Draft from this</Button>
            </div>
          ) : null}
        </div>
        <div className={pane === 'write' ? 'hidden md:block' : ''}>
          <p className="font-ui text-sm text-blue">Preview</p>
          <h2 className="mt-2 font-display text-4xl leading-[1.02] tracking-[-0.03em]">{fields.title || 'Untitled'}</h2>
          {fields.dek ? <p className="mt-3 font-text text-xl italic text-ink-soft">{fields.dek}</p> : null}
          <div className="mt-4">
            <LetterBody markdown={fields.bodyMarkdown || 'The letter is empty.'} />
          </div>
        </div>
      </div>
      {problem ? <p className="mt-4 font-ui text-blue" role="alert">{problem}</p> : null}
      {message ? <p className="mt-4 font-ui text-ink-soft" role="status">{message}</p> : null}
      {!locked ? (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button disabled={busy} onClick={() => void save()}>Save draft</Button>
          <label className="flex items-center gap-2 font-ui text-sm">
            <span className="sr-only">Send at</span>
            <Input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} className="w-auto" aria-label="Send at" />
          </label>
          <Button variant="line" disabled={busy || !id} onClick={() => void schedule()}>Schedule</Button>
          <Button variant="line" disabled={busy || !id} onClick={() => setConfirmSend(true)}>Send now</Button>
        </div>
      ) : null}
      <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
        <DialogContent>
          <DialogTitle className="pr-10 font-display text-4xl tracking-[-0.03em]">Send this letter?</DialogTitle>
          <DialogDescription className="mt-3 font-text text-lg text-ink-soft">
            {health?.transport === 'resend'
              ? 'Resend is live. This mails everyone who confirmed.'
              : 'The transport is a dry run. The letter is logged and nobody is mailed.'}
          </DialogDescription>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => void sendNow()}>Send now</Button>
            <Button variant="ghost" onClick={() => setConfirmSend(false)}>Keep it on the desk</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
