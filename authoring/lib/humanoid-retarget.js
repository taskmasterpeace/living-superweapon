// Generic humanoid retarget onto the production pose bridge. This is the mapping-driven form of
// tools/lib/quaternius-source.mjs → bakePoseBank: the same anatomical-frame math, the same 45-float
// output, driven by a recipe's slot → joint mapping instead of a hard-coded name table. A parity
// test proves it reproduces the shipped locomotion bank exactly. It authors segment directions,
// anatomical rotations and foot suspension — never simulation translation.
import * as THREE from 'three';
import {HUMANOID_SLOTS} from './slots.js';

const CHAINS=[['shoulderL','elbowL','handL'],['shoulderR','elbowR','handR'],['hipL','kneeL','footL'],['hipR','kneeR','footR']];
const ROTATED=['hip','chest','head','footL','footR'];
const round6=n=>Math.round(n*1e6)/1e6;

// A sampler wraps a loaded scene + animations + resolved slot nodes. `conversion` rotates the
// sampled world (yaw about +Y, optional X mirror) so every source reports +Y up / +Z forward.
export function makeSampler(scene,animations,nodes,conversion={}){
 const mixer=new THREE.AnimationMixer(scene);
 const yaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(conversion.yawDegrees||0));
 const mirror=!!conversion.mirrorX;
 const convertPoint=v=>{v.applyQuaternion(yaw);if(mirror)v.x=-v.x;return v;};
 const convertQuat=q=>{q.premultiply(yaw);if(mirror){q.x=-q.x;q.w=-q.w;}return q;};
 const takes=new Map(animations.map(a=>[a.name,a]));
 return {
  scene,mixer,nodes,takes:[...takes.keys()],
  duration(name){const clip=takes.get(name);if(!clip)throw new Error(`Unknown source take: ${name}`);return clip.duration;},
  sample(name,time){
   const clip=takes.get(name);if(!clip)throw new Error(`Unknown source take: ${name}`);
   mixer.stopAllAction();
   const action=mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
   mixer.setTime(Math.max(0,Math.min(clip.duration,time)));scene.updateMatrixWorld(true);
   const points={},rotations={};
   for(const slot of HUMANOID_SLOTS)points[slot]=convertPoint(nodes[slot].getWorldPosition(new THREE.Vector3()));
   for(const slot of ROTATED)rotations[slot]=convertQuat(nodes[slot].getWorldQuaternion(new THREE.Quaternion()));
   return {points,rotations};
  },
 };
}
export function resolveNodes(scene,mapping,sanitize=name=>name){
 const nodes={};
 for(const slot of HUMANOID_SLOTS){
  const name=mapping[slot];if(typeof name!=='string')throw new Error(`Mapping lacks slot ${slot}`);
  const node=scene.getObjectByName(sanitize(name));if(!node)throw new Error(`Required source joint missing: ${name} (slot ${slot})`);
  nodes[slot]=node;
 }
 return nodes;
}
// The contract the production bridge was authored against: negative-X is the L slot, toes face +Z.
export function checkBindContract(bind){
 const p=bind.points,problems=[];
 if(!(p.shoulderL.x<0))problems.push('shoulderL must sit on negative X (map the anatomical side that lands there, never rotate the source)');
 if(!(p.shoulderR.x>0))problems.push('shoulderR must sit on positive X');
 if(!(p.toeL.z>p.footL.z))problems.push('toes must point toward +Z (source faces the wrong way; set sourceConversion.yawDegrees)');
 if(!(p.head.y>p.hip.y))problems.push('head must be above hip (source is not +Y up)');
 return problems;
}
function torsoRotation(p){
 const y=p.chest.clone().sub(p.hip).normalize(),x=p.shoulderR.clone().sub(p.shoulderL).normalize();
 const z=new THREE.Vector3().crossVectors(x,y).normalize();x.crossVectors(y,z).normalize();
 return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
const support=p=>Math.min(p.footL.y,p.footR.y,p.toeL.y,p.toeR.y);
// takes: {id: {take, loop, mode?, side?, contactStart?, contactEnd?}}. Returns {clips, bind, meta}.
export function retarget(sampler,takes,{bindTake='A_TPose',bindTime=0,sampleRate=60}={}){
 const bind=sampler.sample(bindTake,bindTime),clips={},meta={};
 const legLength=bind.points.hipL.distanceTo(bind.points.kneeL)+bind.points.kneeL.distanceTo(bind.points.footL);
 const restSupport=support(bind.points);
 for(const [key,spec] of Object.entries(takes)){
  const name=spec.take,loop=spec.loop===true;
  const duration=sampler.duration(name),count=Math.round(duration*sampleRate),frames=[],samples=[];
  for(let i=0;i<=count;i++){
   const s=sampler.sample(name,duration*i/count),p=s.points,frame=[];
   samples.push(s);
   for(const chain of CHAINS)for(let j=0;j<2;j++)frame.push(...p[chain[j+1]].clone().sub(p[chain[j]]).normalize().toArray());
   for(const node of ROTATED){
    const q=node==='chest'?torsoRotation(p):s.rotations[node].clone().multiply(bind.rotations[node].clone().invert());
    frame.push(...q.normalize().toArray());
   }
   frame.push(Math.max(0,support(p)-restSupport)/legLength);
   frames.push(frame.map(round6));
  }
  const rawEndpoint=frames.at(-1).slice();
  // Close only the last 1/15 s of a loop, exactly as the shipped bank does.
  for(let j=1;loop&&j<=4;j++){
   const frame=frames[count-4+j],t=j/4,w=t*t*(3-2*t);
   for(let k=0;k<24;k+=3){
    const correction=new THREE.Vector3().fromArray(frames[0],k).sub(new THREE.Vector3().fromArray(rawEndpoint,k));
    new THREE.Vector3().fromArray(frame,k).addScaledVector(correction,w).normalize().toArray(frame,k);
   }
   for(let k=24;k<44;k+=4){
    const correction=new THREE.Quaternion().fromArray(frames[0],k).multiply(new THREE.Quaternion().fromArray(rawEndpoint,k).invert());
    new THREE.Quaternion().fromArray(frame,k).premultiply(new THREE.Quaternion().slerp(correction,w)).normalize().toArray(frame,k);
   }
   frame[44]+=w*(frames[0][44]-rawEndpoint[44]);
   frames[count-4+j]=frame.map(round6);
  }
  const {events:_e,derive:_d,id:_i,...passthrough}=spec;
  clips[key]=loop?{...passthrough,take:name,duration,frames,seamFrames:4,rawEndpoint}:{...passthrough,take:name,duration,frames};
  meta[key]={samples,legLength,restSupport,count};
 }
 return {clips,bind,meta,legLength,restSupport};
}
// Posture of one sampled frame, from the same anatomy the frame carries: torso up vector, the
// torso's forward vector (chest normal) against +Y, and hip height relative to the bind pose.
export function postureOf(sample,bind){
 const p=sample.points;
 const y=p.chest.clone().sub(p.hip).normalize(),x=p.shoulderR.clone().sub(p.shoulderL).normalize();
 const z=new THREE.Vector3().crossVectors(x,y).normalize();
 const floor=s=>Math.min(s.points.footL.y,s.points.footR.y,s.points.toeL.y,s.points.toeR.y);
 const restHip=bind.points.hip.y-floor(bind);
 const hip=(p.hip.y-floor(bind))/Math.max(1e-6,restHip);
 const up=y.y,fwdY=z.y;
 let posture='transition';
 if(fwdY<-.6&&hip<.3)posture='prone';
 else if(fwdY>.6&&hip<.3)posture='supine';
 else if(up>.72&&hip>1.15)posture='airborne';
 else if(up>.72&&hip>.85)posture='standing'; // a sprint leans the torso ~40 degrees and is still standing
 else if(up>.55&&hip>.28&&hip<=.85)posture='crouch';
 return {posture,up:+up.toFixed(3),forwardY:+fwdY.toFixed(3),hipRatio:+hip.toFixed(3)};
}
export function categoryOf(start,end,loop){
 const ground=p=>p==='prone'||p==='supine';
 if(ground(start)&&end==='standing')return 'get-up';
 if(start==='standing'&&ground(end))return 'fall';
 if(!ground(start)&&start!=='standing'&&ground(end))return 'knockdown';
 if(start==='prone'&&end==='prone')return loop?'prone-cycle':'prone-hold';
 if(start==='supine'&&end==='supine')return 'supine-hold';
 if(start==='crouch'&&end==='crouch')return loop?'crouch-cycle':'crouch-action';
 return loop?'cycle':'action';
}
// Analysis over the raw samples of one take, for deterministic event derivation and reports.
export function analyzeTake(samples,duration,{legLength,restSupport}){
 const n=samples.length,dt=duration/Math.max(1,n-1);
 const rows=samples.map((s,i)=>{
  const p=s.points,prev=samples[Math.max(0,i-1)].points,next=samples[Math.min(n-1,i+1)].points;
  const speed=(a,b)=>a.distanceTo(b)/((Math.min(n-1,i+1)-Math.max(0,i-1))*dt||dt);
  return {t:i*dt,
   footL:Math.min(p.footL.y,p.toeL.y)-restSupport,footR:Math.min(p.footR.y,p.toeR.y)-restSupport,
   footLSpeed:speed(prev.footL,next.footL),footRSpeed:speed(prev.footR,next.footR),
   handLSpeed:speed(prev.handL,next.handL),handRSpeed:speed(prev.handR,next.handR),
   handGap:p.handL.distanceTo(p.handR)/legLength,
   support:Math.max(0,Math.min(p.footL.y,p.footR.y,p.toeL.y,p.toeR.y)-restSupport)/legLength};
 });
 return {rows,dt};
}
