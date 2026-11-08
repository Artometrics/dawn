/** Dawn Town cast. Original pixel sprites, drawn for this repo. */
export const TOWN_CAST = [
  { id: 'atlas-scout', name: 'Atlas Scout', src: '/sprites/town/atlas-scout.png', file: 'public/sprites/town/atlas-scout.png', href: '/atlas' },
  { id: 'code-mage', name: 'Code Mage', src: '/sprites/town/code-mage.png', file: 'public/sprites/town/code-mage.png', href: '/editor' },
  { id: 'recipe-keeper', name: 'Recipe Keeper', src: '/sprites/town/recipe-keeper.png', file: 'public/sprites/town/recipe-keeper.png', href: '/artifacts' },
  { id: 'letter-carrier', name: 'Letter Carrier', src: '/sprites/town/letter-carrier.png', file: 'public/sprites/town/letter-carrier.png', href: '/letter' },
  { id: 'studio-painter', name: 'Studio Painter', src: '/sprites/town/studio-painter.png', file: 'public/sprites/town/studio-painter.png', href: '/studio' },
  { id: 'agents-desk', name: 'Agents Desk', src: '/sprites/town/agents-desk.png', file: 'public/sprites/town/agents-desk.png', href: '/agents' },
] as const;

export const TOWN_RECENTS = [
  { id: 'morning-briefing', title: 'Morning briefing', href: '/agents' },
  { id: 'deploy-dawn-code', title: 'Deploy Dawn Code', href: '/editor' },
  { id: 'style-board-ideas', title: 'Style board ideas', href: '/agents?section=recipes' },
] as const;
