#!/usr/bin/env node
/**
 * Running stays at trail speed on the path. On the 12 wooden stairs and inside
 * the station room it is capped, the walk clip plays, and footstep cadence
 * follows that speed.
 *
 * The first half is the pure speed and stride math. The second half loads the
 * game in headless Chrome: zero console errors, and a real update() tick.
 */
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inStationRoom, inStationWalk } from '../public/station-room.js';
import { confinedRunZone, movePlan, noteStep, onWoodenStairs, stepStride } from '../public/move-speed.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const failures = [];
const lines = [];

function fail(msg) {
  failures.push(msg);
}

function near(actual, expected, eps, label) {
  if (!(Math.abs(actual - expected) <= eps)) fail(`${label}: got ${actual}, expected ${expected}`);
}

function loadMoveTuning(src) {
  const m = src.match(/move:\{([^}]*)\}/);
  if (!m) {
    fail('TUNING.move block missing from public/game.js');
    return null;
  }
  try {
    return Function(`"use strict"; return ({${m[1]}});`)();
  } catch (e) {
    fail(`TUNING.move did not parse: ${e.message}`);
    return null;
  }
}

function loadStairGeom(src) {
  const m = src.match(/const STAIR0=([^,]+),STAIR1=([^,]+),RISE=([^,]+),STAIR_N=([^,]+),STAIR_TREAD=([^;]+);/);
  if (!m) {
    fail('stair geometry constants missing from public/game.js');
    return null;
  }
  return {
    z0: Number(m[1]),
    z1: Number(m[2]),
    rise: Number(m[3]),
    count: Number(m[4]),
    tread: Number(m[5]),
  };
}

function countSteps(speed, frames, dt, runSpeed) {
  const state = { carry: 0 };
  let steps = 0;
  const dist = speed * dt;
  for (let i = 0; i < frames; i++) if (noteStep(state, dist, speed, runSpeed)) steps++;
  return steps;
}

