import * as THREE from 'three';
import bank from '../data/locomotion-bank.json' with {type:'json'};
import {authoredParts,samplePoseFrame,blendPoseFrames,applyAuthoredPose} from './authored-pose.js';
import {GAIT} from '../core/util.js';
import {exclusivePose,rangedPoseSlot} from './directional-pose.js';
import {restoreJumpBase,supportJumpLanding} from './jump-motion.js';

export const GROUND_CLIPS=bank.clips;
export const GROUND_SOURCE=bank.source;
const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a),0,1);return t*t*(3-2*t);};
const frame=new Float64Array(45),nextFrame=new Float64Array(45);
const HANDOFF_SECONDS=.2;
const bootBounds=new THREE.Box3(),supportOffset=new THREE.Vector3(),supportInverse=new THREE.Quaternion();

// Restore only this overlay, after combat/hit overlays restore their own bases.
export function restoreGroundBase(f){
 const transition=f._groundTransition;
 if(transition?.applied&&transition.rig===f.parts.rig){
  for(const b of transition.joints){b.part.position.copy(b.basePosition);b.part.quaternion.copy(b.baseQuaternion);}
  f.parts.body.position.copy(transition.bodyBase);transition.applied=false;
 }
 // Apply order is ground -> jump -> bridge. Unwind the younger jump snapshot
 // before ground restores its older base, or the jump becomes the next rest.
 restoreJumpBase(f);
 const s=f._groundMotion;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}
export function animateGround(f,dt,combat=0){
 const p=f.parts;if(!p.rig||!f._openSky)return;
 let s=f._groundMotion;
 if(!s||s.rig!==p.rig)s=f._groundMotion={rig:p.rig,phase:0,weight:0,applied:false,take:null,
  base:authoredParts(p).map(part=>({part,position:part.position.clone(),quaternion:part.quaternion.clone()}))};
 const speed=Math.hypot(f.vel.x,f.vel.z),scale=p.rig.pivotHeight/4.6;
 const forward=f.vel.x*Math.sin(p.g.rotation.y)+f.vel.z*Math.cos(p.g.rotation.y);
 const disabled=f.def.model?.locomotion==='procedural'||f.gait!==GAIT.GROUNDED||f.flying||f.gliding||
  f.state==='ko'||f.crouching||f.prone||f._wounds?.leg||f.hanging||f._carry||f.grabbedBy||f.grabState||
  exclusivePose(f)||(combat>.02&&!rangedPoseSlot(f)&&!(f._combatAim?.weight>.0001));
 // A released ranged overlay is still fading out. Keep its source gait under
 // that recovery, or the generic cast base replaces the legs/arms for one beat.
 // Travel-aligned stride, with a derived reverse playback for retreat. The
 // source take name remains truthful: this is not a separately imported backstep.
 // The heading controller can pass through a lateral pivot while changing
 // advance/retreat. Keep the sampled stride through that turn instead of
 // crossfading to the old stiff generic cast legs for a few frames.
 const direction=f._groundHeading?1:smooth(.3,.8,Math.abs(forward)/Math.max(.01,speed));
 const desired=disabled?0:smooth(1,4,speed)*direction;
 s.weight=disabled?0:lerp(s.weight,desired,1-Math.exp(-14*dt));
 if(s.weight<.0001){s.take=null;return;}
 const pace=speed/scale,jog=smooth(8,14,pace),sprint=smooth(20,32,pace);
 const stride=lerp(lerp(10,15,jog),22,sprint)*scale;
 if(f.hitstop<=0)s.phase=((s.phase+Math.sign(forward)*speed/stride*dt)%1+1)%1;
 samplePoseFrame(bank.clips.walk,s.phase,frame);samplePoseFrame(bank.clips.jog,s.phase,nextFrame);blendPoseFrames(frame,nextFrame,jog);
 samplePoseFrame(bank.clips.sprint,s.phase,nextFrame);blendPoseFrames(frame,nextFrame,sprint);
 s.take=(sprint>.5?bank.clips.sprint:jog>.5?bank.clips.jog:bank.clips.walk).take;
 s.duration=(sprint>.5?bank.clips.sprint:jog>.5?bank.clips.jog:bank.clips.walk).duration;
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 applyAuthoredPose(f,frame,s.weight,{hips:true});
}

