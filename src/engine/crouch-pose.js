import * as THREE from 'three';

const bounds=new THREE.Box3(),offset=new THREE.Vector3(),rotation=new THREE.Quaternion();

// Grounded support overlay, before directional aim and final weapon contacts.
// This is authored procedural crouching, not a claimed imported mocap take.
export function restoreCrouchPose(f){
 const s=f._crouchPose;if(!s?.applied)return;
 if(s.rig===f.parts.rig)for(const b of s.base){b.part.position.copy(b.position);b.part.quaternion.copy(b.quaternion);}
 s.applied=false;
}

export function animateCrouchPose(f,dt){
 const p=f.parts;if(!p.rig||!f._openSky)return;
 let s=f._crouchPose;
 if(!s&&!f.crouching)return;
 if(!s||s.rig!==p.rig)s=f._crouchPose={rig:p.rig,weight:0,drop:0,phase:0,applied:false,
  base:[p.body,p.legL,p.legR,p.legL.userData.knee,p.legR.userData.knee,p.legL.userData.boot,p.legR.userData.boot]
   .map(part=>({part,position:new THREE.Vector3(),quaternion:new THREE.Quaternion()}))};
 const eligible=f.gait==='grounded'&&!f.flying&&!f.gliding&&f.alive&&!f.grabbedBy&&!f.hanging&&!f.ragdoll;
 s.weight=eligible?THREE.MathUtils.damp(s.weight,f.crouching?1:0,14,Math.max(0,dt)):0;
 s.drop=0;s.top=null;
 if(s.weight<.0001){s.weight=0;return;}
 for(const b of s.base){b.position.copy(b.part.position);b.quaternion.copy(b.part.quaternion);}s.applied=true;
 const scale=p.rig.pivotHeight/4.6,speed=Math.hypot(f.vel.x,f.vel.z),stride=6*scale;
 if(f.hitstop<=0)s.phase=(s.phase+speed/stride*Math.max(0,dt))%1;
 const step=Math.sin(s.phase*Math.PI*2)*Math.min(1,speed/(8*scale))*.16;
 for(const [leg,side]of [[p.legL,-1],[p.legR,1]]){
  leg.quaternion.slerp(rotation.setFromAxisAngle(offset.set(1,0,0),-1.05+side*step),s.weight);
  leg.userData.knee.rotation.x=THREE.MathUtils.lerp(leg.userData.knee.rotation.x,2.05-side*step,s.weight);
  // Soles counter the combined hip/knee rotation, never stretch the shin.
  rotation.copy(leg.quaternion).multiply(leg.userData.knee.quaternion).invert();
  leg.userData.boot.quaternion.slerp(rotation,s.weight);
 }
 p.g.updateMatrixWorld(true);let low=Infinity;
 for(const leg of [p.legL,p.legR]){bounds.setFromObject(leg.userData.boot);low=Math.min(low,bounds.min.y);}
 const shift=(f.obj.position.y+.025-low)*s.weight;
 offset.set(0,shift,0);p.g.getWorldQuaternion(rotation).invert();p.body.position.add(offset.applyQuaternion(rotation));
 s.drop=Math.max(0,-shift);
}

// Final posed core defines the ducked hurt height, not the former standing tube.
export function updateCrouchBounds(f){
 const s=f._crouchPose;if(!s?.weight)return;
 let high=-Infinity;
 for(const part of [f.parts.head,f.parts.torso,f.parts.pelvis]){
  part.updateWorldMatrix(true,false);if(!part.geometry.boundingBox)part.geometry.computeBoundingBox();
  bounds.copy(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);high=Math.max(high,bounds.max.y);
 }
 s.top=high-f.pos.y+.08;
}
