import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
const localDirection=new THREE.Vector3(),reachTarget=new THREE.Vector3(),parentRotation=new THREE.Quaternion();
// Restore before native animation evaluates its damped baseline; never feed the overlay back.
export function restorePersonThrowOverlay(f){
 const o=f?._personThrowOverlay;if(!o)return;
 o.node.quaternion.copy(o.quaternion);f._personThrowOverlay=null;
}
function captureTorsoBaseline(f){
 const node=f.parts?.torso;if(node&&!f._personThrowOverlay)f._personThrowOverlay={node,quaternion:node.quaternion.clone()};
}
// Visual release continuity only. The simulation owns launch velocity and control locks.
export function beginPersonThrowPose(f,direction=null){
 const nodes=[f.parts.armL,f.parts.armR].flatMap(a=>[a,...a.children]);
 if(f.parts.torso)nodes.push(f.parts.torso);
 f._personThrowPose={direction:direction?.clone().normalize()||null,remaining:.3,duration:.3,rig:f.parts,keys:nodes.map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone()}))};
}
export function advancePersonThrowPose(f,dt){
 const s=f._personThrowPose;if(!s)return;
 restorePersonThrowOverlay(f);
 if(s.rig!==f.parts||f.state==='ko'||f.state==='hit'||f.stunT>0||f.staggerT>0||f.frozenT>0||f.grabState||f.mstate||f.guarding||f.state==='cast'){f._personThrowPose=null;return;}
 if(f.hitstop>0)return;
 s.remaining=Math.max(0,s.remaining-dt);if(!s.remaining)f._personThrowPose=null;
}
export function animatePersonThrowPose(f){
 const s=f._personThrowPose;if(!s||s.rig!==f.parts)return false;
 restorePersonThrowOverlay(f);captureTorsoBaseline(f);
 const t=s.remaining/s.duration,w=t*t*(3-2*t);
 for(const k of s.keys){k.node.position.lerp(k.position,w);k.node.quaternion.slerp(k.quaternion,w);}
 // Extend toward the committed world-space throw direction, then recover.
 // Only joint rotations change; the simulation still owns both actor roots.
 const phase=1-t,extension=Math.sin(Math.PI*Math.min(1,phase/.8))*.9;
 if(s.direction&&f.parts.rig&&extension>0){
  f.obj.updateMatrixWorld(true);
  for(const [arm,side]of [[f.parts.armL,-1],[f.parts.armR,1]]){
   arm.parent.getWorldQuaternion(parentRotation);localDirection.copy(s.direction).applyQuaternion(parentRotation.invert());
   const length=(arm.userData.upperLength+arm.userData.foreLength)*.96;
   reachTarget.copy(arm.position).addScaledVector(localDirection,length);reachArm(arm,reachTarget,side,extension);
  }
 }
 return true;
}

// Wind-up bends the torso, then existing held-hand IK re-establishes contact.
// Root position and release velocity are untouched.
export function animatePersonThrowWindup(f){
 restorePersonThrowOverlay(f);
 const s=f._personThrowWindup,torso=f.parts?.torso;if(!s||!torso)return;
 captureTorsoBaseline(f);
 const phase=Math.min(1,s.elapsed/s.duration),weight=Math.sin(Math.PI*phase);
 torso.rotation.x+=.16*weight;torso.rotation.y-=.12*weight;
}
