// Canonical pre-armor arithmetic. This computes no damage side effects; the
// native receiver commits each stage's mutations/cues in its original order.
import {moodMult} from './psyche.js';
import {canAbsorbNanite} from './nanite-forearms.js';

const pending=new WeakMap();
function calculate(f,amount,opts){
 const src=opts.src,p={};
 if(src?._psyche){amount*=moodMult(src,'dmg',1);if(src._moodCrit){amount*=1.5;p.consumeCrit=true;}}
 if(f._moodVulnT>0)amount*=f._moodVuln||1;
 p.moodAmount=amount;
 // Do not even read later factors when the native downed gate returns early.
 if(f.downedT>0&&!((opts.strike&&amount>=15)||opts.slam)){p.rejected=true;return p;}
 if(src?.sheet?.predator&&f.hp<f.maxHp*.3)amount*=1.15;
 if(src?._sizeMight&&src._sizeMight!==1)amount*=src._sizeMight;
 if(opts.strike&&src?.def?.airSuperiority&&f.pos.y>12&&!f.grounded)amount*=src.def.airSuperiority.mult||1.45;
 p.preBallisticAmount=amount;
 p.dtype=opts.dtype||(opts.ballistic?'ballistic':(opts.strike||opts.slam)?'physical':'energy');
 if(opts.ballistic){
  p.plate=Math.max(0,(f.def.armor??(f.def.metal?9:0))-(f._corrode>0?f._corrodeAmt:0));
  p.stopped=p.plate>0?Math.min(amount,p.plate):0;amount-=p.stopped;p.afterPlateAmount=amount;
  const str=f.strength??5;if(str>=6)amount*=Math.max(.12,1-(str-5)*.17);
  p.ballisticAmount=amount;
  if(amount<=.4){p.rejected=true;return p;}
 }
 p.resistance=f.resist?.[p.dtype]!=null?f.resist[p.dtype]:1;
 if(p.resistance!==1)amount*=p.resistance;
 p.amount=amount;p.rejected=p.resistance===0;return p;
}
export function damageAdmission(f,amount,opts){
 const entry=pending.get(opts);pending.delete(opts);
 return entry?.fighter===f&&entry.input===amount?entry.plan:calculate(f,amount,opts);
}
// Only an actual branded shield contact may preview. The result has no public
// token or caller-supplied override: it exists for one synchronous commit on
// the same options object and is removed on acceptance, reflection or throw.
export function withNaniteDamageAdmission(f,amount,opts,commit){
 if(!canAbsorbNanite(f,opts.naniteContact,opts)||f.remote||f._dupeOf?.alive)return commit(false);
 const plan=calculate(f,amount,opts);
 pending.set(opts,{fighter:f,input:amount,plan});
 try{return commit(!plan.rejected&&Number.isFinite(plan.amount)&&plan.amount>0);}finally{pending.delete(opts);}
}
