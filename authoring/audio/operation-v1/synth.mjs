// authoring/audio/operation-v1/synth.mjs
//
// Dependency-free, DETERMINISTIC DSP synthesis toolkit for the operation-v1 cue set.
//
// THE PROVENANCE CONTRACT (docs/AUDIO_SOURCES.md, audio.js header): every game sound is either a
// CC0 recording held on disk, or "DSP we wrote driven by engine-computed parameters." These cues
// are the second kind, pre-rendered to files: original synthesis, no AI audio model, no recorded
// human voice, no third-party sample. Given the same seed, this file produces byte-identical PCM,
// so every asset is reproducible from source (tools/operation-audio-build.mjs).
//
// Everything works on mono Float32 arrays at SR. Values may exceed [-1,1] mid-build; each cue is
// peak-normalised at the end. No Math.random anywhere — determinism comes from a seeded PRNG.

export const SR = 44100;

// --- deterministic PRNG (mulberry32) -----------------------------------------------------------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// stable 32-bit seed from a string (so a cue id + variant maps to a fixed seed)
export function seedOf(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// --- buffers -----------------------------------------------------------------------------------
export const buffer = (durSec) => new Float32Array(Math.max(1, Math.round(durSec * SR)));
export const secs = (buf) => buf.length / SR;
const idx = (t) => Math.round(t * SR);

// Mix src into dst starting at offset seconds, with gain. dst grows conceptually via caller.
export function mix(dst, src, { gain = 1, at = 0 } = {}) {
  const off = idx(at);
  for (let i = 0; i < src.length; i++) {
    const j = i + off;
    if (j >= 0 && j < dst.length) dst[j] += src[i] * gain;
  }
  return dst;
}

// --- oscillators (render a new buffer) ---------------------------------------------------------
// freq may be a number or a function t->hz (for glides). phase in cycles.
function oscValue(type, ph, rand) {
  const x = ph - Math.floor(ph);
  switch (type) {
    case 'sine': return Math.sin(2 * Math.PI * x);
    case 'saw': return 2 * x - 1;
    case 'square': return x < 0.5 ? 1 : -1;
    case 'tri': return 4 * Math.abs(x - 0.5) - 1;
    case 'noise': return rand ? rand() * 2 - 1 : 0;
    default: return Math.sin(2 * Math.PI * x);
  }
}
export function osc(type, durSec, { freq = 220, gain = 1, phase = 0, rand = null, env = null } = {}) {
  const out = buffer(durSec);
  const fFn = typeof freq === 'function' ? freq : () => freq;
  let ph = phase;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = Math.max(0, fFn(t));
    out[i] = oscValue(type, ph, rand) * gain * (env ? env(t) : 1);
    ph += f / SR;
  }
  return out;
}
// band-limited-ish additive tone by summing a few sine partials (cleaner than raw saw for radio)
export function tone(durSec, { freq = 440, partials = 1, decay = 0, gain = 1, env = null, odd = false } = {}) {
  const out = buffer(durSec);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (let p = 1; p <= partials; p++) {
      if (odd && p % 2 === 0) continue;
      s += Math.sin(2 * Math.PI * freq * p * t) / p;
    }
    out[i] = s * gain * (env ? env(t) : 1);
  }
  return out;
}
export function noise(durSec, { rand, gain = 1, env = null } = {}) {
  const out = buffer(durSec);
  for (let i = 0; i < out.length; i++) out[i] = (rand() * 2 - 1) * gain * (env ? env(i / SR) : 1);
  return out;
}

// --- envelopes (t seconds -> gain) -------------------------------------------------------------
export const env = {
  // attack/decay percussive hit
  ad: (a, d, curve = 2) => (t) => (t < a ? t / Math.max(1e-6, a) : Math.pow(Math.max(0, 1 - (t - a) / Math.max(1e-6, d)), curve)),
  // exponential decay from 1
  exp: (tau) => (t) => Math.exp(-t / Math.max(1e-6, tau)),
  // attack-sustain-release plateau across [0,total]
  asr: (a, r, total) => (t) => {
    if (t < a) return t / Math.max(1e-6, a);
    if (t > total - r) return Math.max(0, (total - t) / Math.max(1e-6, r));
    return 1;
  },
  // linear ramp 0->1 over total (for rising sweeps)
  rampUp: (total) => (t) => Math.min(1, Math.max(0, t / total)),
  mul: (...fns) => (t) => fns.reduce((g, f) => g * f(t), 1),
};

export function applyEnv(buf, fn) { for (let i = 0; i < buf.length; i++) buf[i] *= fn(i / SR); return buf; }
export function fade(buf, inSec = 0.004, outSec = 0.01) {
  const ni = Math.max(1, idx(inSec)), no = Math.max(1, idx(outSec));
  for (let i = 0; i < ni && i < buf.length; i++) buf[i] *= i / ni;
  for (let i = 0; i < no && i < buf.length; i++) buf[buf.length - 1 - i] *= i / no;
  return buf;
}

