import {OPERATION_AUDIO_CUES} from '../data/audio-cues.js';
import {MANIFEST,HOT_SET} from '../core/samples.js';

// Only these delivered cues have native event owners. Remaining assets stay unwired.
export const LIVE_OPERATION_CUES=Object.freeze(['op.zombie.alert','op.zombie.attack','op.zombie.hurt','op.zombie.death','op.hit.confirm','op.block.confirm','op.guard.break','op.shield.deploy','op.shield.hit','op.shield.collapse','op.scanner.acquire','op.scanner.lost','op.portal.ready','op.portal.cross','op.squad.ready','op.pursuit.spotted','op.pursuit.airborne','op.pursuit.lost','op.pursuit.search','op.pursuit.reacquired']);
const cues=new Map(OPERATION_AUDIO_CUES.filter(c=>LIVE_OPERATION_CUES.includes(c.id)).map(c=>[c.id,c]));
for(const [id,c]of cues){MANIFEST[id]={f:c.files,g:.55,reach:c.reach,rj:0};if(!HOT_SET.includes(id))HOT_SET.push(id);}
const clocks=new WeakMap();
const radioClocks=new WeakMap();
export function operationSound(g,id,pos=null,scope=g){
 const c=cues.get(id);if(!c||!g.audio?.sample)return false;
 let times=clocks.get(scope);if(!times){times=new Map();clocks.set(scope,times);}
 const now=Number.isFinite(g.time)?g.time:0;
 const radioAt=radioClocks.get(g);
 if(c.route==='radio'&&radioAt!==undefined&&now>=radioAt&&now-radioAt<1.2)return false;
 const last=times.get(id);
 // Simulation clock may reset between attempts. Never replay a queued, stale cue.
 if(last!==undefined&&now>=last&&now-last<c.cooldownMs/1000)return false;
 times.set(id,now);
 if(c.route==='radio')radioClocks.set(g,now);
 const options={pos:c.spatial?pos:null,bus:c.bus,gain:1,reach:c.reach};
 if(g.audio.sample(id,options))return true;
 const fallback=c.family==='zombie'?'v.beast':c.family==='combat'?(id==='op.guard.break'?'ui.error':'ui.confirm'):c.route==='radio'?'ui.confirm':id==='op.scanner.lost'?'ui.error':id==='op.scanner.acquire'?'ui.confirm':'fx.forcefield';
 return g.audio.sample(fallback,options);
}
