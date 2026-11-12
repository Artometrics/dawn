import type { Metadata } from 'next';
import { HabitsView } from '@/components/preview/habits-view';
import { PreviewShell } from '@/components/preview/preview-shell';

export const metadata: Metadata = {
  title: 'Dawn habits',
  description: 'Demonstration habits. Agents are off.',
  robots: { index: false, follow: false },
};

export default function HabitsPage() {
  return (
    <PreviewShell
      title="Today's habits"
      lead="One at a time."
    >
      <HabitsView />
    </PreviewShell>
  );
}
