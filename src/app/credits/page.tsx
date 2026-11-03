import { readFileSync } from 'node:fs';
import type { Metadata } from 'next';
import { Markdown } from '@/components/credits/markdown';
import './credits.css';
import { BUNDLED_ASSETS, BUNDLED_FONTS } from '@/lib/credits/assets';
import { AGENT_SPRITES } from '@/lib/credits/sprites';
import { TOWN_CAST } from '@/lib/credits/town';
import libraries from '@/lib/credits/libraries.json';

export const metadata: Metadata = {
  title: 'Credits & licenses',
  description: 'Third-party code, fonts, and art used by Dawn.',
};

export default function CreditsPage() {
  const thirdParty = readFileSync('THIRD_PARTY.md', 'utf8');
  const notices = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
  return (
    <main className="credits">
      <p className="kicker">Dawn</p>
      <h1>Credits & licenses</h1>
      <p className="lead">
        One owner today. The fields below are the record for a later commercial release: who made each piece, where it came from, and which license covers it.
      </p>
      <p><a href="/">Back to Dawn</a> · <a href="/agents">Agents</a></p>

      <h2>Agent sprites</h2>
      <p>
        These 16×16 characters are frames from Kenney’s Tiny Dungeon sheet. The license is CC0, which allows a commercial product later.
      </p>
      <ul className="sprite-credits">
        {AGENT_SPRITES.map((sprite) => (
          <li key={sprite.id}>
            <img src={sprite.src} alt="" width={48} height={48} />
            <div>
              <strong>{sprite.name}</strong>
              <p>{sprite.file}</p>
              <p>Artist: {sprite.artist}</p>
              <p>License: {sprite.license}</p>
              <p><a href={sprite.sourceUrl}>{sprite.sourceUrl}</a></p>
            </div>
          </li>
        ))}
      </ul>

      <h2>Dawn Town</h2>
      <p>
        The home map, the player, and these six agents are original pixel art made for Dawn. They are not from Pokémon or any other game.
      </p>
      <ul className="sprite-credits">
        {TOWN_CAST.map((sprite) => (
          <li key={sprite.id}>
            <img src={sprite.src} alt="" width={48} height={48} />
            <div>
              <strong>{sprite.name}</strong>
              <p>{sprite.file}</p>
              <p>Artist: Dawn</p>
              <p>License: Project original</p>
            </div>
          </li>
        ))}
      </ul>

      <h2>Other bundled art and files</h2>
      <table>
        <thead>
          <tr>
            <th>File</th>
            <th>What</th>
            <th>Artist</th>
            <th>License</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {BUNDLED_ASSETS.map((asset) => (
            <tr key={asset.file}>
              <td><code>{asset.file}</code></td>
              <td>{asset.what}</td>
              <td>{asset.artist}</td>
              <td>{asset.license}</td>
              <td><a href={asset.sourceUrl}>{asset.sourceUrl.replace('https://', '')}</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Fonts bundled with the app</h2>
      <p>Loaded through Next.js font files, not stored as loose font files in the repo.</p>
      <ul>
        {BUNDLED_FONTS.map((font) => (
          <li key={font.name}>
            <strong>{font.name}</strong> — {font.artist}. {font.license}. <a href={font.sourceUrl}>{font.sourceUrl}</a>
          </li>
        ))}
      </ul>

      <h2>Open-source libraries</h2>
      <p>Direct dependencies of Dawn and Dawn Code. Transitive packages stay in the lockfiles.</p>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Where</th>
            <th>License</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {libraries.map((lib) => (
            <tr key={`${lib.kind}-${lib.name}`}>
              <td><code>{lib.name}</code></td>
              <td>{lib.kind}</td>
              <td>{lib.license}</td>
              <td>{lib.url ? <a href={lib.url}>{lib.url.replace(/^https?:\/\//, '')}</a> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>THIRD_PARTY.md</h2>
      <Markdown source={thirdParty} />

      <h2>THIRD_PARTY_NOTICES.md</h2>
      <Markdown source={notices} />
    </main>
  );
}
