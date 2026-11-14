export type TarotCard = {
  id: string
  name: string
  arcana: 'major' | 'minor'
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles'
  number?: number
  upright: string
  reversed: string
  artPrompt: string
}

const majors: Omit<TarotCard, 'arcana'>[] = [
  { id: 'major-0', name: 'The Fool', upright: 'New beginnings, trust, leap of faith', reversed: 'Hesitation, recklessness, holding back', artPrompt: 'The Fool tarot card, soft pink watercolor, young traveler at a cliff edge with a white rose, dreamy pastel mystical art' },
  { id: 'major-1', name: 'The Magician', upright: 'Willpower, skill, manifestation', reversed: 'Manipulation, unused talent', artPrompt: 'The Magician tarot, soft rose light, figure with wand and tools on altar, pastel mystical illustration' },
  { id: 'major-2', name: 'The High Priestess', upright: 'Intuition, mystery, inner knowing', reversed: 'Secrets, disconnection from self', artPrompt: 'High Priestess tarot, moon veil, soft pink and indigo watercolor, serene mystical woman' },
  { id: 'major-3', name: 'The Empress', upright: 'Nurture, abundance, creativity', reversed: 'Smothering, creative block', artPrompt: 'The Empress tarot, blooming garden, soft peach and rose palette, nurturing goddess illustration' },
  { id: 'major-4', name: 'The Emperor', upright: 'Structure, protection, authority', reversed: 'Rigidity, control issues', artPrompt: 'The Emperor tarot, gentle stone throne, soft dusk pink sky, protective masculine figure' },
  { id: 'major-5', name: 'The Hierophant', upright: 'Tradition, guidance, shared belief', reversed: 'Dogma, rebellion', artPrompt: 'Hierophant tarot, soft temple light, pastel rose columns, wise teacher illustration' },
  { id: 'major-6', name: 'The Lovers', upright: 'Union, values, meaningful choice', reversed: 'Misalignment, indecision', artPrompt: 'The Lovers tarot, two figures under soft pink sky, garden of roses, romantic mystical art' },
  { id: 'major-7', name: 'The Chariot', upright: 'Drive, direction, victory', reversed: 'Scattered energy, aggression', artPrompt: 'The Chariot tarot, soft metallic chariot with roses, pastel sunrise, determined rider' },
  { id: 'major-8', name: 'Strength', upright: 'Courage, soft power, compassion', reversed: 'Self-doubt, forcefulness', artPrompt: 'Strength tarot, gentle figure with lion, soft pink flowers, tender courage watercolor' },
  { id: 'major-9', name: 'The Hermit', upright: 'Solitude, insight, inner lantern', reversed: 'Isolation, withdrawal', artPrompt: 'The Hermit tarot, lantern glow in mist, soft mauve mountains, contemplative figure' },
  { id: 'major-10', name: 'Wheel of Fortune', upright: 'Cycles, turning point, destiny', reversed: 'Resistance to change', artPrompt: 'Wheel of Fortune tarot, ornate pastel wheel with roses, soft cosmic pink sky' },
  { id: 'major-11', name: 'Justice', upright: 'Truth, balance, accountability', reversed: 'Bias, avoidance', artPrompt: 'Justice tarot, delicate scales and sword, soft rose marble, fair mystical illustration' },
  { id: 'major-12', name: 'The Hanged One', upright: 'Surrender, new perspective', reversed: 'Stalling, martyrdom', artPrompt: 'Hanged One tarot, figure suspended in soft pink mist, serene surrender watercolor' },
  { id: 'major-13', name: 'Death', upright: 'Transformation, release, endings', reversed: 'Clinging, fear of change', artPrompt: 'Death tarot, gentle twilight transformation, rose petals and pale horse, soft mystical art' },
  { id: 'major-14', name: 'Temperance', upright: 'Balance, patience, alchemy', reversed: 'Excess, imbalance', artPrompt: 'Temperance tarot, angel pouring light between cups, soft peach and rose watercolor' },
  { id: 'major-15', name: 'The Devil', upright: 'Attachment, shadow, desire', reversed: 'Release, reclaiming power', artPrompt: 'The Devil tarot, soft shadow chains of roses, introspective pastel mystical art not horror' },
  { id: 'major-16', name: 'The Tower', upright: 'Sudden truth, breakthrough', reversed: 'Delayed upheaval, fear', artPrompt: 'The Tower tarot, soft lightning over rose stone tower, transformative pastel night sky' },
  { id: 'major-17', name: 'The Star', upright: 'Hope, healing, quiet faith', reversed: 'Discouragement, fatigue', artPrompt: 'The Star tarot, kneeling figure under pink starlight by water, hopeful watercolor' },
  { id: 'major-18', name: 'The Moon', upright: 'Dreams, intuition, uncertainty', reversed: 'Clarity emerging from confusion', artPrompt: 'The Moon tarot, twin pillars, soft rose moon path over water, dreamy mystical art' },
  { id: 'major-19', name: 'The Sun', upright: 'Joy, vitality, clarity', reversed: 'Temporary clouds, overconfidence', artPrompt: 'The Sun tarot, radiant soft gold and pink sun, joyful child with sunflowers watercolor' },
  { id: 'major-20', name: 'Judgement', upright: 'Awakening, calling, renewal', reversed: 'Self-criticism, delay', artPrompt: 'Judgement tarot, soft trumpet light, rising figures in rose mist, awakening illustration' },
  { id: 'major-21', name: 'The World', upright: 'Completion, wholeness, integration', reversed: 'Almost there, unfinished cycle', artPrompt: 'The World tarot, dancer in a wreath of roses, soft pastel cosmos, completion art' },
]

