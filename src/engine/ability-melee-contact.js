import * as THREE from 'three';
import {fistContact} from './melee-pose.js';
import {sweepSplitObstacle} from './projectile-contact.js';
import {applyAbilityMeleeHit} from './ability-melee-hit.js';
import {stopRushAtBodyContact} from './ability-rush-body.js';

// Called at the same post-physics, post-pose boundary as martial strikes. The
// source range is an outer bound; only the driven glove can authorize a hit.
export function resolveAbilityMeleeContact(f,g,frame=null){
 const m=f._abilityMeleePose;if(!m?.physicalContact||!m.contactPending)return;
 m.contactPending=false;
 if(!f.alive||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.guarding)return;
 const current=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
 const history=frame?.fists.get(f),sameRig=history?.rig===f.parts.rig;
 const from=history?(sameRig?history.right:current):(m.previous||current);
 m.previous=current.clone();
 if(m.elapsed<.045)return;
 let first=Infinity,foe=null;const point=new THREE.Vector3(),impact=new THREE.Vector3();
 const range=m.slot.def.range||11;
 for(const other of g.entities||[]){
  if(!g.isFoe(f,other)||!other.alive||other.invuln>0||!other.parts?.rig||m.slot.hit.has(other.id))continue;
  const end=other.pos.clone().sub(f.pos),a0=frame?.targets.get(f)?.position,b0=frame?.targets.get(other)?.position;
  const start=a0&&b0?b0.clone().sub(a0):end,delta=end.clone().sub(start);
  const t=delta.lengthSq()?THREE.MathUtils.clamp(-start.dot(delta)/delta.lengthSq(),0,1):0;
  if(start.clone().addScaledVector(delta,t).length()>range)continue;
  for(const key of ['torso','head','pelvis']){
   const old=frame?.targets.get(other)?.parts[key];
   const previous=sameRig&&old?.part===other.parts[key]?old.matrix:null;
   const hit=fistContact(from,current,other.parts[key],.42,point,previous);
   if(hit<first){first=hit;foe=other;impact.copy(point);}
  }
 }
 if(!foe)return;
 const obstacle={};if(sweepSplitObstacle(g.world||{},from,impact,.42,obstacle,false,.42))return;
 m.contactPoint=impact.clone();stopRushAtBodyContact(f,foe);applyAbilityMeleeHit(f,m.slot.def,m.slot,g,foe,impact);
}
