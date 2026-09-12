import * as THREE from 'three';
// Select only at strike start. Once committed, dodging changes the outcome, not the aim.
export function meleeEntryTarget(game,f,range){
 if(f.blindT>0)return null;
 const origin=f.center(new THREE.Vector3()),direction=f.aim3.clone();
 if(!f.airborne)direction.y=0;
 if(direction.lengthSq()<1e-6)return null;direction.normalize();
 let result=null,best=-Infinity;
 for(const target of game.entities||[]){
  if(!game.isFoe?.(f,target)||!target.alive||(target._vis??1)<.4)continue;
  const delta=target.center(new THREE.Vector3()).sub(origin),distance=delta.length();
  if(distance>range||distance<.001||(!f.airborne&&Math.abs(delta.y)>6))continue;
  if(!f.airborne)delta.y=0;delta.normalize();const alignment=direction.dot(delta);
  if(alignment<Math.cos(Math.PI/9)||game.canSee?.(f,target)===false)continue;
  const score=alignment*2-distance/range;if(score>best){best=score;result=target;}
 }
 return result;
}
