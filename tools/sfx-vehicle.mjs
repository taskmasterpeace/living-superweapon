// tools/sfx-vehicle.mjs — the vehicle audio set (the "more vehicle" ask): full car pack curated into
// game events, each with a plain-English spec so Robert can point at what he wants. Grading Artifact.
//   node tools/sfx-vehicle.mjs  ->  public/audio/sfx-veh/*.mp3 + manifest.json + artifacts/sfx-veh/pick.html
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'cc0-src');
const OUT = join(ROOT, 'public', 'audio', 'sfx-veh');
const ART = join(ROOT, 'artifacts', 'sfx-veh');
const car = (n) => join(SRC, 'car', n + '.ogg');
const mw = (n) => join(SRC, 'metalwood', n + '.ogg');
const s1 = (n) => join(SRC, '100cc0', n + '.ogg');

// event | spec (what it IS / when it fires) | sources | cap
const VEH = [
  { cue: 'veh.start', spec: 'Ignition: starter cranks, engine catches and settles to idle. Fires when the player starts the vehicle.', srcs: [car('Car_Engine_Start_Up')], cap: 1.8 },
  { cue: 'veh.idle', spec: 'Steady low engine rumble while running/parked — a seamless LOOP under the vehicle.', srcs: [car('Car_Engine_Loop'), car('Car_Engine_Loop_2')], cap: 1.8, loop: true },
  { cue: 'veh.accel', spec: 'RPM climbs — the boost / pull-away when the player hits the gas.', srcs: [car('Car_Acceleration'), car('Car_Acceleration_2')], cap: 1.8 },
  { cue: 'veh.off', spec: 'Engine powers down and dies. Fires on stop/exit.', srcs: [car('Car_Engine_Turning_Off')], cap: 1.4 },
  { cue: 'veh.door.open', spec: 'Handle + hinge, door swings open. Fires when entering.', srcs: [car('Car_Door_Open')], cap: 0.9 },
  { cue: 'veh.door.close', spec: 'Door thunks shut, latch clicks. Fires when seated / exiting.', srcs: [car('Car_Door_Close')], cap: 0.9 },
  { cue: 'veh.hood', spec: 'Hood/bonnet metal creak + latch (open/close).', srcs: [car('Car_Hood_Open'), car('Car_Hood_Close')], cap: 0.9 },
  { cue: 'veh.trunk', spec: 'Trunk/boot lid opens.', srcs: [car('Car_Trunk_Open')], cap: 0.9 },
  { cue: 'veh.horn', spec: 'Car horn honk.', srcs: [car('Car_Horn')], cap: 1.2 },
  { cue: 'veh.brake', spec: 'Handbrake / parking-brake ratchet pull.', srcs: [car('Car_Parking_Brake')], cap: 0.9 },
  { cue: 'veh.impact', spec: 'Collision / crash — metal crunch + debris. Fires on vehicle damage. (from metal SFX; a real car-crash pack would be better.)', srcs: [mw('metal_hit_01'), mw('metal_hit_03'), mw('metal_falling_01'), mw('metal_sheet_01'), s1('slam_01'), s1('slam_04')], cap: 1.0 },
];
function convert(src, dst, cap) {
  const af = `silenceremove=start_periods=1:start_duration=0.005:start_threshold=-50dB:detection=peak,atrim=end=${cap},afade=t=out:st=${Math.max(0, cap - 0.06).toFixed(3)}:d=0.06`;
  const tail = ['-ac', '1', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', dst];
  try { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', af, ...tail]); }
  catch { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-t', String(cap), ...tail]); }
}
async function main() {
  await mkdir(OUT, { recursive: true }); await mkdir(ART, { recursive: true });
  const cues = [], files = [];
  for (const c of VEH) {
    let i = 0; const takes = [];
    for (const s of c.srcs) {
      if (!existsSync(s)) { console.warn('MISSING', s); continue; }
      i++; const stem = c.cue.replace(/\./g, '_') + '_' + String(i).padStart(2, '0');
      convert(s, join(OUT, stem + '.mp3'), c.cap);
      const e = { cue: c.cue, take: i, stem }; files.push(e); takes.push(e);
    }
    cues.push({ cue: c.cue, spec: c.spec, loop: !!c.loop, takes: takes.length });
  }
  const lic = 'CC0 (Car Sound Effects Pack, 100 CC0 metal+wood, 100 CC0 SFX — all OpenGameArt, public domain). Note: car pack is low-bitrate phone audio.';
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify({ format: 'lsw.sfx-veh.manifest', version: 1, license: lic, counts: { cues: cues.length, files: files.length }, cues, files }, null, 2));

  let main = '<h2>Vehicle sounds</h2>';
  for (const c of cues) {
    let chips = '';
    for (const f of files.filter((f) => f.cue === c.cue)) { const nn = String(f.take).padStart(2, '0'); const b64 = (await readFile(join(OUT, f.stem + '.mp3'))).toString('base64'); chips += `<div class="take" data-snd="${c.cue}" data-take="${nn}"><div class="vote"><button class="up">&#128077;</button><button class="down">&#128078;</button></div><span class="tk">${nn}</span><audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio></div>`; }
    main += `<div class="snd"><div class="hd"><span class="cue">${c.cue}</span>${c.loop ? '<span class="map">LOOP</span>' : ''}</div><div class="spec">${c.spec}</div><div class="takes">${chips}</div></div>`;
  }
  const html = `<title>PowerWorld Vehicle SFX</title>
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
.spec{color:var(--muted);font-size:13.5px;margin:4px 0 2px}
.takes{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.take{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:5px 8px}
.take.keep{border-color:var(--keep);background:var(--keepbg)}.take.rej{border-color:var(--rej);background:var(--rejbg);opacity:.6}
.vote{display:flex;gap:3px}.up,.down{font-size:15px;background:transparent;border:1px solid var(--line);border-radius:7px;padding:3px 6px;cursor:pointer;filter:grayscale(1) opacity(.5)}
.take.keep .up{filter:none;border-color:var(--keep);background:var(--keepbg)}.take.rej .down{filter:none;border-color:var(--rej);background:var(--rejbg)}
.tk{font:600 12px var(--mono);color:var(--muted);width:20px;text-align:center}.take audio{height:30px;max-width:200px}
</style>
<header id="bar"><h1>VEHICLE SFX</h1><span class="sub">Each event described &middot; tap &#128077;/&#128078; on the ones you want</span><span id="count">0 kept</span></header>
<div class="panel"><h3>My picks</h3><div id="pickslist" class="empty">Nothing kept yet.</div><div style="display:flex;gap:10px;margin-top:10px"><button id="copy" class="act primary">&#128203; Copy my picks</button><button id="clr" class="act">Clear</button></div><textarea id="picksbox" readonly placeholder="Kept takes appear here."></textarea></div>
<p class="sub" style="color:var(--muted)">This is one low-bitrate CC0 car. Tell me which events feel right, and I'll source a <b>higher-quality</b> and <b>more vehicle types</b> (truck, aircraft, motorcycle) pack next.</p>
${main}
<script>
const KEY='pwVehVotes';let v={};try{v=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const k=el=>el.dataset.snd+'|'+el.dataset.take;
function render(){let kept=[];document.querySelectorAll('.take').forEach(el=>{const x=v[k(el)];el.classList.toggle('keep',x==='up');el.classList.toggle('rej',x==='down');if(x==='up')kept.push(el.dataset.snd+' -> '+el.dataset.take);});document.getElementById('count').textContent=kept.length+' kept';const L=document.getElementById('pickslist');if(kept.length){L.classList.remove('empty');L.innerHTML=kept.map(s=>'<div style="font:600 13px var(--mono)">&#10003; '+s+'</div>').join('');}else{L.classList.add('empty');L.textContent='Nothing kept yet.';}document.getElementById('picksbox').value=kept.join('\\n');}
document.addEventListener('click',e=>{const b=e.target.closest('.up,.down');if(!b)return;const el=b.closest('.take'),kk=k(el),w=b.classList.contains('up')?'up':'down';v[kk]=v[kk]===w?undefined:w;if(!v[kk])delete v[kk];try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}render();});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picksbox');if(!t.value)return;t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}const b=document.getElementById('copy'),o=b.textContent;b.textContent='Copied \\u2713';setTimeout(()=>b.textContent=o,1200);};
document.getElementById('clr').onclick=()=>{v={};try{localStorage.removeItem(KEY)}catch(e){}render();};
render();
</script>`;
  await writeFile(join(ART, 'pick.html'), html);
  console.log(`sfx-veh: ${cues.length} events / ${files.length} takes`);
}
main().catch((e) => { console.error(e); process.exit(1); });
