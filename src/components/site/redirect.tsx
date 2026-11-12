'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** An old address. It stays a real page, shows where it moved, and replaces itself with the new one. */
export function Redirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <main id="main" className="dw-main">
      <h1 className="dw-h1">Moved</h1>
      <p className="dw-lead">This page is now <Link className="dw-link" href={to}>{label}</Link>.</p>
    </main>
  );
}
