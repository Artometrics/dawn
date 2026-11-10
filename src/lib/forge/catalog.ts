export const HEIGHT_RANGE = { min: 0, max: 1 } as const;
export const BUILD_RANGE = { min: 0, max: 1 } as const;
export const NAME_MAX = 48;
export const EPITHET_MAX = 64;
export const ROSTER_MAX = 12;
export const FILE_MAX_BYTES = 64 * 1024;

export const AGENT_SLOTS = ['trinity', 'kali', 'nimbus'] as const;
export type AgentSlot = (typeof AGENT_SLOTS)[number];
