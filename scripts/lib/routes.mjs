// Every page the static export emits, with the shared-shell family it belongs to.
export const ROUTES = [
  { path: '/', name: 'home', title: 'Town map' },
  { path: '/agents', name: 'agents', title: 'Agents drawer' },
  { path: '/village', name: 'village', title: 'Village' },
  { path: '/atlas', name: 'atlas', title: 'Atlas' },
  { path: '/studio', name: 'studio', title: 'Studio' },
  { path: '/editor', name: 'editor', title: 'Code editor' },
  { path: '/projects', name: 'projects', title: 'Projects' },
  { path: '/artifacts', name: 'artifacts', title: 'Style recipes' },
  { path: '/letter', name: 'letter', title: 'Letter' },
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

// Linked from older notes and tests but not emitted by the export.
export const MISSING_ROUTES = [{ path: '/chats', name: 'chats', title: 'Chats (not built)' }];

export const WIDTHS = [
  { w: 1440, h: 900 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
