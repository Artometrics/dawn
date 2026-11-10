/** The one list of places in Dawn. Header nav, footer, 404 page, and the smoke test all read it. */
export type SiteLink = { href: string; label: string };

export const SITE_NAV: SiteLink[] = [
  { href: '/', label: 'Town' },
  { href: '/village', label: 'Village' },
  { href: '/atlas', label: 'Atlas' },
  { href: '/studio', label: 'Studio' },
  { href: '/editor', label: 'Code' },
  { href: '/projects', label: 'Projects' },
  { href: '/artifacts', label: 'Recipes' },
  { href: '/letter', label: 'Letter' },
  { href: '/kits', label: 'Kits' },
  { href: '/desk', label: 'Desk' },
];

export const SITE_FOOTER: SiteLink[] = [
  { href: '/credits', label: 'Credits & licenses' },
  { href: '/preview', label: 'Review pages' },
  { href: '/agents', label: 'Agents' },
];

/** Every page the static export emits. The smoke test fails when a page appears here but not in out/. */
export const SITE_ROUTES: string[] = [
  '/',
  '/agents',
  '/village',
  '/atlas',
  '/studio',
  '/editor',
  '/projects',
  '/artifacts',
  '/letter',
  '/credits',
  '/desk',
  '/kits',
  '/kits/assistant',
  '/kits/browser',
  '/kits/nightcode',
  '/kits/sandbox',
  '/kits/sendkit',
  '/kits/teammates',
  '/preview',
  '/preview/village',
  '/preview/bench',
  '/preview/habits',
  '/preview/stuck',
  '/preview/style-guide',
];
