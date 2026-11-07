import type { Metadata } from 'next';
import Link from 'next/link';
import { PreviewShell } from '@/components/preview/preview-shell';

export const metadata: Metadata = {
  title: 'Dawn review pages',
  description: 'Unlisted demonstration pages. Agents are off.',
  robots: { index: false, follow: false },
};

const ACTUAL = [
  { href: '/', name: 'Home map', note: 'Pixel town. Live.' },
  { href: '/village', name: 'Village', note: 'Quests, agents, Atlas tab. Live.' },
  { href: '/atlas', name: 'Atlas', note: 'Campus walk. Cardinal note still coming soon.' },
  { href: '/agents', name: 'Agents desk', note: 'Gateway desk. Not opened by this preview.' },
  { href: '/studio', name: 'Studio', note: 'Older studio. Live route, untouched.' },
  { href: '/letter', name: 'Letter', note: 'Newsletter page. Live route, untouched.' },
  { href: '/credits', name: 'Credits', note: 'Sprite and library credits.' },
];

const PROPOSED = [
  { href: '/preview/bench', name: 'Bench', note: 'One sample, saved ideas, your checks.' },
  { href: '/preview/habits', name: 'Habits', note: 'One habit at a time. You mark it.' },
  { href: '/preview/stuck', name: 'Stuck', note: 'Three steps with the player sprite.' },
];

export default function PreviewIndexPage() {
  return (
    <PreviewShell
      title="Review pages"
      lead="The home map, village, Atlas, and desk already exist. These three pages are the gaps: a sample bench, a habit check, and a short round when you are stuck. They are not in the town menu."
    >
      <h2>On the site now</h2>
      <ul className="pv-list">
        {ACTUAL.map((row) => (
          <li key={row.href}>
            <Link className="pv-row" href={row.href}>
              <span>
                <strong>{row.name}</strong>
                <span>{row.note}</span>
              </span>
              <span className="pv-mark">{row.href}</span>
            </Link>
          </li>
        ))}
      </ul>
      <h2>For review only</h2>
      <ul className="pv-list">
        {PROPOSED.map((row) => (
          <li key={row.href}>
            <Link className="pv-row" href={row.href}>
              <img src="/sprites/town/player.png" alt="" width={40} height={40} />
              <span>
                <strong>{row.name}</strong>
                <span>{row.note}</span>
              </span>
              <span className="pv-mark">{row.href}</span>
            </Link>
          </li>
        ))}
      </ul>
    </PreviewShell>
  );
}
