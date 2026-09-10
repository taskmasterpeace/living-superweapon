import * as THREE from 'three';
import {reachArm} from './hero-rig.js';

const clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const upper=new THREE.Vector3(),lower=new THREE.Vector3(),point=new THREE.Vector3();
const x=new THREE.Vector3(),y=new THREE.Vector3(),z=new THREE.Vector3(),hip=new THREE.Vector3(),before=new THREE.Vector3();
const q=new THREE.Quaternion(),q2=new THREE.Quaternion(),bodyInverse=new THREE.Quaternion(),basis=new THREE.Matrix4();
const bootBox=new THREE.Box3(),mirrorBuffer=new Float64Array(45);

export function authoredParts(p){return [p.body,p.pelvis,p.head,p.armL,p.armR,p.legL,p.legR,p.legL.userData.knee,p.legR.userData.knee,p.legL.userData.boot,p.legR.userData.boot,p.armL.children[1],p.armR.children[1],p.armL.children[2],p.armR.children[2]];}
export function samplePoseFrame(clip,phase,out,loop=true){
 const at=(loop?((phase%1)+1)%1:clamp(phase,0,1))*(clip.frames.length-1);
 const i=Math.min(clip.frames.length-2,Math.floor(at)),a=clip.frames[i],b=clip.frames[i+1],t=at-i;
 for(let j=0;j<24;j+=3)upper.fromArray(a,j).lerp(lower.fromArray(b,j),t).normalize().toArray(out,j);
 for(let j=24;j<44;j+=4)q.fromArray(a,j).slerp(q2.fromArray(b,j),t).normalize().toArray(out,j);
 out[44]=lerp(a[44],b[44],t);return out;
}
export function blendPoseFrames(a,b,t){
 for(let j=0;j<24;j+=3)upper.fromArray(a,j).lerp(lower.fromArray(b,j),t).normalize().toArray(a,j);
 for(let j=24;j<44;j+=4)q.fromArray(a,j).slerp(q2.fromArray(b,j),t).normalize().toArray(a,j);
 a[44]=lerp(a[44],b[44],t);return a;
}
export function mirrorPoseFrame(frame){
 mirrorBuffer.set(frame);
 for(const [a,b]of [[0,6],[6,0],[12,18],[18,12]])for(let j=0;j<6;j++)frame[a+j]=mirrorBuffer[b+j]*(j%3===0?-1:1);
 // Reflection across the YZ plane swaps limbs and negates axial Y/Z rotation.
 for(const [a,b]of [[24,24],[28,28],[32,32],[36,40],[40,36]])for(let j=0;j<4;j++)frame[a+j]=mirrorBuffer[b+j]*(j===1||j===2?-1:1);
 return frame;
}
function legPose(leg,frame,offset,ankle,weight){
 upper.fromArray(frame,offset).applyQuaternion(bodyInverse).normalize();lower.fromArray(frame,offset+3).applyQuaternion(bodyInverse).normalize();
 const bend=Math.acos(clamp(upper.dot(lower),-1,1));
 y.copy(upper).negate();z.copy(lower).addScaledVector(upper,-lower.dot(upper)).negate();
 if(z.lengthSq()<1e-6)z.set(0,0,1).addScaledVector(y,-y.z);
 z.normalize();x.crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 q.setFromRotationMatrix(basis.makeBasis(x,y,z));leg.quaternion.slerp(q,weight);
 leg.userData.knee.rotation.x=lerp(leg.userData.knee.rotation.x,bend,weight);
 q.copy(leg.quaternion).multiply(leg.userData.knee.quaternion).invert();q.multiply(q2.fromArray(frame,ankle).premultiply(bodyInverse));
 leg.userData.boot.quaternion.slerp(q,weight);
}
// Visual-only anatomy. Motion/collision roots and fixed segment lengths are never written.
export function applyAuthoredPose(f,frame,w,{legs=true,hips=false,support=true,anchorFromCurrent=false}={}){
 const p=f.parts,scale=p.rig.pivotHeight/4.6;
 hip.set(0,p.rig.pivotHeight,0);before.copy(hip);if(anchorFromCurrent)before.applyQuaternion(p.body.quaternion);
 p.body.quaternion.slerp(q.fromArray(frame,28),w);bodyInverse.copy(p.body.quaternion).invert();
 point.copy(hip).applyQuaternion(p.body.quaternion);p.body.position.add(before.sub(point));
 if(hips){
  // Source hips and shoulders twist independently. Reposition the existing hip
  // pivots around the pelvis, not the entity root; segment lengths stay fixed.
  q2.fromArray(frame,24);q.copy(bodyInverse).multiply(q2);p.pelvis.quaternion.slerp(q,w);
  for(const leg of [p.legL,p.legR]){point.copy(leg.position).sub(hip).applyQuaternion(q2).applyQuaternion(bodyInverse).add(hip);leg.position.lerp(point,w);}
 }
 p.head.quaternion.slerp(q.fromArray(frame,32).premultiply(bodyInverse),w);
 for(const [arm,offset,side]of [[p.armL,0,-1],[p.armR,6,1]]){
  upper.fromArray(frame,offset).applyQuaternion(bodyInverse).normalize();lower.fromArray(frame,offset+3).applyQuaternion(bodyInverse).normalize();
  point.copy(arm.position).addScaledVector(upper,arm.userData.upperLength).addScaledVector(lower,arm.userData.foreLength);reachArm(arm,point,side,w,upper);
 }
 if(legs){legPose(p.legL,frame,12,36,w);legPose(p.legR,frame,18,40,w);}
 if(!support)return;
 p.g.updateMatrixWorld(true);let low=Infinity;
 for(const leg of [p.legL,p.legR]){bootBox.setFromObject(leg.userData.boot);low=Math.min(low,bootBox.min.y);}
 const lift=Math.min(.35*scale,frame[44]*3.8*scale)*w;
 point.set(0,f.obj.position.y+.025+lift-low,0);p.g.getWorldQuaternion(q).invert();point.applyQuaternion(q);p.body.position.addScaledVector(point,w);
}
