import type { Metadata } from 'next';
import { AtlasHome } from '@/components/home/atlas-home';

export const metadata: Metadata = {
  title: 'Dawn',
  description: 'The Atlas map of Cardinal, with tours, places, and the Dawn sidebar one tap away.',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <main style={{ display: 'contents' }}>
      <h1 className="dw-sr-only">Atlas</h1>
      <AtlasHome />
    </main>
  );
}
