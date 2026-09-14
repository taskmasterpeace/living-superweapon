// tools/sfx-amb-lock.mjs — lock Robert's picked ambient loops into public/audio/sfx-amb/final/ + a winners manifest.
//   node tools/sfx-amb-lock.mjs
// Extend PICKS as more beds are graded, then re-run (idempotent — it rewrites final/ from PICKS).
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'audio', 'sfx-amb');
const FINAL = join(OUT, 'final');

// Robert's thumbs-up picks, graded off the seamless-loop artifact (2026-09-14).
// Multiple takes on one cue = alternate them at play time. Extend as the rest are graded.
const PICKS = {
  'amb.machinery': ['05'],
  'amb.bed': ['01', '02'],
};

// game sample name + gain + where it plays. loop:true — these are beds, not one-shots.
const SAMPLE = {
  'amb.wind':      { name: 'amb.wind',      g: 0.5,  mapsTo: 'WIND push-indicator bed — the audio tell for the wind that shoves you' },
  'amb.rain':      { name: 'amb.rain',      g: 0.45, mapsTo: 'RAIN bed for a rainy theatre' },
  'gen.hum':       { name: 'gen.hum',       g: 0.5,  mapsTo: 'GENERATOR / reactor hum — loop under a hittable generator' },
  'amb.machinery': { name: 'amb.machinery', g: 0.4,  mapsTo: 'INDUSTRIAL / works-district zone bed' },
  'amb.bed':       { name: 'amb.bed',       g: 0.35, mapsTo: 'general AMBIENT zone atmosphere (room tone / open air)' },
  'amb.alarm':     { name: 'amb.alarm',     g: 0.5,  mapsTo: 'ALARM / warning loop — breach / overload / red alert' },
  'amb.water':     { name: 'amb.water',     g: 0.45, mapsTo: 'WATER / pump bed' },
};

const manifest = JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'));
await mkdir(FINAL, { recursive: true });
const letters = 'abcdefgh';
const winners = [], bank = {};
for (const [cue, takes] of Object.entries(PICKS)) {
  const cueU = cue.replace(/\./g, '_'), files = [], srcs = [];
  let i = 0;
  for (const tk of takes) {
    const srcStem = `${cueU}_${tk}`, src = join(OUT, srcStem + '.mp3');
    if (!existsSync(src)) { console.warn('MISSING', src); continue; }
    const outStem = `${cueU}_${letters[i]}`; await copyFile(src, join(FINAL, outStem + '.mp3'));
    const rec = manifest.files.find((f) => f.cue === cue && String(f.take).padStart(2, '0') === tk);
    files.push(`sfx-amb/final/${outStem}`); srcs.push({ take: tk, license: rec?.license, filter: rec?.filter });
    i++;
  }
  if (!files.length) continue;
  const s = SAMPLE[cue];
  winners.push({ cue, sample: s.name, mapsTo: s.mapsTo, files, sources: srcs });
  bank[s.name] = { f: files, g: s.g, loop: true };
}

const graded = Object.keys(PICKS);
const pending = manifest.cues.map((c) => c.cue).filter((c) => !graded.includes(c));

const wm = {
  format: 'lsw.sfx-amb.winners', version: 1, pickedBy: 'Robert', date: '2026-09-14',
  provenance: 'Real recordings. amb.wind = CC-BY InspectorJ/AntumDeluge (attribute); everything else CC0 (OpenGameArt). No AI, no synth. Loops crossfade-wrapped (seamless).',
  counts: { sounds: winners.length, files: winners.reduce((a, w) => a + w.files.length, 0) },
  pendingCues: pending, // beds Robert has NOT graded yet — no winner locked
  integration: {
    note: 'Ambient beds are LOOPS — paste `sampleBankManifest` into src/core/samples.js MANIFEST with loop:true and drive them via audio.sampleLoop(name) off the zone/district bed, NOT one-shot. Per-sound gain is a quiet starting point. Multiple files on one sample = alternate.',
    sampleBankManifest: bank,
  },
  winners,
};
await writeFile(join(FINAL, 'winners-manifest.json'), JSON.stringify(wm, null, 2));
console.log(`locked ${winners.length} sound(s) / ${wm.counts.files} file(s) -> public/audio/sfx-amb/final/`);
for (const w of winners) console.log('  ' + w.sample.padEnd(16), w.files.length + ' file(s)', '·', w.mapsTo);
if (pending.length) console.log('PENDING (no pick yet):', pending.join(', '));
