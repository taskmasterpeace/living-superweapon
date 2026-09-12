import * as THREE from 'three';
export function meleeEntryEligibility(game,f,target,range){
 const delta=target.center(new THREE.Vector3()).sub(f.center(new THREE.Vector3())),distance=delta.length();
 const denied=reason=>({eligible:false,reason,distance,alignment:0});
 if(f.blindT>0)return denied('BLINDED');
 if(!game.isFoe?.(f,target)||!target.alive)return denied('NO LIVE FOE');
 if((target._vis??1)<.4)return denied('TARGET UNSEEN');
 if(distance>range)return denied('OUT OF ENTRY RANGE');
 if(distance<.001)return denied('OVERLAPPING');
 if(!f.airborne&&Math.abs(delta.y)>6)return denied('TARGET TOO HIGH');
 const direction=f.aim3.clone();if(!f.airborne){direction.y=0;delta.y=0;}
 if(direction.lengthSq()<1e-6)return denied('FACE TARGET');
 const alignment=direction.normalize().dot(delta.normalize());
 if(alignment<Math.cos(Math.PI/9))return denied('FACE TARGET');
 if(game.canSee?.(f,target)===false)return denied('OBSTRUCTED');
 return {eligible:true,reason:'ENTRY READY',distance,alignment};
}
// Select only at strike start. Once committed, dodging changes the outcome, not the aim.
export function meleeEntryTarget(game,f,range){
 if(f.blindT>0)return null;
 let result=null,best=-Infinity;
 for(const target of game.entities||[]){
  const {eligible,distance,alignment}=meleeEntryEligibility(game,f,target,range);if(!eligible)continue;
  const score=alignment*2-distance/range;if(score>best){best=score;result=target;}
 }
 return result;
}
