import type { Metadata } from 'next';
import { AgentsEntry } from './entry';
import './agents.css';

export const metadata: Metadata = {
  title: 'Dawn Agents',
  description: 'The pinned Dawn characters. The live desk is separate.',
};

export default function AgentsPage() {
  return <main style={{ display: 'contents' }}><AgentsEntry /></main>;
}
