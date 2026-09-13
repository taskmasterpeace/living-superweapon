import * as THREE from 'three';
import {fistContact} from './melee-pose.js';
import {sweepSplitObstacle} from './projectile-contact.js';
import {applyAbilityMeleeHit} from './ability-melee-hit.js';
import {stopRushAtBodyContact} from './ability-rush-body.js';
import {weaponContactSweeps} from './melee-weapon-contact.js';

// Called at the same post-physics, post-pose boundary as martial strikes. The
// Source range is an outer bound; the driven glove or weapon authorizes a hit.
export function resolveAbilityMeleeContact(f,g,frame=null){
 const m=f._abilityMeleePose;if(!m?.physicalContact||!m.contactPending)return;
 m.contactPending=false;
 if(!f.alive||f.staggerT>0||f.stunT>0||f.frozenT>0||f.grabbedBy||f.guarding)return;
 const hand=(m.side===-1?f.parts.armL:f.parts.armR).children[2];
 const current=hand.getWorldPosition(new THREE.Vector3());
 const history=frame?.fists.get(f),sameRig=history?.rig===f.parts.rig;
 const from=history?(sameRig?(m.side===-1?history.left:history.right):current):(m.previous||current);
 m.previous=current.clone();
 const weaponSweep=m.weapon?.parent===hand?weaponContactSweeps(m.weapon,history?(sameRig?history.weapon:null):m.weaponPrevious):null;
 const sweeps=m.weapon?(weaponSweep?.sweeps||[]):[{from,to:current,radius:.42}];
 m.weaponPrevious=weaponSweep?.snapshot??null;
 if(m.elapsed<(m.startup||.045)||m.elapsed>=m.active)return;
 let first=Infinity,foe=null;const point=new THREE.Vector3(),impact=new THREE.Vector3();
 let contactFrom=from,contactRadius=.42;
 const range=m.slot.def.range||m.slot.def.reach||11;
 for(const sweep of sweeps){
 const {from,to:current,radius}=sweep;
 for(const other of g.entities||[]){
  if(!g.isFoe(f,other)||!other.alive||other.invuln>0||!other.parts?.rig||m.slot.hit.has(other.id))continue;
  const end=other.pos.clone().sub(f.pos),a0=frame?.targets.get(f)?.position,b0=frame?.targets.get(other)?.position;
  const start=a0&&b0?b0.clone().sub(a0):end,delta=end.clone().sub(start);
  const t=delta.lengthSq()?THREE.MathUtils.clamp(-start.dot(delta)/delta.lengthSq(),0,1):0;
  if(start.clone().addScaledVector(delta,t).length()>range)continue;
  for(const key of ['torso','head','pelvis']){
   const old=frame?.targets.get(other)?.parts[key];
   const previous=sameRig&&old?.part===other.parts[key]?old.matrix:null;
   const hit=fistContact(from,current,other.parts[key],radius,point,previous);
   if(hit<first){
    const obstacle={};if(sweepSplitObstacle(g.world||{},from,point,radius,obstacle,false,radius))continue;
    first=hit;foe=other;impact.copy(point);contactFrom=from;contactRadius=radius;
   }
  }
 }
 }
 if(!foe)return;
 const obstacle={};if(sweepSplitObstacle(g.world||{},contactFrom,impact,contactRadius,obstacle,false,contactRadius))return;
 m.contactPoint=impact.clone();stopRushAtBodyContact(f,foe);applyAbilityMeleeHit(f,m.slot.def,m.slot,g,foe,impact);
}
