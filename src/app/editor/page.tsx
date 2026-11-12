import type { Metadata } from 'next';
import { Redirect } from '@/components/site/redirect';

export const metadata: Metadata = {
  title: 'Code · Dawn',
  robots: { index: false, follow: false },
};

/** The full editor lives at /editor on the live server. This static copy only points to the Code hub. */
export default function EditorPage() {
  return <Redirect to="/code" label="Code" />;
}
