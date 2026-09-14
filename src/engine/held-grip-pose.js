import * as THREE from 'three';
import {reachArm} from './hero-rig.js';
const target=new THREE.Vector3(),holderLocal=new THREE.Vector3();
const bounds=new THREE.Box3(),relative=new THREE.Matrix4(),inverseRoot=new THREE.Matrix4();
export function animateCarriedObjectGrip(f){
 const c=f._carry,mesh=c?.mesh,p=f.parts;if(!mesh||!p.rig)return false;
 mesh.updateWorldMatrix(true,true);p.body.updateWorldMatrix(true,true);
 if(!c.gripBounds){
  c.gripBounds=new THREE.Box3();inverseRoot.copy(mesh.matrixWorld).invert();
  mesh.traverse(o=>{if(!o.isMesh||!o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();relative.multiplyMatrices(inverseRoot,o.matrixWorld);bounds.copy(o.geometry.boundingBox).applyMatrix4(relative);c.gripBounds.union(bounds);});
 }
 if(c.gripBounds.isEmpty())return false;
 for(const [arm,side]of [[p.armL,-1],[p.armR,1]]){
  arm.getWorldPosition(target);mesh.worldToLocal(target);
  target.x=THREE.MathUtils.clamp(target.x,c.gripBounds.min.x,c.gripBounds.max.x);
  target.z=THREE.MathUtils.clamp(target.z,c.gripBounds.min.z,c.gripBounds.max.z);target.y=c.pickup?THREE.MathUtils.clamp(target.y,c.gripBounds.min.y,c.gripBounds.max.y):c.gripBounds.min.y;
  mesh.localToWorld(target);arm.parent.worldToLocal(target);reachArm(arm,target,side,c.pickup?THREE.MathUtils.smoothstep(c.pickup.age/c.pickup.duration,0,.3):1);
 }
 return true;
}
// Derive the contact from the driven torso geometry, excluding capes/equipment.
// This is visual reach only: carry roots and collision remain simulation-owned.
export function heldGripTarget(holder,receiver,arm,out){
 const torso=receiver.parts.torso;if(!torso.geometry.boundingBox)torso.geometry.computeBoundingBox();
 const box=torso.geometry.boundingBox;
 arm.getWorldPosition(out);torso.worldToLocal(out);
 holderLocal.copy(holder.pos);torso.worldToLocal(holderLocal);
 out.x=THREE.MathUtils.clamp(out.x,box.min.x*.65,box.max.x*.65);
 out.y=THREE.MathUtils.clamp(out.y,box.min.y+.15,box.max.y-.15);
 out.z=holderLocal.z>=0?box.max.z+.12:box.min.z-.12;
 return torso.localToWorld(out);
}
export function animateHeldGrip(f){
 if(animateCarriedObjectGrip(f))return;
 const v=f.grabbing;
 if(!f.parts.rig||!v?.parts?.rig||v.grabbedBy!==f||f.grabState!=='clinch'||f._clinchFinisher)return;
 f.obj.updateMatrixWorld(true);v.obj.updateMatrixWorld(true);
 for(const [i,arm,side]of [[0,f.parts.armL,-1],[1,f.parts.armR,1]]){
  // The free hand keeps its native body-punch or active ranged channel.
  if(i===1&&f._clinchPunch||f._combatAim?.armChannels?.[i]?.weight>.01)continue;
  heldGripTarget(f,v,arm,target);arm.parent.worldToLocal(target);
  reachArm(arm,target,side);
  const hand=arm.children[2];if(hand.morphTargetInfluences&&!hand.userData.gripOccupied)hand.morphTargetInfluences[0]=.35;
 }
}
