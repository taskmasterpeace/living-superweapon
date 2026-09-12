import {operationSound} from './operation-audio.js';
const attackerScopes=new WeakMap();
// Local operator feedback is separate from positional impact/guard sound.
// Only resolved damage outcomes may confirm a hit; visual contact is insufficient.
export function confirmCombatOutcome(game,target,opts,outcome){
 if(!outcome||!target)return false;
 const localDefender=!!game.isHuman?.(target),localAttacker=!!opts.src&&opts.src!==target&&!!game.isHuman?.(opts.src);
 if(outcome.guard==='broken')return (localDefender||localAttacker)&&operationSound(game,'op.guard.break',null,target);
 if(outcome.guard==='blocked'||outcome.deflected)return localDefender&&operationSound(game,'op.block.confirm',null,target);
 if(opts.dot||!(outcome.healthLost>0)||!localAttacker)return false;
 let targets=attackerScopes.get(opts.src);if(!targets){targets=new WeakMap();attackerScopes.set(opts.src,targets);}
 let scope=targets.get(target);if(!scope){scope={};targets.set(target,scope);}
 return operationSound(game,'op.hit.confirm',null,scope);
}
