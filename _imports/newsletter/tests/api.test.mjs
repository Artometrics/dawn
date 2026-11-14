import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

process.env.NEWSLETTER_DRY_RUN = '1';
process.env.NEWSLETTER_DISABLE_GEMINI = '1';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'newsletter-510519';
process.env.PUBLIC_BASE_URL = 'http://127.0.0.1:43123';

const outbound = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  const target = String(url);
  if (target.includes('api.resend.com') || target.includes('generativelanguage.googleapis.com')) {
    outbound.push(target);
    throw new Error(`Refusing outbound call during tests: ${target}`);
  }
  return originalFetch(url, options);
};

const { handleApi } = await import('../functions/src/app.js');
const { db } = await import('../functions/src/store.js');

const server = createServer(handleApi);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const api = `http://127.0.0.1:${port}/api`;
process.env.PUBLIC_API_BASE = api;

async function clearCollections() {
  for (const name of ['subscribers', 'issues', 'events', 'dryRuns', 'sends', 'slugs', 'rateLimits']) {
    const snap = await db.collection(name).get();
    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    if (!snap.empty) await batch.commit();
  }
}

async function tokenFor(email) {
  const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assert.ok(host, 'FIREBASE_AUTH_EMULATOR_HOST is required');
  const signUp = await originalFetch(
    `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({
        email,
        password: 'test-password-123',
        emailVerified: true,
        returnSecureToken: true,
      }),
    },
  );
  let data = await signUp.json();
  if (!data.localId && data.error?.message !== 'EMAIL_EXISTS') {
    throw new Error(`Auth emulator signup failed: ${JSON.stringify(data)}`);
  }
  if (!data.idToken) {
    const signIn = await originalFetch(
      `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'test-password-123', returnSecureToken: true }),
      },
    );
    data = await signIn.json();
  }
  if (data.localId) {
    await originalFetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:update?key=demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ localId: data.localId, emailVerified: true }),
    });
    const again = await originalFetch(
      `http://${host}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'test-password-123', returnSecureToken: true }),
      },
    );
    data = await again.json();
  }
  assert.ok(data.idToken, JSON.stringify(data));
  return data.idToken;
}

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await originalFetch(`${api}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    redirect: 'manual',
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text, headers: response.headers };
}

function mcpRequest(child, message) {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function readMcp(child, id) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => {
      child.stdout.off('data', onData);
      reject(new Error(`MCP timed out waiting for ${id}: ${buffer.slice(0, 400)}`));
    }, 8000);
    const onData = (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        if (message.id === id) {
          clearTimeout(timer);
          child.stdout.off('data', onData);
          resolve(message);
        }
      }
    };
    child.stdout.on('data', onData);
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`MCP exited ${code}`));
    });
  });
}

