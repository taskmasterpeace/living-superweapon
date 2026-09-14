import {hasStrike} from '../data/martial.js';
export const MELEE_CHARGE_MAX=1.3;
// Charge units: charge-rate talents change time to threshold, not region boundaries.
export function meleeReleaseChoice(def,t){
 const tiers=def.meleeTiers??3,jab=hasStrike(def,'jab'),cross=hasStrike(def,'cross'),power=hasStrike(def,'power');
 if(t<.18||tiers===1)return jab||cross?'combo':power?'slam':'none';
 if(t<.55&&tiers>=3)return cross?'cross':jab?'combo':power?'slam':'none';
 return power?'power':cross?'cross':jab?'combo':'none';
}
const labels={combo:'Combo',slam:'Slam',cross:'Straight',power:'Haymaker',none:'Unavailable',body:'Body blow',finish:'Finisher'};
export function meleeChargeRegions(def,clinch=false){
 const edges=clinch?[0,.55,MELEE_CHARGE_MAX]:[0,.18,.55,MELEE_CHARGE_MAX],regions=[];
 for(let i=0;i<edges.length-1;i++){
  const start=edges[i],end=edges[i+1],id=clinch?(start<.55?'body':'finish'):meleeReleaseChoice(def,start);
  const last=regions.at(-1);
  if(last?.id===id)last.end=end;else regions.push({id,label:labels[id],start,end});
 }
 return regions;
}
export function meleeChargeState(f){
 const charge=Math.max(0,Math.min(MELEE_CHARGE_MAX,f.meleeCharge||0));
 const regions=meleeChargeRegions(f.def,!!(f.grabbing&&f.grabState==='clinch'));
 return {charge,progress:charge/MELEE_CHARGE_MAX,regions,active:regions.findLast(r=>charge>=r.start)||regions[0]};
}
