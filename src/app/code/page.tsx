import type { Metadata } from 'next';
import { CodeHub } from '@/components/code/code-hub';

export const metadata: Metadata = {
  title: 'Code · Dawn',
  description: 'NightCode, Teammates, the desk editor and the kits.',
  robots: { index: false, follow: false },
};

export default function CodePage() {
  return <CodeHub />;
}
