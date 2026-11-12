'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const DawnApp = dynamic(() => import('@/components/dawn/dawn-app').then((mod) => mod.DawnApp), {
  ssr: false,
  loading: () => <p className="dw-note" style={{ padding: 24 }}>Opening Dawn…</p>,
});

export default function VillagePage() {
  return (
    <main id="main" className="h-full">
      <h1 className="sr-only">Village</h1>
      <Suspense fallback={null}>
        <DawnApp />
      </Suspense>
    </main>
  );
}
