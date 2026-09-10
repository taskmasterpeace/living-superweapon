import * as THREE from 'three';

const corners=Array.from({length:8},()=>new THREE.Vector3());
function coreBox(f){
 f.obj.updateMatrixWorld(true);const box=new THREE.Box3();
 for(const key of ['head','torso','pelvis']){
  const p=f.parts[key];if(!p?.geometry)continue;
  if(!p.geometry.boundingBox)p.geometry.computeBoundingBox();
  box.union(p.geometry.boundingBox.clone().applyMatrix4(p.matrixWorld));
 }
 return box;
}
function project(box,axis){
 let min=Infinity,max=-Infinity;
 for(let i=0;i<8;i++){const p=corners[i].set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).dot(axis);min=Math.min(min,p);max=Math.max(max,p);}
 return {min,max};
}

// This is authoritative collision response, never visual root motion. A rush
// can no longer keep its lunge velocity while its victim is held in hitstop.
export function stopRushAtBodyContact(f,target){
 const m=f._abilityMeleePose;if(!m?.physicalContact)return;
 m.contactVelocity??=f.vel.clone();
 (m.bodyContacts??=new Map()).set(target,{normal:m.direction.clone().normalize()});
 const n=m.direction,dot=f.vel.dot(n);if(dot>0)f.vel.addScaledVector(n,-dot);
 constrainRushBodies(f);
}

// Called before physics AND after all actor poses, including hitstop-only
// frames. The stored approach normal prevents tunnelling to the victim's far
// side. Transverse separation releases the constraint for a deliberate dodge.
export function constrainRushBodies(f){
 const m=f._abilityMeleePose;if(!m?.bodyContacts||!f.alive)return;
 for(const [target,{normal:n}]of m.bodyContacts){
  if(!target.parts?.rig)continue;
  const a=coreBox(f),b=coreBox(target),right=new THREE.Vector3().crossVectors(n,Math.abs(n.y)<.95?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),up=new THREE.Vector3().crossVectors(right,n);
  const transverse=[right,up].every(axis=>{const x=project(a,axis),y=project(b,axis);return x.max>=y.min&&y.max>=x.min;});
  if(!transverse)continue;
  const x=project(a,n),y=project(b,n),gap=y.min-x.max;
  if(gap<.18){f.pos.addScaledVector(n,gap-.18);f.obj.updateMatrixWorld(true);f.parts.skin?.skeleton.update();}
  if(gap<3){
   const targetSpeed=target.hitstop>0?0:Math.max(0,target.vel.dot(n));
   const inward=f.vel.dot(n)-targetSpeed;if(inward>0)f.vel.addScaledVector(n,-inward);
  }
 }
}