function runUnit(src) {
  const move = loadMoveTuning(src);
  const stairs = loadStairGeom(src);
  if (!move || !stairs) return;
  if (move.walk !== 1.8) fail(`walk speed changed: ${move.walk}`);
  if (move.run !== 4.6) fail(`trail run speed changed: ${move.run}`);
  if (move.confinedRun !== 2.4) fail(`confined run should be 2.4, got ${move.confinedRun}`);
  if (move.stairZPad !== 0.05 || move.stairEdge !== 0.15) fail('stair zone slack changed');
  if (stairs.count !== 12 || stairs.tread !== 3.2 || stairs.z0 !== -62 || stairs.z1 !== -70) fail('stair flight geometry changed');
  if (stairs.tread / 2 + move.stairEdge !== 1.75) fail('stair tread slack no longer matches the old footstep half-width 1.75');
  if (!/battery:false/.test(src)) fail('battery flag is not off');
  if (!src.includes('applyLocomotion(dt)') || !src.includes('noteStep(') || !src.includes('inStationRoom(')) {
    fail('movement no longer goes through applyLocomotion, noteStep, and inStationRoom');
  }
  if (/run\?4\.6:1\.8/.test(src)) fail('speed is still the old inline 4.6/1.8 choice');

  const span = (z, pathX) => ({
    z0: stairs.z0,
    z1: stairs.z1,
    pathX,
    halfWidth: stairs.tread / 2,
    edge: move.stairEdge,
    zPad: move.stairZPad,
  });
  const onFlight = onWoodenStairs(-5, -66, span(-66, -5));
  const beside = onWoodenStairs(-5 + 2.2, -66, span(-66, -5));
  const above = onWoodenStairs(-5, -61, span(-61, -5));
  const edgeOn = onWoodenStairs(-5, stairs.z0 + move.stairZPad, span(stairs.z0, -5));
  const edgeOff = onWoodenStairs(-5, stairs.z0 + move.stairZPad + 0.02, span(stairs.z0, -5));
  if (!onFlight || !edgeOn) fail('stair centre or pad edge was not confined');
  if (beside || above || edgeOff) fail('off-tread or off-flight point was treated as stairs');

  const S = { width: 7, depth: 5, wall: 0.12 };
  const room = inStationRoom(0, 0, S);
  const porchRoom = inStationRoom(0, 3.2, S);
  const porchWalk = inStationWalk(0, 3.2, S);
  if (!room || porchRoom || !porchWalk) fail('inStationRoom / inStationWalk no longer split the room from the porch');
  if (!confinedRunZone(0, -20, { stairs: span(-20, 0), inRoom: true })) fail('station room did not confine a run');
  if (confinedRunZone(0, -20, { stairs: span(-20, 0), inRoom: false })) fail('open trail was confined');

  const full = { mag: 1, runIntent: true, confined: false };
  const capped = { mag: 1, runIntent: true, confined: true };
  const walking = { mag: 1, runIntent: false, confined: true };
  const half = { mag: 0.5, runIntent: true, confined: false };
  const halfCap = { mag: 0.5, runIntent: true, confined: true };
  const still = { mag: 0.05, runIntent: true, confined: false };
  const trail = movePlan(move, full);
  const stairsRun = movePlan(move, capped);
  const roomWalk = movePlan(move, walking);
  if (trail.speed !== 4.6 || trail.clip !== 'run') fail(`trail run plan ${JSON.stringify(trail)}`);
  if (stairsRun.speed !== 2.4 || stairsRun.clip !== 'walk') fail(`capped run plan ${JSON.stringify(stairsRun)}`);
  if (roomWalk.speed !== 1.8 || roomWalk.clip !== 'walk') fail(`walk plan ${JSON.stringify(roomWalk)}`);
  if (movePlan(move, half).speed !== 2.3 || movePlan(move, halfCap).speed !== 1.2) fail('half stick did not scale');
  if (movePlan(move, still).clip !== 'idle' || movePlan(move, still).speed !== 0) fail('a tiny stick still moved');

  const frames = 120;
  const dt = 1 / 60;
  const walkSteps = countSteps(move.walk, frames, dt, move.run);
  const capSteps = countSteps(move.confinedRun, frames, dt, move.run);
  const runSteps = countSteps(move.run, frames, dt, move.run);
  lines.push(`stride walk ${stepStride(move.walk, move.run).toFixed(3)}, cap ${stepStride(move.confinedRun, move.run).toFixed(3)}, run ${stepStride(move.run, move.run).toFixed(3)}`);
  lines.push(`steps over ${frames} frames: walk ${walkSteps}, capped run ${capSteps}, trail run ${runSteps}`);
  if (!(walkSteps < capSteps && capSteps < runSteps)) fail('footstep cadence did not follow walk < capped run < trail run');
  if (stepStride(move.run, move.run) !== 1.35) fail('trail run stride changed');
  if (stepStride(0, move.run) !== 0.72) fail('slow stride floor changed');
}

function mime(path) {
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.woff2': 'font/woff2',
    '.txt': 'text/plain; charset=utf-8',
  }[extname(path)] || 'application/octet-stream';
}

