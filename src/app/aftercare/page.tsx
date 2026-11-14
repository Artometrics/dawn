import type { Metadata } from 'next';
import { AftercareDesk } from '@/components/desks/aftercare-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Aftercare',
  description: 'A tarot table, birth chart, and private journal. Nothing is sent.',
  robots: { index: false, follow: false },
};

export default function AftercarePage() {
  return (
    <PageShell title="Aftercare" wide lead="A tarot table, a birth chart, and a journal. They stay on this phone.">
      <AftercareDesk />
    </PageShell>
  );
}
