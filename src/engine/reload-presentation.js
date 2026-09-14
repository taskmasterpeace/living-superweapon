// Authored procedural magazine action over the final rifle carrier. The ammo
// clock owns timing; this layer only articulates the free hand and rigid props.
import * as THREE from 'three';
import {firearmEmitter} from './weapon-emission.js';
import {reachArm} from './hero-rig.js';
import {authoredParts,samplePoseFrame,applyAuthoredPose} from './authored-pose.js';
import {resolveMotionClip} from './motion-banks.js';

const target=new THREE.Vector3(),start=new THREE.Vector3(),pole=new THREE.Vector3(),endPole=new THREE.Vector3();
const rotation=new THREE.Quaternion(),parent=new THREE.Quaternion();
const actionFrame=new Float64Array(45);
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));

export function restoreReloadPose(f){
 const s=f._reloadPose;if(!s?.applied)return;
 if(s.rig===f.parts.rig)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}
export function resetReloadProps(f){
 const s=f._reloadPose;if(!s)return;
 s.magazine.position.copy(s.magazineRest);s.bolt.position.copy(s.boltRest);
}
export function animateReloadPose(f){
 const r=f._firearmReload,p=f.parts;
 if(!r||!p.rig||!f._riflePose?.active){resetReloadProps(f);return;}
 const emitter=firearmEmitter(f,r.slot.def),gun=emitter.weapon;
 const magazine=gun?.getObjectByName('weapon-magazine'),bolt=gun?.getObjectByName('weapon-charging-handle');
 if(!magazine||!bolt)return;
 const side=-emitter.side,arm=side<0?p.armL:p.armR,hand=arm.children[2];let s=f._reloadPose;
 if(!s||s.rig!==p.rig||s.magazine!==magazine){
  resetReloadProps(f);
  s=f._reloadPose={rig:p.rig,magazine,bolt,magazineRest:magazine.position.clone(),boltRest:bolt.position.clone(),
   base:authoredParts(p).map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 }
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const t=THREE.MathUtils.clamp(r.elapsed/r.duration,0,1);
 const motion=r.motion??resolveMotionClip(f,'reload','reload');r.sourcePhase=t;
 if(motion?.clip){samplePoseFrame(motion.clip,t,actionFrame,false);applyAuthoredPose(f,actionFrame,1,{legs:false,hips:false,support:false,body:false,head:false,armR:false});}
 // Local -Z points below the upright rifle. Package event timing and cue
 // dispatch share this action-owned timeline; fallback values are unchanged.
 const timeline=r.timeline;
 const draw=ramp(t,timeline.drawStart,timeline.drawFull)*(1-ramp(t,timeline.insertStart,timeline.insert));
 const handling=ramp(t,timeline.handlingStart,timeline.handlingFull)*(1-ramp(t,timeline.handlingRelease,timeline.handlingEnd));
 magazine.position.copy(s.magazineRest);magazine.position.z-=draw*.7+handling*.1;magazine.position.y-=handling*.35;
 const charge=ramp(t,timeline.boltStart,timeline.chamber)*(1-ramp(t,timeline.chamber,timeline.boltEnd));
 bolt.position.copy(s.boltRest);bolt.position.y+=charge*.26;
 const weight=ramp(t,0,.15)*(1-ramp(t,.92,1));
 const toBolt=ramp(t,timeline.toBoltStart,timeline.toBoltEnd);
 magazine.getObjectByName('magazine-grip').getWorldPosition(target);
 bolt.getWorldPosition(start);target.lerp(start,toBolt);arm.parent.worldToLocal(target);
 hand.getWorldPosition(start);arm.parent.worldToLocal(start);target.lerp(start,1-weight);
 pole.set(0,-1,0).applyQuaternion(arm.quaternion);
 // Keep the reload elbow outside the carrier, following its current blade.
 if(f._pronePose?.weight)endPole.set(side,0,0);
 else endPole.set(side,-.5,3).applyQuaternion(p.torso.quaternion);
 // The imported support-arm plane remains visible while the final hand target
 // stays authoritative at the physical magazine/bolt contact.
 pole.lerp(endPole,weight*(motion?.clip?.frames?0.75:1));
 reachArm(arm,target,side,1,pole);
 arm.getWorldQuaternion(parent).invert();gun.getWorldQuaternion(rotation);
// Upright magazine palm alignment rolls the low prone hand through the floor.
 // Keep the grounded wrist orientation while the contact solver moves its grip.
 if(!f._pronePose?.weight)hand.quaternion.slerp(parent.multiply(rotation),weight);
 if(hand.morphTargetInfluences)hand.morphTargetInfluences[0]=0;
}
