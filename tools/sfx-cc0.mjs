// tools/sfx-cc0.mjs
//
// Curates REAL CC0 recordings (downloaded to authoring/audio/sfx-gaps/cc0-src/) into the game's
// missing-SFX categories, converts them to the library format (44.1k/mono/96k MP3, leading silence
// trimmed), writes a provenance manifest, and builds a votable audition page.
//
//   node tools/sfx-cc0.mjs
//
// Sources (all CC0 / public domain, from OpenGameArt — same trust level as the existing bank):
//   firearm = The Free Firearm Sound Library · owlish = Owlish Media Sound Effects
//   sfx100  = 100 CC0 SFX · reload = Gun reload sounds

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'authoring', 'audio', 'sfx-gaps', 'cc0-src');
const FIRE = join(SRC, 'firearm', 'Prepared SFX Library');
const OWL = join(SRC, 'owlish');
const S100 = join(SRC, '100cc0');
const OUT = join(ROOT, 'public', 'audio', 'sfx-cc0');
const ART = join(ROOT, 'artifacts', 'sfx-cc0');
const PACKS = {
  firearm: 'The Free Firearm Sound Library — OpenGameArt, CC0',
  owlish: 'Owlish Media Sound Effects — OpenGameArt, CC0',
  sfx100: '100 CC0 SFX — OpenGameArt, CC0',
  reload: 'Gun reload sounds — OpenGameArt, CC0',
};
// first N .wav in a firearm weapon dir
const gun = (w, n = 3) => { const d = join(FIRE, w); return existsSync(d) ? readdirSync(d).filter((f) => /\.wav$/i.test(f)).slice(0, n).map((f) => ({ file: join(d, f), pack: 'firearm' })) : []; };
const owl = (sub, ...names) => names.map((f) => ({ file: join(OWL, sub, f), pack: 'owlish' }));
const s100 = (...names) => names.map((f) => ({ file: join(S100, f), pack: 'sfx100' }));

