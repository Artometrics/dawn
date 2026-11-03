export type AgentSprite = {
  id: string;
  name: string;
  src: string;
  file: string;
  artist: string;
  sourceUrl: string;
  license: string;
  /** Frame index on the 12-column Tiny Dungeon sheet. */
  frame: number;
};

const KENNEY = {
  artist: 'Kenney',
  sourceUrl: 'https://kenney.nl/assets/tiny-dungeon',
  license: 'CC0-1.0',
};

export const AGENT_SPRITES: AgentSprite[] = [
  { id: 'sage', name: 'Sage', src: '/sprites/agents/sage.png', file: 'public/sprites/agents/sage.png', frame: 84, ...KENNEY },
  { id: 'scout', name: 'Scout', src: '/sprites/agents/scout.png', file: 'public/sprites/agents/scout.png', frame: 85, ...KENNEY },
  { id: 'smith', name: 'Smith', src: '/sprites/agents/smith.png', file: 'public/sprites/agents/smith.png', frame: 86, ...KENNEY },
  { id: 'warden', name: 'Warden', src: '/sprites/agents/warden.png', file: 'public/sprites/agents/warden.png', frame: 87, ...KENNEY },
  { id: 'ranger', name: 'Ranger', src: '/sprites/agents/ranger.png', file: 'public/sprites/agents/ranger.png', frame: 88, ...KENNEY },
  { id: 'plate', name: 'Plate', src: '/sprites/agents/plate.png', file: 'public/sprites/agents/plate.png', frame: 96, ...KENNEY },
  { id: 'helm', name: 'Helm', src: '/sprites/agents/helm.png', file: 'public/sprites/agents/helm.png', frame: 97, ...KENNEY },
  { id: 'ember', name: 'Ember', src: '/sprites/agents/ember.png', file: 'public/sprites/agents/ember.png', frame: 98, ...KENNEY },
  { id: 'violet', name: 'Violet', src: '/sprites/agents/violet.png', file: 'public/sprites/agents/violet.png', frame: 99, ...KENNEY },
  { id: 'elder', name: 'Elder', src: '/sprites/agents/elder.png', file: 'public/sprites/agents/elder.png', frame: 100, ...KENNEY },
  { id: 'bard', name: 'Bard', src: '/sprites/agents/bard.png', file: 'public/sprites/agents/bard.png', frame: 111, ...KENNEY },
  { id: 'mason', name: 'Mason', src: '/sprites/agents/mason.png', file: 'public/sprites/agents/mason.png', frame: 112, ...KENNEY },
];

export function spriteById(id: string): AgentSprite | undefined {
  return AGENT_SPRITES.find((sprite) => sprite.id === id);
}

export function defaultSpriteId(seed = 'dawn'): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return AGENT_SPRITES[hash % AGENT_SPRITES.length].id;
}
