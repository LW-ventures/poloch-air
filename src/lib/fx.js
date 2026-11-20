// Sound & Haptik – alles synthetisch per WebAudio, keine Audiodateien nötig.
const PREF = 'polochair:sound';

export function soundOn() {
  try {
    return localStorage.getItem(PREF) !== 'off';
  } catch {
    return true;
  }
}
export function setSound(on) {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off');
  } catch {
    /* egal */
  }
}

let ctx;
function audio() {
  if (!soundOn()) return null;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(c, seconds) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// Ticketdrucker: rhythmisches Rattern
export function playPrint(duration = 1.4) {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, duration);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 1.2;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  const steps = Math.floor(duration / 0.055);
  for (let i = 0; i < steps; i++) {
    const t = t0 + i * 0.055;
    g.gain.setValueAtTime(0.16, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.045);
  }
  g.gain.setValueAtTime(0, t0 + duration);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + duration);
  // Motorbrummen
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 95;
  og.gain.setValueAtTime(0.0001, t0);
  og.gain.exponentialRampToValueAtTime(0.025, t0 + 0.08);
  og.gain.setValueAtTime(0.025, t0 + duration - 0.1);
  og.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(og).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

// Papier reißt
export function playRip() {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 0.35);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(1200, t0);
  hp.frequency.linearRampToValueAtTime(3800, t0 + 0.3);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.33);
  src.connect(hp).connect(g).connect(c.destination);
  src.start(t0);
}

// "Ding-Dong" der Durchsage
export function playChime() {
  const c = audio();
  if (!c) return;
  const t0 = c.currentTime;
  [[659, 0], [523, 0.28]].forEach(([f, dt]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0 + dt);
    g.gain.exponentialRampToValueAtTime(0.2, t0 + dt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.9);
    o.connect(g).connect(c.destination);
    o.start(t0 + dt);
    o.stop(t0 + dt + 1);
  });
}

export function buzz(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iOS kann das nicht – egal */
  }
}
