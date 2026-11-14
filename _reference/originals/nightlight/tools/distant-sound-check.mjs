#!/usr/bin/env node
/**
 * Headless check for the valley moan before subtitle line 2.
 * One play: the sound starts the first time z decreases through -24, and
 * never again. A later play (fresh state) may start it once more.
 * Prints a short report and exits non-zero on failure. Console errors fail it.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { updateDistantSound } from '../public/distant-sound.js';

const RAIN_BUS = 0.12;
const failures = [];
const consoleErrors = [];
const origError = console.error;
console.error = (...args) => {
  consoleErrors.push(args.map(String).join(' '));
  origError(...args);
};

function fail(msg) {
  failures.push(msg);
}

function loadDistantTuning(src) {
  const m = src.match(/distantSound:\s*\{([^}]*)\}/);
  if (!m) {
    fail('TUNING.distantSound block missing from public/game.js');
    return null;
  }
  try {
    return Function(`"use strict"; return ({${m[1]}});`)();
  } catch (e) {
    fail(`TUNING.distantSound did not parse: ${e.message}`);
    return null;
  }
}

function createParam(initial = 0) {
  return {
    value: initial,
    events: [],
    setValueAtTime(v, t) {
      this.events.push({ op: 'set', v, t });
      this.value = v;
      return this;
    },
    linearRampToValueAtTime(v, t) {
      this.events.push({ op: 'linear', v, t });
      this.value = v;
      return this;
    },
    exponentialRampToValueAtTime(v, t) {
      this.events.push({ op: 'exp', v, t });
      this.value = v;
      return this;
    },
    cancelScheduledValues(t) {
      this.events.push({ op: 'cancel', t });
      return this;
    },
  };
}

function createMockContext() {
  const nodes = [];
  function MockNode(kind) {
    this.kind = kind;
    this.outs = [];
    this.started = 0;
    this.stopped = 0;
    nodes.push(this);
  }
  MockNode.prototype.connect = function connect(dest) {
    this.outs.push(dest);
    return dest;
  };
  MockNode.prototype.disconnect = function disconnect() {
    this.outs.length = 0;
  };
  MockNode.prototype.start = function start(when = 0) {
    this.started += 1;
    this.when = when;
  };
  MockNode.prototype.stop = function stop(when = 0) {
    this.stopped += 1;
    this.stopWhen = when;
  };
  const destination = new MockNode('destination');
  const ctx = {
    currentTime: 10,
    sampleRate: 48000,
    destination,
    listener: {
      positionX: createParam(),
      positionY: createParam(),
      positionZ: createParam(),
      forwardX: createParam(),
      forwardY: createParam(),
      forwardZ: createParam(),
      upX: createParam(),
      upY: createParam(),
      upZ: createParam(),
    },
    createGain() {
      const n = new MockNode('gain');
      n.gain = createParam(1);
      return n;
    },
    createOscillator() {
      const n = new MockNode('osc');
      n.frequency = createParam(440);
      n.detune = createParam(0);
      n.type = 'sine';
      return n;
    },
    createBiquadFilter() {
      const n = new MockNode('filter');
      n.frequency = createParam(350);
      n.Q = createParam(1);
      n.type = 'lowpass';
      return n;
    },
    createPanner() {
      const n = new MockNode('panner');
      n.positionX = createParam();
      n.positionY = createParam();
      n.positionZ = createParam();
      return n;
    },
    createBuffer(_ch, len, rate) {
      return {
        length: len,
        sampleRate: rate,
        duration: len / rate,
        getChannelData: () => new Float32Array(len),
      };
    },
    createBufferSource() {
      const n = new MockNode('buffer');
      return n;
    },
  };
  return { ctx, nodes, destination };
}

function poseAt(z) {
  return { x: 4, y: 1.7, z, fx: 0, fy: 0, fz: -1, ux: 0, uy: 1, uz: 0 };
}

function steps(from, to, step) {
  const pts = [from];
  const dir = to < from ? -1 : 1;
  let z = from;
  while ((dir < 0 && z > to) || (dir > 0 && z < to)) {
    z = dir < 0 ? Math.max(to, z - step) : Math.min(to, z + step);
    pts.push(z);
  }
  return pts;
}

function walk(ctx, rain, tuning, state, points) {
  let fires = 0;
  for (let i = 1; i < points.length; i++) {
    fires += updateDistantSound({
      ac: ctx,
      rainGain: rain,
      tuning,
      state,
      prevZ: points[i - 1],
      z: points[i],
      pose: poseAt(points[i]),
    });
  }
  return fires;
}

export function runDistantSoundCheck() {
  const src = readFileSync(new URL('../public/game.js', import.meta.url), 'utf8');
  const soundSrc = readFileSync(new URL('../public/distant-sound.js', import.meta.url), 'utf8');
  const tuning = loadDistantTuning(src);
  const lines = ['Distant sound check (one moan, before the line at z=-30)', ''];

  if (tuning) {
    for (const key of ['z', 'duration', 'pitch', 'detune', 'gain', 'duck', 'x', 'y', 'sourceZ', 'refDistance', 'rolloff', 'swell', 'drop']) {
      if (!(key in tuning)) fail(`TUNING.distantSound.${key} missing`);
    }
    if (tuning.z !== -24) fail(`trigger z is ${tuning.z}, expected -24`);
    if (tuning.duration !== 3) fail(`duration is ${tuning.duration}, expected 3`);
    if (Math.abs(tuning.duck - 0.2) > 1e-6) fail(`duck is ${tuning.duck}, expected 0.2`);
    if (!(tuning.gain < RAIN_BUS)) fail(`gain ${tuning.gain} is not under the rain bus ${RAIN_BUS}`);
    if (!(tuning.gain * tuning.swell < tuning.gain)) fail('swell does not start under the peak');
    if (!(tuning.sourceZ < tuning.z)) fail('source is not ahead of the trigger (sourceZ should be < z)');
    if (!(tuning.x < 0)) fail('source is not to the left (x should be negative)');
    if (!(tuning.y > 2)) fail('source is not up off the path');
    if (!(tuning.drop < 1)) fail('pitch does not drop');
    if (!(tuning.detune !== 0)) fail('second voice is not detuned');
  }

  const beats = [...src.matchAll(/\{z:(-?\d+(?:\.\d+)?),t:"([^"]*)"\}/g)].map((m) => ({ z: Number(m[1]), t: m[2] }));
  const expectedBeats = [
    { z: -4, t: "The power's out across the valley. The radio station is the only way to reach anyone." },
    { z: -30, t: "Keep to the path. Whatever that sound was, it wasn't the wind." },
    { z: -58, t: 'The old stairs. The station should be just over the ridge.' },
    { z: -96, t: "There. A light in the window. Someone's still there." },
  ];
  if (JSON.stringify(beats) !== JSON.stringify(expectedBeats)) fail(`subtitle beats changed: ${JSON.stringify(beats)}`);

  const updateAt = src.indexOf('function update');
  const callAt = src.indexOf('updateDistantSound(', updateAt);
  if (updateAt < 0 || callAt < 0) fail('updateDistantSound is not called from update()');
  if (src.slice(0, updateAt).includes('updateDistantSound(')) fail('the moan is scheduled before the play loop');
  const call = src.slice(callAt, src.indexOf(';', callAt));
  if (!call.includes('tuning:TUNING.distantSound') || !call.includes('prevZ:z0') || !call.includes('rainGain')) {
    fail('update() does not pass TUNING.distantSound, the previous z, and the rain gain');
  }
  const playAt = src.indexOf("$('play').addEventListener");
  if (playAt < 0 || !src.slice(playAt).includes('startAudio()')) fail('startAudio is not tied to the Play control');
  if (!src.includes('rainGain=ac.createGain()') || !src.includes('.connect(rainGain).connect(bus)')) {
    fail('rain duck sits on the rain chain, not on the shared footstep bus');
  }
  if (!src.includes('.connect(g).connect(bus)')) fail('footsteps no longer use the rain bus');
  if (src.includes('console.error') || soundSrc.includes('console.error')) fail('sound path logs console errors');
  if (/\.(mp3|ogg|wav|m4a|flac)\b/.test(src + soundSrc)) fail('sound path references an audio file');

  if (tuning) {
    const { ctx, nodes, destination } = createMockContext();
    const rain = ctx.createGain();
    rain.gain.value = 1;
    const state = { played: false };
    const approach = walk(ctx, rain, tuning, state, steps(2, -23.5, 0.5));
    const crossing = walk(ctx, rain, tuning, state, [-23.5, -24, -24.4, -30]);
    const listenerAtLine = ctx.listener.positionZ.value;
    const rest = walk(ctx, rain, tuning, state, steps(-30, -114, 1).concat(steps(-114, 2, 2), steps(2, -80, 0.5)));
    const oscs = nodes.filter((n) => n.kind === 'osc');
    const panners = nodes.filter((n) => n.kind === 'panner');
    const buffers = nodes.filter((n) => n.kind === 'buffer');
    lines.push(`approach to z=-23.5: ${approach} start(s)`);
    lines.push(`cross z=-24, then the valley and a second pass: ${crossing} then ${rest}`);
    lines.push(`oscillators ${oscs.length}, panners ${panners.length}, noise buffers ${buffers.length}`);
    if (approach !== 0) fail(`moan started before z=-24 (${approach})`);
    if (crossing !== 1) fail(`crossing z=-24 started the moan ${crossing} time(s), expected 1`);
    if (rest !== 0) fail(`moan repeated later in the same play (${rest})`);
    if (oscs.length !== 3) fail(`expected 3 oscillators, got ${oscs.length}`);
    if (panners.length !== 1) fail(`expected 1 panner, got ${panners.length}`);
    if (buffers.length !== 1) fail(`expected 1 noise buffer, got ${buffers.length}`);
    for (const osc of oscs) {
      if (osc.started !== 1) fail('an oscillator did not start once');
      if (Math.abs(osc.stopWhen - osc.when - tuning.duration) > 1e-6) fail(`oscillator length ${osc.stopWhen - osc.when}, expected ${tuning.duration}`);
    }
    const pitched = oscs.filter((o) => o.frequency.events.some((e) => e.op === 'set' && e.v === tuning.pitch));
    if (pitched.length < 2) fail('voices are not pitched from TUNING.pitch');
    const detuned = oscs.filter((o) => o.detune.events.some((e) => e.v === tuning.detune));
    if (detuned.length !== 1) fail('one voice should carry TUNING.detune');
    const panner = panners[0];
    if (!panner || panner.positionX.value !== tuning.x || panner.positionY.value !== tuning.y || panner.positionZ.value !== tuning.sourceZ) {
      fail('panner is not at the valley source');
    }
    if (!panner.outs.includes(destination)) fail('panner does not reach the destination');
    if (rain.outs.includes(panner)) fail('rain gain is chained into the moan');
    const master = nodes.find((n) => n.kind === 'gain' && n.gain.events.some((e) => e.op === 'linear' && e.v === tuning.gain));
    if (!master) fail('master gain never swells to TUNING.gain');
    else {
      const early = master.gain.events.find((e) => e.op === 'exp' && e.v > 0.001);
      if (!early || !(early.v < tuning.gain) || !(early.v < RAIN_BUS)) fail('moan does not start quieter than its peak and the rain');
    }
    const ducked = rain.gain.events.find((e) => e.op === 'linear' && Math.abs(e.v - (1 - tuning.duck)) < 1e-6);
    const recovered = rain.gain.events.filter((e) => e.op === 'linear' && Math.abs(e.v - 1) < 1e-6);
    if (!ducked) fail('rain gain does not duck by about 20%');
    if (!recovered.length) fail('rain gain does not recover');
    if (Math.abs(listenerAtLine - (-30)) > 1e-6) fail('listener did not follow the camera pose');
    const noise = buffers[0];
    if (!noise || noise.buffer.length !== Math.floor(ctx.sampleRate * tuning.duration)) fail('noise buffer is not one moan long');

    const again = createMockContext();
    const rain2 = again.ctx.createGain();
    rain2.gain.value = 1;
    const secondPlay = walk(again.ctx, rain2, tuning, { played: false }, [-20, -30]);
    lines.push(`fresh play, one crossing: ${secondPlay} start(s)`);
    if (secondPlay !== 1) fail(`a new play did not fire once (${secondPlay})`);

    const silentNodes = createMockContext();
    const missed = { played: false };
    const missedFires = updateDistantSound({
      ac: null,
      rainGain: null,
      tuning,
      state: missed,
      prevZ: -20,
      z: -30,
      pose: poseAt(-30),
    });
    const late = createMockContext();
    const lateRain = late.ctx.createGain();
    lateRain.gain.value = 1;
    const lateFires = updateDistantSound({
      ac: late.ctx,
      rainGain: lateRain,
      tuning,
      state: missed,
      prevZ: -10,
      z: -40,
      pose: poseAt(-40),
    });
    const noRain = { played: false };
    const noRainFires = walk(silentNodes.ctx, null, tuning, noRain, [-20, -30]);
    lines.push(`no audio context at the crossing: ${missedFires} start(s); late context: ${lateFires}; rain gain missing: ${noRainFires}`);
    if (missedFires !== 0 || lateFires !== 0 || noRainFires !== 0) fail('the moan played without the Play context, or arrived late');
    if (silentNodes.nodes.some((n) => n.kind === 'osc') || late.nodes.some((n) => n.kind === 'osc')) fail('nodes were built with no audio context');
    if (!missed.played || !noRain.played) fail('a missed crossing stayed armed');
  }

  lines.push(`console errors: ${consoleErrors.length}`);
  if (consoleErrors.length) fail(`console errors: ${consoleErrors.join(' | ')}`);
  lines.push('');
  if (failures.length) {
    lines.push(`Summary: FAILED (${failures.length})`);
    for (const f of failures) lines.push(`- ${f}`);
  } else {
    lines.push('Summary: triggered once at z=-24; 0 repeats in that play; 0 console errors.');
  }
  return { report: lines.join('\n'), ok: failures.length === 0 };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  let result;
  try {
    result = runDistantSoundCheck();
  } catch (e) {
    console.log(`Distant sound check threw: ${e && e.stack ? e.stack : e}`);
    process.exitCode = 1;
  }
  if (result) {
    console.log(result.report);
    if (!result.ok) process.exitCode = 1;
  }
}
