export interface Theme {
  id: string
  label: string
  /** Major arcana number that carries the theme in our connection map. */
  cardNumber: number
  blurb: string
}

export const THEMES: Theme[] = [
  { id: 'love', label: 'Love', cardNumber: 6, blurb: 'Choosing, closeness and what we cherish.' },
  { id: 'home', label: 'Home', cardNumber: 3, blurb: 'Shelter, nourishment and belonging.' },
  { id: 'wonder', label: 'Wonder', cardNumber: 17, blurb: 'Open-mouthed awe and quiet hope.' },
  { id: 'courage', label: 'Courage', cardNumber: 8, blurb: 'Soft strength and brave small steps.' },
  { id: 'change', label: 'Change', cardNumber: 10, blurb: 'Cycles, turns and new weather.' },
  { id: 'mystery', label: 'Mystery', cardNumber: 2, blurb: 'Things half-seen and worth the wondering.' },
  { id: 'craft', label: 'Craft', cardNumber: 1, blurb: 'Skill, tools and making something real.' },
  { id: 'rest', label: 'Rest', cardNumber: 9, blurb: 'Lantern-lit solitude and slow time.' },
  { id: 'joy', label: 'Joy', cardNumber: 19, blurb: 'Plain, unembarrassed gladness.' },
  { id: 'truth', label: 'Truth', cardNumber: 11, blurb: 'Fairness, clarity and honest accounts.' },
  { id: 'growth', label: 'Growth', cardNumber: 0, blurb: 'Leaps, beginnings and learning by doing.' },
  { id: 'memory', label: 'Memory', cardNumber: 20, blurb: 'Calls from the past and what we carry.' },
]

export const themeById = (id?: string): Theme | undefined => THEMES.find((t) => t.id === id)
