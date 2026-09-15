// Presentation admission only. Never modifies damage, state or combat telemetry.
export function impactView(game,target,source,feedback){
 const own=!!target&&target===game.player,relevant=own||!!source&&source===game.player||!!target&&(target===game.hardLock||target===game.player?.target);
 return {owner:own?'YOU':target?.name||target?.def?.name||'TARGET',relevant,
  priority:(feedback?.priority||0)+(own?100:relevant?30:0),
  size:own&&feedback?.priority>=70?24:relevant?18:14,life:own?1.2:.85,
  word:relevant&&feedback?.priority>=75?feedback.word:''};
}
export class ImpactPolicy {
 constructor(){this.seen=new WeakMap();}
 admit(target,family,priority,now){
  if(!target||typeof target!=='object')return true;
  const last=this.seen.get(target);
  if(last&&now>=last.time&&((family===last.family&&now-last.time<.8)||(priority<=last.priority&&now-last.time<.32)))return false;
  this.seen.set(target,{family,priority,time:now});return true;
 }
 clear(){this.seen=new WeakMap();}
}
