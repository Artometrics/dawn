import type { Metadata } from 'next';
import { AtlasHome } from '@/components/home/atlas-home';

export const metadata: Metadata = {
  title: 'Atlas · Dawn',
  description: 'A map of real places with your pixel character on it. Cardinal, the Stanford story, is the first region.',
  robots: { index: false, follow: false },
};

/** Same screen as /. Kept so old links and the static host keep working. */
export default function AtlasPage() {
  return (
    <main style={{ display: 'contents' }}>
      <h1 className="dw-sr-only">Atlas</h1>
      <AtlasHome />
    </main>
  );
}
