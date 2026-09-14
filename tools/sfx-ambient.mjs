// tools/sfx-ambient.mjs — ambient / zone beds + machinery loops (wind, rain, generator hum, alarms,
// water). Real CC/CC0 loops. Wind variants are EQ-processed from one real recording (not synth).
//   node tools/sfx-ambient.mjs  ->  public/audio/sfx-amb/*.mp3 + manifest.json + artifacts/sfx-amb/pick.html
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { toWav16, SR } from '../authoring/audio/sfx-gaps/synth.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'cc0-src');
const OUT = join(ROOT, 'public', 'audio', 'sfx-amb');
const ART = join(ROOT, 'artifacts', 'sfx-amb');
const lp = (n) => join(SRC, 'loops30', n + '.ogg');   // 30 CC0 SFX loops (CC0)
const WIND = join(SRC, 'wind-01.ogg');                 // Wind Loop (CC-BY InspectorJ/AntumDeluge)
const CC0 = 'CC0 1.0 (30 CC0 SFX loops — OpenGameArt)';
const CCBYW = 'CC-BY 3.0 — InspectorJ / AntumDeluge (Wind Loop, OpenGameArt)';

// cue | LOOP | spec | sources [{file, filter?, license}]
const CUR = [
  { cue: 'amb.wind', loop: true, spec: 'WIND bed — the audio indicator for the wind that pushes you around. 3 flavours from one real recording (raw / distant-soft / gusty-bright).',
    srcs: [{ file: WIND, license: CCBYW }, { file: WIND, filter: 'lowpass=f=1100', license: CCBYW }, { file: WIND, filter: 'highpass=f=280,volume=2dB', license: CCBYW }] },
  { cue: 'amb.rain', loop: true, spec: 'RAIN bed for a rainy theatre.', srcs: [{ file: lp('rain'), license: CC0 }, { file: lp('rain'), filter: 'lowpass=f=2200', license: CC0 }] },
  { cue: 'gen.hum', loop: true, spec: 'GENERATOR / reactor hum — steady electrical/machine loop under a generator you can hit. 6 options.',
    srcs: ['machine_01', 'machine_02', 'machine_03', 'machine_05', 'machine_07', 'machine_09'].map((n) => ({ file: lp(n), license: CC0 })) },
  { cue: 'amb.machinery', loop: true, spec: 'MACHINERY / industrial zone bed (factory, works district). 5 options.',
    srcs: ['machine_04', 'machine_06', 'machine_08', 'machine_10', 'machine_11'].map((n) => ({ file: lp(n), license: CC0 })) },
  { cue: 'amb.bed', loop: true, spec: 'General AMBIENT zone atmosphere (room tone / open air). 3 options.',
    srcs: ['ambient_01', 'ambient_02', 'ambient_03'].map((n) => ({ file: lp(n), license: CC0 })) },
  { cue: 'amb.alarm', loop: true, spec: 'ALARM / warning loop — base breach, generator overload, red alert. 3 options.',
    srcs: ['alarm_01', 'alarm_02', 'alarm_03'].map((n) => ({ file: lp(n), license: CC0 })) },
  { cue: 'amb.water', loop: true, spec: 'WATER / pump — flowing water + industrial pump beds.',
    srcs: [{ file: lp('water_flowing'), license: CC0 }, { file: lp('pump_01'), license: CC0 }, { file: lp('pump_02'), license: CC0 }] },
];
// read a canonical PCM16 mono WAV -> Float32
function readWav(buf) {
  let p = 12; while (p + 8 <= buf.length) { const id = buf.toString('ascii', p, p + 4), sz = buf.readUInt32LE(p + 4);
    if (id === 'data') { const n = sz >> 1, o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = buf.readInt16LE(p + 8 + i * 2) / 32768; return o; } p += 8 + sz + (sz & 1); }
  return new Float32Array(0);
}
// crossfade-wrap: blend the tail over the head so out[0] flows continuously from out[end] (equal-power),
// then repeat so the audition plays seamless internal loops (game should use buffer-loop / loopStart-End).
function seamless(pcm, cfSec = 0.3, reps = 3) {
  const L = pcm.length, cf = Math.min(Math.round(cfSec * SR), Math.floor(L * 0.25));
  if (cf < 8) return pcm;
  const one = new Float32Array(L - cf);
  for (let i = 0; i < L - cf; i++) one[i] = pcm[i];
  for (let i = 0; i < cf; i++) { const w = i / cf; one[i] = pcm[i] * Math.sqrt(w) + pcm[L - cf + i] * Math.sqrt(1 - w); }
  const out = new Float32Array(one.length * reps);
  for (let r = 0; r < reps; r++) out.set(one, r * one.length);
  return out;
}
// loops: decode (+EQ) -> crossfade-wrap for a truly seamless loop -> mp3
function convert(src, dst, filter) {
  const tmp = dst.replace(/\.mp3$/, '.tmp.wav'), tmp2 = dst.replace(/\.mp3$/, '.seam.wav');
  const dec = ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-t', '4.2', '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', tmp];
  if (filter) dec.splice(8, 0, '-af', filter);
  execFileSync('ffmpeg', dec);
  const pcm = readWav(readFileSync(tmp));
  writeFileSync(tmp2, toWav16(seamless(pcm, 0.3, 2)));
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', tmp2, '-ac', '1', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', dst]);
  rmSync(tmp, { force: true }); rmSync(tmp2, { force: true });
}
async function main() {
  await mkdir(OUT, { recursive: true }); await mkdir(ART, { recursive: true });
  const cues = [], files = [];
  for (const c of CUR) {
    let i = 0; const takes = [];
    for (const s of c.srcs) {
      if (!existsSync(s.file)) { console.warn('MISSING', s.file); continue; }
      i++; const stem = c.cue.replace(/\./g, '_') + '_' + String(i).padStart(2, '0');
      convert(s.file, join(OUT, stem + '.mp3'), s.filter);
      files.push({ cue: c.cue, take: i, stem, license: s.license, filter: s.filter || '' }); takes.push(i);
    }
    cues.push({ cue: c.cue, loop: c.loop, spec: c.spec, takes: takes.length, license: [...new Set(c.srcs.map((s) => s.license))].join(' / ') });
  }
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({ format: 'lsw.sfx-amb.manifest', version: 1, note: 'Ambient/zone loops. All CC0 except amb.wind = CC-BY InspectorJ/AntumDeluge (attribute).', counts: { cues: cues.length, files: files.length }, cues, files }, null, 2));

  let main = '<h2>Ambient &amp; zone loops</h2>';
  for (const c of cues) {
    let chips = '';
    for (const f of files.filter((f) => f.cue === c.cue)) { const nn = String(f.take).padStart(2, '0'); const b64 = (await readFile(join(OUT, f.stem + '.mp3'))).toString('base64'); chips += `<div class="take" data-snd="${c.cue}" data-take="${nn}"><div class="vote"><button class="up">&#128077;</button><button class="down">&#128078;</button></div><span class="tk">${nn}</span><audio controls preload="none" loop src="data:audio/mpeg;base64,${b64}"></audio></div>`; }
    main += `<div class="snd"><div class="hd"><span class="cue">${c.cue}</span>${c.loop ? '<span class="map">LOOP</span>' : ''}</div><div class="spec">${c.spec}</div><div class="lic">${c.license}</div><div class="takes">${chips}</div></div>`;
  }
  const html = `<title>PowerWorld Ambient SFX</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
<style>
:root{--bg:#f3ece0;--surface:#fbf6ec;--surface2:#efe6d6;--line:#d8cbb2;--text:#2a2318;--muted:#7a6f58;--gold:#a9781a;--keep:#4a7a1e;--keepbg:#e7f0d5;--rej:#a8402a;--rejbg:#f2ddd6;--disp:'Rajdhani',system-ui,sans-serif;--mono:ui-monospace,Consolas,monospace}
:root:not([data-theme="light"]){@media(prefers-color-scheme:dark){--bg:#15120c;--surface:#1e1a12;--surface2:#241f15;--line:#3a3020;--text:#ece4d2;--muted:#9a907c;--gold:#e0a63a;--keep:#9ccf5a;--keepbg:#23301433;--rej:#e0754a;--rejbg:#3a1f1433}}
:root[data-theme="dark"]{--bg:#15120c;--surface:#1e1a12;--surface2:#241f15;--line:#3a3020;--text:#ece4d2;--muted:#9a907c;--gold:#e0a63a;--keep:#9ccf5a;--keepbg:#23301433;--rej:#e0754a;--rejbg:#3a1f1433}
*{box-sizing:border-box}body{background:var(--bg);color:var(--text);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1000px;padding:0 clamp(14px,4vw,40px) 60px}
h1{font:700 26px var(--disp);margin:0}h2{font:600 15px var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);border-bottom:1px solid var(--line);padding-bottom:6px;margin:26px 0 10px}
#bar{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}#bar .sub{color:var(--muted);font-size:13px}#count{font:700 15px var(--disp);color:var(--gold);margin-left:auto}
.panel{background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0}.panel h3{font:600 12px var(--disp);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
button.act{font:600 13px var(--disp);background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 14px;cursor:pointer}button.act.primary{background:var(--gold);color:#15120c;border-color:var(--gold)}
button.act:focus-visible,.up:focus-visible,.down:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
textarea{width:100%;height:88px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;font:12.5px/1.5 var(--mono);padding:8px;margin-top:8px;resize:vertical}.empty{color:var(--muted);font-size:13px}
.snd{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px;margin:9px 0}.hd{display:flex;gap:10px;align-items:baseline}.cue{font:600 14px var(--mono);color:var(--gold)}.map{font:11px var(--mono);color:var(--muted);margin-left:auto;border:1px solid var(--line);border-radius:5px;padding:1px 6px}
.spec{color:var(--muted);font-size:13.5px;margin:4px 0 2px}.lic{font:11px var(--mono);color:var(--muted);margin-bottom:2px}
.takes{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.take{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:5px 8px}
.take.keep{border-color:var(--keep);background:var(--keepbg)}.take.rej{border-color:var(--rej);background:var(--rejbg);opacity:.6}
.vote{display:flex;gap:3px}.up,.down{font-size:15px;background:transparent;border:1px solid var(--line);border-radius:7px;padding:3px 6px;cursor:pointer;filter:grayscale(1) opacity(.5)}
.take.keep .up{filter:none;border-color:var(--keep);background:var(--keepbg)}.take.rej .down{filter:none;border-color:var(--rej);background:var(--rejbg)}
.tk{font:600 12px var(--mono);color:var(--muted);width:20px;text-align:center}.take audio{height:30px;max-width:200px}
</style>
<header id="bar"><h1>AMBIENT SFX</h1><span class="sub">Zone beds &amp; machinery loops &middot; players loop &middot; tap &#128077;/&#128078;</span><span id="count">0 kept</span></header>
<div class="panel"><h3>My picks</h3><div id="pickslist" class="empty">Nothing kept yet.</div><div style="display:flex;gap:10px;margin-top:10px"><button id="copy" class="act primary">&#128203; Copy my picks</button><button id="clr" class="act">Clear</button></div><textarea id="picksbox" readonly placeholder="Kept takes appear here."></textarea></div>
<p class="sub" style="color:var(--muted)">These loop while playing (click a clip — it repeats). <b>amb.wind</b> is your wind push-indicator; <b>gen.hum</b> sits under generators you can hit.</p>
${main}
<script>
const KEY='pwAmbVotes';let v={};try{v=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const k=el=>el.dataset.snd+'|'+el.dataset.take;
function render(){let kept=[];document.querySelectorAll('.take').forEach(el=>{const x=v[k(el)];el.classList.toggle('keep',x==='up');el.classList.toggle('rej',x==='down');if(x==='up')kept.push(el.dataset.snd+' -> '+el.dataset.take);});document.getElementById('count').textContent=kept.length+' kept';const L=document.getElementById('pickslist');if(kept.length){L.classList.remove('empty');L.innerHTML=kept.map(s=>'<div style="font:600 13px var(--mono)">&#10003; '+s+'</div>').join('');}else{L.classList.add('empty');L.textContent='Nothing kept yet.';}document.getElementById('picksbox').value=kept.join('\\n');}
document.addEventListener('click',e=>{const b=e.target.closest('.up,.down');if(!b)return;const el=b.closest('.take'),kk=k(el),w=b.classList.contains('up')?'up':'down';v[kk]=v[kk]===w?undefined:w;if(!v[kk])delete v[kk];try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}render();});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picksbox');if(!t.value)return;t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}const b=document.getElementById('copy'),o=b.textContent;b.textContent='Copied \\u2713';setTimeout(()=>b.textContent=o,1200);};
document.getElementById('clr').onclick=()=>{v={};try{localStorage.removeItem(KEY)}catch(e){}render();};
render();
</script>`;
  await writeFile(join(ART, 'pick.html'), html);
  console.log(`sfx-amb: ${cues.length} beds / ${files.length} takes`);
  for (const c of cues) console.log('  ' + c.cue.padEnd(14), c.takes + ' takes', '·', c.license);
}
main().catch((e) => { console.error(e); process.exit(1); });
