'use client';

import dynamic from 'next/dynamic';

const DawnApp = dynamic(() => import('@/components/dawn/dawn-app').then((mod) => mod.DawnApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#0e0e0c] text-[#f3f1ec]">
      Opening Dawn…
    </div>
  ),
});

export default function HomePage() {
  return <DawnApp />;
}
