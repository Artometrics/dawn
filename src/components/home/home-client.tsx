'use client';

import dynamic from 'next/dynamic';

const PixelHome = dynamic(() => import('@/components/home/pixel-home').then((mod) => mod.PixelHome), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#143018] text-[#f6f3ee]">
      Opening Dawn…
    </div>
  ),
});

export function HomeClient({ initialPanel = false }: { initialPanel?: boolean }) {
  return <PixelHome initialPanel={initialPanel} />;
}
