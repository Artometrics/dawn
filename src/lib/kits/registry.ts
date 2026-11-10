export type KitId = 'teammates' | 'assistant' | 'sandbox' | 'browser' | 'sendkit' | 'nightcode';

export type KitInfo = {
  id: KitId;
  title: string;
  source: string;
  adapted: string;
  replaced: string;
  href: string;
  liveUrl: string;
};

const HOST = 'https://2-29-173-68.sslip.io';

export const KITS: KitInfo[] = [
  {
    id: 'teammates',
    title: 'AI Teammates',
    source: 'code-with-antonio/ai-teammates lib/sandbox-tools.ts and lib/handoff-tool.ts',
    adapted: 'File, memory, and handoff tools inside a child process whose working directory is a jail.',
    replaced: 'Daytona desktop, Trigger.dev, Neon, and Clerk. No screenshot tool and no model call.',
    href: '/kits/teammates',
    liveUrl: `${HOST}/kits/teammates`,
  },
  {
    id: 'assistant',
    title: 'Personal assistant',
    source: 'code-with-antonio/ai-personal-assistant src/trigger/channel-messages.ts',
    adapted: 'A local inbox stores the incoming line and a reply draft.',
    replaced: 'Telegram, Linq iMessage, Firecrawl, Daytona, and Trigger.dev. The draft is not delivered.',
    href: '/kits/assistant',
    liveUrl: `${HOST}/kits/assistant`,
  },
  {
    id: 'sandbox',
    title: 'Sandbox game',
    source: 'code-with-antonio/sandbox lib/games/tools.ts path rules and ask_player',
    adapted: 'One design question, then a seeded HTML file written only inside the game directory.',
    replaced: 'Anthropic, Daytona, Trigger.dev, and Clerk. This is not a generated 3D game.',
    href: '/kits/sandbox',
    liveUrl: `${HOST}/kits/sandbox`,
  },
  {
    id: 'browser',
    title: 'Browser workflows',
    source: 'code-with-antonio/browser-automation-app features/workflows/nodes open-url, act, and extract',
    adapted: 'Chrome opens a page this process serves, clicks, and reads the DOM.',
    replaced: 'Browserbase, Liveblocks, Trigger.dev, and Resend. Private addresses are refused.',
    href: '/kits/browser',
    liveUrl: `${HOST}/kits/browser`,
  },
  {
    id: 'sendkit',
    title: 'SendKit',
    source: 'code-with-antonio/sendkit packages/core/src/schemas.ts message shape',
    adapted: 'A draft records chat id and text and stops.',
    replaced: 'The Telegram fetch that puts a bot token in the URL. Nothing is sent.',
    href: '/kits/sendkit',
    liveUrl: `${HOST}/kits/sendkit`,
  },
  {
    id: 'nightcode',
    title: 'NightCode',
    source: 'code-with-antonio/nightcode packages/server/src/routes/chat.ts and packages/cli/src/lib/local-tools.ts',
    adapted: 'A session chat stores turns in SQLite and runs plan or build tools in a child process.',
    replaced: 'Clerk, Neon, Prisma, and Polar. Gemini stays off until a spend cap is set. Bash stays off.',
    href: '/kits/nightcode',
    liveUrl: `${HOST}/kits/nightcode`,
  },
];

export function kitById(id: string): KitInfo | undefined {
  return KITS.find((kit) => kit.id === id);
}
