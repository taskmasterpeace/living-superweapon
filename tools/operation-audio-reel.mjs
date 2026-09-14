// tools/operation-audio-reel.mjs
//
// Builds an audition reel for the operation-v1 cues from the ACTUAL shipped assets (not a re-synth):
//   artifacts/operation-audio/audition.html  — self-contained page (MP3s embedded as data URIs),
//                                               grouped by family, per-cue play + metadata. Just open it.
//   artifacts/operation-audio/audition-reel.wav — one concatenated WAV (marker blips + gaps) to scrub.
//   artifacts/operation-audio/reel.json       — the running order + offsets.
//
//   node tools/operation-audio-reel.mjs        (run tools/operation-audio-build.mjs first)

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { OPERATION_AUDIO_CUES } from '../src/data/audio-cues.js';
import { SR, buffer, osc, env, applyEnv, mix, toWav16, fade } from '../authoring/audio/operation-v1/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(ROOT, 'public', 'audio', 'operation-v1');           // .mp3 + manifest
const MASTERS = join(ROOT, 'authoring', 'audio', 'operation-v1', 'masters'); // .wav
const REEL = join(ROOT, 'artifacts', 'operation-audio');

// read a canonical PCM16 mono WAV back to Float32
function readWav(buf) {
  let p = 12; // skip RIFF....WAVE
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), sz = buf.readUInt32LE(p + 4);
    if (id === 'data') { const n = sz >> 1, out = new Float32Array(n); for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(p + 8 + i * 2) / 32768; return out; }
    p += 8 + sz + (sz & 1);
  }
  return new Float32Array(0);
}
const marker = (n) => { // n descending blips = a family chapter tick
  const b = buffer(0.06 * n + 0.02);
  for (let i = 0; i < n; i++) mix(b, applyEnv(osc('sine', 0.05, { freq: 1400 - i * 300 }), env.ad(0.003, 0.05, 3)), { gain: 0.35, at: i * 0.055 });
  return fade(b, 0.002, 0.01);
};
const silence = (s) => buffer(s);

async function main() {
  if (!existsSync(join(RUNTIME, 'manifest.json'))) { console.error('run tools/operation-audio-build.mjs first'); process.exit(1); }
  await mkdir(REEL, { recursive: true });
  const manifest = JSON.parse(await readFile(join(RUNTIME, 'manifest.json'), 'utf8'));
  const byId = Object.fromEntries(manifest.cues.map((c) => [c.id, c]));

  // ---- concatenated scrub reel (WAV) ----
  const parts = [], order = [];
  let cursor = 0, lastFamily = null;
  for (const c of OPERATION_AUDIO_CUES) {
    if (c.family !== lastFamily) { const m = marker(2); parts.push(m); cursor += m.length; lastFamily = c.family; const g = silence(0.15); parts.push(g); cursor += g.length; }
    const tick = marker(1); parts.push(tick); cursor += tick.length;
    const base = c.files[0].replace(/^operation-v1\//, '');
    const wav = readWav(await readFile(join(MASTERS, base + '.wav')));
    order.push({ id: c.id, family: c.family, atSec: +(cursor / SR).toFixed(3), durSec: +(wav.length / SR).toFixed(3) });
    parts.push(wav); cursor += wav.length;
    const gap = silence(0.35); parts.push(gap); cursor += gap.length;
  }
  const reel = new Float32Array(cursor);
  { let o = 0; for (const p of parts) { reel.set(p, o); o += p.length; } }
  await writeFile(join(REEL, 'audition-reel.wav'), toWav16(reel));
  await writeFile(join(REEL, 'reel.json'), JSON.stringify({ format: 'lsw.operation-audio.reel', totalSec: +(cursor / SR).toFixed(2), order }, null, 2));

  // ---- self-contained audition page (embed the real MP3s) ----
  const fams = [...new Set(OPERATION_AUDIO_CUES.map((c) => c.family))];
  let rows = '';
  for (const fam of fams) {
    rows += `<h2>${fam.toUpperCase()}</h2>`;
    for (const c of OPERATION_AUDIO_CUES.filter((x) => x.family === fam)) {
      const man = byId[c.id];
      let players = '';
      for (const f of c.files) {
        const base = f.replace(/^operation-v1\//, '');
        const b64 = (await readFile(join(RUNTIME, base + '.mp3'))).toString('base64');
        players += `<audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio> `;
      }
      const peak = Math.max(...man.variantStems.map((s) => manifest.files.find((f) => f.sample === s).peakDbfs));
      rows += `<div class="cue"><div class="hd"><b>${c.id}</b> <span class="lbl">${c.label}</span>`
        + `<span class="tag">${c.playback}</span><span class="tag">${c.bus}${c.spatial ? ' · spatial' : ''}</span>`
        + `<span class="tag">${man.durationSec}s</span><span class="tag">peak ${peak} dBFS</span>`
        + `<span class="tag warn">UNWIRED</span></div>`
        + `<div class="dir">${c.direction}</div>`
        + `<div class="map">→ <code>${c.event}</code> · ${c.transition}</div>`
        + `<div class="pl">${players}</div></div>`;
    }
  }
  const html = `<!doctype html><meta charset="utf-8"><title>Operation-v1 audio audition</title>
<style>body{background:#17140f;color:#e9e2d4;font:14px/1.5 system-ui;margin:0;padding:22px 26px;max-width:900px}
h1{font-size:20px;letter-spacing:.02em}h2{color:#e0a63a;border-bottom:1px solid #3a3222;padding-bottom:4px;margin-top:26px}
.cue{border:1px solid #2c2619;border-radius:10px;padding:10px 12px;margin:8px 0;background:#1e1a12}
.hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbl{color:#b8ad97}
.tag{font:11px ui-monospace,monospace;background:#2a2417;border:1px solid #3a3222;border-radius:5px;padding:1px 6px;color:#c9bfa6}
.tag.warn{background:#3a2417;border-color:#7a4a24;color:#e0a63a}
.dir{color:#cdbfa0;margin:6px 0 2px}.map{font:12px ui-monospace,monospace;color:#8f8570}.map code{color:#e0a63a}
.pl audio{height:30px;vertical-align:middle;margin:6px 6px 0 0}small{color:#8a8270}</style>
<h1>OPERATION-V1 — combat &amp; squad audio audition</h1>
<small>Original deterministic DSP synthesis · ${OPERATION_AUDIO_CUES.length} cues / ${manifest.files.length} files · encoder ${manifest.encoder} · <b>NOT WIRED</b> (asset delivery, not live gameplay).</small>
${rows}`;
  await writeFile(join(REEL, 'audition.html'), html);
  console.log(`reel: ${order.length} cues, ${(cursor / SR).toFixed(1)}s → artifacts/operation-audio/audition-reel.wav`);
  console.log(`page: artifacts/operation-audio/audition.html (self-contained)`);
}
main().catch((e) => { console.error(e); process.exit(1); });
