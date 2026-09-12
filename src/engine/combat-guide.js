import {DTYPE_INFO, DOT_DTYPE, resistOf} from '../data/damage-types.js';
import {bakeSheet} from '../data/ranks.js';
import {dtypeOf} from '../data/visual.js';

// Facts come from attack metadata, never the attack's name or its particle color.
export function attackGuide(a,payload){
 if(!a)return {types:[],effects:[],label:''};
 const damaging=!!(a.damage||a.dps||a.dmgMax||a.dmgMin||['melee','rush','grab','bow','rifle','beam','projectile','volley','charge','cone','nova','mine','tentacle','lifedrain'].includes(a.type));
 const dtype=damaging?dtypeOf(a):null;
 const types=new Set(dtype?[dtype]:[]),effects=new Set();
 const payloads=payload?[payload]:a.payload?[a.payload]:a.payloads||[];
 for(const kind of payloads){
  const effect={flame:'BURN',poison:'POISON',gas:'POISON',acid:'CORRODE',sleep:'SLEEP',teargas:'BLIND',mustard:'CORRODE'}[kind];
  const type={flame:'fire',poison:'toxic',gas:'toxic',acid:'acid',teargas:'toxic',mustard:'acid'}[kind];
  if(effect)effects.add(effect);if(type)types.add(type);
 }
 if(a.blind)effects.add('BLIND');
 if(a.shockDuration>0)effects.add('SHOCK');
 if(a.cold||a.freeze)effects.add('FREEZE');
 if(a.dmgClass==='slash')effects.add('BLEED');
 if(dtype==='magic')effects.add('SIPHON');
 if(dtype==='acid')effects.add('CORRODE');
 for(const dot of [a.gasDot,a.dot])if(dot){types.add(dot.dtype||DOT_DTYPE[dot.kind||'gas']||'toxic');effects.add(({burn:'BURN',acid:'CORRODE'})[dot.kind]||'POISON');}
 return {types:[...types],effects:[...effects],label:[...[...types].map(t=>DTYPE_INFO[t]?.label||t.toUpperCase()),...effects].join(' · ')};
}

export function resistanceGuide(def,table=resistOf(def,bakeSheet(def))){
 return Object.entries(table).filter(([type,mult])=>DTYPE_INFO[type]&&Math.abs(mult-1)>.005).map(([type,mult])=>({
  type,mult,label:mult===0?`${DTYPE_INFO[type].label} IMMUNE`:`${DTYPE_INFO[type].label} ${mult<1?'−':'+'}${Math.round(Math.abs(mult-1)*100)}% damage`,
  kind:mult===0?'immune':mult<1?'resist':'weak',
 }));
}

export function attackMatchup(a,target,payload){
 if(!target)return '';
 return attackGuide(a,payload).types.flatMap(type=>{
  const m=target.resist?.[type]??1;
  return m===0?[`${type.toUpperCase()} IMMUNE`]:m<.995?[`${type.toUpperCase()} RESISTED`]:m>1.005?[`${type.toUpperCase()} VULNERABLE`]:[];
 }).join(' · ');
}
