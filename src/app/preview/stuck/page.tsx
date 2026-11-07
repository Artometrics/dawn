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
      title="A short round"
      lead="When a sample stalls, the village has nowhere to go but away. This round is three steps. It does not finish a check for you."
      current="/preview/stuck"
    >
      <StuckView />
    </PreviewShell>
  );
}