const CURATION = [
  // ---- SHOTGUN (the priority) — real ----
  { cue: 'sfx.shotgun.fire', cat: 'Shotgun (REAL)', label: 'Shotgun — fire', mapsTo: "arsenal wpn-pump / wpn-auto12",
    srcs: [...gun('Mossberg', 2), ...gun('Model 12', 2), ...gun('Nova', 2)] },
  { cue: 'sfx.shotgun.pump', cat: 'Shotgun (REAL)', label: 'Shotgun — pump / cock (was missing entirely)', mapsTo: 'shotgun rack/reload',
    srcs: [{ file: join(SRC, 'reload_shotguncock_0.wav'), pack: 'reload' }] },
  // ---- REAL GUN FIRES — candidates to replace the weak AI arsenal guns ----
  { cue: 'gun.ak', cat: 'Real gun fires (candidates for the arsenal)', label: 'AK-47', mapsTo: "wpn-ak", srcs: gun('AK-47', 4) },
  { cue: 'gun.ar15', cat: 'Real gun fires (candidates for the arsenal)', label: 'AR-15 / M16', mapsTo: "wpn-m16", srcs: gun('AR-15', 2) },
  { cue: 'gun.smg', cat: 'Real gun fires (candidates for the arsenal)', label: 'SMG (Carl Gustav M45)', mapsTo: "wpn-mp5 / wpn-pdw", srcs: gun('Carl Gustav M45', 4) },
  { cue: 'gun.smg2', cat: 'Real gun fires (candidates for the arsenal)', label: 'SMG (PPSh)', mapsTo: "wpn-saw / wpn-machinepistol", srcs: gun('PPSh', 4) },
  { cue: 'gun.pistol', cat: 'Real gun fires (candidates for the arsenal)', label: 'Pistol (Walther PPQ 9mm)', mapsTo: "wpn-p9", srcs: gun('Walther PPQ', 2) },
  { cue: 'gun.pistol2', cat: 'Real gun fires (candidates for the arsenal)', label: 'Pistol (Bersa)', mapsTo: "wpn-machinepistol", srcs: gun('Bersa', 2) },
  { cue: 'gun.revolver', cat: 'Real gun fires (candidates for the arsenal)', label: 'Revolver (S&W 642)', mapsTo: "wpn-magnum", srcs: gun('Smith & Wesson 642', 2) },
  { cue: 'gun.bolt', cat: 'Real gun fires (candidates for the arsenal)', label: 'Bolt sniper (Mosin Nagant)', mapsTo: "wpn-m24", srcs: gun('Mosin Nagant', 2) },
  { cue: 'gun.battle', cat: 'Real gun fires (candidates for the arsenal)', label: 'Battle rifle (SKS)', mapsTo: "wpn-battle", srcs: gun('SKS', 2) },
  // ---- IMPACTS — real ----
  { cue: 'sfx.impact.glass', cat: 'Bullet impacts (REAL)', label: 'Impact — glass', srcs: s100('glass_01.ogg', 'glass_02.ogg', 'glass_03.ogg', 'glass_04.ogg', 'glass_05.ogg') },
  { cue: 'sfx.impact.metal', cat: 'Bullet impacts (REAL)', label: 'Impact — metal', srcs: s100('metal_01.ogg', 'metal_03.ogg', 'metal_05.ogg', 'metal_07.ogg', 'metal_09.ogg', 'metal_11.ogg') },
  { cue: 'sfx.impact.wood', cat: 'Bullet impacts (REAL)', label: 'Impact — wood', srcs: s100('wooden_01.ogg', 'wooden_02.ogg', 'wooden_03.ogg') },
  { cue: 'sfx.impact.concrete', cat: 'Bullet impacts (REAL)', label: 'Impact — concrete/stone (approx: hard slam)', srcs: s100('slam_01.ogg', 'slam_02.ogg', 'slam_04.ogg', 'hit_01.ogg', 'hit_03.ogg') },
  { cue: 'sfx.impact.water', cat: 'Bullet impacts (REAL)', label: 'Impact — water', srcs: [...s100('splash_01.ogg', 'splash_02.ogg'), ...owl('Impacts', 'gulp1.wav', 'gulp2.wav')] },
  { cue: 'sfx.impact.flesh', cat: 'Bullet impacts (REAL)', label: 'Impact — flesh (fruit/slap foley)', srcs: owl('Impacts', 'fruit1.wav', 'fruit2.wav', 'fruit3.wav', 'slap2.wav', 'hit.wav') },
  // ---- MELEE flesh — real foley ----
  { cue: 'sfx.punch.flesh', cat: 'Melee flesh (REAL)', label: 'Punch — bare fist to body', srcs: owl('Impacts', 'fruit1.wav', 'fruit2.wav', 'slap2.wav', 'hit.wav') },
  // ---- FOOTSTEPS — real (concrete/grass/dirt; other surfaces need a dedicated pack) ----
  { cue: 'sfx.step.concrete', cat: 'Footsteps (REAL)', label: 'Footstep — concrete/hard', srcs: owl('Footsteps', 'hard-footstep1.wav', 'hard-footstep2.wav', 'hard-footstep3.wav', 'hard-footstep4.wav') },
  { cue: 'sfx.step.grass', cat: 'Footsteps (REAL)', label: 'Footstep — grass', srcs: owl('Footsteps', 'grassy-footstep2.wav', 'grassy-footstep3.wav', 'grassy-footstep4.wav', 'gassy-footstep1.wav') },
  { cue: 'sfx.step.dirt', cat: 'Footsteps (REAL)', label: 'Footstep — dirt (approx)', srcs: owl('Footsteps', 'gassy-footstep1.wav', 'step1.wav', 'step2.wav', 'step3.wav') },
];

// categories we could NOT cover from these CC0 packs — need a targeted pack next
const GAPS = ['ricochet (whine-off)', 'whiz-by / supersonic crack', 'shell casings', 'dirt/sand bullet impact (only approx)',
  'footsteps: gravel / metal grating / mud / water', 'vehicle: door / impact / boost'];