const suitMeanings: Record<string, { upright: string; reversed: string }> = {
  wands: { upright: 'energy, passion, initiative', reversed: 'delays, burnout, scattered fire' },
  cups: { upright: 'feeling, connection, intuition', reversed: 'emotional fog, withdrawal' },
  swords: { upright: 'thought, truth, clarity', reversed: 'overthinking, harsh words' },
  pentacles: { upright: 'body, work, material care', reversed: 'insecurity, neglect of foundations' },
}

const ranks = [
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Page', 'Knight', 'Queen', 'King',
]

function minorDeck(): TarotCard[] {
  const suits: Array<TarotCard['suit']> = ['wands', 'cups', 'swords', 'pentacles']
  const cards: TarotCard[] = []
  for (const suit of suits) {
    ranks.forEach((rank, index) => {
      const meaning = suitMeanings[suit!]
      cards.push({
        id: `${suit}-${index + 1}`,
        name: `${rank} of ${suit![0].toUpperCase()}${suit!.slice(1)}`,
        arcana: 'minor',
        suit,
        number: index + 1,
        upright: `${rank} energy of ${meaning.upright}`,
        reversed: `${rank} shadow of ${meaning.reversed}`,
        artPrompt: `${rank} of ${suit} tarot card, soft pink pastel mystical watercolor, rose-gold accents, dreamy Aftercare style illustration`,
      })
    })
  }
  return cards
}

export const TAROT_DECK: TarotCard[] = [
  ...majors.map((c) => ({ ...c, arcana: 'major' as const })),
  ...minorDeck(),
]

export function getCardById(id: string) {
  return TAROT_DECK.find((c) => c.id === id)
}

export function shuffleDeck(seed = Date.now()) {
  const deck = [...TAROT_DECK]
  let s = seed
  for (let i = deck.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296
    const j = s % (i + 1)
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export type SpreadType = 'single' | 'three'

export function drawSpread(type: SpreadType, seed = Date.now()) {
  const deck = shuffleDeck(seed)
  const positions =
    type === 'single'
      ? ['Present']
      : ['Past', 'Present', 'Future']
  return positions.map((position, i) => {
    const card = deck[i]
    const reversed = ((seed >> i) & 1) === 1
    return { card, reversed, position }
  })
}