test('health is dry-run and does not require a key', async () => {
  const health = await request('/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.transport, 'dry-run');
  assert.equal(health.json.gemini, 'off');
  assert.equal(health.json.projectId, 'newsletter-510519');
  assert.equal(health.json.addressIsPlaceholder, true);
  assert.match(health.json.address.join('\n'), /548 Market Street/);
});

test('signup, confirm, send, track, and one-click unsubscribe never call Resend', async () => {
  await clearCollections();
  const admin = await tokenFor('team@artometrics.com');
  const stranger = await tokenFor('stranger@example.com');

  const denied = await request('/subscribers/count', { token: stranger });
  assert.equal(denied.status, 403);
  const missing = await request('/issues', { method: 'POST', body: { title: 'Nope' } });
  assert.equal(missing.status, 401);

  const bad = await request('/subscribe', { method: 'POST', body: { email: 'ada@example.com', consent: false } });
  assert.equal(bad.status, 400);
  assert.equal(bad.json.error.code, 'consent_required');

  const joined = await request('/subscribe', {
    method: 'POST',
    body: { email: 'Ada@Example.com', consent: true, website: '' },
  });
  assert.equal(joined.status, 200);
  const honeypot = await request('/subscribe', {
    method: 'POST',
    body: { email: 'bot@example.com', consent: true, website: 'http://spam.test' },
  });
  assert.equal(honeypot.status, 200);

  const subscriber = await db.collection('subscribers').doc(
    (await import('../functions/src/tokens.js')).subscriberId('ada@example.com'),
  ).get();
  assert.equal(subscriber.data().status, 'pending');
  assert.equal(subscriber.data().email, 'ada@example.com');
  assert.equal(subscriber.data().consentText.includes('unsubscribe'), true);
  assert.ok(subscriber.data().consentAt);

  const logs = await db.collection('dryRuns').get();
  const confirmLog = logs.docs.map((doc) => doc.data()).find((row) => row.kind === 'confirm');
  assert.ok(confirmLog);
  assert.match(confirmLog.html, /548 Market Street/);
  assert.match(confirmLog.headers['List-Unsubscribe'], /unsubscribe\?token=/);
  assert.equal(confirmLog.headers['List-Unsubscribe-Post'], 'List-Unsubscribe=One-Click');
  assert.equal(confirmLog.to, 'ada@example.com');
  const confirmToken = /confirm\?token=([^"&\s]+)/.exec(confirmLog.html)[1];

  const empty = await request('/issues', {
    method: 'POST',
    token: admin,
    body: { title: 'Nobody', subject: 'Nobody', bodyMarkdown: 'No list.' },
  });
  const emptySend = await request(`/issues/${empty.json.issue.id}/send`, { method: 'POST', token: admin });
  assert.equal(emptySend.status, 409);

  const confirmed = await request(`/confirm?token=${confirmToken}`);
  assert.equal(confirmed.status, 200);
  assert.equal(confirmed.json.status, 'confirmed');
  const again = await request(`/confirm?token=${confirmToken}`);
  assert.equal(again.json.status, 'confirmed');

  const blocked = await request('/draft', {
    method: 'POST',
    token: admin,
    body: { url: 'http://169.254.169.254/latest/meta-data' },
  });
  assert.equal(blocked.status, 400);
  assert.equal(blocked.json.error.code, 'blocked_url');

  const drafted = await request('/draft', {
    method: 'POST',
    token: admin,
    body: { notes: 'The press check ran long.\n\nThe blue is #0047FF.', save: false },
  });
  assert.equal(drafted.status, 200);
  assert.equal(drafted.json.draft.generator, 'local-fallback');
  assert.match(drafted.json.draft.bodyMarkdown, /press check/);

  const created = await request('/issues', {
    method: 'POST',
    token: admin,
    body: {
      title: 'Press check',
      subject: 'Press check',
      preheader: 'The blue stayed put.',
      dek: 'A letter about the sheet.',
      bodyMarkdown: 'The sheet came off the press.\n\nSee [the studio](https://artometrics.com).',
    },
  });
  assert.equal(created.status, 201);
  const issueId = created.json.issue.id;

  const second = await request('/subscribe', {
    method: 'POST',
    body: { email: 'bea@example.com', consent: true },
  });
  assert.equal(second.status, 200);
  const beaLog = (await db.collection('dryRuns').get()).docs
    .map((doc) => doc.data())
    .find((row) => row.to === 'bea@example.com');
  const beaToken = /confirm\?token=([^"&\s]+)/.exec(beaLog.html)[1];
  await request(`/confirm?token=${beaToken}`);
  const beaUnsub = /unsubscribed\?token=([^"&\s]+)/.exec(beaLog.html)[1];
  const left = await request(`/unsubscribe?token=${encodeURIComponent(beaUnsub)}`, {
    method: 'POST',
    body: 'List-Unsubscribe=One-Click',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  assert.equal(left.status, 200);
  assert.equal(left.json.status, 'unsubscribed');

  const sent = await request(`/issues/${issueId}/send`, { method: 'POST', token: admin });
  assert.equal(sent.status, 200);
  assert.equal(sent.json.transport, 'dry-run');
  assert.equal(sent.json.sent, 1);
  assert.equal(sent.json.status, 'sent');

  const issueMail = (await db.collection('dryRuns').get()).docs
    .map((doc) => doc.data())
    .filter((row) => row.kind === 'issue');
  assert.equal(issueMail.length, 1);
  assert.equal(issueMail[0].to, 'ada@example.com');
  assert.match(issueMail[0].html, /548 Market Street/);
  assert.match(issueMail[0].headers['List-Unsubscribe'], /unsubscribe\?token=/);
  const openToken = /track\/open\/([^"\s]+)/.exec(issueMail[0].html)[1];
  const click = /track\/click\/([^"?]+)\?u=([^"\s]+)/.exec(issueMail[0].html);
  assert.ok(click);

  const pixel = await request(`/track/open/${openToken}`);
  assert.equal(pixel.status, 200);
  assert.match(pixel.headers.get('content-type'), /image\/gif/);
  await request(`/track/open/${openToken}`);
  const hop = await request(`/track/click/${click[1]}?u=${click[2]}`);
  assert.equal(hop.status, 302);
  assert.equal(hop.headers.get('location'), 'https://artometrics.com/');

  const stats = await request(`/stats/${issueId}`, { token: admin });
  assert.equal(stats.json.issue.stats.opens, 2);
  assert.equal(stats.json.issue.stats.uniqueOpens, 1);
  assert.equal(stats.json.issue.stats.clicks, 1);
  assert.equal(stats.json.issue.stats.uniqueClicks, 1);
  assert.equal(stats.json.subscribers.confirmed, 1);
  assert.equal(stats.json.subscribers.unsubscribed, 1);

  const adaUnsub = /unsubscribed\?token=([^"&\s]+)/.exec(issueMail[0].html)[1];
  const adaLeft = await request(`/unsubscribe?token=${adaUnsub}`);
  assert.equal(adaLeft.status, 200);

  const future = await request('/issues', {
    method: 'POST',
    token: admin,
    body: { title: 'Later', subject: 'Later', bodyMarkdown: 'Not yet.' },
  });
  const when = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const scheduled = await request(`/issues/${future.json.issue.id}/schedule`, {
    method: 'POST',
    token: admin,
    body: { scheduledAt: when },
  });
  assert.equal(scheduled.json.issue.status, 'scheduled');
  const processed = await request('/scheduled/process', { method: 'POST', token: admin });
  assert.equal(processed.status, 200);
  assert.equal(processed.json.results.length, 0);

  const count = await request('/subscribers/count', { token: admin });
  assert.equal(count.json.confirmed, 0);
  assert.equal(count.json.unsubscribed, 2);

  const child = spawn('node', ['mcp/server.js'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, NEWSLETTER_API_BASE: api, NEWSLETTER_ID_TOKEN: admin },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  let mcpError = '';
  child.stderr.on('data', (chunk) => {
    mcpError += chunk.toString();
  });
  try {
    const ready = readMcp(child, 1);
    mcpRequest(child, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });
    await ready;
    mcpRequest(child, { jsonrpc: '2.0', method: 'notifications/initialized' });
    const pending = readMcp(child, 2);
    mcpRequest(child, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'subscriber_count', arguments: {} },
    });
    const reply = await pending;
    assert.equal(reply.error, undefined, mcpError);
    const payload = JSON.parse(reply.result.content[0].text);
    assert.equal(payload.unsubscribed, 2);
  } finally {
    child.kill();
  }

  assert.equal(outbound.length, 0, outbound.join(','));
});

test('a past schedule sends on the processor and still does not mail', async () => {
  await clearCollections();
  const admin = await tokenFor('kylesmcauliffe@gmail.com');
  await request('/subscribe', { method: 'POST', body: { email: 'cy@example.com', consent: true } });
  const log = (await db.collection('dryRuns').get()).docs[0].data();
  const confirmToken = /confirm\?token=([^"&\s]+)/.exec(log.html)[1];
  await request(`/confirm?token=${confirmToken}`);
  const created = await request('/issues', {
    method: 'POST',
    token: admin,
    body: { title: 'Due', subject: 'Due', bodyMarkdown: 'Send me.' },
  });
  await request(`/issues/${created.json.issue.id}/schedule`, {
    method: 'POST',
    token: admin,
    body: { scheduledAt: new Date(Date.now() - 60_000).toISOString() },
  });
  const processed = await request('/scheduled/process', { method: 'POST', token: admin });
  assert.equal(processed.json.results[0].status, 'sent');
  assert.equal(processed.json.results[0].transport, 'dry-run');
  assert.equal(outbound.length, 0);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});
