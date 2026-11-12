import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/home-client';

export const metadata: Metadata = {
  title: 'Dawn Town',
  description: 'The 8-bit map of Dawn. Search, walk, and open the desk.',
  robots: { index: false, follow: false },
};

export default function TownPage() {
  return <main style={{ display: 'contents' }}><HomeClient /></main>;
}
