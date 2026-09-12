import {operationSound} from './operation-audio.js';
const awareness=new WeakMap(),deaths=new WeakSet();
export function zombieSound(game,actor,event){
 if(actor?.def?.vocalFamily!=='zombie'||!game)return false;
 if(event==='death'){if(deaths.has(actor))return false;deaths.add(actor);}
 else if(deaths.has(actor)||!actor.alive)return false;
 return operationSound(game,`op.zombie.${event}`,actor.pos,actor);
}
export function zombieAwareness(game,actor,sees){
 if(actor?.def?.vocalFamily!=='zombie')return;
 const before=awareness.get(actor)||false;awareness.set(actor,!!sees);
 if(sees&&!before)zombieSound(game,actor,'alert');
}