// Finite source-body/leg handoff, not another gait. Ground source support stops
// immediately at takeoff, but its last visible stride must not vanish in one
// frame. This runs before directional/combat solving so emitters see final support.
export function animateGroundTransition(f,dt){
 const p=f.parts;if(!p.rig||!f._openSky)return;
 // The physics root can already have touched down while the gait still says
 // AIRBORNE/SETTLE. That first landing pose, and ballistic -> powered air,
 // both need the same finite bridge as ground -> air.
 const grounded=!f.flying&&!f.gliding&&(f.onBlock||f.pos.y<=(f.groundY||0)+.02);
 const family=grounded?'ground':f.flying||f.gliding?'flight':'ballistic';
 const blocked=exclusivePose(f)||f.state==='ko'||f.hanging||f._carry||f.grabbedBy||f.grabState||f.crouching||f.prone;
 let s=f._groundTransition;
 if(!s||s.rig!==p.rig){
  // Source articulation includes its body carrier. Blending only local legs
  // still snaps their world-space orientation when that parent is replaced.
  // Arms/head remain unbridged: directional and emitter solving owns them last.
  const parts=[p.body,p.legL,p.legR,p.legL.userData.knee,p.legR.userData.knee,p.legL.userData.boot,p.legR.userData.boot];
  s=f._groundTransition={rig:p.rig,grounded,family,remaining:0,applied:false,bodyBase:p.body.position.clone(),joints:parts.map(part=>({part,
   previousPosition:part.position.clone(),previousQuaternion:part.quaternion.clone(),
   fromPosition:part.position.clone(),fromQuaternion:part.quaternion.clone(),
   basePosition:part.position.clone(),baseQuaternion:part.quaternion.clone()}))};
 }
 if(blocked){s.remaining=0;s.family=family;s.blocked=true;}
 else if(s.family!==family){
  s.remaining=s.blocked?0:HANDOFF_SECONDS;s.family=family;
  for(const j of s.joints){j.fromPosition.copy(j.previousPosition);j.fromQuaternion.copy(j.previousQuaternion);}
 }
 s.grounded=grounded;
 if(!blocked)s.blocked=false;
 if(s.remaining>0){
  const frozen=f.hitstop>0;
  s.remaining=Math.max(0,s.remaining-(frozen?0:Math.max(0,dt)));
  const t=1-s.remaining/HANDOFF_SECONDS,blend=t*t*t*(t*(t*6-15)+10);
  s.bodyBase.copy(p.body.position);s.applied=true;
  for(const j of s.joints){
   j.basePosition.copy(j.part.position);j.baseQuaternion.copy(j.part.quaternion);
   if(frozen){j.part.position.copy(j.previousPosition);j.part.quaternion.copy(j.previousQuaternion);}
   else{j.part.position.lerpVectors(j.fromPosition,j.basePosition,blend);j.part.quaternion.slerpQuaternions(j.fromQuaternion,j.baseQuaternion,blend);}
  }
  if(grounded){
   p.g.updateMatrixWorld(true);let low=Infinity;
   for(const leg of [p.legL,p.legR]){bootBounds.setFromObject(leg.userData.boot);low=Math.min(low,bootBounds.min.y);}
   // Re-establish visible sole contact before head/hand solves. Do not drag
   // support into flight, or move the simulation root to fix a rendered foot.
   supportOffset.set(0,Math.max(0,f.obj.position.y+.025-low),0);
   p.g.getWorldQuaternion(supportInverse).invert();p.body.position.add(supportOffset.applyQuaternion(supportInverse));
  }
 }
 supportJumpLanding(f);
 for(const j of s.joints){j.previousPosition.copy(j.part.position);j.previousQuaternion.copy(j.part.quaternion);}
}
