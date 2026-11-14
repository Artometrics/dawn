import type { Metadata } from 'next';
import { FernboundDesk } from '@/components/desks/fernbound-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Fernbound',
  description: 'The Fernbound field, played in the browser.',
  robots: { index: false, follow: false },
};

export default function FernboundPage() {
  return (
    <PageShell title="Fernbound" wide lead="A wildkin field. The game runs here and does not call out.">
      <FernboundDesk />
    </PageShell>
  );
}
