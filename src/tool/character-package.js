// Portable ORIGIN recipes + production presentation. No executable or arbitrary engine data.
import {freshPicks,buildDef,validate,saveCustom,BUDGETS,POWERS,GIFTS,GADGETS,PALETTES,SKINS,FRAMES,EVADE_KINDS} from '../data/creator.js';
import {TALENTS} from '../data/ranks.js';
import {validateProfile,applyProfile} from './studio-profile.js';

const fail=message=>{throw Error(message);};
function safe(value,depth=0) {
  if(depth>16)fail('Character data is nested too deeply.');
  if(value&&typeof value==='object')for(const [key,v] of Object.entries(value)){
    if(['__proto__','constructor','prototype'].includes(key))fail('Unsafe property in character data.');
    safe(v,depth+1);
  }
}
function fields(value,keys,label){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(`${label} must be an object.`);
  if(Object.keys(value).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(value,k)))fail(`${label} has missing or unsupported fields.`);
}
const member=(value,values,label)=>{if(!values.includes(value))fail(`Unsupported ${label}.`);};
const number=(value,min,max,label,integer=false)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail(`${label} must be ${min}–${max}${integer?' (whole number)':''}.`);};
export function validateCharacter(input){
  safe(input);fields(input,['format','version','sourceId','picks','profile'],'Character package');
  if(input.format!=='lsw-character'||input.version!==1)fail('Unsupported character package version.');
  if(typeof input.sourceId!=='string'||!/^cx_[a-zA-Z0-9_-]{1,90}$/.test(input.sourceId))fail('Character package needs a custom source ID.');
  const p=input.picks;fields(p,Object.keys(freshPicks()),'ORIGIN recipe');
  for(const [key,max] of Object.entries({name:14,title:26,realName:80,city:80,country:80})){
    if(typeof p[key]!=='string'||p[key].length>max||/[<>\u0000-\u001f]/.test(p[key]))fail(`${key} must be plain text, at most ${max} characters.`);
  }
  for(const k of ['cape','yells'])if(typeof p[k]!=='boolean')fail(`${k} must be true or false.`);
  number(p.voicePitch,.5,1.6,'Voice pitch');
  for(const [k,size] of [['palette',PALETTES.length],['skin',SKINS.length],['frame',FRAMES.length]])number(p[k],0,size-1,k,true);
  fields(p.attrs,['fgt','agl','mgt','vig','int','awr','res'],'Attributes');
  for(const [k,v] of Object.entries(p.attrs))number(v,1,10,k,true);
  member(p.budget,BUDGETS.map(b=>b.id),'budget');member(p.flightTier,[0,1,2,3],'flight tier');
  member(p.guardType,['block','barrier','deflect'],'guard');member(p.evade,EVADE_KINDS.map(e=>e.v),'evade');member(p.meleeTiers,[2,3],'melee tiers');
  for(const [k,allowed,max] of [['gifts',GIFTS.map(g=>g.id),GIFTS.length],['talents',Object.keys(TALENTS),3],['gadgets',GADGETS.map(g=>g.id),2]]){
    if(!Array.isArray(p[k])||p[k].length>max||new Set(p[k]).size!==p[k].length)fail(`Invalid ${k} selection.`);
    for(const v of p[k])member(v,allowed,k);
  }
  fields(p.slots,['lmb','rmb','q','e','f','r'],'Power slots');
  for(const v of Object.values(p.slots))member(v,[null,...POWERS.map(a=>a.id)],'power');
  const errors=validate(p);if(errors.length)fail(errors.join(' '));
  const profile=validateProfile(input.profile);
  if(profile.heroId!==input.sourceId)fail('Presentation and character IDs do not match.');
  return JSON.parse(JSON.stringify({...input,profile}));
}
export function exportCharacter(record,profile){
  if(!record?.def?.isCustom)fail('Select a custom ORIGIN character to export a complete package.');
  return validateCharacter({format:'lsw-character',version:1,sourceId:record.def.id,picks:record.picks,profile});
}
export function importCharacter(input,roster,storage=localStorage){
  const pack=validateCharacter(input);
  // Always a new ID: importing a backup cannot silently replace an existing hero or profile.
  const id='cx_'+crypto.randomUUID().replaceAll('-','');
  const profile={...pack.profile,heroId:id};
  const def=applyProfile(buildDef(pack.picks,id),profile);
  // One storage write carries both kit and presentation; no partially installed two-key package.
  saveCustom(pack.picks,def,roster,storage);
  return {v:1,picks:pack.picks,def};
}
