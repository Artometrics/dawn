import type { Metadata } from 'next';
import { BooksDesk } from '@/components/desks/books-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Books',
  description: 'Literary tarot, a three-question match, the Gutenberg press, and a private shelf.',
  robots: { index: false, follow: false },
};

export default function BooksPage() {
  return (
      <PageShell title="Books" wide lead="An oracle, a three-question match, the Gutenberg press, and a shelf on this phone.">
      <BooksDesk />
    </PageShell>
  );
}
