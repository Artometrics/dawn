import type { Metadata } from 'next';
import { ResearchDesk } from '@/components/desks/research-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Research',
  description: 'Cited answers over your own PDFs, transcripts, and web clips.',
  robots: { index: false, follow: false },
};

export default function ResearchPage() {
  return (
    <PageShell title="Research" wide lead="File a PDF or a transcript, ask a question, and keep the citations.">
      <ResearchDesk />
    </PageShell>
  );
}
