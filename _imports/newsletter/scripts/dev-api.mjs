process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8181';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'newsletter-510519';
process.env.NEWSLETTER_DRY_RUN = '1';
process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:43123';
process.env.PUBLIC_API_BASE = process.env.PUBLIC_API_BASE || 'http://127.0.0.1:5291/api';

const { createServer } = await import('node:http');
const { handleApi } = await import('../functions/src/app.js');

const server = createServer((req, res) => {
  handleApi(req, res);
});

server.listen(5291, '127.0.0.1', () => {
  console.log('Artometrics API http://127.0.0.1:5291/api/health (dry-run, no mail)');
});
