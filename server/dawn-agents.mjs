import { startAgentsServer } from '../src/lib/dawn-agents/http.ts';

const email = (process.env.DAWN_ALLOWED_EMAIL || process.env.DAWN_OWNER_EMAIL || '').trim();
if (!email) {
  console.error('Set DAWN_ALLOWED_EMAIL to the Google accounts that may enter, separated by commas. It is not printed.');
  process.exit(1);
}

if (!process.env.DAWN_WORKER_TOKEN) console.error('DAWN_WORKER_TOKEN is unset. Workers cannot connect.');
if (!process.env.DAWN_EDITOR_TOKEN) console.error('DAWN_EDITOR_TOKEN is unset. The editor API is closed.');
if (process.env.DAWN_ALLOW_LOOPBACK_OWNER === '1') {
  console.error('Loopback without a proxy header is the owner. Do not set this on the public host.');
}

const port = Number(process.env.DAWN_AGENTS_PORT || 8787);
const server = await startAgentsServer({
  storePath: process.env.DAWN_AGENTS_STORE || 'data/dawn-agents/store.json',
  ownerEmail: email,
  allowLoopbackOwner: process.env.DAWN_ALLOW_LOOPBACK_OWNER === '1',
  workerToken: process.env.DAWN_WORKER_TOKEN || '',
  editorToken: process.env.DAWN_EDITOR_TOKEN || '',
  spendCapUsd: process.env.DAWN_SPEND_CAP_USD ? Number(process.env.DAWN_SPEND_CAP_USD) : 20,
  host: process.env.DAWN_AGENTS_HOST || '127.0.0.1',
  trustedOrigins: process.env.DAWN_TRUSTED_ORIGINS
    ? process.env.DAWN_TRUSTED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
    : undefined,
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