function servePublic() {
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const path = normalize(join(publicDir, rel));
    if (path !== publicDir && !path.startsWith(publicDir + '/')) {
      res.writeHead(403);
      res.end();
      return;
    }
    let body;
    try {
      body = readFileSync(path);
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }
    res.writeHead(200, { 'Content-Type': mime(path), 'Cache-Control': 'no-store' });
    res.end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function waitFor(stream, re, ms) {
  return new Promise((resolve, reject) => {
    let buf = '';
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${re}. output: ${buf.slice(-500)}`)), ms);
    const onData = (chunk) => {
      buf += chunk;
      if (re.test(buf)) {
        clearTimeout(timer);
        stream.off('data', onData);
        resolve(buf);
      }
    };
    stream.on('data', onData);
  });
}

function launchChrome() {
  const dir = mkdtempSync(join(tmpdir(), 'nightlight-chrome-'));
  const proc = spawn('google-chrome', [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
    '--autoplay-policy=no-user-gesture-required',
    '--remote-allow-origins=*',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--window-size=1280,720',
    '--remote-debugging-port=0',
    `--user-data-dir=${dir}`,
    'about:blank',
  ], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  return { proc, dir };
}

async function connectPage(port) {
  let list = null;
  let last = null;
  for (let i = 0; i < 40 && !list; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      list = await res.json();
    } catch (e) {
      last = e.cause || e;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (!list) throw new Error(`devtools list failed on ${port}: ${last}`);
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error(`no page target in ${JSON.stringify(list)}`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('devtools websocket failed')), { once: true });
  });
  let next = 0;
  const pending = new Map();
  const waits = [];
  const errors = [];
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message || 'cdp error'}`));
      else resolve(msg.result);
      return;
    }
    if (!msg.method) return;
    for (let i = waits.length - 1; i >= 0; i--) {
      if (waits[i].method === msg.method) {
        const w = waits.splice(i, 1)[0];
        clearTimeout(w.timer);
        w.resolve(msg.params);
      }
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.unserializableValue ?? a.type).join(' ');
      logs.push(`${msg.params.type}: ${text}`);
      if (msg.params.type === 'error') errors.push(text);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails || {};
      const text = d.exception?.description || d.text || 'exception';
      errors.push(text);
      logs.push(`exception: ${text}`);
    } else if (msg.method === 'Log.entryAdded') {
      const e = msg.params.entry || {};
      logs.push(`${e.level}: ${e.text}`);
      if (e.level === 'error') errors.push(e.text || e.url || 'log error');
    } else if (msg.method === 'Network.responseReceived') {
      const s = msg.params.response?.status;
      if (s >= 400) errors.push(`HTTP ${s} ${msg.params.response.url}`);
    } else if (msg.method === 'Network.loadingFailed') {
      errors.push(`load failed ${msg.params.errorText || ''} ${msg.params.type || ''}`.trim());
    }
  });
  function send(method, params) {
    const id = ++next;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  function once(method, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), ms);
      waits.push({ method, timer, resolve });
    });
  }
  function evaluate(expression, ms = 20000) {
    return Promise.race([
      (async () => {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) {
          const d = result.exceptionDetails;
          throw new Error(d.exception?.description || d.text || 'evaluate failed');
        }
        return result.result?.value;
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('evaluate timed out')), ms)),
    ]);
  }
  return { ws, send, once, evaluate, errors, logs };
}

