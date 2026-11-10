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
  { href: '/village', name: 'Village', note: 'Quests, library and the drawer. Phone layout fits.' },
  { href: '/atlas', name: 'Atlas', note: 'Campus walk. Cardinal note still coming soon.' },
  { href: '/agents', name: 'Agents desk', note: 'Gateway desk. Not opened by this preview.' },
  { href: '/studio', name: 'Studio', note: 'Chat and live preview workspace. Sends need a model on the host; local and static builds send nothing.' },
  { href: '/letter', name: 'Letter', note: 'Newsletter page. Needs the desk to subscribe.' },
  { href: '/credits', name: 'Credits', note: 'Sprite and library credits.' },
  { href: '/preview/style-guide', name: 'Style guide', note: 'Tokens and shared components every page uses.' },
];

const PROPOSED = [
  { href: '/preview/village', name: 'Village fit', note: 'Contained scene, five nav buttons, team strip. Agents off.' },
  { href: '/preview/bench', name: 'Bench', note: 'One sample, saved ideas, your checks.' },
  { href: '/preview/habits', name: 'Habits', note: 'One habit at a time. You mark it.' },
  { href: '/preview/stuck', name: 'Stuck', note: 'Three steps with the player sprite.' },
];

export default function PreviewIndexPage() {
  return (
    <PreviewShell
      title="Review pages"
      lead="The live village on a phone scrolls sideways and hides the bottom nav. The village preview is that screen, contained. The bench, habits, and stuck round stay the other sample pages. None of them are in the town menu."
    >
      <h2>On the site now</h2>
      <ul className="pv-list">
        {ACTUAL.map((row) => (
          <li key={row.href}>
            <Link prefetch={false} className="pv-row" href={row.href}>
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
            <Link prefetch={false} className="pv-row" href={row.href}>
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