// one-shot length cap (seconds) per category — trims the long room-reverb tails on the gun recordings
function capFor(cue) {
  if (cue === 'sfx.shotgun.fire') return 1.3;
  if (cue === 'sfx.shotgun.pump') return 1.0;
  if (cue.startsWith('gun.')) return 1.1;
  if (cue === 'sfx.impact.water') return 0.8;
  if (cue === 'sfx.punch.flesh') return 0.5;
  if (cue.startsWith('sfx.step.')) return 0.6;
  if (cue.startsWith('sfx.impact.')) return 1.0;
  return 1.2;
}
function convert(src, dst, cap) {
  const af = `silenceremove=start_periods=1:start_duration=0.005:start_threshold=-50dB:detection=peak,atrim=end=${cap},afade=t=out:st=${Math.max(0, cap - 0.06).toFixed(3)}:d=0.06`;
  const tail = ['-ac', '1', '-ar', '44100', '-b:a', '96k', '-map_metadata', '-1', '-codec:a', 'libmp3lame', dst];
  try { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', af, ...tail]); }
  catch { execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-t', String(cap), ...tail]); }
}
const dur = (f) => { try { return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim(); } catch { return 0; } };

async function main() {
  await mkdir(OUT, { recursive: true }); await mkdir(ART, { recursive: true });
  const cues = [], files = [];
  for (const c of CURATION) {
    const takes = [];
    let i = 0;
    for (const s of c.srcs) {
      if (!existsSync(s.file)) { console.warn('MISSING src', s.file); continue; }
      i++; const stem = c.cue.replace(/\./g, '_') + '_' + String(i).padStart(2, '0');
      const dst = join(OUT, stem + '.mp3'); convert(s.file, dst, capFor(c.cue));
      const d = dur(dst); const e = { cue: c.cue, take: i, stem, durationSec: Math.round(d * 1000) / 1000, source: s.file.replace(SRC + '\\', '').replace(SRC + '/', '').replace(/\\/g, '/'), pack: PACKS[s.pack] };
      files.push(e); takes.push(e);
    }
    cues.push({ cue: c.cue, cat: c.cat, label: c.label, mapsTo: c.mapsTo || '', takes: takes.length });
  }
  const manifest = { format: 'lsw.sfx-cc0.manifest', version: 1, provenance: 'Real recordings, all CC0 / public domain (OpenGameArt). No AI, no synthesis. Sources per file below.', packs: PACKS, gaps: GAPS, counts: { cues: cues.length, files: files.length }, cues, files };
  await writeFile(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // ---- votable audition page ----
  const cats = [...new Set(CURATION.map((c) => c.cat))];
  let body = '';
  for (const cat of cats) {
    body += `<h2>${cat}</h2>`;
    for (const c of CURATION) {
      if (c.cat !== cat) continue;
      const mine = files.filter((f) => f.cue === c.cue);
      let th = '';
      for (const f of mine) { const b64 = (await readFile(join(OUT, f.stem + '.mp3'))).toString('base64'); th += `<div class="take" data-take="${String(f.take).padStart(2, '0')}"><button class="pick">PICK ${String(f.take).padStart(2, '0')}</button><audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio></div>`; }
      body += `<div class="snd" data-snd="${c.cue}"><div class="hd"><b>${c.cue}</b> <span class="lbl">${c.label}</span>` + (c.mapsTo ? `<span class="map">→ ${c.mapsTo}</span>` : '') + `<span class="chosen"></span></div><div class="takes">${th || '<i>no sources found</i>'}</div></div>`;
    }
  }
  const total = CURATION.length;
  const html = `<!doctype html><meta charset="utf-8"><title>REAL CC0 SFX — pick a take</title>
<style>
body{background:#12140f;color:#e9e2d4;font:14px/1.5 system-ui;margin:0;padding:0 24px 48px;max-width:1000px}
#bar{position:sticky;top:0;background:#0c0e08;border-bottom:1px solid #33402a;padding:10px 0;display:flex;gap:10px;align-items:center;z-index:5}
#bar b{color:#9ccf5a}#count{color:#b8ad97}
#bar button{background:#20281a;color:#e9e2d4;border:1px solid #33402a;border-radius:6px;padding:5px 11px;cursor:pointer}
#copy{background:#24361a;border-color:#5a7a2a;color:#9ccf5a;font-weight:600}
textarea#picks{width:100%;height:70px;background:#0e100b;color:#c9d0b6;border:1px solid #2a331f;border-radius:8px;font:12px ui-monospace,monospace;margin:8px 0;box-sizing:border-box;padding:6px}
.sub{color:#8a9070;font-size:12px;margin:4px 0 0}
h2{color:#9ccf5a;border-bottom:1px solid #33402a;padding-bottom:4px;margin-top:22px}
.snd{border:1px solid #263019;border-radius:10px;padding:9px 12px;margin:8px 0;background:#191c12}
.snd.done{border-color:#5a7a2a;background:#182012}
.hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.lbl{color:#b8c097}
.map{font:11px ui-monospace,monospace;color:#c9a24a}
.chosen{margin-left:auto;font:12px ui-monospace,monospace;color:#9ccf5a}
.takes{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px}
.take{display:flex;align-items:center;gap:6px;border:1px solid transparent;border-radius:8px;padding:3px 6px}
.take.sel{border-color:#9ccf5a;background:#20301488}
.pick{background:#20281a;color:#c9d0b6;border:1px solid #33402a;border-radius:6px;padding:3px 9px;font:11px ui-monospace,monospace;cursor:pointer}
.take.sel .pick{background:#3a5a1a;border-color:#9ccf5a;color:#eaffd0}.take audio{height:28px}
.gaps{margin-top:26px;border-top:1px dashed #4a3a1a;padding-top:10px;color:#c9a24a}.gaps li{color:#b8ad97}
</style>
<div id="bar"><b>REAL CC0 SOUNDS</b> <span id="count"></span><button id="copy">📋 Copy my picks</button><button id="clr">clear</button></div>
<textarea id="picks" readonly placeholder="your picks show up here — copy this back to me"></textarea>
<p class="sub">Real recordings, <b>all CC0 / public domain</b> (OpenGameArt) — no synth, no AI. ${total} sounds · click <b>PICK</b> on your favourite take; saves automatically.</p>
${body}
<div class="gaps"><b>Still need a dedicated pack (not in these four) — say the word and I'll pull them:</b><ul>${GAPS.map((g) => `<li>${g}</li>`).join('')}</ul></div>
<script>
const KEY='sfxCC0Picks';let picks={};try{picks=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const TOTAL=${total};
function render(){let n=0,lines=[];document.querySelectorAll('.snd').forEach(el=>{const id=el.dataset.snd,tk=picks[id];el.classList.toggle('done',!!tk);el.querySelector('.chosen').textContent=tk?('\\u2713 take '+tk):'';el.querySelectorAll('.take').forEach(t=>t.classList.toggle('sel',t.dataset.take===tk));if(tk){n++;lines.push(id+' -> '+tk);}});document.getElementById('count').textContent=n+' / '+TOTAL+' picked';document.getElementById('picks').value=lines.join('\\n');}
document.addEventListener('click',e=>{const btn=e.target.closest('.pick');if(!btn)return;picks[btn.closest('.snd').dataset.snd]=btn.closest('.take').dataset.take;try{localStorage.setItem(KEY,JSON.stringify(picks))}catch(e){}render();});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picks');t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}};
document.getElementById('clr').onclick=()=>{picks={};try{localStorage.removeItem(KEY)}catch(e){}render();};
render();
</script>`;
  await writeFile(join(ART, 'audition.html'), html);
  console.log(`sfx-cc0: ${cues.length} sounds, ${files.length} real files converted`);
  console.log(`durations ${Math.min(...files.map((f) => f.durationSec))}s–${Math.max(...files.map((f) => f.durationSec))}s`);
  console.log(`audition: artifacts/sfx-cc0/audition.html`);
}
main().catch((e) => { console.error(e); process.exit(1); });
