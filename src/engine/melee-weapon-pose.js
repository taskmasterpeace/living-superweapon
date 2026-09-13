import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
import {supportWeaponGrip} from './weapon-support-grip.js';
import {meleeWeaponFor} from './weapon-grip.js';

const handPoint=new THREE.Vector3(),blade=new THREE.Vector3(),axis=new THREE.Vector3(),x=new THREE.Vector3(),z=new THREE.Vector3();
const q=new THREE.Quaternion(),inverse=new THREE.Quaternion(),basis=new THREE.Matrix4();
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const families={bat:'swing',sword:'slash',katana:'slash',knife:'slash',axe:'chop',baton:'slash',spear:'thrust'};
const delta=new THREE.Vector3(),projected=new THREE.Vector3(),lateral=new THREE.Vector3(),pole=new THREE.Vector3();
// Choose a reachable elbow plane for a shaft held across the fingers. A spear
// cannot aim straight by bending the wrist sideways around an arbitrary elbow.
function thrustElbow(arm,point,direction,side){
 const {upperLength:u,foreLength:v}=arm.userData;
 delta.copy(arm.position).sub(point);projected.copy(delta).addScaledVector(direction,-delta.dot(direction));
 const length=projected.length();if(length<1e-5)return null;
 const c=(v*v+delta.lengthSq()-u*u)/(2*length);if(Math.abs(c)>v)return null;
 projected.divideScalar(length);lateral.crossVectors(direction,projected).normalize();
 if(lateral.x*side<0)lateral.negate();
 return pole.copy(point).addScaledVector(projected,c).addScaledVector(lateral,Math.sqrt(Math.max(0,v*v-c*c))).sub(arm.position);
}

function readyTwoHanded(f,weapon,side){
 const arm=side===1?f.parts.armR:f.parts.armL,s=f.parts.rig.pivotHeight/4.6;
 handPoint.set(-side*.2*s,arm.position.y-1.1*s,2*s);reachArm(arm,handPoint,side);
 return supportWeaponGrip(f,weapon,side);
}
export function animateWeaponReady(f){
 if(f.mstate||f.grabState||f._carry||f.hanging||f.guarding||f.poseGuard>.02||f.stunT>0||f.staggerT>0||f.frozenT>0||f.grabbedBy||!f.alive)return false;
 const held=meleeWeaponFor(f);if(!held?.weapon.userData.twoHanded)return false;
 return readyTwoHanded(f,held.weapon,held.side);
}

// Procedural weapon families use native strike phases. Pose owns joints only;
// the simulation's committed target, movement and contact remain authoritative.
export function animateWeaponStrike(f,t,weight,m=f._meleeMotion,phase=f.mstate){
 const kind=m?.weapon?.userData.weaponKind,family=families[kind];
 if(!family||!m.weapon.visible)return false;
 const p=f.parts,side=m.side,arm=side===1?p.armR:p.armL,off=side===1?p.armL:p.armR;
 if(m.weapon.userData.twoHanded)readyTwoHanded(f,m.weapon,side);
 const s=p.rig.pivotHeight/4.6;
 const u=phase==='startup'?.3*smooth(t):phase==='active'?.3+.4*smooth(t):.7+.3*smooth(t);
 const angle=Math.PI*u;
 if(family==='swing'){
  p.body.rotation.y+=side*.65*Math.cos(angle)*weight;
  handPoint.set(side*(-.2+.3*Math.cos(angle))*s,arm.position.y-1.1*s,(1.25+.2*Math.sin(angle))*s);
  blade.set(side*Math.cos(angle),.15,Math.sin(angle));
 }else if(family==='slash'){
  p.body.rotation.y+=side*.3*Math.cos(angle)*weight;
  handPoint.set(side*(.25+1.7*Math.cos(angle))*s,arm.position.y-1.5*s,(1.2+.8*Math.sin(angle))*s);
  blade.set(side*Math.cos(angle),.15,Math.sin(angle));
 }else if(family==='thrust'){
  const extension=phase==='startup'?.15*smooth(t):phase==='active'?.15+.85*smooth(t):1-smooth(t);
  handPoint.set(side*.9*s,arm.position.y-2*s,(.55+.6*extension)*s);
  f.obj.updateMatrixWorld(true);
  if(!m.weaponDirection){blade.copy(handPoint);p.body.localToWorld(blade);m.weaponDirection=m.point.clone().sub(blade).normalize();}
  p.body.getWorldQuaternion(inverse).invert();blade.copy(m.weaponDirection).applyQuaternion(inverse);
 }else{
  p.body.rotation.x+=(-.1+.24*u)*weight;
  handPoint.set(side*.9*s,arm.position.y+(.35-2.2*u)*s,(1.2+.65*Math.sin(angle))*s);
  blade.set(side*.12,Math.cos(angle),Math.sin(angle));
 }
 let elbow=null;
 if(family==='thrust'){
  elbow=thrustElbow(arm,handPoint,blade,side);
  // Stay within the same anatomical elbow solution as extension approaches
  // its limit; never snap back to a differently twisted generic reach.
  for(let i=0;!elbow&&i<24;i++){handPoint.z-=.05*s;elbow=thrustElbow(arm,handPoint,blade,side);}
 }
 reachArm(arm,handPoint,side,weight,elbow);
 // Roll around the forearm only. No wrist bend or detached weapon is used to
 // force the blade angle. The blade follows the reachable projected direction.
 const hand=arm.children[2];q.copy(arm.quaternion).multiply(hand.quaternion);
 axis.set(0,1,0).applyQuaternion(q).normalize();
 blade.addScaledVector(axis,-blade.dot(axis));
 if(blade.lengthSq()>.001){
  x.copy(blade).normalize().multiplyScalar(-side);z.crossVectors(x,axis).normalize();
  q.setFromRotationMatrix(basis.makeBasis(x,axis,z));q.premultiply(inverse.copy(arm.quaternion).invert());
  hand.quaternion.slerp(q,weight);
 }
 if(!supportWeaponGrip(f,m.weapon,side,1)){
  handPoint.copy(off.position).add(new THREE.Vector3(-side*.15*s,-.9*s,1.2*s));
  reachArm(off,handPoint,-side,weight);
 }
 m.weaponFamily=family;
 return true;
}

