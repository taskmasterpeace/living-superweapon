import * as THREE from 'three';
import {reachArm} from './hero-rig.js';

const point=new THREE.Vector3(),elbowPole=new THREE.Vector3();
const turn=new THREE.Quaternion(),pivot=new THREE.Vector3();
const down=new THREE.Vector3(0,-1,0),forward=new THREE.Vector3(0,0,1),rotation=new THREE.Quaternion();
const weightOf=f=>!f._openSky||!f.parts.rig||!f.alive||f.staggerT>0||f.frozenT>0||f.stunT>0||f.grabbedBy||f.grabbing||f.mstate||f.grabState?0:Math.max(0,Math.min(1,f.poseGuard||0));

// Feed the desired brace into the shared torso carrier BEFORE it settles. An
// additive lean after settling would exceed its angular speed on beam → guard.
export function braceGuard(f) {
 const w=weightOf(f);if(w<.001)return;
 const p=f.parts,impact=Math.min(1,Math.max(0,f._blocked)/.16);
 p.body.rotation.x+=(.1+impact*.16)*w;
 p.body.rotation.y+=(f.def.guardType==='barrier'?-.16:f.def.guardType==='deflect'||f.def.guardStrong?-.23:-.1)*w;
}

// A procedural defensive body carrier. Physics owns displacement; this layer
// braces around the pelvis, and the fixed-length arm solve keeps gear attached.
export function animateGuard(f) {
 const p=f.parts,w=weightOf(f);if(w<.001)return;
 const barrier=f.def.guardType==='barrier',shield=f.def.guardType==='deflect'||f.def.guardStrong;
 const scale=p.rig.pivotHeight/4.6,head=p.head.position.y;
 p.head.rotation.x+=.1*w;p.cowl.quaternion.copy(p.head.quaternion);
 const targets=barrier?[[-1.6,head-.65*scale,3.5],[1.1,head-2*scale,2]]:
   shield?[[-1.15,head-1.3*scale,2.8],[1.2,head-.75*scale,1.9]]:
   [[-1.25,head-.55*scale,2],[1.1,head-.9*scale,2.45]];
 for(let i=0;i<2;i++) {
  const arm=i?p.armR:p.armL,[x,y,z]=targets[i];
  point.set(x*scale,y,z*scale);elbowPole.set((i?1:-1)*.28,-1,-.12);
  if(f._directionalPose?.applied){
    turn.setFromEuler(new THREE.Euler(-f._directionalPose.pitch,f._directionalPose.shoulder,0,'YXZ'));
    pivot.set(0,p.rig.pivotHeight,0);point.sub(pivot).applyQuaternion(turn).add(pivot);elbowPole.applyQuaternion(turn);
  }
  reachArm(arm,point,i?1:-1,w,elbowPole);
  if(barrier&&i===0&&!arm.children[2].userData.gripOccupied){
   // Palm normal in the arm's local coordinates; using body-forward directly
   // here would twist it sideways again after the shoulder IK rotation.
   point.copy(forward).applyQuaternion(rotation.copy(arm.quaternion).invert());
   rotation.setFromUnitVectors(down,point);arm.children[2].quaternion.slerp(rotation,w);
  }
 }
 // Upright aerial resistance: one long leg and one counterbalancing knee, not
 // a running cycle or two knees pulled up into a seated hover.
 if(f.airborne) {
  p.legL.rotation.x=THREE.MathUtils.lerp(p.legL.rotation.x,-.08,w);
  p.legR.rotation.x=THREE.MathUtils.lerp(p.legR.rotation.x,.12,w);
  p.legL.userData.knee.rotation.x=THREE.MathUtils.lerp(p.legL.userData.knee.rotation.x,.3,w);
  p.legR.userData.knee.rotation.x=THREE.MathUtils.lerp(p.legR.userData.knee.rotation.x,.6,w);
 }
}
