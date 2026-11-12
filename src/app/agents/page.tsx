import type { Metadata } from 'next';
import { AgentsEntry } from './entry';
import './agents.css';

export const metadata: Metadata = {
  title: 'Dawn Agents',
  description: 'Your Dawn agents and their chats.',
};

export default function AgentsPage() {
  return <AgentsEntry />;
}
