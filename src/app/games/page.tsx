import type { Metadata } from 'next';
import { GamesDesk } from '@/components/desks/games-desk';

export const metadata: Metadata = {
  title: 'Games',
  description: 'The dilemma village, Fernbound, and towers. All of it stays in the browser.',
  robots: { index: false, follow: false },
};

export default function GamesPage() {
  return (
    <main id="main" className="as-fill arcade-shell">
      <h1 className="dw-sr-only">Games</h1>
      <GamesDesk />
    </main>
  );
}
