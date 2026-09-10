import {loadMotionPackage,bindMotionPackage} from './motion-banks.js';

export function invalidateFighterMotion(fighter){
  fighter._authoredMotionGeneration=(fighter._authoredMotionGeneration||0)+1;
  fighter._motionSources={};
}

// Preload at construction/form/respawn boundaries, never during pose sampling.
// A load completing for an old rig or dead actor cannot change its presentation.
export function loadFighterMotion(fighter,{load=loadMotionPackage}={}){
  invalidateFighterMotion(fighter);
  const generation=fighter._authoredMotionGeneration,parts=fighter.parts;
  const refs={...fighter.def?.model?.assets?.motion};
  const status=fighter._authoredMotionStatus={};
  const current=role=>!fighter._formDisposed&&fighter.state!=='ko'&&!fighter.ragdoll&&
    fighter.parts===parts&&fighter._authoredMotionGeneration===generation&&
    fighter.def?.model?.assets?.motion?.[role]===refs[role];
  const requests=Object.entries(refs).map(async([role,ref])=>{
    status[role]={ref,state:'loading',message:'Loading selected package; bundled fallback remains available.'};
    try{
      const pack=await load(ref);
      if(current(role)&&bindMotionPackage(fighter,role,pack))
        status[role]={ref,state:'ready',packageHash:pack.packageHash,message:'Selected package loaded. Missing clips use bundled fallback.'};
    }catch(error){
      if(current(role))status[role]={ref,state:'fallback',message:error.message||'Package unavailable. Bundled fallback retained.'};
    }
  });
  fighter._authoredMotionReady=Promise.all(requests);
  return fighter._authoredMotionReady;
}
