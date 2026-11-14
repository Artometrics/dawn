import type { Metadata } from 'next';
import { ResearchDesk } from '@/components/desks/research-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Research',
  description: 'Cited answers over your own files. Embeddings are off.',
  robots: { index: false, follow: false },
};

export default function ResearchPage() {
  return (
    <PageShell title="Research" wide lead="Ask a question of your own PDFs and transcripts. Citations export as Markdown or BibTeX. Embeddings are off.">
      <ResearchDesk />
    </PageShell>
  );
}
