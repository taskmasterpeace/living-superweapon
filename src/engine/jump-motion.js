import * as THREE from 'three';
import bank from '../data/jump-bank.json' with {type:'json'};
import {authoredParts,samplePoseFrame,applyAuthoredPose} from './authored-pose.js';
import {exclusivePose} from './directional-pose.js';

export const JUMP_CLIPS=bank.clips;
export const JUMP_SOURCE=bank.source;
const frame=new Float64Array(45),clamp=THREE.MathUtils.clamp;
const TAKEOFF=.30,LANDING=.36,EXIT=.12;
const bootBounds=new THREE.Box3(),supportOffset=new THREE.Vector3(),supportInverse=new THREE.Quaternion();

// Existing full-body owners retain their flight suppression/articulation. Only
// free ballistic air is removed from the powered velocity-aligned family.
export function usesFlightPose(f){return f.gliding||(f.airborne&&(f.flying||exclusivePose(f)));}
export function restoreJumpBase(f){
 const s=f._jumpMotion;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}s.applied=false;
}
export function supportJumpLanding(f){
 const p=f.parts,s=f._jumpMotion;
 if(!s?.applied||s.mode!=='landing'||f.flying||f.gliding||(!f.onBlock&&f.pos.y>(f.groundY||0)+.02))return;
 p.g.updateMatrixWorld(true);let low=Infinity;
 for(const leg of [p.legL,p.legR]){bootBounds.setFromObject(leg.userData.boot);low=Math.min(low,bootBounds.min.y);}
 supportOffset.set(0,f.obj.position.y+.025-low,0);p.g.getWorldQuaternion(supportInverse).invert();
 p.body.position.add(supportOffset.applyQuaternion(supportInverse));
}
export function animateJump(f,dt){
 const p=f.parts;if(!p.rig||!f._openSky)return;
 let s=f._jumpMotion;
 if(!s||s.rig!==p.rig)s=f._jumpMotion={rig:p.rig,time:0,weight:0,wasAir:false,mode:null,take:null,applied:false,
  base:authoredParts(p).map(part=>({part,position:part.position.clone(),quaternion:part.quaternion.clone()}))};
 const blocked=exclusivePose(f)||f._grapple||f.def.model?.locomotion==='procedural';
 const onFloor=f.onBlock||f.pos.y<=(f.groundY||0)+.02;
 const air=!f.flying&&!f.gliding&&!onFloor;
 if(blocked||f.flying||f.gliding){s.mode=null;s.take=null;s.time=0;s.weight=0;s.wasAir=false;return;}
 const delta=f.hitstop>0?0:Math.max(0,dt);
 if(air&&!s.wasAir){s.mode=f.vel.y>0?'jump':'fall';s.time=0;}
 else if(!air&&s.wasAir){s.mode='landing';s.time=0;}
 s.wasAir=air;
 if(!s.mode){s.take=null;return;}
 s.time+=delta;
 if(s.mode==='jump'&&s.time>=TAKEOFF){s.time-=TAKEOFF;s.mode='fall';}
 if(s.mode==='landing'&&s.time>=LANDING+EXIT){s.mode=null;s.take=null;s.weight=0;return;}
 const clip=s.mode==='jump'?bank.clips.takeoff:s.mode==='fall'?bank.clips.fall:bank.clips.landing;
 if(!clip){s.take=null;s.weight=0;return;}
 const duration=s.mode==='jump'?TAKEOFF:s.mode==='landing'?LANDING:clip.duration;
 s.phase=clip.loop?(s.time/duration)%1:clamp(s.time/duration,0,1);
 s.take=clip.take;s.duration=clip.duration;
 const entry=s.mode==='jump'?clamp(s.time/.08,0,1):1;
 s.weight=entry*(s.mode==='landing'?1-clamp((s.time-LANDING)/EXIT,0,1):1);
 samplePoseFrame(clip,s.phase,frame,clip.loop);
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 // Landing support is resolved after the finite lower-body bridge, before aim.
 applyAuthoredPose(f,frame,s.weight,{hips:true,support:false});
}
