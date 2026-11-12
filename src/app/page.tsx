import type { Metadata } from 'next';
import { AtlasScreen } from '@/components/site/atlas-screen';

export const metadata: Metadata = {
  title: 'Dawn',
  description: 'The Atlas map of Cardinal, with tours, places, and the Dawn sidebar one tap away.',
  robots: { index: false, follow: false },
};

export default function HomePage() {
  return (
    <main id="main" style={{ display: 'contents' }}>
      <h1 className="dw-sr-only">Atlas</h1>
      <AtlasScreen />
    </main>
  );
}
