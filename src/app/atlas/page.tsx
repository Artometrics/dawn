import type { Metadata } from 'next';
import { AtlasApp } from '@/features/atlas/components/atlas-app';

export const metadata: Metadata = {
  title: 'Atlas · Dawn',
  description: 'A map of real places with your pixel character on it. Cardinal, the Stanford story, is the first region.',
};

export default function AtlasPage() {
  return (
    <main style={{ display: 'contents' }}>
      <h1 className="dw-sr-only">Atlas</h1>
      <AtlasApp />
    </main>
  );
}
