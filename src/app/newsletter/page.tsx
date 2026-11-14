import type { Metadata } from 'next';
import { NewsletterDesk } from '@/components/desks/newsletter-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Newsletter',
  description: 'Compose the Artometrics letter, keep the list, and file a dry-run send.',
  robots: { index: false, follow: false },
};

export default function NewsletterPage() {
  return (
    <PageShell
      title="Newsletter"
      wide
      lead="Write the letter, keep the subscriber list, and file a send. Mail stays off until the gateway flag is on."
    >
      <NewsletterDesk />
    </PageShell>
  );
}
