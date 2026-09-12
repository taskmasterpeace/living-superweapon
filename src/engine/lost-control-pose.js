import {Euler,Quaternion,Vector3,MathUtils} from 'three';
import {bendArm} from './hero-rig.js';
const bodyKeys=['torso','head','cowl','pelvis','armL','armR','legL','legR'];
const turn=new Quaternion(),euler=new Euler(),pivot=new Vector3(0,5,0);

export function airControlState(f){
 if(!f.alive||f.ragdoll)return 'ko';
 if(f.grabbedBy||f.hanging||f._passengerTransport||f._aircraftVehicle||f._scoutVehicle)return 'attached';
 if(f.pos.y-(f.groundY||0)<1)return 'grounded';
 if(f.launchT>0||f.stunT>0||f.staggerT>0||f.sleepT>0||f.downedT>0)return 'uncontrolled';
 return f.flying?'flight':'falling';
}

export function restoreLostControlPose(f){
 const s=f._lostControlPose;if(!s?.applied)return;
 for(const e of s.nodes){e.node.position.copy(e.position);e.node.quaternion.copy(e.quaternion);}
 s.applied=false;
}

// A reusable presentation layer on the shared rig, never another physics owner.
// Restore before evaluating animation, apply after offensive fist-speed sampling.
export function animateLostControlPose(f,dt){
 if(!(f._openSky||f._game?.modeId==='powerworld')||!f.parts.rig)return;
 const state=airControlState(f),exclusive=f.mstate||f.grabState||f.guarding||f.meleeCharge>0||f.state==='cast';
 let s=f._lostControlPose;
 if(!s&&state!=='uncontrolled')return;
 if(!s||s.rig!==f.parts.rig){
  const nodes=bodyKeys.map(k=>f.parts[k]).filter(Boolean);
  for(const side of ['L','R']){nodes.push(f.parts['leg'+side].userData.knee,...f.parts['arm'+side].children.slice(1,3));}
  s=f._lostControlPose={rig:f.parts.rig,time:0,weight:0,applied:false,nodes:nodes.filter(Boolean).map(node=>({node,position:new Vector3(),quaternion:new Quaternion()}))};
 }
 const step=f.hitstop>0?0:Math.max(0,dt),active=state==='uncontrolled'&&!exclusive;
 if(active)s.time+=step;
 const target=active?MathUtils.clamp((f.pos.y-(f.groundY||0)-1)/7,0,1):0;
 s.weight=MathUtils.damp(s.weight,target,active?14:12,step);
 if(state==='ko'||state==='attached'||state==='grounded'||exclusive)s.weight=0;
 if(s.weight<.001){s.weight=0;s.time=0;return;}
 for(const e of s.nodes){e.position.copy(e.node.position);e.quaternion.copy(e.node.quaternion);}s.applied=true;
 const p=f.parts,t=s.time,w=s.weight;
 for(const [i,side]of ['L','R'].entries()){
  const phase=t*8+i*2.3,arm=p['arm'+side],leg=p['leg'+side],sign=i?-1:1;
  arm.rotation.x=MathUtils.lerp(arm.rotation.x,-1.8+Math.sin(phase)*.7,w);
  arm.rotation.z=MathUtils.lerp(arm.rotation.z,sign*(.8+Math.sin(phase*.7)*.3),w);
  bendArm(arm,.65+Math.sin(phase+1)*.25);
  for(const part of arm.children.slice(1,3)){const base=s.nodes.find(e=>e.node===part);part.position.lerpVectors(base.position,part.position,w);turn.copy(part.quaternion);part.quaternion.copy(base.quaternion).slerp(turn,w);}
  leg.rotation.x=MathUtils.lerp(leg.rotation.x,Math.sin(phase+2)*.65,w);
  leg.rotation.z=MathUtils.lerp(leg.rotation.z,sign*.2,w);
  const knee=leg.userData.knee;if(knee)knee.rotation.x=MathUtils.lerp(knee.rotation.x,.7+Math.sin(phase)*.3,w);
 }
 // Rotate the body parts about the pelvis; ground shadows and physics stay put.
 turn.setFromEuler(euler.set((.55+Math.sin(t*4)*.5)*w,Math.sin(t*2.8)*.2*w,Math.sin(t*3.3+.6)*.55*w));
 for(const key of bodyKeys){const part=p[key];if(!part)continue;part.position.sub(pivot).applyQuaternion(turn).add(pivot);part.quaternion.premultiply(turn);}
}
