import * as THREE from 'three';

const keys=['torso','head','cowl','armL','armR'];
const origin=new THREE.Vector3(),direction=new THREE.Vector3(),front=new THREE.Vector3(),hip=new THREE.Vector3();
const inverse=new THREE.Quaternion(),desired=new THREE.Quaternion(),identity=new THREE.Quaternion();
const entryTarget=new THREE.Quaternion(),entryBase=new THREE.Quaternion();

export function restoreChestAim(f){
 const s=f._chestPose;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}

// Chest projection owns a coherent upper-body carrier. It cannot rotate the
// physics root or the gait's planted legs, and hands/head are solved afterwards.
export function animateChestAim(f,dt,slot,blocked,opticSlot=null){
 const p=f.parts;if(!p.rig||!f._openSky)return null;
 // When no chest weapon owns the spine, the same reversible upper-body
 // carrier supports an optic shot outside the neck cone. It is a posture
 // constraint, not a new root controller or a redirected beam packet.
 const optic=!slot?.active?.sustaining&&opticSlot?.active?.sustaining?opticSlot:null;
 const source=optic||slot;
 let s=f._chestPose;
 if(!s||s.rig!==p.rig){
  if(!source)return null;
  s=f._chestPose={rig:p.rig,rotation:new THREE.Quaternion(),applied:false,
   base:keys.map(key=>({part:p[key],position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 }
 desired.identity();
 if(source&&!blocked){
  p.g.updateMatrixWorld(true);
  const beam=source.active?.sustaining?source.active:null;
  if(beam?.predictDirection){beam.sampleMuzzle(origin);beam.predictDirection(direction,dt,origin);}
  else{
   p.torso.getWorldPosition(origin);
   if(f.hasAimWorld)direction.copy(f.aimWorld).sub(origin);else direction.copy(f.aim3);
   direction.normalize();
  }
  p.body.getWorldQuaternion(inverse).invert();direction.applyQuaternion(inverse);
  front.set(0,0,1).applyQuaternion(p.torso.quaternion);
  desired.setFromUnitVectors(front.normalize(),direction.normalize());
  // Additional thoracic correction only; this budget is not a total spine
  // limit. The existing directional/flight carrier handles larger reorientation.
  const angle=desired.angleTo(identity),correction=Math.min(.8,optic?Math.max(0,angle-1):angle);
  if(angle>1e-6)desired.slerp(identity,1-correction/angle);
 }
 // Live emission is already temporally steered. Deferring required support
 // again makes either axial emitter detach; ordinary release still eases out.
 if(source?.active?.sustaining&&!source.active.pendingLaunch&&!blocked)s.rotation.copy(desired);else s.rotation.rotateTowards(desired,8*dt);
 if(source?.active?.sustaining&&f._directionalPose?.airEntry&&f._combatRenderedTorso){
  // Initial travel-to-aim support and thoracic assistance share one rendered
  // budget. Two individually bounded turns can otherwise add up to a snap.
  // Keep this through the first packet if the carrier is still connecting.
  // The head/hand solves follow afterward; established steering is unchanged.
  entryTarget.copy(s.rotation).multiply(p.torso.quaternion);
  entryBase.copy(f._combatRenderedTorso).rotateTowards(entryTarget,12*dt);
  s.rotation.copy(entryBase).multiply(inverse.copy(p.torso.quaternion).invert());
 }
 if(s.rotation.angleTo(identity)<1e-5)return s.rotation;
 hip.set(0,p.rig.pivotHeight,0);
 for(const b of s.base){
  b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);
  b.part.position.sub(hip).applyQuaternion(s.rotation).add(hip);
  b.part.quaternion.premultiply(s.rotation);
 }
 s.applied=true;return s.rotation;
}
