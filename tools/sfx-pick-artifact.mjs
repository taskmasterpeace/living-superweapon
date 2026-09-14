// tools/sfx-pick-artifact.mjs
// Emits an ARTIFACT-ready HTML grading console from the already-converted CC0 clips.
// (Artifact wraps <!doctype>/<head>/<body>, so we write <title> + <style> + content + <script> only.)
//   node tools/sfx-pick-artifact.mjs  ->  artifacts/sfx-cc0/pick.html
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'audio', 'sfx-cc0');
const manifest = JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'));

const cats = [...new Set(manifest.cues.map((c) => c.cat))];
let main = '';
for (const cat of cats) {
  main += `<h2>${cat}</h2>`;
  for (const c of manifest.cues.filter((x) => x.cat === cat)) {
    const takes = manifest.files.filter((f) => f.cue === c.cue);
    let chips = '';
    for (const f of takes) {
      const nn = String(f.take).padStart(2, '0');
      const b64 = (await readFile(join(OUT, f.stem + '.mp3'))).toString('base64');
      chips += `<div class="take" data-snd="${c.cue}" data-take="${nn}">`
        + `<div class="vote"><button class="up" title="want it" aria-label="keep take ${nn}">&#128077;</button>`
        + `<button class="down" title="reject" aria-label="reject take ${nn}">&#128078;</button></div>`
        + `<span class="tk">${nn}</span>`
        + `<audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio></div>`;
    }
    main += `<div class="snd"><div class="hd"><span class="cue">${c.cue}</span><span class="lbl">${c.label}</span>`
      + (c.mapsTo ? `<span class="map">&#8594; ${c.mapsTo}</span>` : '') + `</div><div class="takes">${chips}</div></div>`;
  }
}
const gaps = (manifest.gaps || []).map((g) => `<li>${g}</li>`).join('');

