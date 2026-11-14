import type { Metadata } from 'next';
import { ShowsDesk } from '@/components/desks/shows-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Shows',
  description: 'Podcast shows, an RSS feed, and a download counter. Nothing is published yet.',
  robots: { index: false, follow: false },
};

export default function ShowsPage() {
  return (
    <PageShell title="Shows" wide lead="Shows and episodes on this phone. Cardinal is listed as drafts. No feed or audio is published.">
      <ShowsDesk />
    </PageShell>
  );
}
