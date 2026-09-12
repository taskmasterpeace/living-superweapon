import {operationSound} from './operation-audio.js';

const observers=new WeakMap();
const labels={spotted:'CONTACT',airborne:'TARGET AIRBORNE',search:'LOST VISUAL · SEARCHING',lost:'CONTACT LOST',reacquired:'CONTACT REACQUIRED'};

// Read only this observer's accepted knowledge. No unseen target coordinates or
// live flight state enter a report; radio sharing itself remains owned by AI.
export function updateSquadReport(ai,game,target,sees){
 const actor=ai.bot;
 if(!actor?._squadLeader||actor.team!==game.player?.team||!actor.alive)return null;
 const prior=observers.get(ai)||{state:'idle',target:null,airborne:false};
 const state=sees?'contact':ai.belief&&ai._mem>0?'search':'idle';
 const targetId=sees?target?.id??target?.def?.id:prior.target;
 const airborne=sees?!!target?.flying:false;
 let event=null;
 if(sees){
  if(prior.state!=='contact'||targetId!==prior.target)event=prior.target===targetId&&prior.state!=='idle'?'reacquired':'spotted';
  else if(airborne&&!prior.airborne)event='airborne';
 }else if(state==='search'&&prior.state==='contact')event='search';
 else if(state==='idle'&&prior.state!=='idle')event='lost';
 observers.set(ai,{state,target:targetId,airborne});
 if(!event)return null;
 const record={time:game.time,observer:actor.def.id,target:targetId,state,event};
 const owner=game.ms||game;
 const log=owner.squadReports??=[];log.push(record);if(log.length>64)log.shift();
 if(operationSound(game,`op.pursuit.${event}`))game.hud?.feed?.(`${actor.def.name}: ${labels[event]}`,'#d5bd80');
 return record;
}
