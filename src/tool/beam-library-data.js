import {attackSource,attackFields,reconcileAttackOverrides} from '../data/attack-tuning.js';

// Read the same defaults and sparse overrides as the inspector, without applying
// profiles to roster definitions. These are configuration comparisons, not DPS sims.
export function beamCatalog(roster,{load=()=>null,draft=null}={}){
 const rows=[],errors=[];
 for(const hero of roster){
  if(!Object.keys(hero.abilities||{}).some(slot=>attackSource(hero,slot)?.type==='beam'))continue;
  try{
   const current=draft?.heroId===hero.id,profile=current?draft:load(hero.id);
   const attacks=profile?.attacks||{},compatible=reconcileAttackOverrides(hero,attacks);
   const stale=Object.keys(attacks).filter(slot=>!Object.hasOwn(compatible,slot));
   if(stale.length)errors.push(`${hero.name}: stale ${stale.join(', ')} overrides ignored; showing kit defaults for those attacks.`);
   const state=current&&draft.dirty?'Unsaved draft':profile&&(current?draft.saved:true)?'Saved local':hero.isCustom?'ORIGIN default':'Shipped default';
   for(const slot of Object.keys(hero.abilities||{})){
    const source=attackSource(hero,slot);if(source?.type!=='beam')continue;
    const v=Object.fromEntries(attackFields(hero,slot,compatible).map(f=>[f.key,f.value]));
    rows.push({heroId:hero.id,heroName:hero.name,slot,name:source.name||slot,
     shape:v.build,flow:v.temper,radius:v.radius,dps:v.dps,guardDps:v.dps*v.guardChip,
     tipSpeed:v.tipSpeed,reach:v.maxLen,travel100:v.maxLen>=100?100/v.tipSpeed:null,
     energy:v.kiPerSec,cost:v.cost,push:v.pushForce,state});
   }
  }catch(error){errors.push(`${hero.name}: ${error.message}`);}
 }
 return {rows,errors};
}

export function filterBeams(rows,{query='',shape='all',sort='name'}={}){
 const q=query.trim().toLowerCase();
 const compare={travel:(a,b)=>(a.travel100??Infinity)-(b.travel100??Infinity),dps:(a,b)=>b.dps-a.dps,energy:(a,b)=>a.energy-b.energy}[sort];
 const name=(a,b)=>`${a.heroName} ${a.name}`.localeCompare(`${b.heroName} ${b.name}`);
 return rows.filter(r=>(shape==='all'||r.shape===shape)&&`${r.heroName} ${r.name} ${r.slot}`.toLowerCase().includes(q)).sort((a,b)=>(compare?.(a,b)||name(a,b)));
}
