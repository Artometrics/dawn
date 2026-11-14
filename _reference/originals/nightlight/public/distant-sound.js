/**
 * One slow metallic moan, once per play, from up the valley.
 * Oscillators and filtered noise only. The context must already exist
 * (the Play gesture). Numbers come from TUNING.distantSound.
 */

function setParam(param, value, time) {
  if (!param) return;
  if (typeof param.setValueAtTime === 'function') param.setValueAtTime(value, time);
  else param.value = value;
}

export function syncDistantListener(ac, pose) {
  if (!ac || !pose || !ac.listener) return;
  const t = ac.currentTime;
  const L = ac.listener;
  if (L.positionX && L.forwardX && L.upX) {
    setParam(L.positionX, pose.x, t);
    setParam(L.positionY, pose.y, t);
    setParam(L.positionZ, pose.z, t);
    setParam(L.forwardX, pose.fx, t);
    setParam(L.forwardY, pose.fy, t);
    setParam(L.forwardZ, pose.fz, t);
    setParam(L.upX, pose.ux, t);
    setParam(L.upY, pose.uy, t);
    setParam(L.upZ, pose.uz, t);
    return;
  }
  if (typeof L.setPosition === 'function') {
    L.setPosition(pose.x, pose.y, pose.z);
    if (typeof L.setOrientation === 'function') L.setOrientation(pose.fx, pose.fy, pose.fz, pose.ux, pose.uy, pose.uz);
  }
}

function placePanner(panner, x, y, z, time) {
  if (panner.positionX) {
    setParam(panner.positionX, x, time);
    setParam(panner.positionY, y, time);
    setParam(panner.positionZ, z, time);
    return;
  }
  if (typeof panner.setPosition === 'function') panner.setPosition(x, y, z);
}

// Mix sums to about 1 so TUNING.gain is the pre-panner peak, under the rain.
const MIX = { fundamental: 0.58, detune: 0.34, metal: 0.04, noise: 0.08 };
const METAL_RATIO = 4.87;

function startMoan(ac, rainGain, tuning) {
  const t0 = ac.currentTime;
  const dur = tuning.duration;
  const pitch = tuning.pitch;
  const endPitch = pitch * tuning.drop;
  const peak = tuning.gain;
  const startLevel = Math.max(0.0002, peak * tuning.swell);
  const tAttack = t0 + Math.min(0.45, dur * 0.15);
  const tSwell = t0 + dur * 0.62;
  const tEnd = t0 + dur;

  const master = ac.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(startLevel, tAttack);
  master.gain.linearRampToValueAtTime(peak, tSwell);
  master.gain.exponentialRampToValueAtTime(0.0001, tEnd);

  const panner = ac.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = tuning.refDistance;
  panner.rolloffFactor = tuning.rolloff;
  placePanner(panner, tuning.x, tuning.y, tuning.sourceZ, t0);

  const body = ac.createBiquadFilter();
  body.type = 'lowpass';
  body.frequency.setValueAtTime(pitch * 14, t0);
  body.frequency.linearRampToValueAtTime(Math.max(80, endPitch * 9), tEnd);
  body.Q.value = 0.7;

  const o1 = ac.createOscillator();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(pitch, t0);
  o1.frequency.linearRampToValueAtTime(endPitch, tEnd);
  const g1 = ac.createGain();
  g1.gain.value = MIX.fundamental;

  const o2 = ac.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(pitch, t0);
  o2.frequency.linearRampToValueAtTime(endPitch, tEnd);
  o2.detune.setValueAtTime(tuning.detune, t0);
  const g2 = ac.createGain();
  g2.gain.value = MIX.detune;

  const o3 = ac.createOscillator();
  o3.type = 'triangle';
  o3.frequency.setValueAtTime(pitch * METAL_RATIO, t0);
  o3.frequency.linearRampToValueAtTime(endPitch * METAL_RATIO, tEnd);
  o3.detune.setValueAtTime(-tuning.detune, t0);
  const metal = ac.createBiquadFilter();
  metal.type = 'bandpass';
  metal.frequency.value = pitch * METAL_RATIO;
  metal.Q.value = 5;
  const g3 = ac.createGain();
  g3.gain.value = MIX.metal;

  const nLen = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, nLen, ac.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < nLen; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.08 * w) / 1.08;
    data[i] = w * 0.35 + last * 2.2;
  }
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const nf = ac.createBiquadFilter();
  nf.type = 'bandpass';
  nf.frequency.setValueAtTime(pitch * 6.5, t0);
  nf.frequency.linearRampToValueAtTime(Math.max(90, endPitch * 5.2), tEnd);
  nf.Q.value = 3.2;
  const ng = ac.createGain();
  ng.gain.value = MIX.noise;

  o1.connect(g1).connect(body);
  o2.connect(g2).connect(body);
  o3.connect(metal).connect(g3).connect(body);
  noise.connect(nf).connect(ng).connect(body);
  body.connect(master).connect(panner).connect(ac.destination);

  o1.start(t0);
  o2.start(t0);
  o3.start(t0);
  noise.start(t0);
  const stopAt = (node) => {
    node.stop(tEnd);
    node.onended = () => {
      try { node.disconnect(); } catch (e) { /* node already torn down */ }
    };
  };
  stopAt(o1);
  stopAt(o2);
  stopAt(o3);
  stopAt(noise);

  const base = rainGain.gain.value;
  const ducked = base * (1 - tuning.duck);
  const duckIn = Math.min(0.4, dur * 0.2);
  const holdAt = t0 + Math.max(duckIn + 0.05, dur - 0.45);
  rainGain.gain.cancelScheduledValues(t0);
  rainGain.gain.setValueAtTime(base, t0);
  rainGain.gain.linearRampToValueAtTime(ducked, t0 + duckIn);
  rainGain.gain.setValueAtTime(ducked, holdAt);
  rainGain.gain.linearRampToValueAtTime(base, tEnd + Math.min(0.5, dur * 0.16));
}

/**
 * Sync the listener, and the first time z decreases through tuning.z, start the moan.
 * Returns 1 if this call started it, else 0. A play with no context consumes the
 * crossing so it cannot arrive late, after the subtitle.
 */
export function updateDistantSound({ ac, rainGain, tuning, state, prevZ, z, pose }) {
  if (!tuning || !state) return 0;
  syncDistantListener(ac, pose);
  if (state.played) return 0;
  if (!(prevZ > tuning.z && z <= tuning.z)) return 0;
  state.played = true;
  if (!ac || !rainGain) return 0;
  startMoan(ac, rainGain, tuning);
  return 1;
}