async function runBrowser(move) {
  const server = await servePublic();
  const port = server.address().port;
  const chrome = launchChrome();
  let chromeLog = '';
  chrome.proc.stderr.on('data', (chunk) => { chromeLog += chunk; });
  let page = null;
  try {
    const heard = await waitFor(chrome.proc.stderr, /DevTools listening on ws:\/\/(?:127\.0\.0\.1|\[::1\]):(\d+)/, 20000);
    const devtoolsPort = Number(heard.match(/DevTools listening on ws:\/\/(?:127\.0\.0\.1|\[::1\]):(\d+)/)[1]);
    page = await connectPage(devtoolsPort);
    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Network.enable');
    const loaded = page.once('Page.loadEventFired', 20000);
    await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
    await loaded;
    let ready = null;
    for (let i = 0; i < 80; i++) {
      ready = await page.evaluate(`(() => {
        const load = document.getElementById('load');
        const g = window.__game;
        return { load: load ? load.textContent : null, clips: g && g.clips, started: g ? g.started : false };
      })()`);
      if (ready && ready.clips && ready.clips.walk && ready.clips.run) break;
      if (ready && ready.load && /failed/i.test(ready.load)) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    lines.push(`load: ${JSON.stringify(ready)}`);
    if (!ready || !ready.clips || !ready.clips.walk || !ready.clips.run) fail('character clips did not load');
    await page.evaluate(`document.getElementById('play').click()`);
    let audio = false;
    for (let i = 0; i < 20; i++) {
      audio = await page.evaluate(`!!(window.__game && window.__game.audio)`);
      if (audio) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    lines.push(`audio: ${audio}`);
    if (!audio) fail('Play did not start the audio context, so footstep cadence could not be heard');
    const visibility = await page.evaluate(`document.visibilityState`);
    const glErrors = await page.evaluate(`window.__game.paintFrames(3)`);
    lines.push(`visibility: ${visibility}; paint gl errors: ${JSON.stringify(glErrors)}`);
    if (!Array.isArray(glErrors) || glErrors.some((code) => code !== 0)) fail(`render reported WebGL errors ${JSON.stringify(glErrors)}`);

    const tuning = await page.evaluate(`window.__game.tuning.move`);
    if (tuning.walk !== move.walk || tuning.run !== move.run || tuning.confinedRun !== move.confinedRun) {
      fail(`page tuning ${JSON.stringify(tuning)} does not match TUNING.move`);
    }
    const spot = async (z, lx, lz) => {
      if (lx != null) return page.evaluate(`window.__game.toWorld(${lx}, ${lz})`);
      const x = await page.evaluate(`window.__game.pathX(${z})`);
      return { x, z };
    };
    const trail = await spot(-2);
    const mid = await spot(-40);
    const stair = await spot(-64);
    const stairTop = await spot(-69.2);
    const beside = { x: stair.x + 2.2, z: stair.z };
    const inside = await spot(null, 0, 0);
    const porch = await spot(null, 0, 3.2);
    const frames = 120;
    const dt = 1 / 60;
    const sample = (place, run, n = 1) => page.evaluate(`window.__game.sampleMove(${JSON.stringify({ x: place.x, z: place.z, run, frames: n, dt })})`);

    const cases = [
      ['trail run', trail, true, move.run, 'run', false],
      ['mid-trail run', mid, true, move.run, 'run', false],
      ['beside stairs run', beside, true, move.run, 'run', false],
      ['porch run', porch, true, move.run, 'run', false],
      ['trail walk', trail, false, move.walk, 'walk', false],
      ['stairs walk', stair, false, move.walk, 'walk', true],
      ['cabin walk', inside, false, move.walk, 'walk', true],
      ['stairs run', stair, true, move.confinedRun, 'walk', true],
      ['top step run', stairTop, true, move.confinedRun, 'walk', true],
      ['cabin run', inside, true, move.confinedRun, 'walk', true],
      ['stairs run toggle', stair, 'toggle', move.confinedRun, 'walk', true],
    ];
    for (const [label, place, run, speed, clip, confined] of cases) {
      const got = await sample(place, run, 1);
      lines.push(`${label}: speed ${got.speed.toFixed(4)} clip ${got.clip} confined ${got.confinedStart} -> ${got.confinedEnd}`);
      near(got.speed, speed, 0.02, label);
      if (got.clip !== clip) fail(`${label} clip ${got.clip}, expected ${clip}`);
      if (!!got.confinedStart !== confined) fail(`${label} confined ${got.confinedStart}, expected ${confined}`);
    }

    const longTrail = await sample(trail, true, frames);
    const longWalk = await sample(trail, false, frames);
    const longStairs = await sample({ x: (await page.evaluate(`window.__game.pathX(-62.4)`)), z: -62.4 }, true, frames);
    const expectRun = countSteps(move.run, frames, dt, move.run);
    const expectWalk = countSteps(move.walk, frames, dt, move.run);
    const expectCap = countSteps(move.confinedRun, frames, dt, move.run);
    lines.push(`cadence trail run speed ${longTrail.speed.toFixed(4)} steps ${longTrail.steps} (formula ${expectRun}), end confined ${longTrail.confinedEnd}`);
    lines.push(`cadence trail walk speed ${longWalk.speed.toFixed(4)} steps ${longWalk.steps} (formula ${expectWalk})`);
    lines.push(`cadence stairs run speed ${longStairs.speed.toFixed(4)} steps ${longStairs.steps} (formula ${expectCap}), end confined ${longStairs.confinedEnd} z ${longStairs.endZ.toFixed(2)}`);
    near(longTrail.speed, move.run, 0.02, 'long trail run');
    near(longWalk.speed, move.walk, 0.02, 'long trail walk');
    near(longStairs.speed, move.confinedRun, 0.02, 'long stairs run');
    if (longStairs.confinedEnd !== true) fail('the stairs run left the flight before the cadence sample ended');
    if (longTrail.steps !== expectRun) fail(`trail run steps ${longTrail.steps}, formula ${expectRun}`);
    if (longWalk.steps !== expectWalk) fail(`trail walk steps ${longWalk.steps}, formula ${expectWalk}`);
    if (longStairs.steps !== expectCap) fail(`stairs run steps ${longStairs.steps}, formula ${expectCap}`);
    if (!(longWalk.steps < longStairs.steps && longStairs.steps < longTrail.steps)) fail('heard cadence was not walk < stairs run < trail run');

    const player = await page.evaluate(`({x: window.__game.player.position.x, z: window.__game.player.position.z, started: window.__game.started})`);
    lines.push(`player restored to ${player.x.toFixed(2)}, ${player.z.toFixed(2)}, started ${player.started}`);
    if (Math.hypot(player.x, player.z - 2) > 0.2) fail('probe left the player away from the spawn');
  } catch (e) {
    fail(`headless browser: ${e && e.stack ? e.stack : e}`);
    if (chromeLog.trim()) lines.push(`chrome: ${chromeLog.trim().split('\n').slice(-8).join(' | ')}`);
  } finally {
    const consoleErrors = page ? page.errors.slice() : [];
    const consoleLogs = page ? page.logs.slice() : [];
    lines.push(`console errors: ${consoleErrors.length}`);
    if (consoleErrors.length) {
      fail(`console errors: ${consoleErrors.join(' | ')}`);
      for (const row of consoleLogs) lines.push(`  ${row}`);
    }
    try { page?.ws.close(); } catch { /* already closed */ }
    try { process.kill(-chrome.proc.pid, 'SIGKILL'); } catch { try { chrome.proc.kill('SIGKILL'); } catch { /* already exited */ } }
    try { rmSync(chrome.dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 40 }); } catch (e) {
      lines.push(`temp profile left in place: ${e.message}`);
    }
    try { if (typeof server.closeAllConnections === 'function') server.closeAllConnections(); } catch { /* ignore */ }
    await new Promise((resolve) => {
      server.close(() => resolve());
      setTimeout(resolve, 300);
    });
  }
}

async function main() {
  const src = readFileSync(join(publicDir, 'game.js'), 'utf8');
  const html = readFileSync(join(publicDir, 'index.html'), 'utf8');
  const hosting = readFileSync(join(root, 'firebase.json'), 'utf8');
  const robots = readFileSync(join(publicDir, 'robots.txt'), 'utf8');
  if (!html.includes('noindex')) fail('index.html lost noindex');
  if (!hosting.includes('noindex')) fail('firebase.json lost the noindex header');
  if (!/Disallow:\s*\//.test(robots)) fail('robots.txt no longer disallows crawlers');
  runUnit(src);
  const move = loadMoveTuning(src);
  if (move) await runBrowser(move);
  if (failures.length) {
    lines.push(`Summary: FAILED (${failures.length})`);
    for (const f of failures) lines.push(`- ${f}`);
  } else {
    lines.push('Summary: trail run 4.6, stairs and cabin run 2.4 with the walk clip, cadence follows that speed, 0 console errors.');
  }
  console.log(lines.join('\n'));
  if (failures.length) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.log(e && e.stack ? e.stack : e);
    process.exitCode = 1;
  });
}