// --- filters (RBJ biquad, Direct Form I, in place) ---------------------------------------------
function biquadCoeffs(type, f0, Q, gainDb) {
  const w0 = 2 * Math.PI * Math.min(f0, SR * 0.49) / SR;
  const cw = Math.cos(w0), sw = Math.sin(w0);
  const alpha = sw / (2 * Math.max(0.0001, Q));
  const A = Math.pow(10, (gainDb || 0) / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lp': b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'hp': b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'bp': b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'notch': b0 = 1; b1 = -2 * cw; b2 = 1; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha; break;
    case 'peak': b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A; break;
    case 'ls': { const s = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) - (A - 1) * cw + s); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - s); a0 = (A + 1) + (A - 1) * cw + s; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - s; break; }
    case 'hs': { const s = 2 * Math.sqrt(A) * alpha; b0 = A * ((A + 1) + (A - 1) * cw + s); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - s); a0 = (A + 1) - (A - 1) * cw + s; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - s; break; }
    default: b0 = 1; b1 = 0; b2 = 0; a0 = 1; a1 = 0; a2 = 0;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
export function biquad(buf, type, f0, Q = 0.707, gainDb = 0) {
  const [b0, b1, b2, a1, a2] = biquadCoeffs(type, f0, Q, gainDb);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const x = buf[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; buf[i] = y;
  }
  return buf;
}
// moving-cutoff lowpass (recompute coeffs each sample from cutoffFn t->hz) — for sweeps
export function sweepLP(buf, cutoffFn, Q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const [b0, b1, b2, a1, a2] = biquadCoeffs('lp', Math.max(40, cutoffFn(i / SR)), Q, 0);
    const x = buf[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; buf[i] = y;
  }
  return buf;
}

// --- shapers / modulators ----------------------------------------------------------------------
export function softclip(buf, drive = 2) { for (let i = 0; i < buf.length; i++) buf[i] = Math.tanh(buf[i] * drive); return buf; }
export function ringmod(buf, freq, depth = 1) {
  for (let i = 0; i < buf.length; i++) { const m = Math.sin(2 * Math.PI * freq * (i / SR)); buf[i] *= (1 - depth) + depth * m; }
  return buf;
}
export function tremolo(buf, rate, depth = 0.5, phase = 0) {
  for (let i = 0; i < buf.length; i++) { const m = 0.5 + 0.5 * Math.sin(2 * Math.PI * (rate * (i / SR) + phase)); buf[i] *= 1 - depth + depth * m; }
  return buf;
}
// short feedback delay (adds echoes in place, extend the buffer beforehand for tails)
export function delay(buf, timeSec, feedback = 0.35, mix = 0.4, taps = 4) {
  const d = Math.max(1, idx(timeSec)); const dry = buf.slice();
  for (let t = 1; t <= taps; t++) {
    const g = mix * Math.pow(feedback, t - 1), off = d * t;
    for (let i = 0; i < dry.length; i++) { const j = i + off; if (j < buf.length) buf[j] += dry[i] * g; }
  }
  return buf;
}

// --- "radio" processor: what makes a friendly-comms cue read as a radio, not a UI beep ----------
// Band-limit to a comms passband, add a touch of drive and quiet carrier hiss, and (optionally)
// frame with squelch bursts. Keeps callouts sitting UNDER speech and combat rather than over them.
export function radio(buf, { rand, low = 380, high = 2900, drive = 1.6, hiss = 0.015, squelch = false } = {}) {
  biquad(buf, 'hp', low, 0.8);
  biquad(buf, 'lp', high, 0.8);
  softclip(buf, drive);
  biquad(buf, 'peak', 1600, 1.2, 4); // presence bump so a short blip stays intelligible
  if (hiss > 0) for (let i = 0; i < buf.length; i++) buf[i] += (rand() * 2 - 1) * hiss;
  if (squelch) {
    const n = noise(0.02, { rand, gain: 0.5 }); biquad(n, 'hp', 1500, 0.7);
    mix(buf, n, { at: 0 }); mix(buf, n, { at: Math.max(0, secs(buf) - 0.022) });
  }
  return buf;
}

// --- measurement + WAV export ------------------------------------------------------------------
export function normalizePeak(buf, targetLinear = 0.89) {
  let peak = 0; for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a; }
  if (peak > 1e-9) { const g = targetLinear / peak; for (let i = 0; i < buf.length; i++) buf[i] *= g; }
  return buf;
}
export function measure(buf) {
  let peak = 0, sq = 0;
  for (let i = 0; i < buf.length; i++) { const a = Math.abs(buf[i]); if (a > peak) peak = a; sq += buf[i] * buf[i]; }
  const rms = Math.sqrt(sq / Math.max(1, buf.length));
  const dbfs = (x) => (x > 1e-9 ? 20 * Math.log10(x) : -Infinity);
  return { durationSec: secs(buf), peak, rms, peakDbfs: dbfs(peak), rmsDbfs: dbfs(rms), samples: buf.length };
}
// 16-bit PCM mono WAV (deterministic bytes; dithering intentionally omitted for reproducibility)
export function toWav16(buf) {
  const n = buf.length, bytes = 44 + n * 2, ab = new ArrayBuffer(bytes), dv = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ws(36, 'data'); dv.setUint32(40, n * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) { let s = Math.max(-1, Math.min(1, buf[i])); s = s < 0 ? s * 0x8000 : s * 0x7fff; dv.setInt16(o, Math.round(s), true); o += 2; }
  return Buffer.from(ab);
}
