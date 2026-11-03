import type { Metadata } from 'next';
import { AgentsRoot } from '@/components/dawn-agents/agents-app';
import './agents.css';

export const metadata: Metadata = {
  title: 'Dawn Agents',
  description: "Kyle's private agent desk.",
};

export default function AgentsPage() {
  return <AgentsRoot />;
}
