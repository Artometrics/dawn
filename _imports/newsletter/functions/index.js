import { setGlobalOptions } from 'firebase-functions/v2';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { handleApi } from './src/app.js';
import { GEMINI_API_KEY, RESEND_API_KEY } from './src/secrets.js';
import { processDueIssues } from './src/send.js';

setGlobalOptions({ region: 'us-west1', maxInstances: 10 });

export const api = onRequest(
  {
    region: 'us-west1',
    secrets: [RESEND_API_KEY, GEMINI_API_KEY],
    invoker: 'public',
    timeoutSeconds: 300,
    memory: '256MiB',
    cors: false,
  },
  handleApi,
);

export const processScheduled = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'us-west1',
    timeZone: 'America/Los_Angeles',
    secrets: [RESEND_API_KEY],
    timeoutSeconds: 300,
    memory: '256MiB',
  },
  async () => {
    await processDueIssues();
  },
);
