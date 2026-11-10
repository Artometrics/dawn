'use client';

import dynamic from 'next/dynamic';

const PixelHome = dynamic(() => import('@/components/home/pixel-home').then((mod) => mod.PixelHome), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[var(--dawn-forest)] text-[var(--dawn-text)]">
      Opening Dawn…
    </div>
  ),
});

export function HomeClient({ initialPanel = false }: { initialPanel?: boolean }) {
  return <PixelHome initialPanel={initialPanel} />;
}
