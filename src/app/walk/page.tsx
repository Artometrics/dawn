import type { Metadata } from 'next';
import { WalkApp } from '@/features/walk/walk-app';

export const metadata: Metadata = {
  title: 'Walk · Dawn',
  description: 'A single-player walk on the real map. XP, loot, bosses, daily quests, and a festival. Saved on this phone.',
  robots: { index: false, follow: false },
};

export default function WalkPage() {
  return (
    <main id="main" className="wk-main">
      <h1 className="dw-sr-only">Walk</h1>
      <WalkApp />
    </main>
  );
}
