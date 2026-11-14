import type { Metadata } from 'next';
import { FernboundDesk } from '@/components/desks/fernbound-desk';

export const metadata: Metadata = {
  title: 'Fernbound',
  description: 'An original wildkin-binding story on The Fern Marches. It plays in the browser.',
  robots: { index: false, follow: false },
};

export default function FernboundPage() {
  return (
    <main id="main" className="as-fill arcade-shell">
      <h1 className="dw-sr-only">Fernbound</h1>
      <FernboundDesk />
    </main>
  );
}
