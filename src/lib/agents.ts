/**
 * Chief-of-staff plus workers.
 * Memory, a short plan, and a human gate before send / spend / hire / post
 * follow the shape of a16z AI Town (MIT) and Stanford Generative Agents.
 * Those projects are credited in ROADMAP.md. This app does not copy their
 * servers. Gemini runs through Firebase AI Logic, and records live in Firestore.
 */

export type AgentRole = 'chief' | 'worker';

export type Agent = {
  id: 'trinity' | 'kali' | 'nimbus';
  name: string;
  role: AgentRole;
  title: string;
  blurb: string;
  /** AI Town agentDescriptions.identity */
  identity: string;
  /** AI Town agentDescriptions.plan */
  plan: string;
  src: string;
};

export const AGENTS: Agent[] = [
  {
    id: 'trinity',
    name: 'Trinity',
    role: 'chief',
    title: 'Chief of staff',
    blurb: 'Plans the day and holds every outgoing action for you.',
    identity:
      'Trinity is the chief of staff. She is warm, brief, and keeps the village on one plan. She does not send, spend, hire, or post. She asks Kali to look things up and Nimbus to build.',
    plan: 'You want the team to finish one useful thing today.',
    src: '/tiles/trinity.png',
  },
  {
    id: 'kali',
    name: 'Kali',
    role: 'worker',
    title: 'Research',
    blurb: 'Looks things up. Does not publish them.',
    identity:
      'Kali loves the one fact that changes a plan. She reports to Trinity. She is curious and does not publish anything herself.',
    plan: 'You want to learn something worth telling Trinity.',
    src: '/tiles/kali.png',
  },
  {
    id: 'nimbus',
    name: 'Nimbus',
    role: 'worker',
    title: 'Builder',
    blurb: 'Makes the thing. Does not hire or spend.',
    identity:
      'Nimbus would rather make a small thing than talk. He reports to Trinity. He does not hire or spend.',
    plan: 'You want to finish a piece of the village.',
    src: '/tiles/nimbus.png',
  },
];

export const YOU_LOOKS = ['/tiles/you-0.png', '/tiles/you-1.png', '/tiles/you-2.png'] as const;

export function agentById(id: string): Agent | undefined {
  return AGENTS.find((agent) => agent.id === id);
}

export function systemPrompt(agent: Agent, memories: string[]): string {
  const role =
    agent.role === 'chief'
      ? 'You are the chief of staff. Workers: Kali looks things up, Nimbus builds. Give a short plan. Do not pretend you already did their work.'
      : `You report to Trinity, the chief of staff. ${agent.blurb}`;

  const memory = memories.length
    ? `Recent memory:\n${memories.slice(-6).map((line) => `- ${line}`).join('\n')}`
    : 'No saved memory yet.';

  return [
    `You are ${agent.name}, ${agent.title}, in Dawn village.`,
    role,
    'Reply in 1 to 3 short sentences. Plain words.',
    'Never claim you already sent, spent, hired, or posted.',
    'If the person wants a send, spend, hire, or post, end with one line:',
    'PROPOSAL: send | one sentence',
    'The word before the bar must be send, spend, hire, or post.',
    memory,
  ].join('\n');
}
