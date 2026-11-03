import { startAgentsServer } from '../src/lib/dawn-agents/http.ts';

const email = process.env.DAWN_OWNER_EMAIL?.trim();
const password = process.env.DAWN_OWNER_PASSWORD ?? '';
if (!email || !password) {
  console.error('Set DAWN_OWNER_EMAIL and DAWN_OWNER_PASSWORD. They are not printed.');
  process.exit(1);
}

if (!process.env.DAWN_AGENTS_SECRET) console.error('DAWN_AGENTS_SECRET is unset. Sessions reset when the gateway restarts.');
if (!process.env.DAWN_WORKER_TOKEN) console.error('DAWN_WORKER_TOKEN is unset. Workers cannot connect.');
if (!process.env.DAWN_EDITOR_TOKEN) console.error('DAWN_EDITOR_TOKEN is unset. The editor API is closed.');

const port = Number(process.env.DAWN_AGENTS_PORT || 8787);
const server = await startAgentsServer({
  storePath: process.env.DAWN_AGENTS_STORE || 'data/dawn-agents/store.json',
  ownerEmail: email,
  ownerPassword: password,
  sessionSecret: process.env.DAWN_AGENTS_SECRET || `ephemeral-${process.pid}`,
  workerToken: process.env.DAWN_WORKER_TOKEN || '',
  editorToken: process.env.DAWN_EDITOR_TOKEN || '',
  spendCapUsd: process.env.DAWN_SPEND_CAP_USD ? Number(process.env.DAWN_SPEND_CAP_USD) : 20,
  host: process.env.DAWN_AGENTS_HOST || '0.0.0.0',
  port,
  schedule: true,
});

const keys = [
  ['Gemini', Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)],
  ['xAI', Boolean(process.env.XAI_API_KEY)],
  ['OpenRouter', Boolean(process.env.OPENROUTER_API_KEY)],
];
console.log(`Dawn Agents gateway on ${server.url}`);
for (const [name, present] of keys) console.log(`${name} key: ${present ? 'set' : 'missing'}`);
