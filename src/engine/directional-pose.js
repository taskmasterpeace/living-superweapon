import * as THREE from 'three';
import {GAIT} from '../core/util.js';
import {rangedPoseChannels} from './cast-channels.js';

const clamp=THREE.MathUtils.clamp;
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const axis=new THREE.Vector3(0,1,0),pivot=new THREE.Vector3(),turn=new THREE.Quaternion();
const angles=new THREE.Euler(0,0,0,'YXZ');
const aim=new THREE.Vector3(),inverse=new THREE.Quaternion();
const pelvisForward=new THREE.Vector3(),torsoForward=new THREE.Vector3();
const emissionOrigin=new THREE.Vector3(),emissionDirection=new THREE.Vector3();
const upper=['torso','head','cowl','armL','armR'];

export function rangedPoseSlot(f){
 return rangedPoseChannels(f).dominant;
}
export function exclusivePose(f){
 return f.state==='ko'||f._abilityMeleePose||f.guarding||f.poseGuard>.02||f.poseStrike>.02||f.poseGrab>.02||f.mstate||
  f.meleeCharge>0||f._bowDraw>.02||f.crouching||f.hanging||f._carry||f.grabbedBy||f.grabState||
  f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0||f.launchT>0||f._slideT>0;
}
// Visual heading only. Aim, collision and movement stay in simulation/world space.
// Retreat uses a backwards-sampled stride; never ask a neck to turn through 180°.
function emittedAim(f,dt){
 const channels=rangedPoseChannels(f);
 const slot=channels.torso?.active?.sustaining?channels.torso:channels.head?.active?.sustaining?channels.head:channels.hands;
 const beam=slot?.active?.sustaining?slot.active:null;
 if(!beam?.predictDirection||exclusivePose(f))return false;
 f.parts.g.updateMatrixWorld(true);beam.sampleMuzzle(emissionOrigin);beam.predictDirection(emissionDirection,dt,emissionOrigin);
 return true;
}
export function groundHeading(f,dt=0){
 const ground=f.gait===GAIT.GROUNDED&&!f.flying&&!f.gliding;
 const air=(f.airborne||f.gliding)&&!!rangedPoseSlot(f);
 if(!f._openSky||!f.parts.rig||(!ground&&!air)||exclusivePose(f)||Math.hypot(f.vel.x,f.vel.z)<1){
  f._groundHeading=null;
  f._flightHeading=null;
  // At hover/braking, the active casting carrier still follows live emission.
  // Following the faster raw cursor here turns the body through its own hose.
  if(f._openSky&&f.parts.rig&&emittedAim(f,dt)&&Math.hypot(emissionDirection.x,emissionDirection.z)>.001)
   return Math.atan2(emissionDirection.x,emissionDirection.z);
  return f.facing;
 }
 const facing=emittedAim(f,dt)&&Math.hypot(emissionDirection.x,emissionDirection.z)>.001?Math.atan2(emissionDirection.x,emissionDirection.z):f.facing;
 let delta=wrap(Math.atan2(f.vel.x,f.vel.z)-facing);
 // Keep a small deadband around the advance/retreat choice. Otherwise mouse
 // jitter at the boundary flips the leg target ~140 degrees and reverses the
 // source stride even though the fighter's travel direction has not changed.
 const key=ground?'_groundHeading':'_flightHeading';
 f[ground?'_flightHeading':'_groundHeading']=null;
 let state=f[key];
 if(!state||state.rig!==f.parts.rig)state=f[key]={rig:f.parts.rig,retreat:Math.abs(delta)>Math.PI*.67};
 else if(Math.abs(delta)>Math.PI*.72)state.retreat=true;
 else if(Math.abs(delta)<Math.PI*.62)state.retreat=false;
 if(state.retreat)delta=wrap(delta+Math.PI);
 const bias=f._spinePose?.rig===f.parts.rig?f._spinePose.bias:0;
 return facing+clamp(delta,-1.4,1.4)+bias;
}
export function restoreDirectionalAim(f){
 const s=f._directionalPose;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}
