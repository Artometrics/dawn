import type { Metadata } from 'next';
import { HomeClient } from '@/components/home/home-client';

export const metadata: Metadata = {
  title: 'Dawn',
  description: 'A 16-bit map of Dawn. Search, walk, and open the desk.',
};

export default function HomePage() {
  return <HomeClient />;
}
