import type { Metadata } from 'next';
import { BooksDesk } from '@/components/desks/books-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Books',
  description: 'The Carrie book quiz, library, and a private shelf.',
  robots: { index: false, follow: false },
};

export default function BooksPage() {
  return (
    <PageShell title="Books" wide lead="A short quiz, the library, and a shelf. Nothing is bought from here.">
      <BooksDesk />
    </PageShell>
  );
}
