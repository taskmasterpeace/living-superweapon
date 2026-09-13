// tools/sfx-cc0b.mjs — round 2: the remaining gaps as real CC/CC0 recordings (+ synth fallback where
// no CC source exists), converted to game format, with an Artifact-ready grading page.
//   node tools/sfx-cc0b.mjs   ->  public/audio/sfx-cc0b/*.mp3 + manifest.json + artifacts/sfx-cc0b/pick.html
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'cc0-src');
const MASTERS = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'masters');
const OUT = join(ROOT, 'public', 'audio', 'sfx-cc0b');
const ART = join(ROOT, 'artifacts', 'sfx-cc0b');
const CCBY = 'CC-BY 3.0 — congusbongus (Footsteps on different surfaces)';
const CC0 = 'CC0 1.0 (public domain)';
const SYN = 'original synth — no CC0 source found (fallback)';
// source helpers (each returns {file, pack, license})
const fs_ = (surf, ...ix) => ix.map((i) => ({ file: join(SRC, 'footsurf', 'footsteps', surf, i + '.ogg'), pack: 'Footsteps on different surfaces (OpenGameArt)', license: CCBY }));
const ds = (n) => ({ file: join(SRC, 'diffsteps', n), pack: 'Different steps wood/stone/leaves/gravel/mud (OpenGameArt)', license: CC0 });
const car = (n) => ({ file: join(SRC, 'car', n + '.ogg'), pack: 'Car Sound Effects Pack (OpenGameArt)', license: CC0 });
const mw = (n) => ({ file: join(SRC, 'metalwood', n + '.ogg'), pack: '100 CC0 metal and wood SFX (OpenGameArt)', license: CC0 });
const sw = (n) => ({ file: join(SRC, 'swishes', 'swishes', n + '.wav'), pack: 'Swishes Sound Pack (OpenGameArt)', license: CC0 });
const ow = (sub, n) => ({ file: join(SRC, 'owlish', sub, n), pack: 'Owlish Media Sound Effects (OpenGameArt)', license: CC0 });
const s1 = (n) => ({ file: join(SRC, '100cc0', n + '.ogg'), pack: '100 CC0 SFX (OpenGameArt)', license: CC0 });
const syn = (n) => ({ file: join(MASTERS, n + '.wav'), pack: 'authoring/audio/sfx-gaps (synth)', license: SYN });

