import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LetterBody } from '@/components/LetterBody';
import { Colophon, Masthead } from '@/components/Masthead';
import { useSession } from '@/lib/session';
import { formatWhen } from '@/lib/utils';

type Letter = { title: string; dek: string; bodyMarkdown: string; sentAt: unknown };

export function IssuePage() {
  const { slug = '' } = useParams();
  const { db, phase, error } = useSession();
  const [letter, setLetter] = useState<Letter | null | undefined>(undefined);
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!db || !slug) return;
    let cancelled = false;
    const letters = query(
      collection(db, 'issues'),
      where('slug', '==', slug),
      where('status', '==', 'sent'),
      limit(1),
    );
    getDocs(letters)
      .then((snap) => {
        if (cancelled) return;
        const sent = snap.docs[0];
        if (!sent) {
          setLetter(null);
          return;
        }
        const data = sent.data();
        setLetter({ title: data.title, dek: data.dek || '', bodyMarkdown: data.bodyMarkdown || '', sentAt: data.sentAt });
      })
      .catch(() => {
        if (!cancelled) setProblem('That letter could not be opened.');
      });
    return () => {
      cancelled = true;
    };
  }, [db, slug]);

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Masthead />
      <article className="mx-auto max-w-[68ch] px-5 py-10">
        <p className="font-ui text-sm"><Link to="/archive" className="text-blue">Archive</Link></p>
        {phase === 'error' ? <p className="mt-6 text-blue" role="alert">{error}</p> : null}
        {problem ? <p className="mt-6 text-blue" role="alert">{problem}</p> : null}
        {letter === undefined && !problem ? <p className="mt-8 font-text text-xl">Opening the letter.</p> : null}
        {letter === null ? <h1 className="mt-6 font-display text-4xl tracking-[-0.03em]">That letter is not on the shelf.</h1> : null}
        {letter ? (
          <>
            <h1 className="mt-4 font-display text-[clamp(2.6rem,6vw,4.25rem)] leading-[0.98] tracking-[-0.03em]">{letter.title}</h1>
            <p className="mt-3 font-ui text-sm text-ink-soft">{formatWhen(letter.sentAt)}</p>
            {letter.dek ? <p className="mt-5 font-text text-xl italic text-ink-soft">{letter.dek}</p> : null}
            <div className="mt-8">
              <LetterBody markdown={letter.bodyMarkdown} />
            </div>
          </>
        ) : null}
      </article>
      <Colophon />
    </div>
  );
}
