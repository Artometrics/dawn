import type { Metadata } from 'next';
import { CampusAtlas } from '@/components/atlas/campus-atlas';

export const metadata: Metadata = {
  title: 'Atlas · Dawn',
  description: 'Walk a day on the Stanford campus. Cardinal notes are still to come.',
};

export default function AtlasPage() {
  return <main style={{ display: 'contents' }}><h1 className="dw-sr-only">Atlas</h1><CampusAtlas /></main>;
}
