// tools/sfx-gaps.mjs
//
// Renders every missing-SFX sound × N takes to WAV masters + MP3, writes a manifest, and builds a
// self-contained CLICKABLE + VOTABLE audition page: click PICK on your favourite take per sound, it
// saves as you go (localStorage), and "Copy my picks" hands the list back.
//
//   node tools/sfx-gaps.mjs
//
// Outputs: authoring/audio/sfx-gaps/masters/<stem>.wav · public/audio/sfx-gaps/<stem>.mp3
//          public/audio/sfx-gaps/manifest.json · artifacts/sfx-gaps/audition.html

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
  const manifest = { format: 'lsw.sfx-gaps.manifest', version: 2, generatedBy: 'tools/sfx-gaps.mjs', recipes: 'authoring/audio/sfx-gaps/recipes-sfx.mjs', encoder: ff, sampleRate: SR, channels: 1, mp3Bitrate: '96k', takesPerSound: SOUNDS[0].variants, counts: { sounds: cues.length, files: files.length }, cues, files };
  await writeFile(join(RUNTIME, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // sanity: how much do takes actually differ? report the duration spread per sound (0 = identical)
  const spreads = cues.map((c) => { const d = files.filter((f) => f.id === c.id).map((f) => f.durationSec); return Math.max(...d) - Math.min(...d); });

  // ---- clickable + votable audition page ----
  const cats = [...new Set(SOUNDS.map((s) => s.cat))];
  let bodyHtml = '';
  for (const cat of cats) {
    bodyHtml += `<h2>${cat}</h2>`;
    for (const s of SOUNDS.filter((x) => x.cat === cat)) {
      let takesHtml = '';
      for (let v = 0; v < s.variants; v++) {
        const st = stem(s.id, v), nn = String(v + 1).padStart(2, '0');
        const b64 = haveFf ? (await readFile(join(RUNTIME, st + '.mp3'))).toString('base64') : '';
        takesHtml += `<div class="take" data-take="${nn}"><button class="pick">PICK ${nn}</button>`
          + (b64 ? `<audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio>` : `<i>no mp3</i>`) + `</div>`;
      }
      bodyHtml += `<div class="snd" data-snd="${s.id}"><div class="hd"><b>${s.id}</b> <span class="lbl">${s.label}</span>`
        + (s.note ? `<span class="note">${s.note}</span>` : '') + (s.mapsTo ? `<span class="map">→ ${s.mapsTo}</span>` : '')
        + `<span class="chosen"></span></div><div class="takes">${takesHtml}</div></div>`;
    }
  }
  const total = SOUNDS.length;
  const html = `<!doctype html><meta charset="utf-8"><title>SFX gaps — pick a take</title>
<style>
body{background:#17140f;color:#e9e2d4;font:14px/1.5 system-ui;margin:0;padding:0 24px 48px;max-width:1000px}
#bar{position:sticky;top:0;background:#0f0d09;border-bottom:1px solid #3a3222;padding:10px 0;display:flex;gap:10px;align-items:center;z-index:5}
#bar b{color:#e0a63a}#count{color:#b8ad97}
#bar button{background:#2a2417;color:#e9e2d4;border:1px solid #3a3222;border-radius:6px;padding:5px 11px;cursor:pointer}
#copy{background:#3a2a12;border-color:#7a5a24;color:#e0a63a;font-weight:600}
textarea#picks{width:100%;height:70px;background:#12100b;color:#c9bfa6;border:1px solid #2c2619;border-radius:8px;font:12px ui-monospace,monospace;margin:8px 0;box-sizing:border-box;padding:6px}
.sub{color:#8a8270;font-size:12px;margin:4px 0 0}
h2{color:#e0a63a;border-bottom:1px solid #3a3222;padding-bottom:4px;margin-top:22px}
.snd{border:1px solid #2c2619;border-radius:10px;padding:9px 12px;margin:8px 0;background:#1e1a12}
.snd.done{border-color:#5a7a2a;background:#1a2012}
.hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbl{color:#b8ad97}.note{color:#8f8570;font-style:italic}
.map{font:11px ui-monospace,monospace;color:#c9a24a}
.chosen{margin-left:auto;font:12px ui-monospace,monospace;color:#9ccf5a}
.takes{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}
.take{display:flex;align-items:center;gap:6px;border:1px solid transparent;border-radius:8px;padding:3px 6px}
.take.sel{border-color:#9ccf5a;background:#20301488}
.pick{background:#241f14;color:#c9bfa6;border:1px solid #3a3222;border-radius:6px;padding:3px 9px;font:11px ui-monospace,monospace;cursor:pointer}
.take.sel .pick{background:#3a5a1a;border-color:#9ccf5a;color:#eaffd0}
.take audio{height:28px}
</style>
<div id="bar"><b>PICK A TAKE</b> <span id="count"></span>
 <button id="copy">📋 Copy my picks</button><button id="clr">clear</button></div>
<textarea id="picks" readonly placeholder="your picks show up here — copy this back to me"></textarea>
<p class="sub">${total} sounds × ${SOUNDS[0].variants} takes · each take is a genuinely different voicing (pitch/length/punch/brightness vary) · encoder ${ff} · <b>UNWIRED</b>. Click <b>PICK</b> on your favourite take of each sound — picks save automatically.</p>
${bodyHtml}
<script>
const KEY='sfxPicks_v2';
let picks={};try{picks=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const TOTAL=${total};
function render(){
  let n=0,lines=[];
  document.querySelectorAll('.snd').forEach(el=>{
    const id=el.dataset.snd, tk=picks[id];
    el.classList.toggle('done',!!tk);
    el.querySelector('.chosen').textContent=tk?('\\u2713 take '+tk):'';
    el.querySelectorAll('.take').forEach(t=>t.classList.toggle('sel',t.dataset.take===tk));
    if(tk){n++;lines.push(id+' -> '+tk);}
  });
  document.getElementById('count').textContent=n+' / '+TOTAL+' picked';
  document.getElementById('picks').value=lines.join('\\n');
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('.pick'); if(!btn)return;
  picks[btn.closest('.snd').dataset.snd]=btn.closest('.take').dataset.take;
  try{localStorage.setItem(KEY,JSON.stringify(picks))}catch(e){} render();
});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picks');t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}};
document.getElementById('clr').onclick=()=>{picks={};try{localStorage.removeItem(KEY)}catch(e){}render();};
render();
</script>`;
  await writeFile(join(ART, 'audition.html'), html);

  console.log(`sfx-gaps: ${cues.length} sounds × ${SOUNDS[0].variants} takes = ${files.length} files`);
  console.log(`peak ceiling: ${round(Math.max(...files.map((f) => f.peakDbfs)))} dBFS`);
  console.log(`take duration spread (0=identical): min ${round(Math.min(...spreads), 3)}s, max ${round(Math.max(...spreads), 3)}s across sounds`);
  console.log(`audition: artifacts/sfx-gaps/audition.html`);
  if (!haveFf) console.log('WARNING: ffmpeg missing — WAV only.');
}
main().catch((e) => { console.error(e); process.exit(1); });
