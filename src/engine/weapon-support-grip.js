import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
const target=new THREE.Vector3(),wrist=new THREE.Vector3(),offset=new THREE.Vector3(),shaft=new THREE.Vector3(),axis=new THREE.Vector3(),x=new THREE.Vector3(),z=new THREE.Vector3();
const q=new THREE.Quaternion(),inv=new THREE.Quaternion(),basis=new THREE.Matrix4();

// The support hand solves toward a socket on the actual held mesh. Weapons
// never move to chase the off-hand, and neither arm may stretch its bones.
export function supportWeaponGrip(f,weapon,primarySide,weight=1){
 const socket=weapon.getObjectByName('weapon-support-grip');if(!weapon.userData.twoHanded||!socket)return false;
 const side=-primarySide,arm=side===1?f.parts.armR:f.parts.armL,hand=arm.children[2];
 if(arm.userData.shield||hand.children.some(o=>o.visible&&o.userData.weaponKind))return false;
 f.obj.updateMatrixWorld(true);socket.getWorldPosition(target);arm.parent.worldToLocal(target);
 weapon.getWorldQuaternion(q);arm.parent.getWorldQuaternion(inv).invert();q.premultiply(inv);
 shaft.set(0,-1,0).applyQuaternion(q).normalize();
 wrist.copy(target);
 for(let i=0;i<4;i++){
  reachArm(arm,wrist,side,weight);
  q.copy(arm.quaternion).multiply(hand.quaternion);axis.set(0,1,0).applyQuaternion(q).normalize();
  x.copy(shaft).addScaledVector(axis,-shaft.dot(axis));
  if(x.lengthSq()>.001){
   x.normalize().multiplyScalar(-side);z.crossVectors(x,axis).normalize();
   q.setFromRotationMatrix(basis.makeBasis(x,axis,z));q.premultiply(inv.copy(arm.quaternion).invert());hand.quaternion.slerp(q,weight);
  }
  q.copy(arm.quaternion).multiply(hand.quaternion);
  offset.set(0,-.25,.12).applyQuaternion(q);
  wrist.copy(target).sub(offset);
 }
 if(hand.morphTargetInfluences)hand.morphTargetInfluences[0]=0;
 return true;
}
