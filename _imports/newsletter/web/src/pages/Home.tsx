import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Colophon, Masthead } from '@/components/Masthead';
import { SignupForm } from '@/components/SignupForm';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Latest = { slug: string; title: string; dek: string; sentAt: unknown };

export function Home() {
  const { db, phase, error } = useSession();
  const [latest, setLatest] = useState<Latest | null | undefined>(undefined);
  const [archiveError, setArchiveError] = useState('');

  useEffect(() => {
    if (!db) return;
    const letters = query(collection(db, 'issues'), where('status', '==', 'sent'), orderBy('sentAt', 'desc'), limit(1));
    return onSnapshot(
      letters,
      (snap) => {
        const doc = snap.docs[0];
        if (!doc) {
          setLatest(null);
          return;
        }
        const data = doc.data();
        setLatest({ slug: data.slug, title: data.title, dek: data.dek || '', sentAt: data.sentAt });
        setArchiveError('');
      },
      () => setArchiveError('The archive could not be opened. On the local desk, start the Firestore emulator.'),
    );
  }, [db]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <a href="#letter" className="skip">Skip to the letter</a>
      <Masthead />
      <section className="px-5 pb-8 pt-8 md:px-12 md:pt-12">
        <h1 className="max-w-[12ch] font-display text-[clamp(2.75rem,7vw,6rem)] leading-[0.9] tracking-[-0.04em]">
          The letter from the studio.
        </h1>
      </section>
      {phase === 'error' ? <p className="px-5 font-ui text-blue md:px-12" role="alert">{error}</p> : null}
      <section id="letter" className="bg-blue text-white">
        <div className="grid gap-10 px-5 py-10 md:grid-cols-12 md:px-12 md:py-14">
          <div className="md:col-span-7">
            {archiveError ? <p role="alert">{archiveError}</p> : null}
            {latest === undefined && !archiveError ? <p className="font-text text-xl text-[#e7eeff]">Opening the shelf.</p> : null}
            {latest === null ? (
              <>
                <h2 className="font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.02] tracking-[-0.03em]">The desk is clear.</h2>
                <p className="mt-4 max-w-[34ch] font-text text-xl italic text-[#e7eeff]">No letter has been sent. Join, and the next one can find you.</p>
              </>
            ) : null}
            {latest ? (
              <>
                <h2 className="font-display text-[clamp(2.2rem,4vw,3.4rem)] leading-[1.02] tracking-[-0.03em]">{latest.title}</h2>
                <p className="mt-3 font-ui text-sm text-[#d6e0ff]">{formatWhen(latest.sentAt)}</p>
                {latest.dek ? <p className="mt-4 max-w-[36ch] font-text text-xl italic text-[#e7eeff]">{latest.dek}</p> : null}
                <Link to={`/archive/${latest.slug}`} className="mt-8 inline-flex min-h-11 items-center bg-white px-5 font-ui text-blue hover:bg-[#e7eeff]">
                  Read this letter
                </Link>
              </>
            ) : null}
          </div>
          <div className="md:col-span-5">
            <SignupForm />
          </div>
        </div>
      </section>
      <Colophon />
    </div>
  );
}
