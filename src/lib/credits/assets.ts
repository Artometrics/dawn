export type BundledAsset = {
  file: string;
  what: string;
  artist: string;
  sourceUrl: string;
  license: string;
};

const KENNEY_URL = 'https://kenney.nl/assets/tiny-dungeon';
const CC0 = 'CC0-1.0';

export const BUNDLED_ASSETS: BundledAsset[] = [
  { file: 'public/tiles/kenney-tiny-dungeon.png', what: 'Village floor sheet', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/kenney-tiny-town.png', what: 'Home overworld tiles (grass, trees, paths, fences, buildings)', artist: 'Kenney', sourceUrl: 'https://kenney.nl/assets/tiny-town', license: CC0 },
  { file: 'public/tiles/kenney-tiny-town-license.txt', what: 'License note for the Kenney town tiles', artist: 'Kenney', sourceUrl: 'https://kenney.nl/assets/tiny-town', license: CC0 },
  { file: 'public/tiles/dawn-town-map.png', what: 'Earlier Dawn Town sketch, not the live home map', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/maps/dawn-town-staging.png', what: 'Staging home plate until a Tiled map replaces it. Approved Dawn Town comp, not a game rip.', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/LICENSE.txt', what: 'License note for the Dawn Town cast', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/player.png', what: 'Dawn Town player', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/maps/atlas/cardinal-basemap.json', what: 'Atlas campus basemap, baked from OpenStreetMap data (roads, paths, buildings, water, green)', artist: 'OpenStreetMap contributors', sourceUrl: 'https://www.openstreetmap.org/copyright', license: 'ODbL-1.0' },
  { file: 'public/sprites/town/atlas-scout.png', what: 'Atlas Scout', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/code-mage.png', what: 'Code Mage', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/recipe-keeper.png', what: 'Recipe Keeper', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/letter-carrier.png', what: 'Letter Carrier', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/studio-painter.png', what: 'Studio Painter', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/sprites/town/agents-desk.png', what: 'Agents Desk', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
  { file: 'public/tiles/trinity.png', what: 'Village portrait, Trinity (sheet frame 84)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/kali.png', what: 'Village portrait, Kali (sheet frame 88)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/nimbus.png', what: 'Village portrait, Nimbus (sheet frame 86)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/you-0.png', what: 'Village portrait, you (sheet frame 90)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/you-1.png', what: 'Village portrait, you (sheet frame 92)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/tiles/you-2.png', what: 'Village portrait, you (sheet frame 96)', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/avatars/mona-lisa.webp', what: 'Account picture: Mona Lisa (c. 1503–06), face crop', artist: 'Leonardo da Vinci', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mona_Lisa,_by_Leonardo_da_Vinci,_from_C2RMF_retouched.jpg', license: 'Public domain' },
  { file: 'public/avatars/pearl-earring.webp', what: 'Account picture: Girl with a Pearl Earring (c. 1665), face crop', artist: 'Johannes Vermeer', sourceUrl: 'https://commons.wikimedia.org/wiki/File:1665_Girl_with_a_Pearl_Earring.jpg', license: 'Public domain' },
  { file: 'public/avatars/van-gogh.webp', what: 'Account picture: Self-Portrait (1887), face crop', artist: 'Vincent van Gogh', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project_(454045).jpg', license: 'Public domain' },
  { file: 'public/avatars/rembrandt.webp', what: 'Account picture: Self-Portrait (1659), face crop', artist: 'Rembrandt', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Rembrandt_van_Rijn_-_Self-Portrait_-_Google_Art_Project.jpg', license: 'Public domain' },
  { file: 'public/avatars/ermine.webp', what: 'Account picture: Lady with an Ermine (c. 1490), face crop', artist: 'Leonardo da Vinci', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Lady_with_an_Ermine_-_Leonardo_da_Vinci_-_Google_Art_Project.jpg', license: 'Public domain' },
  { file: 'public/avatars/madame-x.webp', what: 'Account picture: Madame X (1883–84), face crop', artist: 'John Singer Sargent', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Madame_X_(Madame_Pierre_Gautreau),_John_Singer_Sargent,_1884_(unfree_frame_crop).jpg', license: 'Public domain' },
  { file: 'public/avatars/whistler-mother.webp', what: 'Account picture: Whistler\'s Mother (1871), face crop', artist: 'James McNeill Whistler', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Whistlers_Mother_high_res.jpg', license: 'Public domain' },
  { file: 'public/avatars/adele.webp', what: 'Account picture: Adele Bloch-Bauer I (1907), face crop', artist: 'Gustav Klimt', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gustav_Klimt_046.jpg', license: 'Public domain' },
  { file: 'public/avatars/arnolfini.webp', what: 'Account picture: Arnolfini Portrait (1434), face crop', artist: 'Jan van Eyck', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Van_Eyck_-_Arnolfini_Portrait.jpg', license: 'Public domain' },
  { file: 'public/fonts/Chomsky.otf', what: 'Recipes masthead wordmark font (same face as the Artometrics wordmark)', artist: 'Fredrick Brennan', sourceUrl: 'https://github.com/ctrlcctrlv/chomsky', license: 'OFL-1.1' },
  { file: 'public/sprites/agents/LICENSE.txt', what: 'License note for the agent sprites', artist: 'Kenney', sourceUrl: KENNEY_URL, license: CC0 },
  { file: 'public/file.svg', what: 'Next.js starter icon', artist: 'Vercel / Next.js', sourceUrl: 'https://github.com/vercel/next.js', license: 'MIT' },
  { file: 'public/globe.svg', what: 'Next.js starter icon', artist: 'Vercel / Next.js', sourceUrl: 'https://github.com/vercel/next.js', license: 'MIT' },
  { file: 'public/next.svg', what: 'Next.js mark', artist: 'Vercel', sourceUrl: 'https://github.com/vercel/next.js', license: 'MIT' },
  { file: 'public/vercel.svg', what: 'Vercel mark', artist: 'Vercel', sourceUrl: 'https://github.com/vercel/next.js', license: 'MIT' },
  { file: 'public/window.svg', what: 'Next.js starter icon', artist: 'Vercel / Next.js', sourceUrl: 'https://github.com/vercel/next.js', license: 'MIT' },
  { file: 'editor/extension/media/icon.svg', what: 'Dawn Code extension icon', artist: 'Dawn', sourceUrl: 'https://github.com/Artometrics/dawn', license: 'Project original' },
];

export const BUNDLED_FONTS = [
  { name: 'Geist', artist: 'Vercel', license: 'SIL Open Font License 1.1', sourceUrl: 'https://github.com/vercel/geist-font' },
  { name: 'Geist Mono', artist: 'Vercel', license: 'SIL Open Font License 1.1', sourceUrl: 'https://github.com/vercel/geist-font' },
  { name: 'Press Start 2P', artist: 'Cody Boisclair (CodeMan38)', license: 'SIL Open Font License 1.1', sourceUrl: 'https://fonts.google.com/specimen/Press+Start+2P' },
  { name: 'Source Serif 4', artist: 'Frank Grießhammer, Adobe', license: 'SIL Open Font License 1.1', sourceUrl: 'https://github.com/adobe-fonts/source-serif' },
];
