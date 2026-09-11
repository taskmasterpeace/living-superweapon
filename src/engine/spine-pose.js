import * as THREE from 'three';

const keys=['torso','head','cowl','armL','armR'];
const angles=new THREE.Euler(0,0,0,'YXZ'),hip=new THREE.Vector3();
const desired=new THREE.Quaternion(),candidate=new THREE.Quaternion(),inverse=new THREE.Quaternion();
const before=new THREE.Vector3(),after=new THREE.Vector3();
const clamp=THREE.MathUtils.clamp,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const YAW_LIMIT=1.2,TURN_RATE=12;

function project(q){
 angles.setFromQuaternion(q);angles.y=clamp(angles.y,-YAW_LIMIT,YAW_LIMIT);
 return q.setFromEuler(angles);
}

export function restoreSpineAim(f){
 const s=f._spinePose;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}

// Final composed envelope, in the pelvis frame. Directional and chest planning
// precede this; head, hands and physical contact follow it. No simulation writes.
export function animateSpineAim(f,dt,active,blocked){
 const p=f.parts;if(!p.rig||!f._openSky)return null;
 let s=f._spinePose;
 if(!s||s.rig!==p.rig)s=f._spinePose={rig:p.rig,applied:false,engaged:false,bias:0,
  relative:p.pelvis.quaternion.clone().invert().multiply(p.torso.quaternion),rotation:new THREE.Quaternion(),
  base:keys.map(key=>({part:p[key],position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 desired.copy(p.pelvis.quaternion).invert().multiply(p.torso.quaternion);
 if(blocked){s.relative.copy(desired);s.engaged=false;s.bias=0;return null;}
 if(active)s.engaged=true;
 if(!s.engaged){s.relative.copy(desired);s.bias=THREE.MathUtils.damp(s.bias,0,12,dt);return null;}
 project(desired);
 const budget=TURN_RATE*Math.max(0,dt),distance=s.relative.angleTo(desired);
 let amount=Math.min(1,budget/Math.max(distance,1e-8));
 project(candidate.copy(s.relative).slerp(desired,amount));
 // Quaternion interpolation can leave a yaw-limited Euler region. Project its
 // path, then retain only progress that also satisfies the actual angular rate.
 if(candidate.angleTo(s.relative)>budget+1e-8){
  let lo=0,hi=amount;
  for(let i=0;i<16;i++){
   const t=(lo+hi)*.5;project(candidate.copy(s.relative).slerp(desired,t));
   if(candidate.angleTo(s.relative)<=budget)lo=t;else hi=t;
  }
  amount=lo;project(candidate.copy(s.relative).slerp(desired,amount));
 }
 s.relative.copy(candidate);
 s.rotation.copy(p.pelvis.quaternion).multiply(candidate).multiply(inverse.copy(p.torso.quaternion).invert());
 before.set(0,0,1).applyQuaternion(p.torso.quaternion);
 after.copy(before).applyQuaternion(s.rotation);
 if(active&&Math.hypot(before.x,before.z)>.1&&Math.hypot(after.x,after.z)>.1){
  const debt=wrap(Math.atan2(before.x,before.z)-Math.atan2(after.x,after.z));
  s.bias=clamp(s.bias+debt*Math.min(1,8*dt),-1.2,1.2);
 }else s.bias=THREE.MathUtils.damp(s.bias,0,12,dt);
 // Reaching this frame's target does not finish a moving combat recovery.
 // Keep the rate bound until that source blend has released the pose too.
 if(!active&&(f._combatAim?.weight||0)<.0001&&s.relative.angleTo(desired)<1e-5)s.engaged=false;
 hip.set(0,p.rig.pivotHeight,0);
 for(const b of s.base){
  b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);
  b.part.position.sub(hip).applyQuaternion(s.rotation).add(hip);b.part.quaternion.premultiply(s.rotation);
 }
 s.applied=true;return s.rotation;
}
