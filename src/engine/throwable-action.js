import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {constrainArmCover} from './arm-cover.js';
import {updateSoldierLoadoutPresentation} from './soldier-loadout-presentation.js';
import {authoredParts,samplePoseFrame,mirrorPoseFrame,applyAuthoredPose} from './authored-pose.js';
import {resolveMotionClip} from './motion-banks.js';

const point=new THREE.Vector3(),offset=new THREE.Vector3(),pole=new THREE.Vector3(),start=new THREE.Vector3();
const actionFrame=new Float64Array(45);
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const cue=(f,id)=>f._game?.audio?.soundLibrary?.play(id,{pos:f.pos,loop:false});
const interrupted=f=>f.alive===false||f.state==='ko'||f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0||f.grabbedBy||f.grabbing||f.grabState||f.mstate||f._abilityMeleePose||f.hanging||f._carry||f.guarding||f.meleeCharge>0||f.strikeActive>0||f._disarmT>0||f._aircraftVehicle||f._scoutVehicle;
const timing=(value,min,max,fallback)=>Number.isFinite(value)?THREE.MathUtils.clamp(value,min,max):fallback;

export function usesThrowAction(f,d){return !!f.parts?.rig&&f.def.archetype==='soldier'&&d.gear&&d.canister&&d.grav>0;}
export function beginThrowAction(f,slot,release){
 if(f._throwAction||interrupted(f))return false;
 // A soldier retains the rifle in the dominant hand; the free hand throws.
 // This is an authored procedural action, not an imported motion-capture clip.
 const side=-1,hand=f.parts.armL.children[2];
 updateSoldierLoadoutPresentation(f);if(hand.userData.gripOccupied)return false;
 const prop=new THREE.Mesh(new THREE.CapsuleGeometry(.22,.24,3,8),new THREE.MeshStandardMaterial({color:slot.def.color||'#8a915a',roughness:.75,metalness:.25}));
 prop.name='held-grenade';prop.position.set(0,-.13,.15);prop.castShadow=true;hand.add(prop);
 const motion=resolveMotionClip(f,'grenade','grenade-throw');
 f._throwAction={slot,side,prop,release,rig:f.parts.rig,elapsed:0,releaseAt:timing(slot.def.throwWindup,.24,1.5,.38),recovery:timing(slot.def.throwRecovery,.15,1,.32),released:false,releasePosition:new THREE.Vector3(),motion};
 cue(f,'grenade-prepare');return true;
}
export function restoreThrowPose(f){
 const s=f._throwPose;if(!s?.applied)return;
 if(s.rig===f.parts.rig)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}
export function cancelThrowAction(f){
 const m=f._throwAction;if(!m)return;
 if(!m.released){m.prop.removeFromParent();m.prop.geometry.dispose();m.prop.material.dispose();}
 f._throwAction=null;
}
export function cancelInterruptedThrow(f){
 const m=f._throwAction;
 if(m&&(interrupted(f)||m.rig!==f.parts.rig||!Object.values(f.slots).includes(m.slot)))cancelThrowAction(f);
}
export function advanceThrowAction(f,dt){
 cancelInterruptedThrow(f);const m=f._throwAction;if(!m||!(dt>0)||!Number.isFinite(dt)||f.hitstop>0)return;
 if(f._game?.paused||f._game?.combatOverlayOpen||f._game?.hud?.titleOpen)return;
 // Preserve the release pose even after a long frame; ordnance commits after
 // final articulation. Render/inspection alone cannot release a projectile.
 m.elapsed=Math.min(m.elapsed+dt,m.released?Infinity:m.releaseAt);
 if(m.released&&m.elapsed>=m.releaseAt+m.recovery)cancelThrowAction(f);
}
export function animateThrowAction(f){
 const m=f._throwAction,p=f.parts;if(!m||m.rig!==p.rig)return;
 const arm=p.armL,hand=arm.children[2];let s=f._throwPose;
 if(!s||s.rig!==p.rig)s=f._throwPose={rig:p.rig,base:authoredParts(p).map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const scale=p.rig.pivotHeight/4.6,t=m.elapsed/m.releaseAt*.38;
 if(m.motion?.clip){
  const event=m.motion.metadata?.events?.find(e=>e.type==='grenade-release'),releasePhase=THREE.MathUtils.clamp((event?.t??m.motion.clip.duration*.35)/m.motion.clip.duration,.01,.99);
  const phase=m.elapsed<=m.releaseAt?m.elapsed/m.releaseAt*releasePhase:releasePhase+(1-releasePhase)*Math.min(1,(m.elapsed-m.releaseAt)/m.recovery);
  samplePoseFrame(m.motion.clip,phase,actionFrame,false);mirrorPoseFrame(actionFrame);
  applyAuthoredPose(f,actionFrame,1,{legs:false,hips:false,support:false,body:false,head:false,armR:false});
 }
 const wind=smooth(t/.22),cast=smooth((t-.22)/.16),recovery=smooth((m.elapsed-m.releaseAt)/m.recovery);
 const weight=smooth(t/.12)*(1-recovery);
 // Wide overarm arc: elbow and shell pass outside the helmet and jacket.
 offset.set(-.85,THREE.MathUtils.lerp(-1.3,1.2,wind),THREE.MathUtils.lerp(.6,-.7,wind));
 offset.lerp(point.set(-.6,.4,2.95),cast);point.copy(arm.position).add(offset.multiplyScalar(scale));
 hand.getWorldPosition(start);arm.parent.worldToLocal(start);
 point.lerp(start,1-weight);point.z+=Math.sin(Math.PI*weight)*1.1*scale;
 pole.set(0,-1,0).applyQuaternion(arm.quaternion).lerp(offset.set(-1,.25,0),weight);
 reachArm(arm,point,-1,1,pole);
 p.g.updateMatrixWorld(true);
 if(f._openSky)constrainArmCover(f,arm,-1,pole.set(-1,-.55,-.15));
 if(hand.morphTargetInfluences)hand.morphTargetInfluences[0]=m.released?(1-recovery)*.8:0;
}
export function resolveThrowRelease(f){
 cancelInterruptedThrow(f);const m=f._throwAction;
 if(!m||m.released||m.elapsed+1e-8<m.releaseAt)return;
 m.prop.getWorldPosition(m.releasePosition);m.released=true;
 m.release(m.releasePosition.clone(),m.prop);cue(f,'grenade-release');
}
