import type { Metadata } from 'next';
import { GamesDesk } from '@/components/desks/games-desk';
import { PageShell } from '@/components/site/page-shell';

export const metadata: Metadata = {
  title: 'Games',
  description: 'A small arcade: the dilemma village and Pantheon Towers.',
  robots: { index: false, follow: false },
};

export default function GamesPage() {
  return (
    <PageShell title="Games" wide lead="Two games that fit on the desk. They stay in the browser.">
      <GamesDesk />
    </PageShell>
  );
}
