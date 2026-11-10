import type { Metadata } from 'next';
import { VillagePreview } from '@/components/preview/village-preview';

export const metadata: Metadata = {
  title: 'Dawn village preview',
  description: 'A contained village screen for review. Agents are off.',
  robots: { index: false, follow: false },
};

export default function VillagePreviewPage() {
  return <main style={{ display: 'contents' }}><h1 className="dw-sr-only">Village preview</h1><VillagePreview /></main>;
}
