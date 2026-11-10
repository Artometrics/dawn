'use client';

import dynamic from 'next/dynamic';

const DawnApp = dynamic(() => import('@/components/dawn/dawn-app').then((mod) => mod.DawnApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[var(--dawn-bg)] text-[var(--dawn-text)]">
      Opening Dawn…
    </div>
  ),
});

export default function VillagePage() {
  return <DawnApp />;
}