const html = `<title>PowerWorld SFX Review</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap">
<style>
:root{
 --bg:#f3ece0; --surface:#fbf6ec; --surface2:#efe6d6; --line:#d8cbb2; --text:#2a2318; --muted:#7a6f58;
 --gold:#a9781a; --keep:#4a7a1e; --keepbg:#e7f0d5; --rej:#a8402a; --rejbg:#f2ddd6;
 --disp:'Rajdhani',system-ui,sans-serif; --mono:ui-monospace,'Cascadia Code',Consolas,monospace;
}
:root:not([data-theme="light"]){ @media (prefers-color-scheme:dark){
 --bg:#15120c; --surface:#1e1a12; --surface2:#241f15; --line:#3a3020; --text:#ece4d2; --muted:#9a907c;
 --gold:#e0a63a; --keep:#9ccf5a; --keepbg:#23301433; --rej:#e0754a; --rejbg:#3a1f1433; }}
:root[data-theme="dark"]{
 --bg:#15120c; --surface:#1e1a12; --surface2:#241f15; --line:#3a3020; --text:#ece4d2; --muted:#9a907c;
 --gold:#e0a63a; --keep:#9ccf5a; --keepbg:#23301433; --rej:#e0754a; --rejbg:#3a1f1433; }
*{box-sizing:border-box}
body{background:var(--bg);color:var(--text);font:15px/1.55 system-ui,sans-serif;margin:0;padding:0 clamp(14px,4vw,40px) 60px;max-width:1040px;margin:0 auto}
h1{font:700 26px/1.1 var(--disp);letter-spacing:.02em;margin:0}
h2{font:600 15px/1 var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);border-bottom:1px solid var(--line);padding-bottom:6px;margin:30px 0 10px}
#bar{position:sticky;top:0;z-index:10;background:var(--bg);border-bottom:1px solid var(--line);padding:12px 0;display:flex;gap:12px;align-items:baseline;flex-wrap:wrap}
#bar .sub{color:var(--muted);font-size:13px}
#count{font:700 15px/1 var(--disp);letter-spacing:.06em;color:var(--gold);margin-left:auto}
.panel{background:var(--surface2);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:12px 0}
.panel h3{font:600 12px/1 var(--disp);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 8px}
.panel .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
button.act{font:600 13px var(--disp);letter-spacing:.04em;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:7px 14px;cursor:pointer}
button.act.primary{background:var(--gold);color:#15120c;border-color:var(--gold)}
button.act:focus-visible,.up:focus-visible,.down:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
textarea{width:100%;height:88px;background:var(--bg);color:var(--text);border:1px solid var(--line);border-radius:8px;font:12.5px/1.5 var(--mono);padding:8px;margin-top:8px;resize:vertical}
.empty{color:var(--muted);font-size:13px}
.snd{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:11px 13px;margin:9px 0}
.hd{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.cue{font:600 13px var(--mono);color:var(--gold)}
.lbl{font-weight:600}.map{font:12px var(--mono);color:var(--muted);margin-left:auto}
.takes{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.take{display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--line);border-radius:10px;padding:5px 8px}
.take.keep{border-color:var(--keep);background:var(--keepbg)}
.take.rej{border-color:var(--rej);background:var(--rejbg);opacity:.6}
.vote{display:flex;gap:3px}
.up,.down{font-size:15px;line-height:1;background:transparent;border:1px solid var(--line);border-radius:7px;padding:3px 6px;cursor:pointer;filter:grayscale(1) opacity(.5)}
.take.keep .up{filter:none;border-color:var(--keep);background:var(--keepbg)}
.take.rej .down{filter:none;border-color:var(--rej);background:var(--rejbg)}
.tk{font:600 12px var(--mono);color:var(--muted);width:20px;text-align:center}
.take audio{height:30px;max-width:200px}
.gaps{margin-top:34px;border-top:1px dashed var(--gold);padding-top:12px}
.gaps h3{font:600 12px var(--disp);letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
.gaps li{color:var(--muted);font-size:13.5px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
</style>
<header id="bar">
 <h1>SFX REVIEW</h1>
 <span class="sub">Real CC0 recordings &middot; tap <b>&#128077;</b> to keep, <b>&#128078;</b> to reject</span>
 <span id="count">0 kept</span>
</header>
<div class="panel">
 <h3>My picks</h3>
 <div id="pickslist" class="empty">Nothing kept yet — hit &#128077; on the takes you want.</div>
 <div class="row" style="margin-top:10px">
  <button id="copy" class="act primary">&#128203; Copy my picks</button>
  <button id="clr" class="act">Clear all</button>
 </div>
 <textarea id="picksbox" readonly placeholder="Your kept takes appear here — copy this and paste it back in chat."></textarea>
</div>
${main}
<div class="gaps"><h3>Still need a dedicated pack (say the word)</h3><ul>${gaps}</ul></div>
<script>
const KEY='pwSfxVotes';
let votes={};try{votes=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(votes))}catch(e){}}
function keyOf(el){return el.dataset.snd+'|'+el.dataset.take;}
function render(){
 let kept=[];
 document.querySelectorAll('.take').forEach(el=>{
  const v=votes[keyOf(el)];
  el.classList.toggle('keep',v==='up');el.classList.toggle('rej',v==='down');
  if(v==='up')kept.push(el.dataset.snd+' -> '+el.dataset.take);
 });
 document.getElementById('count').textContent=kept.length+' kept';
 const list=document.getElementById('pickslist');
 if(kept.length){list.classList.remove('empty');list.innerHTML=kept.map(k=>'<div style="font:600 13px var(--mono)">&#10003; '+k+'</div>').join('');}
 else{list.classList.add('empty');list.textContent='Nothing kept yet — hit \\uD83D\\uDC4D on the takes you want.';}
 document.getElementById('picksbox').value=kept.join('\\n');
}
document.addEventListener('click',e=>{
 const b=e.target.closest('.up,.down');if(!b)return;
 const el=b.closest('.take'),k=keyOf(el),want=b.classList.contains('up')?'up':'down';
 votes[k]=votes[k]===want?undefined:want;if(!votes[k])delete votes[k];
 save();render();
});
document.getElementById('copy').onclick=()=>{const t=document.getElementById('picksbox');if(!t.value){return;}t.select();try{navigator.clipboard.writeText(t.value)}catch(e){}try{document.execCommand('copy')}catch(e){}const b=document.getElementById('copy');const o=b.textContent;b.textContent='Copied \\u2713';setTimeout(()=>b.textContent=o,1200);};
document.getElementById('clr').onclick=()=>{votes={};save();render();};
render();
</script>`;
await writeFile(join(ROOT, 'artifacts', 'sfx-cc0', 'pick.html'), html);
console.log('wrote artifacts/sfx-cc0/pick.html', (html.length / 1e6).toFixed(2) + 'MB', '·', manifest.files.length, 'takes');
