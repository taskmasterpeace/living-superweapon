// Read-only export. Never imports browser-local profiles or changes roster definitions.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ROSTER,SLOT_ORDER} from '../src/data/characters.js';
import {MILITARY_ROSTER} from '../src/data/military-characters.js';
import {BUILDS,frameOf} from '../src/engine/figure.js';
import {heroModelOf} from '../src/data/hero-models.js';
import {characterIdentityView} from '../src/engine/character-identity-view.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'artifacts/character-review');
// The directory is a user review workspace after its first export. Protect every
// file (including edited CSV/HTML) unless replacement was explicitly requested.
const replaceGenerated=process.argv.includes('--replace-generated');
const existing=await fs.readdir(out).catch(error=>{if(error.code==='ENOENT')return [];throw error;});
if(existing.length&&!replaceGenerated){
 console.log(JSON.stringify({status:'preserved',directory:out,message:'Existing review files were left unchanged. Save any user edits elsewhere before explicitly using --replace-generated to refresh source exports.'},null,2));
 process.exit(0);
}
const beforeDir=path.join(root,'artifacts/marketing/roster-before-rebuild');
const archive=JSON.parse(await fs.readFile(path.join(beforeDir,'roster.json'),'utf8'));
const military=new Set(MILITARY_ROSTER.map(d=>d.id));
const editable=['Desired look / silhouette','Desired hair / face','Desired costume','Desired emblem','Desired colors / materials','Desired gear','Desired sprint animation','Desired flight animation','Desired infected identity','Desired power visuals','Design approval','Animation approval','Reviewer notes','After evidence link'];
const j=v=>v==null?'Not declared':typeof v==='string'?v:JSON.stringify(v);
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const present=async p=>fs.access(p).then(()=>true,()=>false);
const rows=[],powers=[];
for(const d of ROSTER){
 const source=military.has(d.id)?'src/data/military-characters.js':'src/data/characters.js';
 const model=heroModelOf(d);
 const before={};
 for(const view of ['front','rear'])before[view]=await present(path.join(beforeDir,`${d.id}-${view}.png`))?`../marketing/roster-before-rebuild/${d.id}-${view}.png`:'';
 const row={ID:d.id,Name:d.name,Title:j(d.title),Role:j(d.role),Origin:j(d.origin),'Current identity / powers':j(d.blurb),
  'Current movement':characterIdentityView(d).movement,'Declared speed':d.speed??'Not declared','Flight tier':d.flightTier??3,'Flight tier basis':d.flightTier==null?'Runtime default (not explicit)':'Explicit source',
  'Current flight visual':j(model.flightStyle),'Current evade / sprint':j(d.evade),'Current movement extras':j(Object.fromEntries(['flyStyle','afterburner','movementTrail','momentumGlide','glider','traversalLeap'].filter(k=>d[k]!=null).map(k=>[k,d[k]]))),
  'Current body model':j(model.body),'Current frame (derived)':j(frameOf(d)),'Current model (resolved defaults)':j(model),'Current build / gear':j({...BUILDS[d.id],...d.build}),'Current carried items':j(d.items),
  'Current colors':j(d.colors),'Current threat':j(d.threat),'Current strength':d.strength??'Not declared','Current power-up':j(d.powerUp),
  'Current abilities':Object.entries(d.abilities||{}).map(([k,a])=>`${SLOT_ORDER.find(s=>s.k===k)?.label||k}: ${a.name} (${a.type})`).join('\n'),
  'Before front':before.front,'Before rear':before.rear,'Before archive commit':archive.commit,'After status':'No after evidence supplied',
  ...Object.fromEntries(editable.map(k=>[k,''])),'Definition source':source,'Appearance source':'src/data/hero-models.js; src/engine/figure.js; def.model / def.build','Scope':'Checked-in roster; no browser-local profiles'};
 rows.push(row);
 for(const [slot,a] of Object.entries(d.abilities||{}))powers.push({ID:d.id,Name:d.name,'Stable ability ID':`${d.id}.${slot}`,Slot:slot,Control:SLOT_ORDER.find(s=>s.k===slot)?.label||slot,'Power name':a.name,Type:a.type,'Declared description':a.description??a.blurb??'Not separately declared; see character identity and parameters','Full source parameters':JSON.stringify(a),'Definition source':source});
}
const ids=rows.map(r=>r.ID);
if(new Set(ids).size!==ROSTER.length)throw Error('Duplicate stable character IDs');
if(powers.length!==ROSTER.reduce((n,d)=>n+Object.keys(d.abilities||{}).length,0))throw Error('Missing power records');
await fs.mkdir(out,{recursive:true});
const csv=(data)=>'\ufeff'+[Object.keys(data[0]),...data.map(r=>Object.values(r))].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
await fs.writeFile(path.join(out,'characters.csv'),csv(rows));
await fs.writeFile(path.join(out,'powers.csv'),csv(powers));
const sourceFiles=['src/data/characters.js','src/data/military-characters.js','src/data/power-up.js','src/data/hero-models.js','src/engine/figure.js','src/engine/character-identity-view.js'];
const hashes=Object.fromEntries(await Promise.all(sourceFiles.map(async f=>[f,createHash('sha256').update(await fs.readFile(path.join(root,f))).digest('hex')])));
const manifest={scope:'All canonical ROSTER records, including military. No browser-local characters or saved outfits.',count:rows.length,powerCount:powers.length,ids,beforeCommit:archive.commit,beforeImageCount:rows.reduce((n,r)=>n+!!r['Before front']+!!r['Before rear'],0),sourceHashes:hashes,missingBefore:rows.filter(r=>!r['Before front']||!r['Before rear']).map(r=>r.ID),archiveOnly:archive.roster.filter(r=>!ids.includes(r.id)).map(r=>r.id),afterEvidence:'Not supplied; no after images generated'};
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(out,'characters.json'),JSON.stringify({manifest,characters:rows,powers,rawDefinitions:ROSTER},null,2)+'\n');
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Character design review</title><style>
:root{color-scheme:dark;font:14px Inter,system-ui,sans-serif;background:oklch(.18 .02 85);color:oklch(.93 .02 85)}body{max-width:1024px;margin:auto;padding:24px}h1,h2{letter-spacing:-.025em}h1{font-size:30px}h2{font-size:24px;margin:0}p{line-height:1.6}.muted{color:oklch(.72 .04 85)}nav{display:flex;gap:12px;flex-wrap:wrap}a,button{color:oklch(.85 .14 85);transition:.2s}a:hover{color:white}input,button,select{font:inherit;padding:12px;border:1px solid oklch(.35 .03 85);border-radius:10px;background:oklch(.24 .025 85);color:inherit}input{width:min(500px,80%);margin:24px 0}article{background:oklch(.22 .025 85);border:1px solid oklch(.32 .03 85);border-radius:10px;padding:24px;margin:12px 0}article:hover{box-shadow:0 8px 30px #0003}article[hidden]{display:none}.images{display:grid;grid-template-columns:1fr 1fr;gap:12px}.images img{width:100%;border-radius:10px}.tag{color:oklch(.82 .12 85)}dl{display:grid;grid-template-columns:160px 1fr;gap:12px}dt{color:oklch(.72 .04 85)}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}details{margin-top:16px}summary{cursor:pointer;padding:12px 0}summary:hover{color:oklch(.85 .14 85)}.after{padding:16px;border:1px dashed oklch(.42 .04 85);border-radius:10px;margin-top:12px}@media(max-width:600px){body{padding:12px}article{padding:16px}dl{grid-template-columns:1fr}dd{margin-bottom:10px}}
</style><h1>Character design review</h1><p>${rows.length} characters · ${powers.length} powers. Review each existing identity, then enter your desired appearance and animation choices in the workbook's amber columns.</p><p class="muted">Before views are the preserved archive at ${escape(archive.commit)}. Current facts are today's checked-in definitions with explicitly labeled defaults. Personal saved outfits are outside this export.</p><nav><a href="characters.xlsx">Editable Excel workbook</a><a href="characters.csv">Character CSV</a><a href="powers.csv">All power parameters</a><a href="../marketing/roster-before-rebuild/index.html">Preserved before gallery</a></nav><input id="search" type="search" aria-label="Find a character or power" placeholder="Find a name, ID, role or power"><span id="count">${rows.length} characters</span><main>${rows.map(r=>`<article id="${escape(r.ID)}"><h2>${escape(r.Name)} <small class="muted">${escape(r.ID)}</small></h2><p class="tag">${escape(r.Title)} · ${escape(r.Role)}</p><p>${escape(r['Current identity / powers'])}</p><div class="images">${['front','rear'].map(view=>r['Before '+view]?`<a href="${escape(r['Before '+view])}"><img loading="lazy" src="${escape(r['Before '+view])}" alt="Archived ${escape(r.Name)} ${view} view">Before · ${view}</a>`:`<p>No archived ${view} image</p>`).join('')}</div><div class="after">After: awaiting your design choices and a new reviewed capture.</div><dl>${['Current movement','Current flight visual','Current evade / sprint','Current colors','Current abilities'].map(k=>`<dt>${escape(k)}</dt><dd>${escape(r[k])}</dd>`).join('')}</dl><details><summary>Source body, gear and identity details</summary><dl>${['Current body model','Current frame (derived)','Current model (resolved defaults)','Current build / gear','Current carried items','Current power-up','Definition source'].map(k=>`<dt>${escape(k)}</dt><dd>${escape(r[k])}</dd>`).join('')}</dl></details><p class="muted">Editable workbook row for ID <strong>${escape(r.ID)}</strong>: look, hair, costume, emblem, colors, gear, sprint, flight, infected identity, power visuals and approvals.</p></article>`).join('')}</main><script>const articles=[...document.querySelectorAll('article')];document.querySelector('#search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();articles.forEach(a=>a.hidden=!a.textContent.toLowerCase().includes(q));document.querySelector('#count').textContent=articles.filter(a=>!a.hidden).length+' characters';});</script></html>`);

// XLSX is optional so the canonical CSV/HTML export works without artifact-tool.
const deps=process.env.ARTIFACT_NODE_MODULES;
if(deps){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'character-review-'));
 await fs.symlink(path.resolve(deps),path.join(temp,'node_modules'),'junction');
 const require=createRequire(path.join(temp,'builder.mjs'));
 const {Workbook,SpreadsheetFile}=await import(pathToFileURL(require.resolve('@oai/artifact-tool')).href);
 const wb=Workbook.create();
 const review=rows.map(r=>Object.fromEntries(['ID','Name',...editable,'Role','Current identity / powers','Current movement','Current flight visual','Current evade / sprint','Before front','Before rear'].map(k=>[k,r[k]])));
 for(const [name,data] of [['Design review',review],['Current characters',rows.map(r=>Object.fromEntries(Object.entries(r).filter(([k])=>!editable.includes(k))))],['Powers',powers]]){
  const s=wb.worksheets.add(name),keys=Object.keys(data[0]);
  s.showGridLines=false;
  s.getRange('A1').write([keys,...data.map(r=>Object.values(r))]);
  const range=s.getRangeByIndexes(0,0,data.length+1,keys.length);
  range.format.font={name:'Arial',size:10,color:'#24313A'};
  range.format.columnWidth=28;range.format.rowHeight=48;range.format.wrapText=true;range.format.verticalAlignment='top';
  const head=s.getRangeByIndexes(0,0,1,keys.length);head.format.fill='#263D49';head.format.font={name:'Arial',size:10,bold:true,color:'#FFFFFF'};head.format.rowHeight=44;
  s.getRange(`A2:B${data.length+1}`).format.columnWidth=20;
  s.freezePanes.freezeRows(1);s.freezePanes.freezeColumns(2);
  s.tables.add(`A1:${column(keys.length)}${data.length+1}`,true,`Review${name.replace(/ /g,'')}`);
  for(let c=0;c<keys.length;c++){
   const col=s.getRangeByIndexes(1,c,data.length,1);
   if(editable.includes(keys[c]))col.format.fill='#FFF1CB';
   if(keys[c].includes('approval'))col.dataValidation={rule:{type:'list',values:['Pending','Revise','Approved']}};
   if(keys[c].includes('parameters')||keys[c].includes('identity / powers'))col.format.columnWidth=65;
  }
  // Detail strings remain complete in cells/CSV; expandable row height in Excel.
  if(name==='Powers')s.getRange(`I2:I${data.length+1}`).format.rowHeight=110;
 }
 wb.recalculate();
 const inspect=await wb.inspect({kind:'table',range:"'Design review'!A1:D4",include:'values',tableMaxRows:4,tableMaxCols:4});
 await fs.writeFile(path.join(out,'workbook-inspection.json'),JSON.stringify(inspect,null,2));
 for(const name of ['Design review','Current characters','Powers']){
  const preview=await wb.render({sheetName:name,range:'A1:F5',scale:1,format:'png'});
  await fs.writeFile(path.join(out,`${name.toLowerCase().replace(/ /g,'-')}-preview.png`),new Uint8Array(await preview.arrayBuffer()));
 }
 await (await SpreadsheetFile.exportXlsx(wb)).save(path.join(out,'characters.xlsx'));
}
console.log(JSON.stringify({...manifest,xlsx:!!deps},null,2));
function column(n){let s='';for(;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
