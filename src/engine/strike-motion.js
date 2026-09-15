import * as THREE from 'three';
import {STRIKE_CLIPS,strikeClipFor} from '../data/strike-markers.js';
import {authoredParts,samplePoseFrame,mirrorPoseFrame,applyAuthoredPose} from './authored-pose.js';
import {GAIT} from '../core/util.js';
import {artOf} from '../data/martial.js';
import paidBoxer from '../data/paid-boxer-strike-bank.json' with {type:'json'};

export {STRIKE_CLIPS};
const frame=new Float64Array(45),lerp=THREE.MathUtils.lerp;
export function authoredStrikeClipFor(f){
 const fallback=strikeClipFor(f.def,f.mId),p=f.parts;
 // Explicit lab-only candidate. The supplied boxer stance fails native fast
 // contact continuity, so normal gameplay keeps the accepted source pipeline.
 if(f._paidBoxerPreview!==true)return fallback;
 const occupied=[p.armL,p.armR].some(a=>a.userData.shield||a.children[2].userData.gripOccupied||a.children[2].children.some(o=>o.visible&&o.userData.weaponKind));
 // Purchased boxing is a grounded style choice. Keep authored marker overrides,
 // armed actions, air adaptation and all three heavy-charge regions intact.
 if(artOf(f.def)!=='boxing'||f.gait!==GAIT.GROUNDED||f.flying||f.gliding||f.def.model?.paidMotions==='off'||f.def.model?.strikeMarkers?.[f.mId]||f._meleeMotion?.weapon||occupied)return fallback;
 return (f.mId==='jab'||f.mId==='cross')&&paidBoxer.clips[f.mId]||fallback;
}
export function restoreAuthoredStrikeBase(f){
 const s=f._authoredStrike;if(!s?.applied||s.rig!==f.parts.rig)return;
 for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;s.take=null;s.clip=null;
}
export function animateAuthoredStrike(f,t,weight){
 const p=f.parts,clip=authoredStrikeClipFor(f),heavy=f.mId==='power';
 const preference=heavy?f.def.model?.heavyStrikes:f.def.model?.strikes;
 // This take is bare-handed. Preserve weapon swings until a matching source
 // exists; a sword/axe is not a fist and a shield needs its own counterbalance.
 const armed=!!f._meleeMotion?.weapon||(heavy&&[p.armL,p.armR].some(arm=>arm.userData.shield||arm.children[2].userData.gripOccupied));
 if(!clip||preference==='procedural'||armed||weight<=0||f.stunT>0||f.staggerT>0||f.frozenT>0||f.grabbedBy)return false;
 // A deeply bladed boxing stance needs time to enter from locomotion. This
 // presentation blend finishes before contact and never changes combat timing.
 if(f.mstate==='startup'&&clip.entryBlendFraction)weight=Math.min(weight,THREE.MathUtils.smoothstep(t,0,clip.entryBlendFraction));
 let s=f._authoredStrike;
 if(!s||s.rig!==p.rig)s=f._authoredStrike={rig:p.rig,applied:false,take:null,base:authoredParts(p).map(part=>({part,position:part.position.clone(),quaternion:part.quaternion.clone()}))};
 const time=f.mstate==='startup'?lerp(0,clip.contactStart,t):f.mstate==='active'?lerp(clip.contactStart,clip.contactEnd,t):lerp(clip.contactEnd,clip.duration,t);
 s.time=THREE.MathUtils.clamp(time,0,clip.duration);s.take=clip.take;s.clip=clip;s.mirrored=f._meleeMotion.side!==clip.side;
 samplePoseFrame(clip,s.time/clip.duration,frame,false);if(s.mirrored)mirrorPoseFrame(frame);
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const grounded=f.gait===GAIT.GROUNDED&&!f.flying&&!f.gliding;
 const nativeCore=clip.corePolicy==='native';
 applyAuthoredPose(f,frame,weight,{legs:grounded,hips:grounded&&!nativeCore,body:!nativeCore,head:!nativeCore,support:grounded,anchorFromCurrent:true});
 return true;
}
