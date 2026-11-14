import type { Metadata } from 'next';
import { ShowsDesk } from '@/components/desks/shows-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Shows',
  description: 'Podcast shows, an RSS feed, an embed player, and a download counter.',
  robots: { index: false, follow: false },
};

export default function ShowsPage() {
  return (
    <PageShell title="Shows" wide lead="Shows and episodes. Publish a podcast feed, an embed player, and a download counter.">
      <ShowsDesk />
    </PageShell>
  );
}
