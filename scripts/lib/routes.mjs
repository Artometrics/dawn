// Every page the static export emits, with the shared-shell family it belongs to.
export const ROUTES = [
  { path: '/', name: 'home', title: 'Atlas home' },
  { path: '/agents', name: 'agents', title: 'Agents drawer' },
  { path: '/village', name: 'village', title: 'Village' },
  { path: '/town', name: 'town', title: 'Dawn Town (8-bit map)' },
  { path: '/atlas', name: 'atlas', title: 'Atlas' },
  { path: '/studio', name: 'studio', title: 'Studio' },
  { path: '/editor', name: 'editor', title: 'Editor (old address)' },
  { path: '/code', name: 'code', title: 'Code hub' },
  { path: '/code/editor', name: 'code-editor', title: 'Editor' },
  { path: '/projects', name: 'projects', title: 'Projects' },
  { path: '/artifacts', name: 'artifacts', title: 'Style recipes' },
  { path: '/letter', name: 'letter', title: 'Letter' },
  { path: '/newsletter', name: 'newsletter', title: 'Newsletter' },
  { path: '/invoices', name: 'invoices', title: 'Invoices' },
  { path: '/contacts', name: 'contacts', title: 'Contacts' },
  { path: '/games', name: 'games', title: 'Games' },
  { path: '/fernbound', name: 'fernbound', title: 'Fernbound' },
  { path: '/aftercare', name: 'aftercare', title: 'Aftercare' },
  { path: '/books', name: 'books', title: 'Books' },
  { path: '/cuts', name: 'cuts', title: 'Cuts' },
  { path: '/shows', name: 'shows', title: 'Shows' },
  { path: '/research', name: 'research', title: 'Research' },
  { path: '/credits', name: 'credits', title: 'Credits' },
  { path: '/desk', name: 'desk', title: 'Bot desk' },
  { path: '/kits', name: 'kits', title: 'Kits' },
  { path: '/kits/assistant', name: 'kits-assistant', title: 'Kit: assistant' },
  { path: '/kits/browser', name: 'kits-browser', title: 'Kit: browser' },
  { path: '/kits/nightcode', name: 'kits-nightcode', title: 'Kit: NightCode' },
  { path: '/kits/sandbox', name: 'kits-sandbox', title: 'Kit: sandbox' },
  { path: '/kits/sendkit', name: 'kits-sendkit', title: 'Kit: send' },
  { path: '/kits/teammates', name: 'kits-teammates', title: 'Kit: teammates' },
  { path: '/preview', name: 'preview', title: 'Preview index' },
  { path: '/preview/village', name: 'preview-village', title: 'Preview: village' },
  { path: '/preview/bench', name: 'preview-bench', title: 'Preview: bench' },
  { path: '/preview/habits', name: 'preview-habits', title: 'Preview: habits' },
  { path: '/preview/stuck', name: 'preview-stuck', title: 'Preview: stuck' },
  { path: '/preview/style-guide', name: 'preview-style-guide', title: 'Preview: style guide' },
];

// Forge, the Character Maker, is a section of /village rather than a page of its own. These are the
// addresses that open it and the village drawing its characters. They share the /village HTML file.
export const FORGE_ROUTES = [
  { path: '/village/?section=characters', name: 'village-characters', title: 'Forge: Character Maker' },
  { path: '/village/?section=village', name: 'village-forge-avatars', title: 'Village with Forge avatars' },
];

// Linked from older notes and tests but not emitted by the export.
export const MISSING_ROUTES = [{ path: '/chats', name: 'chats', title: 'Chats (not built)' }];

export const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
