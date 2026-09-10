import * as THREE from 'three';
import {disjointCombatFixture} from './helpers/disjoint-combat-fixture.mjs';

// Read the final native articulation, not either overlay's local correction.
// Fixed-position diagnostic: velocities drive native source/procedural poses.
const rows=[];
for(const motion of ['stand','strafe','hover','fly','rise','descend'])for(const source of ['hand','chest','eye']){
 const x=disjointCombatFixture({motion}),{f}=x;
 Object.assign(f.slots.lmb.def,{chest:source==='chest',faceOrigin:source==='eye',castStyle:source==='chest'?'chest-brace':source==='eye'?'optic-focus':'palm'});
 const aim=(yaw,height)=>{
  f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));
  f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 };
 const q=new THREE.Quaternion(),pelvis=new THREE.Quaternion(),angles=new THREE.Euler(0,0,0,'YXZ');
 let maximum={twist:0},previous=null,maxFrameTurn=0;
 try{
  aim(0,0);for(let i=0;i<90;i++)x.step();x.start('lmb');for(let i=0;i<90;i++)x.step();
  for(let frame=0;frame<360;frame++){
   if(frame===0)aim(170,25);if(frame===120)aim(-100,-30);if(frame===240)aim(5,60);x.step();
   f.parts.torso.getWorldQuaternion(q);f.parts.pelvis.getWorldQuaternion(pelvis).invert();q.premultiply(pelvis);angles.setFromQuaternion(q);
   if(previous)maxFrameTurn=Math.max(maxFrameTurn,q.angleTo(previous));else previous=new THREE.Quaternion();previous.copy(q);
   const twist=Math.abs(angles.y);
   if(twist>maximum.twist)maximum={frame,twist,pitch:angles.x,roll:angles.z,torso:f.parts.torso.quaternion.toArray(),pelvis:f.parts.pelvis.quaternion.toArray(),rootYaw:f.obj.rotation.y,carrier:f._directionalPose?.shoulder,chestCorrection:f._chestPose?.rotation.angleTo(new THREE.Quaternion()),sourceTake:f._groundMotion?.take||null};
  }
  rows.push({motion,source,maximum:{...maximum,twistDegrees:maximum.twist*180/Math.PI},maxFrameTurnDegrees:maxFrameTurn*180/Math.PI});
 }finally{x.close();}
}
console.log(JSON.stringify(rows,null,2));
