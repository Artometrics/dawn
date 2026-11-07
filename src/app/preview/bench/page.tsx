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
      title="One sample"
      lead="Pick one sample. Save an idea in this browser. Mark the checks yourself. Switching samples clears those checks and keeps the ideas."
      current="/preview/bench"
    >
      <BenchView />
    </PreviewShell>
  );
}
