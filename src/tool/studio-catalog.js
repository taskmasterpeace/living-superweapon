/* THESIS: choose reusable character packages without leaving the live inspector.
   OWN-WORLD: inherit Studio's charcoal/gold properties and native selects.
   STORY: select a package, inspect its limitations, then save or undo normally.
   FIRST VIEWPORT: a disclosure in Model, never an overlay over the fighter.
   FORM: scoped extension of the established inspector; no new visual world. */
import {loadBodyDefinition} from '../engine/authored-assets.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=[
  ['body','Body package','humanoid-body'],
  ['motion.locomotion','Locomotion package','humanoid-motion','walk'],
  ['motion.reload','Reload package','humanoid-motion','reload'],
  ['motion.grenade','Grenade package','humanoid-motion','grenade-throw'],
  ['equipment.rifle','Rifle package','equipment','rifle'],
  ['equipment.pistol','Sidearm package','equipment','pistol']
];
const valueAt=(assets,path)=>path.split('.').reduce((value,key)=>value?.[key],assets);

export function catalogInspector(catalog,assets,{loading=false,error='',open=false}={}){
  const controls=fields.map(([path,label,kind,role])=>{
    const value=valueAt(assets,path)||'';
    const entries=(catalog?.packages||[]).filter(entry=>entry.kind===kind&&(!role||(kind==='equipment'?entry.tags?.includes(role):Object.values(entry.clipCategories||{}).flat().includes(role))));
    const selected=entries.find(entry=>`${entry.id}@${entry.version}`===value);
    const options=[`<option value="">Bundled / procedural fallback</option>`,...entries.map(entry=>`<option value="${esc(entry.id)}@${entry.version}" ${`${entry.id}@${entry.version}`===value?'selected':''}>${esc(entry.displayName)} · v${entry.version}</option>`)];
    if(value&&!selected)options.push(`<option value="${esc(value)}" selected>${esc(value)} · unavailable</option>`);
    const note=selected?`${selected.adapter} · ${selected.license} · structure: ${selected.acceptance?.structural||'unknown'} · art: ${selected.acceptance?.visual||'unapproved'}${selected.acceptance?.blockers?.length?` · Needs work: ${selected.acceptance.blockers.join(', ')}`:''}`
      :value?(loading?'Checking catalog…':'Unavailable in this catalog. Reference kept; bundled presentation remains the fallback.'):'Uses the current built-in presentation.';
    return `<div class="property"><label for="catalog-${path}">${label}</label><select id="catalog-${path}" data-catalog="${path}" aria-describedby="catalog-note-${path}" ${loading?'disabled':''}>${options.join('')}</select><p class="help" id="catalog-note-${path}" data-catalog-note="${path}">${esc(note)}</p></div>`;
  }).join('');
  return `<details class="asset-catalog" ${open?'open':''}><summary>Asset packages</summary><p class="help">Reusable body, motion and weapon references. Choosing a body applies its calibrated proportions; you can edit them afterward. Structural checks do not approve appearance or hand contact. Missing clips keep their bundled fallback. Native prone stays unchanged.</p>${error?`<p class="help" role="alert">${esc(error)} Saved references are unchanged.</p><button id="catalog-retry" type="button">Retry catalog</button>`:''}${controls}<p class="help" id="catalog-runtime" role="status"></p><button id="catalog-motion-retry" type="button" hidden>Retry selected motion</button></details>`;
}

export function updateCatalogRuntime(fighter,host){
  const note=host.querySelector('#catalog-runtime');if(!note)return;
  const states=Object.entries(fighter?._authoredMotionStatus||{});
  const message=states.length?states.map(([role,state])=>`${role}: ${state.state}${state.state==='fallback'?` — ${state.message}`:''}`).join(' · '):'Motion uses bundled sources.';
  if(note.textContent!==message)note.textContent=message;
  const retry=host.querySelector('#catalog-motion-retry');
  if(retry)retry.hidden=!states.some(([,state])=>state.state==='fallback');
}

export function selectCatalogReference(profile,path,reference){
  if(!fields.some(field=>field[0]===path))throw new Error('Unknown asset selection.');
  const next=structuredClone(profile),assets=next.model.assets??={},keys=path.split('.');
  next.model.assets=assets;
  const target=keys.length===1?assets:(assets[keys[0]]??={});
  if(reference)target[keys.at(-1)]=reference;else delete target[keys.at(-1)];
  for(const family of ['motion','equipment'])if(assets[family]&&!Object.keys(assets[family]).length)delete assets[family];
  if(!Object.keys(assets).length)delete next.model.assets;
  return next;
}

export async function prepareCatalogSelection(profile,path,reference,{loadBody=loadBodyDefinition}={}){
  const next=selectCatalogReference(profile,path,reference);
  if(path==='body'&&reference){
    const body=await loadBody(reference);
    if(body.version!==1||typeof body.catalogBody!=='string'||!body.frame||typeof body.frame!=='object')
      throw new Error('Body package has no supported body/proportion preset. Existing draft kept.');
    next.model.body=body.catalogBody;
    next.frame={...next.frame,...body.frame};
  }
  return next;
}
