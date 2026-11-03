import { mkdirSync } from 'node:fs';
import { createGateway } from './server.ts';
import { redact } from '../shared/redact.ts';

const token = process.env.DAWN_CODE_TOKEN ?? '';
if (!token) {
  process.stderr.write('DAWN_CODE_TOKEN is required. Refusing to start an open gateway.\n');
  process.exit(1);
}

const dataDir = process.env.DAWN_CODE_DATA || '/var/lib/dawn-code';
mkdirSync(dataDir, { recursive: true });

const port = Number(process.env.DAWN_CODE_PORT || 8791);
const host = process.env.DAWN_CODE_HOST || '127.0.0.1';
const cap = process.env.DAWN_SPEND_CAP_USD ? Number(process.env.DAWN_SPEND_CAP_USD) : 20;

const server = createGateway({
  token,
  dataDir,
  capUsd: Number.isFinite(cap) ? cap : 20,
  mock: process.env.DAWN_CODE_MOCK === '1',
  mockDelayMs: Number(process.env.DAWN_CODE_MOCK_DELAY_MS || 16),
  agentsUrl: process.env.DAWN_AGENTS_URL || 'http://127.0.0.1:8787',
  editorToken: process.env.DAWN_EDITOR_TOKEN || '',
  trainingLogUrl:
    process.env.DAWN_TRAINING_LOG_URL ||
    `${(process.env.DAWN_AGENTS_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')}/api/v1/training-log`,
  trainingToken: process.env.DAWN_TRAINING_LOG_TOKEN || process.env.DAWN_EDITOR_TOKEN || '',
});

server.listen(port, host, () => {
  process.stderr.write(`dawn-code gateway listening on http://${host}:${port}\n`);
});

server.on('error', (error) => {
  process.stderr.write(`${redact(error.message)}\n`);
  process.exit(1);
});
