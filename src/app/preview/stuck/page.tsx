import type { Metadata } from 'next';
import { PreviewShell } from '@/components/preview/preview-shell';
import { StuckView } from '@/components/preview/stuck-view';

export const metadata: Metadata = {
  title: 'Dawn stuck round',
  description: 'A three-step demonstration. No agent plays it.',
  robots: { index: false, follow: false },
};

export default function StuckPage() {
  return (
    <PreviewShell
      title="Take a short break"
      lead="Three steps, then back to the bench."
    >
      <StuckView />
    </PreviewShell>
  );
}
