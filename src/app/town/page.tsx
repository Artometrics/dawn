import type { Metadata } from 'next';
import { Redirect } from '@/components/site/redirect';

export const metadata: Metadata = {
  title: 'Village · Dawn',
  robots: { index: false, follow: false },
};

/** Old address of the 8-bit town. The village is the one place for it now. */
export default function TownPage() {
  return <Redirect to="/village?section=village" label="Village" />;
}
