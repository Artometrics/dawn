import type { Metadata } from 'next';
import { BotDesk } from '@/components/desk/bot-desk';
import './desk.css';

export const metadata: Metadata = {
  title: 'Dawn bot desk',
  description: 'A local bot task with plan and build permissions.',
  robots: { index: false, follow: false },
};

export default function DeskPage() {
  return <BotDesk />;
}
