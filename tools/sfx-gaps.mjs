// tools/sfx-gaps.mjs
//
// Renders every missing-SFX sound × N takes to WAV masters + MP3, writes a manifest, and builds a
// self-contained CLICKABLE audition page where you pick a winning take per sound.
//
//   node tools/sfx-gaps.mjs
//
// Outputs:
//   authoring/audio/sfx-gaps/masters/<stem>.wav   (reproducible source)
//   public/audio/sfx-gaps/<stem>.mp3              (44.1k/mono/96k, matches the library)
//   public/audio/sfx-gaps/manifest.json           (measurements + checksums)
//   artifacts/sfx-gaps/audition.html              (open it — play + pick per take)

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { SOUNDS, render, stem } from '../authoring/audio/sfx-gaps/recipes-sfx.mjs';
import { toWav16, measure, SR } from '../authoring/audio/sfx-gaps/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNTIME = join(ROOT, 'public', 'audio', 'sfx-gaps');
const MASTERS = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'masters');
const ART = join(ROOT, 'artifacts', 'sfx-gaps');
const sha = (b) => createHash('sha256').update(b).digest('hex').slice(0, 16);
const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;
function ffver() { try { return execFileSync('ffmpeg', ['-version'], { encoding: 'utf8' }).split('\n')[0].trim(); } catch { return 'ffmpeg-unavailable'; } }

async function main() {
  await mkdir(RUNTIME, { recursive: true }); await mkdir(MASTERS, { recursive: true }); await mkdir(ART, { recursive: true });
  const ff = ffver(), haveFf = !ff.startsWith('ffmpeg-unavailable');
  const files = [], cues = [];
  for (const s of SOUNDS) {
    const takes = [];
    for (let v = 0; v < s.variants; v++) {
      const st = stem(s.id, v), pcm = render(s.id, v), m = measure(pcm);
      if (m.peak > 1.0001) throw new Error(`${st} clips`);
      const wav = toWav16(pcm); await writeFile(join(MASTERS, st + '.wav'), wav);
      let mp3Bytes = 0;
      if (haveFf) { const mp3 = join(RUNTIME, st + '.mp3'); execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', join(MASTERS, st + '.wav'), '-ac', '1', '-ar', String(SR), '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', mp3]); mp3Bytes = readFileSync(mp3).length; }
      const e = { id: s.id, take: v + 1, stem: st, durationSec: round(m.durationSec, 3), peakDbfs: round(m.peakDbfs), rmsDbfs: round(m.rmsDbfs), wavSha: sha(wav), mp3Bytes };
      files.push(e); takes.push(e);
    }
    cues.push({ id: s.id, cat: s.cat, label: s.label, note: s.note || '', mapsTo: s.mapsTo || '', takes: takes.length });
  }
  const manifest = { format: 'lsw.sfx-gaps.manifest', version: 1, generatedBy: 'tools/sfx-gaps.mjs', recipes: 'authoring/audio/sfx-gaps/recipes-sfx.mjs', encoder: ff, sampleRate: SR, channels: 1, mp3Bitrate: '96k', takesPerSound: SOUNDS[0].variants, counts: { sounds: cues.length, files: files.length }, cues, files };
  await writeFile(join(RUNTIME, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // ---- clickable audition page (embed the real MP3s; pick a take per sound) ----
  const cats = [...new Set(SOUNDS.map((s) => s.cat))];
  let body = '';
  for (const cat of cats) {
    body += `<h2>${cat}</h2>`;
    for (const s of SOUNDS.filter((x) => x.cat === cat)) {
      let takesHtml = '';
      for (let v = 0; v < s.variants; v++) {
        const st = stem(s.id, v);
        const b64 = haveFf ? (await readFile(join(RUNTIME, st + '.mp3'))).toString('base64') : '';
        takesHtml += `<div class="take"><span class="tk">${String(v + 1).padStart(2, '0')}</span>`
          + (b64 ? `<audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio>` : `<i>no mp3</i>`) + `</div>`;
      }
      body += `<div class="snd"><div class="hd"><b>${s.id}</b> <span class="lbl">${s.label}</span>`
        + (s.note ? `<span class="note">${s.note}</span>` : '') + (s.mapsTo ? `<span class="map">→ ${s.mapsTo}</span>` : '')
        + `<span class="tag warn">UNWIRED</span></div><div class="takes">${takesHtml}</div></div>`;
    }
  }
  const html = `<!doctype html><meta charset="utf-8"><title>SFX gaps audition</title>
<style>body{background:#17140f;color:#e9e2d4;font:14px/1.5 system-ui;margin:0;padding:20px 24px;max-width:1000px}
h1{font-size:20px}h2{color:#e0a63a;border-bottom:1px solid #3a3222;padding-bottom:4px;margin-top:24px}
.snd{border:1px solid #2c2619;border-radius:10px;padding:9px 12px;margin:8px 0;background:#1e1a12}
.hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbl{color:#b8ad97}.note{color:#8f8570;font-style:italic}
.map{font:11px ui-monospace,monospace;color:#c9a24a}.tag.warn{font:11px ui-monospace,monospace;background:#3a2417;border:1px solid #7a4a24;border-radius:5px;padding:1px 6px;color:#e0a63a}
.takes{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}
.take{display:flex;align-items:center;gap:5px}.tk{font:11px ui-monospace,monospace;color:#8a8270;width:18px;text-align:right}
.take audio{height:28px}small{color:#8a8270}</style>
<h1>MISSING SFX — audition &amp; pick a take</h1>
<small>Original deterministic DSP synthesis · ${cues.length} sounds × ${SOUNDS[0].variants} takes = ${files.length} files · encoder ${ff} · <b>UNWIRED</b>, nothing merged. Tell me the winning take number per sound (e.g. "impact.metal → 03").</small>
${body}`;
  await writeFile(join(ART, 'audition.html'), html);

  console.log(`sfx-gaps: ${cues.length} sounds × ${SOUNDS[0].variants} takes = ${files.length} files`);
  console.log(`peak ceiling: ${round(Math.max(...files.map((f) => f.peakDbfs)))} dBFS`);
  console.log(`audition: artifacts/sfx-gaps/audition.html`);
  if (!haveFf) console.log('WARNING: ffmpeg missing — WAV only.');
}
main().catch((e) => { console.error(e); process.exit(1); });
