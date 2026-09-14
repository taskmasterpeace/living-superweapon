// Read native state only: these labels never grant an action or predict a hit.
export function meleePhase(f){
 if(f.alive===false||f.state==='ko')return {phase:'ko',remaining:0};
 if(f.grabbedBy)return {phase:'held',remaining:0};
 if(f.frozenT>0)return {phase:'frozen',remaining:f.frozenT};
 if(f.sleepT>0)return {phase:'asleep',remaining:f.sleepT};
 if(f.stunT>0)return {phase:'stunned',remaining:f.stunT};
 if(f.downedT>0)return {phase:'downed',remaining:f.downedT};
 if(f.staggerT>0)return {phase:'staggered',remaining:f.staggerT};
 if(f.shockT>0)return {phase:'shocked',remaining:f.shockT};
 if(f.mstate)return {phase:f.mstate,remaining:Math.max(0,f.mT||0)};
 if(f.grabState)return {phase:f.grabState==='startup'?'grab-startup':f.grabState,remaining:f.grabMode==='friendly'?0:Math.max(0,f.grabT||0)};
 if(f.meleeCharge>0)return {phase:'charging',remaining:0};
 if(f.guarding)return {phase:'guard',remaining:0};
 if(f.strikeCd>0)return {phase:f.comboWin>0?'combo':'cooldown',remaining:f.strikeCd};
 return {phase:'ready',remaining:0};
}
export const MELEE_PHASE_LABELS={startup:'Wind-up',active:'Strike active',recover:'Recovery',clinch:'Holding target','grab-startup':'Grab wind-up',charging:'Charging heavy',held:'Held',frozen:'Frozen',asleep:'Asleep',stunned:'Stunned',downed:'Knocked down',shocked:'Shocked',staggered:'Staggered',cooldown:'Attack cooldown',combo:'Combo follow-up',guard:'Guard raised',ready:'Ready',ko:'Knocked out'};
export function phaseLabel(phase){return MELEE_PHASE_LABELS[phase]||phase;}

// Contact/phase events are stamped every simulation frame; pose samples are
// throttled. Merge only facts newer than the displayed sample, without mutating it.
export function reviewStates(frame,events,time){
 const actors=frame.actors.map(a=>({...a}));
 for(const e of events){
  if(e.time<frame.time||e.time>time)continue;
  if(e.kind==='phase'&&actors[e.actor])Object.assign(actors[e.actor],{phase:e.phase,remaining:e.remaining});
  if(e.kind==='contact'){
   const target=actors[e.actor??(e.incoming?0:1)];if(target&&Number.isFinite(e.hp))target.hp=e.hp;
   if(actors[0]&&Number.isFinite(e.playerKi))actors[0].ki=e.playerKi;
  }
 }
 return actors;
}
