// Branch-owned catalog and inspection view. It READS packages from /authored-assets and drives
// production APIs read-only (Fighter, samplePoseFrame, applyAuthoredPose). It never replaces
// them and never fakes a success path: if a package cannot be played through the real bridge,
// the report says so.
import {renderReport} from './report.js';
import {Stage} from './stage.js';
import {loadPackage} from './production-bridge.js';

const $=s=>document.querySelector(s);
const state={catalog:null,packages:new Map(),selected:null,kind:'all',filter:''};
const stage=new Stage($('#gl'),$('#viewport'));
stage.loader=loadPackage;
window.AUTHORING={state,stage,select};

async function loadFixtures(){
 // The CLI's report carries the fixture board; the browser never runs the validator itself.
 const res=await fetch('/authoring/artifacts/report.json',{cache:'no-store'}).catch(()=>null);
 const list=$('#fixture-list');
 if(!res?.ok){list.innerHTML='<li class="empty">run node authoring/bin/authoring.js report</li>';return;}
 const report=await res.json();state.report=report;
 list.innerHTML=(report.fixtures||[]).map(f=>`<li><span>${f.group}/${f.name}</span><span class="code ${f.ok?'ok':''}">${f.ok?'PASS':f.codes.join(',')}</span></li>`).join('');
}
async function loadCatalog(){
 await loadFixtures();
 const res=await fetch('/authored-assets/catalog.json',{cache:'no-store'});
 if(!res.ok){state.catalog={packages:[],ok:false,missing:true};$('#catalog-state').textContent='no catalog: run node authoring/bin/authoring.js build';$('#list').innerHTML='<li class="empty">No packages built yet.</li>';return;}
 state.catalog=await res.json();
 $('#catalog-state').textContent=`${state.catalog.packages.length} packages · catalog ${state.catalog.ok?'valid':'HAS FAILURES'}`;
 renderKinds();renderList();
 const hash=location.hash.slice(1);
 const first=state.catalog.packages.find(p=>`${p.id}@${p.version}`===hash)||state.catalog.packages[0];
 if(first)await select(first);
}
function renderKinds(){
 const kinds=['all',...new Set(state.catalog.packages.map(p=>p.kind))];
 $('#kinds').innerHTML=kinds.map(k=>`<button type="button" data-kind="${k}" class="${state.kind===k?'on':''}">${k}</button>`).join('');
 for(const b of $('#kinds').querySelectorAll('button'))b.onclick=()=>{state.kind=b.dataset.kind;renderKinds();renderList();};
}
function visible(){
 const q=state.filter.toLowerCase();
 return state.catalog.packages.filter(p=>(state.kind==='all'||p.kind===state.kind)&&(!q||p.id.includes(q)||p.kind.includes(q)||p.tags.some(t=>t.includes(q))||String(p.displayName).toLowerCase().includes(q)));
}
function renderList(){
 const items=visible();
 $('#list').innerHTML=items.length?items.map(p=>`<li data-key="${p.id}@${p.version}" class="${state.selected&&state.selected.id===p.id&&state.selected.version===p.version?'on':''}"><span class="${p.ok?'ok':'bad'}">${p.ok?'VALID':'INVALID'}</span><div class="id">${p.id} <span class="mono">v${p.version}</span></div><span class="k">${p.kind.toUpperCase()} · ${p.adapter} · ${p.license}</span></li>`).join(''):'<li class="empty">Nothing matches.</li>';
 for(const li of $('#list').querySelectorAll('li[data-key]'))li.onclick=()=>select(state.catalog.packages.find(p=>`${p.id}@${p.version}`===li.dataset.key));
}
async function select(entry){
 state.selected=entry;location.hash=`${entry.id}@${entry.version}`;renderList();
 let pkg=state.packages.get(entry.dir);
 if(!pkg){
  const manifest=await (await fetch(`/authored-assets/${entry.dir}/manifest.json`,{cache:'no-store'})).json();
  pkg={entry,manifest,base:`/authored-assets/${entry.dir}/`};state.packages.set(entry.dir,pkg);
 }
 $('#title').textContent=`${pkg.manifest.displayName}`;
 $('#meta').textContent=`${pkg.manifest.id} · v${pkg.manifest.version} · ${pkg.manifest.kind} · ${pkg.manifest.source.adapter} · ${pkg.manifest.provenance.license} (${pkg.manifest.provenance.redistribution}) · hash ${pkg.manifest.packageHash.slice(0,12)}`;
 $('#tab-manifest').textContent=JSON.stringify(pkg.manifest,null,1);
 $('#tab-report').innerHTML=renderReport(pkg.manifest,entry);
 $('#tab-reference').innerHTML=pkg.manifest.reference?.image?`<p class="mono">${pkg.manifest.reference.note||''}</p><img alt="Approved reference" src="/${pkg.manifest.reference.image}">`:'<p class="empty">No approved reference image recorded for this package.</p>';
 $('#export-text').textContent=JSON.stringify({id:pkg.manifest.id,version:pkg.manifest.version,packageHash:pkg.manifest.packageHash,outputs:pkg.manifest.outputs,budgets:pkg.manifest.budgets},null,1);
 const playback=await stage.load(pkg);
 renderClips(playback);
}
function renderClips(playback){
 const clip=$('#clip');
 clip.innerHTML=(playback.clips||[]).map(c=>`<option value="${c.id}">${c.id} · ${c.take} · ${c.duration.toFixed(3)}s</option>`).join('')||'<option value="">no clips</option>';
 clip.onchange=()=>stage.setClip(clip.value);
 if(playback.clips?.length)stage.setClip(playback.clips[0].id);
}
$('#filter').oninput=e=>{state.filter=e.target.value;renderList();};
for(const b of document.querySelectorAll('.tabs button'))b.onclick=()=>{for(const x of document.querySelectorAll('.tabs button'))x.classList.toggle('on',x===b);for(const t of document.querySelectorAll('.tab'))t.classList.toggle('on',t.id==='tab-'+b.dataset.tab);};
$('#play').onclick=()=>{stage.playing=!stage.playing;$('#play').textContent=stage.playing?'Pause':'Play';};
$('#scrub').oninput=e=>{stage.playing=false;$('#play').textContent='Play';stage.seek(Number(e.target.value));};
$('#show-skeleton').onchange=e=>stage.toggle('skeleton',e.target.checked);
$('#show-sockets').onchange=e=>stage.toggle('sockets',e.target.checked);
$('#show-zones').onchange=e=>stage.toggle('zones',e.target.checked);
$('#view').onchange=e=>stage.setView(e.target.value);
$('#body').onchange=e=>stage.setBody(e.target.value);
$('#export-json').onclick=()=>{const blob=new Blob([$('#export-text').textContent],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${state.selected.id}-v${state.selected.version}-report.json`;a.click();};
stage.onFrame=(t,frac)=>{$('#time').textContent=`${t.toFixed(3)}s`;if(stage.playing)$('#scrub').value=String(frac);};
stage.onBodies=bodies=>{$('#body').innerHTML=bodies.map(b=>`<option value="${b.id}">${b.label}</option>`).join('');};
stage.onClip=id=>{$('#clip').value=id;};
stage.onBody=id=>{$('#body').value=id;};
loadCatalog();
