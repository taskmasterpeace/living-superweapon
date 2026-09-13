import * as THREE from 'three';
import {reachArm} from './hero-rig.js';

const handPoint=new THREE.Vector3(),blade=new THREE.Vector3(),axis=new THREE.Vector3(),x=new THREE.Vector3(),z=new THREE.Vector3();
const q=new THREE.Quaternion(),inverse=new THREE.Quaternion(),basis=new THREE.Matrix4();
const smooth=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const families={sword:'slash',katana:'slash',knife:'slash',axe:'chop',baton:'slash'};

// Procedural weapon families use native strike phases. Pose owns joints only;
// the simulation's committed target, movement and contact remain authoritative.
export function animateWeaponStrike(f,t,weight){
 const m=f._meleeMotion,kind=m?.weapon?.userData.weaponKind,family=families[kind];
 if(!family||!m.weapon.visible)return false;
 const p=f.parts,side=m.side,arm=side===1?p.armR:p.armL,off=side===1?p.armL:p.armR;
 const s=p.rig.pivotHeight/4.6;
 const u=f.mstate==='startup'?.3*smooth(t):f.mstate==='active'?.3+.4*smooth(t):.7+.3*smooth(t);
 const angle=Math.PI*u;
 if(family==='slash'){
  p.body.rotation.y+=side*.3*Math.cos(angle)*weight;
  handPoint.set(side*(.25+1.7*Math.cos(angle))*s,arm.position.y-1.5*s,(1.2+.8*Math.sin(angle))*s);
  blade.set(side*Math.cos(angle),.15,Math.sin(angle));
 }else{
  p.body.rotation.x+=(-.1+.24*u)*weight;
  handPoint.set(side*.9*s,arm.position.y+(.35-2.2*u)*s,(1.2+.65*Math.sin(angle))*s);
  blade.set(side*.12,Math.cos(angle),Math.sin(angle));
 }
 reachArm(arm,handPoint,side,weight);
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
 handPoint.copy(off.position).add(new THREE.Vector3(-side*.15*s,-.9*s,1.2*s));
 reachArm(off,handPoint,-side,weight);
 m.weaponFamily=family;
 return true;
}
