import type { Metadata } from 'next';
import Link from 'next/link';
import { PreviewShell } from '@/components/preview/preview-shell';

export const metadata: Metadata = {
  title: 'Dawn review pages',
  description: 'Unlisted demonstration pages. Agents are off.',
  robots: { index: false, follow: false },
};

const ACTUAL = [
  { href: '/', name: 'Home', note: 'The Atlas map with the Dawn sidebar. Live.' },
  { href: '/town', name: 'Dawn Town', note: 'The 8-bit town map that used to be home. Live.' },
  { href: '/village', name: 'Village', note: 'Quests, library and the drawer. Phone layout fits.' },
  { href: '/atlas', name: 'Atlas', note: 'Same screen as home. Kept so old links work.' },
  { href: '/agents', name: 'Agents desk', note: 'Gateway desk. Not opened by this preview.' },
  { href: '/studio', name: 'Studio', note: 'Chat and live preview workspace. Sends need a model on the host; local and static builds send nothing.' },
  { href: '/letter', name: 'Letter', note: 'Public signup and archive. Needs consent, then a confirmation link.' },
  { href: '/newsletter', name: 'Newsletter', note: 'Compose, list, archive, and counts. Sending is off.' },
  { href: '/invoices', name: 'Invoices', note: 'Numbered invoices with PDF and print.' },
  { href: '/contacts', name: 'Contacts', note: 'People, pipeline, and today.' },
  { href: '/games', name: 'Games', note: 'Dilemma village and towers. No server.' },
  { href: '/fernbound', name: 'Fernbound', note: 'The field loads after a button. No server.' },
  { href: '/aftercare', name: 'Aftercare', note: 'Cards, numbers, journal. Nothing is sent.' },
  { href: '/books', name: 'Books', note: 'Oracle, quiz, Gutenberg press, library, and shelf. No shop links.' },
  { href: '/cuts', name: 'Cuts', note: 'A board for one video: script, chapters, captions, and a license shelf.' },
  { href: '/shows', name: 'Shows', note: 'Podcast shows and episodes. The feed stays empty until you publish.' },
  { href: '/research', name: 'Research', note: 'Cited answers over your own files. Embeddings are off.' },
  { href: '/credits', name: 'Credits', note: 'Sprite and library credits.' },
  { href: '/walk', name: 'Walk', note: 'Single-player map. XP, loot, bosses, daily quests, and a festival. Saved on this phone.' },
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
