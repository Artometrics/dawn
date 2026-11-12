'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { pageTitle } from '@/lib/site/nav';

const DawnApp = dynamic(() => import('@/components/dawn/dawn-app').then((mod) => mod.DawnApp), {
  ssr: false,
  loading: () => <p className="dw-note" style={{ padding: 24 }}>Opening Dawn…</p>,
});

function SectionHeading() {
  const section = useSearchParams().get('section');
  return <h1 className="sr-only">{pageTitle('/village', section)}</h1>;
}

export default function VillagePage() {
  return (
    <main id="main" className="h-full">
      <Suspense fallback={<h1 className="sr-only">Village</h1>}>
        <SectionHeading />
      </Suspense>
      <Suspense fallback={null}>
        <DawnApp />
      </Suspense>
    </main>
  );
}