export function animateDirectionalAim(f,dt){
 const p=f.parts;if(!p.rig||!f._openSky)return;
 let s=f._directionalPose;
 if(!s||s.rig!==p.rig)s=f._directionalPose={rig:p.rig,yaw:0,shoulder:0,pitch:0,aimYaw:f.facing,applied:false,
  base:upper.map(key=>({part:p[key],position:p[key].position.clone(),quaternion:p[key].quaternion.clone()}))};
 const guardFacing=(f.guarding||f.poseGuard>.001)&&!f.mstate&&!f.grabState&&!f.grabbedBy&&f.staggerT<=0&&f.stunT<=0&&f.frozenT<=0;
 const blocked=exclusivePose(f)&&!guardFacing;
 // Keep the same aiming carrier through a sustained flight attack's braking /
 // vertical handoff. Dropping it at the horizontal-speed threshold leaves the
 // chest-only correction chasing the suddenly unwinding shoulder base.
 const wasAirTravel=s.airTravel;
 s.airTravel=!!((f.airborne||f.gliding)&&!exclusivePose(f)&&rangedPoseSlot(f)&&(f._flightHeading||s.airTravel));
 if(s.airTravel&&!wasAirTravel)s.airEntry={shoulder:s.shoulder,pitch:s.pitch};
 if(!s.airTravel)s.airEntry=null;
 const enabled=!blocked&&((f.gait===GAIT.GROUNDED&&!f.flying&&!f.gliding)||s.airTravel);
 const followsEmission=!blocked&&emittedAim(f,dt);
 // A traveling hose already has a steering rate. A second command-yaw filter
 // lets its physical face/chest lag far behind the energy leaving that socket.
 if(followsEmission)s.aimYaw=Math.hypot(emissionDirection.x,emissionDirection.z)>.001?Math.atan2(emissionDirection.x,emissionDirection.z):s.aimYaw;
 else s.aimYaw+=clamp(wrap(f.facing-s.aimYaw),-8*dt,8*dt);
 // Include the sampled chest counter-swing, not just the entity yaw. Otherwise
 // each stride can turn the casting shoulder back across the line of fire.
 p.g.updateMatrixWorld(true);p.body.getWorldQuaternion(inverse).invert();
 aim.set(Math.sin(s.aimYaw),0,Math.cos(s.aimYaw)).applyQuaternion(inverse);
 const delta=enabled?Math.atan2(aim.x,aim.z):0;
 // Root heading already eases in; cancel the sampled chest swing this frame.
 // Filtering that cancellation again lets elbows lag through the moving ribs.
 s.yaw=blocked?0:enabled?clamp(delta,-2.1,2.1):THREE.MathUtils.damp(s.yaw,0,16,dt);
 s.shoulder=clamp(s.yaw*.92,-2.05,2.05);
 let pitch=0;
 if(enabled&&rangedPoseSlot(f)&&!guardFacing){
  p.head.getWorldPosition(pivot);
  if(followsEmission)aim.copy(emissionDirection);
  else{
   aim.copy(f.hasAimWorld?f.aimWorld:f.pos).sub(pivot);
   if(!f.hasAimWorld)aim.copy(f.aim3);
  }
  aim.applyQuaternion(inverse);
  pitch=clamp(Math.atan2(aim.y,Math.hypot(aim.x,aim.z))*.45,-.5,.5);
 }
 s.pitch=blocked?0:followsEmission?pitch:THREE.MathUtils.damp(s.pitch,pitch,14,dt);
 if(enabled&&!guardFacing){
  // The source gait counter-rotates the pelvis inside `body`. Limit the actual
  // shoulder-to-pelvis yaw, not the correction relative to that parent group.
  // Keep the solved scalar offsets authoritative for the hand IK carrier.
  pelvisForward.set(0,0,1).applyQuaternion(p.pelvis.quaternion);
  torsoForward.set(0,0,1).applyQuaternion(p.torso.quaternion);
  turn.setFromEuler(angles.set(-s.pitch,0,0));torsoForward.applyQuaternion(turn);
  const baseYaw=Math.atan2(torsoForward.x,torsoForward.z)-Math.atan2(pelvisForward.x,pelvisForward.z);
  const relativeYaw=wrap(s.shoulder+baseYaw);
  s.shoulder+=clamp(relativeYaw,-1.2,1.2)-relativeYaw;
 }
 if(s.airEntry){
  // Acquiring the airborne aiming carrier is a posture transition, even when
  // a held beam already exists but has no emitted packets. Once connected,
  // retain direct live-ray tracking; filtering every turn detaches emitters.
  const entry=s.airEntry,dy=wrap(s.shoulder-entry.shoulder),dp=s.pitch-entry.pitch;
  const distance=Math.hypot(dy,dp),amount=Math.min(1,10*dt/Math.max(distance,1e-8));
  s.shoulder=entry.shoulder+=dy*amount;s.pitch=entry.pitch+=dp*amount;
  if(amount===1)s.airEntry=null;
 }
 if(Math.abs(s.yaw)+Math.abs(s.pitch)<.00001)return;
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 pivot.set(0,p.rig.pivotHeight,0);turn.setFromEuler(angles.set(-s.pitch,s.shoulder,0));
 for(const key of upper){p[key].position.sub(pivot).applyQuaternion(turn).add(pivot);p[key].quaternion.premultiply(turn);}
 // The remaining yaw is a neck turn relative to the already-turned shoulders.
 turn.setFromAxisAngle(axis,s.yaw-s.shoulder);p.head.quaternion.premultiply(turn);p.cowl.quaternion.copy(p.head.quaternion);
}
