/**
 * The one list of places in Dawn. The shell sidebar, the top bar title, the 404 page,
 * the smoke test and docs/process/design/shared-shell/SITEMAP.md all read it.
 * Same items, same order, on every route.
 */
export type IconKey =
  | 'atlas' | 'quests' | 'village' | 'characters' | 'library'
  | 'projects' | 'studio' | 'recipes' | 'letter' | 'newsletter' | 'invoices' | 'contacts' | 'cuts' | 'shows' | 'research'
  | 'code' | 'nightcode' | 'teammates' | 'editor' | 'kits'
  | 'agents' | 'desk' | 'data' | 'settings';

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: IconKey;
  /** Pathname this item lives on. Items that share one (the village sections) also set `section`. */
  path: string;
  section?: string;
  /** Other pathnames that count as being inside this item. */
  within?: string[];
};

export type NavGroup = { id: string; label: string | null; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'explore',
    label: null,
    items: [
      { id: 'atlas', label: 'Atlas', href: '/', icon: 'atlas', path: '/' },
      { id: 'quests', label: 'Quests', href: '/village?section=quests', icon: 'quests', path: '/village', section: 'quests' },
      { id: 'village', label: 'Village', href: '/village?section=village', icon: 'village', path: '/village', section: 'village' },
      { id: 'characters', label: 'Characters', href: '/village?section=characters', icon: 'characters', path: '/village', section: 'characters' },
      { id: 'library', label: 'Library', href: '/village?section=library', icon: 'library', path: '/village', section: 'library' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      { id: 'projects', label: 'Projects', href: '/projects', icon: 'projects', path: '/projects' },
      { id: 'studio', label: 'Studio', href: '/studio', icon: 'studio', path: '/studio' },
      { id: 'recipes', label: 'Recipes', href: '/artifacts', icon: 'recipes', path: '/artifacts' },
      { id: 'letter', label: 'Letter', href: '/letter', icon: 'letter', path: '/letter' },
      { id: 'newsletter', label: 'Newsletter', href: '/newsletter', icon: 'newsletter', path: '/newsletter' },
      { id: 'invoices', label: 'Invoices', href: '/invoices', icon: 'invoices', path: '/invoices' },
      { id: 'contacts', label: 'Contacts', href: '/contacts', icon: 'contacts', path: '/contacts' },
      { id: 'cuts', label: 'Cuts', href: '/cuts', icon: 'cuts', path: '/cuts' },
      { id: 'shows', label: 'Shows', href: '/shows', icon: 'shows', path: '/shows' },
      { id: 'research', label: 'Research', href: '/research', icon: 'research', path: '/research' },
    ],
  },
  {
    id: 'code',
    label: 'Code',
    items: [
      { id: 'code', label: 'Code', href: '/code', icon: 'code', path: '/code' },
      { id: 'nightcode', label: 'NightCode', href: '/kits/nightcode', icon: 'nightcode', path: '/kits/nightcode' },
      { id: 'teammates', label: 'Teammates', href: '/kits/teammates', icon: 'teammates', path: '/kits/teammates' },
      { id: 'editor', label: 'Editor', href: '/code/editor', icon: 'editor', path: '/code/editor' },
      { id: 'kits', label: 'Kits', href: '/kits', icon: 'kits', path: '/kits', within: ['/kits/assistant', '/kits/browser', '/kits/sandbox', '/kits/sendkit'] },
    ],
  },
  {
    id: 'agents',
    label: 'Agents',
    items: [
      { id: 'agents', label: 'Agents', href: '/agents', icon: 'agents', path: '/agents' },
      { id: 'desk', label: 'Bot desk', href: '/desk', icon: 'desk', path: '/desk' },
      { id: 'data', label: 'Data', href: '/agents?section=data', icon: 'data', path: '/agents', section: 'data' },
      { id: 'settings', label: 'Settings', href: '/agents?section=settings', icon: 'settings', path: '/agents', section: 'settings' },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const CREDITS_HREF = '/credits';

/** Pinned characters. Each opens its chat in the village. */
export const PINNED_AGENTS = [
  { id: 'trinity', name: 'Trinity', src: '/tiles/trinity.png' },
  { id: 'kali', name: 'Kali', src: '/tiles/kali.png' },
  { id: 'nimbus', name: 'Nimbus', src: '/tiles/nimbus.png' },
] as const;

export function pinnedHref(agentId: string): string {
  return `/village?agent=${encodeURIComponent(agentId)}`;
}

/** Old addresses that still work. Each shows a short "moving" page and then replaces itself with the new one. */
export const REDIRECTS: { from: string; to: string; label: string }[] = [
  { from: '/atlas', to: '/', label: 'Atlas' },
  { from: '/town', to: '/village?section=village', label: 'Village' },
  { from: '/editor', to: '/code', label: 'Code' },
];

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed || '/';
}

/** The sidebar item for this place, or undefined on pages that are not an entry of their own. */
export function activeItem(pathname: string, section?: string | null): NavItem | undefined {
  const path = normalizePath(pathname);
  const here = NAV_ITEMS.filter((item) => item.path === path || item.within?.includes(path));
  if (here.length <= 1) return here[0];
  const wanted = section || here[0].section;
  return here.find((item) => item.section === wanted) ?? here[0];
}

const OTHER_TITLES: Record<string, string> = {
  '/credits': 'Credits',
  '/preview': 'Review pages',
  '/preview/village': 'Village preview',
  '/preview/bench': 'Bench demo',
  '/preview/habits': 'Habits demo',
  '/preview/stuck': 'Break demo',
  '/preview/style-guide': 'Style guide',
  '/kits/assistant': 'Assistant kit',
  '/kits/browser': 'Browser kit',
  '/kits/sandbox': 'Sandbox kit',
  '/kits/sendkit': 'Send kit',
};

/** Title for the top bar. Never empty. */
export function pageTitle(pathname: string, section?: string | null): string {
  const path = normalizePath(pathname);
  return OTHER_TITLES[path] ?? activeItem(path, section)?.label ?? 'Dawn';
}

/** Every page the static export emits. The smoke test fails when a page appears here but not in out/. */
export const SITE_ROUTES: string[] = [
  '/',
  '/agents',
  '/village',
  '/town',
  '/atlas',
  '/studio',
  '/editor',
  '/code',
  '/code/editor',
  '/projects',
  '/artifacts',
  '/letter',
  '/newsletter',
  '/invoices',
  '/contacts',
  '/cuts',
  '/shows',
  '/research',
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
