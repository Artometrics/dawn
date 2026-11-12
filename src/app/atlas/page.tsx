import type { Metadata } from 'next';
import { Redirect } from '@/components/site/redirect';

export const metadata: Metadata = {
  title: 'Atlas · Dawn',
  robots: { index: false, follow: false },
};

/** Old address of the Atlas. The map is the home screen now. */
export default function AtlasPage() {
  return <Redirect to="/" label="Atlas" />;
}
