import type { Metadata } from 'next';
import { BenchView } from '@/components/preview/bench-view';
import { PreviewShell } from '@/components/preview/preview-shell';

export const metadata: Metadata = {
  title: 'Dawn bench',
  description: 'Demonstration bench. One sample at a time. Agents are off.',
  robots: { index: false, follow: false },
};

export default function BenchPage() {
  return (
    <PreviewShell
      title="Choose a sample"
      lead="Ideas stay in this browser."
      current="/preview/bench"
    >
      <BenchView />
    </PreviewShell>
  );
}
