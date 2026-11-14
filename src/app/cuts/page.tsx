import type { Metadata } from 'next';
import { CutsDesk } from '@/components/desks/cuts-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Cuts',
  description: 'A board for one video: script, chapters, captions, and a license shelf.',
  robots: { index: false, follow: false },
};

export default function CutsPage() {
  return (
    <PageShell title="Cuts" wide lead="One board per video. A topic or an article in, a script package out. No video is downloaded.">
      <CutsDesk />
    </PageShell>
  );
}
