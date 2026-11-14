import type { Metadata } from 'next';
import { AftercareDesk } from '@/components/desks/aftercare-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Aftercare',
  description: 'Tarot, numerology, and a private journal. Nothing is sent.',
  robots: { index: false, follow: false },
};

export default function AftercarePage() {
  return (
    <PageShell title="Aftercare" wide lead="Cards, numbers, and a journal. They stay on this phone.">
      <AftercareDesk />
    </PageShell>
  );
}