const CUR = [
  { cue: 'step.gravel', cat: 'Footsteps — surfaces', label: 'Footstep — gravel', mapsTo: 'new footstep surface',
    srcs: [...fs_('gravel', 0, 1, 2, 3, 4, 5, 6, 7, 8), ds('gravel.ogg')] },
  { cue: 'step.metal', cat: 'Footsteps — surfaces', label: 'Footstep — metal grating', mapsTo: 'new footstep surface',
    srcs: fs_('metal', 0, 1, 2, 3, 4, 5, 6, 7) },
  { cue: 'step.water', cat: 'Footsteps — surfaces', label: 'Footstep — water/puddle', mapsTo: 'new footstep surface',
    srcs: fs_('water', 0, 1, 2, 3, 4, 5, 6, 7) },
  { cue: 'step.mud', cat: 'Footsteps — surfaces', label: 'Footstep — mud (only 1 CC0 found)', mapsTo: 'new footstep surface',
    srcs: [ds('mud02.ogg')] },
  { cue: 'step.tile', cat: 'Footsteps — surfaces', label: 'Footstep — tile/polished (bonus)', mapsTo: 'bonus surface',
    srcs: fs_('tile', 0, 1, 2, 3, 4) },
  { cue: 'vehicle.door', cat: 'Vehicle', label: 'Vehicle — door', mapsTo: 'vehicle door open/close',
    srcs: [car('Car_Door_Open'), car('Car_Door_Close'), car('Car_Hood_Close'), car('Car_Trunk_Open')] },
  { cue: 'vehicle.boost', cat: 'Vehicle', label: 'Vehicle — boost/accelerate', mapsTo: 'vehicle boost',
    srcs: [car('Car_Acceleration'), car('Car_Acceleration_2'), car('Car_Engine_Start_Up'), car('Car_Engine_Loop')] },
  { cue: 'vehicle.impact', cat: 'Vehicle', label: 'Vehicle — impact/crash (metal)', mapsTo: 'vehicle damage',
    srcs: [mw('metal_hit_01'), mw('metal_hit_02'), mw('metal_hit_03'), mw('metal_hit_04'), mw('metal_falling_01'), mw('metal_falling_02'), mw('metal_sheet_01'), mw('metal_sheet_03')] },
  { cue: 'blade.slash', cat: 'Blade / slash', label: 'Blade — slash / whoosh', mapsTo: 'blade swing (variety)',
    srcs: [sw('swish-1'), sw('swish-2'), sw('swish-3'), sw('swish-5'), sw('swish-7'), sw('swish-9'), sw('swish-11'), sw('swish-13')] },
  { cue: 'slash.flesh', cat: 'Blade / slash', label: 'Slash into flesh (squish)', mapsTo: 'blade-into-flesh (NEW)',
    srcs: [ow('Impacts', 'fruit1.wav'), ow('Impacts', 'fruit2.wav'), ow('Impacts', 'fruit3.wav'), ow('Impacts', 'slap2.wav'), ow('Impacts', 'hit.wav')] },
  { cue: 'shell.casings', cat: 'Ballistic', label: 'Shell casings (brass-ish metal tinks, approx)', mapsTo: 'casings on ground (NEW)',
    srcs: [mw('keys_01'), mw('keys_02'), mw('keys_03'), mw('keys_04'), mw('keys_05'), mw('keys_06'), mw('keys_07'), s1('metal_01'), s1('metal_04'), s1('metal_07')] },
  { cue: 'ricochet', cat: 'Ballistic — SYNTH (no CC0 found)', label: 'Ricochet / whine-off', mapsTo: 'ricochet (NEW)',
    srcs: [syn('sfx_ricochet_01'), syn('sfx_ricochet_02'), syn('sfx_ricochet_03'), syn('sfx_ricochet_04'), syn('sfx_ricochet_05'), syn('sfx_ricochet_06')] },
  { cue: 'whizby', cat: 'Ballistic — SYNTH (no CC0 found)', label: 'Whiz-by / supersonic crack', mapsTo: 'whiz-by (NEW)',
    srcs: [syn('sfx_whizby_01'), syn('sfx_whizby_02'), syn('sfx_whizby_03'), syn('sfx_whizby_04'), syn('sfx_whizby_05'), syn('sfx_whizby_06')] },
];
function capFor(cue) {
  if (cue.startsWith('step.')) return 0.6;
  if (cue === 'vehicle.door') return 0.7; if (cue === 'vehicle.boost') return 1.6; if (cue === 'vehicle.impact') return 1.0;
  if (cue === 'blade.slash') return 0.6; if (cue === 'slash.flesh') return 0.5; if (cue === 'shell.casings') return 0.8;
  return 0.5;
}
function convert(src, dst, cap) {
  const af = `silenceremove=start_periods=1:start_duration=0.005:start_threshold=-50dB:detection=peak,atrim=end=${cap},afade=t=out:st=${Math.max(0, cap - 0.06).toFixed(3)}:d=0.06`;
  const tail = ['-ac', '1', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', dst];
  try { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', af, ...tail]); }
  catch { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-t', String(cap), ...tail]); }
}

async function main() {
  await mkdir(OUT, { recursive: true }); await mkdir(ART, { recursive: true });
  const cues = [], files = [];
  for (const c of CUR) {
    let i = 0; const takes = [];
    for (const s of c.srcs) {
      if (!existsSync(s.file)) { console.warn('MISSING', s.file); continue; }
      i++; const stem = c.cue.replace(/\./g, '_') + '_' + String(i).padStart(2, '0');
      convert(s.file, join(OUT, stem + '.mp3'), capFor(c.cue));
      const e = { cue: c.cue, take: i, stem, source: s.file.replace(SRC + '\\', '').replace(SRC + '/', '').replace(/\\/g, '/'), pack: s.pack, license: s.license };
      files.push(e); takes.push(e);
    }
    cues.push({ cue: c.cue, cat: c.cat, label: c.label, mapsTo: c.mapsTo, takes: takes.length,
      license: [...new Set(takes.map((t) => t.license))].join(' / ') });
  }
  const manifest = { format: 'lsw.sfx-cc0b.manifest', version: 1, note: 'Round 2 — remaining SFX gaps. Real CC/CC0 recordings; ricochet+whizby are synth (no CC0 source). Sources per file.', counts: { cues: cues.length, files: files.length }, cues, files };
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // ---- artifact-ready grading page (thumbs up/down, my-picks, copy) ----
  const cats = [...new Set(CUR.map((c) => c.cat))];
  let main = '';
  for (const cat of cats) {
    main += `<h2>${cat}</h2>`;
    for (const c of cues.filter((x) => x.cat === cat)) {
      let chips = '';
      for (const f of files.filter((f) => f.cue === c.cue)) {
        const nn = String(f.take).padStart(2, '0');
        const b64 = (await readFile(join(OUT, f.stem + '.mp3'))).toString('base64');
        chips += `<div class="take" data-snd="${c.cue}" data-take="${nn}"><div class="vote"><button class="up" aria-label="keep ${nn}">&#128077;</button><button class="down" aria-label="reject ${nn}">&#128078;</button></div><span class="tk">${nn}</span><audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio></div>`;
      }
      main += `<div class="snd"><div class="hd"><span class="cue">${c.cue}</span><span class="lbl">${c.label}</span><span class="map">&#8594; ${c.mapsTo}</span></div><div class="lic">${c.license}</div><div class="takes">${chips}</div></div>`;
    }
  }
  const html = `<title>PowerWorld SFX Review · Round 2</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
<style>
:root{--bg:#f3ece0;--surface:#fbf6ec;--surface2:#efe6d6;--line:#d8cbb2;--text:#2a2318;--muted:#7a6f58;--gold:#a9781a;--keep:#4a7a1e;--keepbg:#e7f0d5;--rej:#a8402a;--rejbg:#f2ddd6;--disp:'Rajdhani',system-ui,sans-serif;--mono:ui-monospace,Consolas,monospace}
:root:not([data-theme="light"]){@media(prefers-color-scheme:dark){--bg:#15120c;--surface:#1e1a12;--surface2:#241f15;--line:#3a3020;--text:#ece4d2;--muted:#9a907c;--gold:#e0a63a;--keep:#9ccf5a;--keepbg:#23301433;--rej:#e0754a;--rejbg:#3a1f1433}}
:root[data-theme="dark"]{--bg:#15120c;--surface:#1e1a12;--surface2:#241f15;--line:#3a3020;--text:#ece4d2;--muted:#9a907c;--gold:#e0a63a;--keep:#9ccf5a;--keepbg:#23301433;--rej:#e0754a;--rejbg:#3a1f1433}
*{box-sizing:border-box}body{background:var(--bg);color:var(--text);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1040px;padding:0 clamp(14px,4vw,40px) 60px}
h1{font:700 26px/1.1 var(--disp);letter-spacing:.02em;margin:0}
h2{font:600 15px/1 var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);border-bottom:1px solid var(--line);padding-bottom:6px;margin:30px 0 10px}
#bar{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
#bar .sub{color:var(--muted);font-size:13px}#count{font:700 15px var(--disp);letter-spacing:.06em;color:var(--gold);margin-left:auto}
.panel{background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0}
.panel h3{font:600 12px var(--disp);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
button.act{font:600 13px var(--disp);letter-spacing:.04em;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 14px;cursor:pointer}
button.act.primary{background:var(--gold);color:#15120c;border-color:var(--gold)}
button.act:focus-visible,.up:focus-visible,.down:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
textarea{width:100%;height:88px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;font:12.5px/1.5 var(--mono);padding:8px;margin-top:8px;resize:vertical}
.empty{color:var(--muted);font-size:13px}
.snd{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px;margin:9px 0}
.hd{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.cue{font:600 13px var(--mono);color:var(--gold)}.lbl{font-weight:600}.map{font:12px var(--mono);color:var(--muted);margin-left:auto}
.lic{font:11px var(--mono);color:var(--muted);margin-top:2px}
.takes{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.take{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:5px 8px}
.take.keep{border-color:var(--keep);background:var(--keepbg)}.take.rej{border-color:var(--rej);background:var(--rejbg);opacity:.6}
.vote{display:flex;gap:3px}.up,.down{font-size:15px;line-height:1;background:transparent;border:1px solid var(--line);border-radius:7px;padding:3px 6px;cursor:pointer;filter:grayscale(1) opacity(.5)}
.take.keep .up{filter:none;border-color:var(--keep);background:var(--keepbg)}.take.rej .down{filter:none;border-color:var(--rej);background:var(--rejbg)}
.tk{font:600 12px var(--mono);color:var(--muted);width:20px;text-align:center}.take audio{height:30px;max-width:190px}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<header id="bar"><h1>SFX REVIEW &middot; R2</h1><span class="sub">Remaining gaps &middot; real CC/CC0 &middot; tap &#128077;/&#128078;</span><span id="count">0 kept</span></header>
<div class="panel"><h3>My picks</h3><div id="pickslist" class="empty">Nothing kept yet.</div>
<div style="display:flex;gap:10px;margin-top:10px"><button id="copy" class="act primary">&#128203; Copy my picks</button><button id="clr" class="act">Clear all</button></div>
<textarea id="picksbox" readonly placeholder="Kept takes appear here — copy and paste back in chat."></textarea></div>
${main}
<script>
const KEY='pwSfxVotesR2';let v={};try{v=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const k=el=>el.dataset.snd+'|'+el.dataset.take;
function render(){let kept=[];document.querySelectorAll('.take').forEach(el=>{const x=v[k(el)];el.classList.toggle('keep',x==='up');el.classList.toggle('rej',x==='down');if(x==='up')kept.push(el.dataset.snd+' -> '+el.dataset.take);});document.getElementById('count').textContent=kept.length+' kept';const L=document.getElementById('pickslist');if(kept.length){L.classList.remove('empty');L.innerHTML=kept.map(s=>'<div style="font:600 13px var(--mono)">&#10003; '+s+'</div>').join('');}else{L.classList.add('empty');L.textContent='Nothing kept yet.';}document.getElementById('picksbox').value=kept.join('\\n');}
document.addEventListener('click',e=>{const b=e.target.closest('.up,.down');if(!b)return;const el=b.closest('.take'),kk=k(el),w=b.classList.contains('up')?'up':'down';v[kk]=v[kk]===w?undefined:w;if(!v[kk])delete v[kk];try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}render();});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picksbox');if(!t.value)return;t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}const b=document.getElementById('copy'),o=b.textContent;b.textContent='Copied \\u2713';setTimeout(()=>b.textContent=o,1200);};
document.getElementById('clr').onclick=()=>{v={};try{localStorage.removeItem(KEY)}catch(e){}render();};
render();
</script>`;
  await writeFile(join(ART, 'pick.html'), html);
  console.log(`sfx-cc0b: ${cues.length} sounds / ${files.length} takes converted`);
  for (const c of cues) console.log('  ' + c.cue.padEnd(15), c.takes + ' takes', '·', c.license);
  console.log('artifact page: artifacts/sfx-cc0b/pick.html', ((html.length / 1e6).toFixed(2)) + 'MB');
}
main().catch((e) => { console.error(e); process.exit(1); });
