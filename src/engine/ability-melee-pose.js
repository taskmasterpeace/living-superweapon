import * as THREE from 'three';
import {reachArm} from './hero-rig.js';

const point=new THREE.Vector3(),guard=new THREE.Vector3(),direction=new THREE.Vector3();
const inverse=new THREE.Quaternion(),rotation=new THREE.Quaternion(),forward=new THREE.Vector3(0,0,1);
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};

// Ability punches own a presentation channel, not the martial combo hitbox.
// Existing ability timing/damage remain authoritative; the visual clock is
// shared by the live fighter and Studio's advanceActionPose.
export function beginAbilityMeleePose(f,slot){
 if(!f._openSky||!f.parts.rig)return;
 f._abilityMeleePose={slot,elapsed:0,active:slot.t,recovery:.30,direction:f.aim3.clone().normalize(),physicalContact:slot.def.contact==='fist',contactPending:false};
}
export function cancelAbilityMeleePose(f){
 const motion=f._abilityMeleePose;
 if(motion)motion.slot.t=0;
 f._abilityMeleePose=null;
}
export function cancelInterruptedAbilityMeleePose(f){
 if(f._abilityMeleePose&&(f.state==='ko'||f.staggerT>0||f.stunT>0||f.frozenT>0||f.sleepT>0||f.downedT>0||f.grabbedBy||f.grabState||f.mstate||f.guarding))cancelAbilityMeleePose(f);
}
export function advanceAbilityMeleePose(f,dt){
 cancelInterruptedAbilityMeleePose(f);
 const motion=f._abilityMeleePose;if(!motion)return;
 motion.elapsed+=Math.max(0,dt);
 if(motion.elapsed>=motion.active+motion.recovery)f._abilityMeleePose=null;
}
export function animateAbilityMeleePose(f){
 const motion=f._abilityMeleePose,p=f.parts;if(!motion||!p.rig)return false;
 // The rushing ability can contact on its first simulation tick. Native
 // hitstop deliberately does not advanceActionPose, so the old elapsed-only
 // envelope froze a retracted hand while the victim flew away. The hit set is
 // authoritative: cut anticipation at actual contact, then hold the contact
 // pose until this same clock catches up. Rendering never advances the clock
 // or changes damage, range, root motion, or the active window.
 const contacted=motion.slot.hit?.size>0;
 const t=motion.physicalContact?motion.elapsed:Math.max(motion.elapsed,contacted?.12:0);
 const release=Math.max(0,(motion.elapsed-motion.active)/motion.recovery);
 // Keep ownership while the elbow folds back. Fading the whole overlay and
 // extension together lost the recovery into the already-extended cruise fist.
 const weight=smooth(t/.025)*(1-smooth((release-.5)/.5));
 const extension=smooth((t-.045)/.075)*(1-smooth(release/.7));
 const scale=p.rig.pivotHeight/4.6;
 p.body.rotation.y+=(.30-.62*extension)*weight;
 // Flight already supplies travel lean and trailing legs; do not force a
 // standing boxer silhouette or add visual translation to simulation roots.
 p.g.updateMatrixWorld(true);
 const arm=p.armR,off=p.armL;
 if(motion.physicalContact){
  // Punch across the shoulder toward the aiming ray, not on a parallel ray
  // offset by the full shoulder width (which misses a centered human chest).
  f.center(point);point.addScaledVector(motion.direction,(arm.userData.upperLength+arm.userData.foreLength)*2);
 }else{arm.getWorldPosition(point);point.addScaledVector(motion.direction,(arm.userData.upperLength+arm.userData.foreLength)*.98);}
 p.body.worldToLocal(point);
 // Keep the chamber outside the ribs by a fist radius. A pivot-only margin
 // could let the curled glove nick the breathing torso during recovery.
 guard.copy(arm.position).add(direction.set(.75,-.7,-.6).multiplyScalar(scale));point.lerp(guard,1-extension);
 // The fist travels around the ribs before crossing toward the aim ray. A
 // straight chamber-to-ray interpolation cut the glove through the chest at
 // low extension, even though both endpoint poses were outside the torso.
 if(motion.physicalContact)point.x+=Math.sin(Math.PI*extension)*1.2*scale;
 reachArm(arm,point,1,weight);
 guard.copy(off.position).add(direction.set(-.55,-.9,.85).multiplyScalar(scale));reachArm(off,guard,-1,weight);
 p.head.parent.getWorldQuaternion(inverse).invert();direction.copy(motion.direction).applyQuaternion(inverse);
 direction.z=Math.max(.2,direction.z);direction.normalize();rotation.setFromUnitVectors(forward,direction);
 p.head.quaternion.slerp(rotation,weight*.65);p.cowl.quaternion.copy(p.head.quaternion);
 return true;
}
