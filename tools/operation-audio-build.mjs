// tools/operation-audio-build.mjs
//
// Renders every operation-v1 cue from its deterministic recipe to a WAV master and a 44.1k/mono/96k
// MP3 derivative under public/audio/operation-v1/, then writes public/audio/operation-v1/manifest.json
// with measured durations, peak/RMS levels, checksums, and the exact SampleBank MANIFEST/HOT_SET
// snippet main needs to wire these in. WAV masters are the reproducible source of truth; the MP3s
// are the runtime derivatives the existing loader fetches (audio/<stem>.mp3).
//
//   node tools/operation-audio-build.mjs
//
// Reproducible: same recipes + same seeds => byte-identical WAV. MP3 bytes also depend on the
// ffmpeg/libmp3lame build recorded in the manifest.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { RECIPES, CUE_IDS, render, stem } from '../authoring/audio/operation-v1/recipes.mjs';
import { toWav16, measure, SR } from '../authoring/audio/operation-v1/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(ROOT, 'public', 'audio', 'operation-v1');           // .mp3 derivatives + manifest.json (web-served)
const MASTERS = join(ROOT, 'authoring', 'audio', 'operation-v1', 'masters'); // .wav masters (reproducible source, never fetched at runtime)
const REL = 'operation-v1'; // stem prefix used inside SampleBank MANIFEST `f:` entries

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);
function ffmpegVersion() {
  try { return execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0].trim(); }
  catch { return 'ffmpeg-unavailable'; }
}
const round = (x, n = 3) => Math.round(x * 10 ** n) / 10 ** n;

async function main() {
  await mkdir(RUNTIME, { recursive: true });
  await mkdir(MASTERS, { recursive: true });
  const ff = ffmpegVersion();
  const haveFfmpeg = !ff.startsWith('ffmpeg-unavailable');
  const files = [], cues = [];

  for (const id of CUE_IDS) {
    const rec = RECIPES[id], variants = [];
    for (let v = 0; v < rec.variants; v++) {
      const s = stem(id, v);
      const pcm = render(id, v);
      const m = measure(pcm);
      if (m.peak > 1.0001) throw new Error(`${s} clips (peak ${m.peak})`);
      const wav = toWav16(pcm);
      const wavPath = join(MASTERS, s + '.wav');
      await writeFile(wavPath, wav);
      let mp3Sha = null, mp3Bytes = 0;
      if (haveFfmpeg) {
        const mp3Path = join(RUNTIME, s + '.mp3');
        execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wavPath,
          '-ac', '1', '-ar', String(SR), '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', mp3Path]);
        const mb = readFileSync(mp3Path); mp3Sha = sha256(mb); mp3Bytes = mb.length;
      }
      const entry = {
        stem: s, sample: `${REL}/${s}`,
        durationSec: round(m.durationSec, 4), samples: m.samples, sampleRate: SR, channels: 1,
        peakDbfs: round(m.peakDbfs, 2), rmsDbfs: round(m.rmsDbfs, 2),
        wavBytes: wav.length, wavSha: sha256(wav), mp3Bytes, mp3Sha, recipe: 'authoring/audio/operation-v1/recipes.mjs', variant: v,
      };
      files.push(entry); variants.push(entry);
    }
    cues.push({ id, sampleName: id, variantStems: variants.map((e) => `${REL}/${e.stem}`),
      durationSec: round(variants.reduce((a, e) => a + e.durationSec, 0) / variants.length, 4),
      peakDbfsMax: round(Math.max(...variants.map((e) => e.peakDbfs)), 2) });
  }

  // exact SampleBank MANIFEST snippet (sample name -> {f:[stems], g, reach}); gains/reach recommended
  // per family. Main pastes this into src/core/samples.js (see the handoff for call sites).
  const REACH = { 'op.zombie': 150, 'op.shield': 150, 'op.portal': 170 }; // spatial families
  const manifestSnippet = {};
  for (const c of cues) {
    const fam = c.id.split('.').slice(0, 2).join('.');
    const spatial = c.id.startsWith('op.shield.') || c.id.startsWith('op.portal.') || c.id.startsWith('op.zombie.');
    const g = c.id.startsWith('op.squad.') || c.id.startsWith('op.pursuit.') ? 0.6 : c.id.startsWith('op.zombie.') ? 0.8 : 0.7;
    const e = { f: c.variantStems, g };
    if (spatial) e.reach = REACH[fam] ?? 160;
    manifestSnippet[c.id] = e;
  }
  const hotSet = ['op.hit.confirm', 'op.block.confirm', 'op.shield.hit', 'op.pursuit.spotted', 'op.zombie.attack'];

  const manifest = {
    format: 'lsw.operation-audio.manifest', version: 1,
    generatedBy: 'tools/operation-audio-build.mjs', recipes: 'authoring/audio/operation-v1/recipes.mjs',
    encoder: ff, mp3Rendered: haveFfmpeg, sampleRate: SR, channels: 1, mp3Bitrate: '96k',
    runtimeDir: 'public/audio/operation-v1/', mastersDir: 'authoring/audio/operation-v1/masters/',
    counts: { cues: cues.length, files: files.length },
    totalDurationSec: round(files.reduce((a, e) => a + e.durationSec, 0), 3),
    cues, files,
    integration: {
      note: 'Assets only; NOT wired. Paste `sampleBankManifest` into src/core/samples.js MANIFEST and, optionally, hotSet names into HOT_SET. Files load via audio/<stem>.mp3.',
      sampleBankManifest: manifestSnippet, hotSet,
    },
  };
  await writeFile(join(RUNTIME, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`operation-audio: ${cues.length} cues, ${files.length} files, ${manifest.totalDurationSec}s total`);
  console.log(`encoder: ${ff}`);
  let worst = -Infinity; for (const f of files) worst = Math.max(worst, f.peakDbfs);
  console.log(`peak ceiling across all assets: ${round(worst, 2)} dBFS (must be < 0)`);
  if (!haveFfmpeg) console.log('WARNING: ffmpeg not found — WAV masters written, MP3 derivatives skipped.');
}
main().catch((e) => { console.error(e); process.exit(1); });
