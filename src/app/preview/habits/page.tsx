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
      lead="The village quest is still three generic checks. This page is the missing habit day: one row open, and you are the one who marks it."
      current="/preview/habits"
    >
      <HabitsView />
    </PreviewShell>
  );
}
