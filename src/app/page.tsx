'use client';

import dynamic from 'next/dynamic';

const DawnApp = dynamic(() => import('@/components/dawn/dawn-app').then((mod) => mod.DawnApp), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#1c1410] text-[#f3e6d0]">
      Opening the village…
    </div>
  ),
});

export default function HomePage() {
  return <DawnApp />;
}
