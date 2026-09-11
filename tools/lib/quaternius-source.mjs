// Exact CC0 source ingestion. Runtime consumes the generated bank, never this Node module.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root=new URL('../../assets-src/quaternius/',import.meta.url);
const names={hip:'DEF-hips',chest:'DEF-spine.003',head:'DEF-head',
 shoulderL:'DEF-upper_arm.L',elbowL:'DEF-forearm.L',handL:'DEF-hand.L',
 shoulderR:'DEF-upper_arm.R',elbowR:'DEF-forearm.R',handR:'DEF-hand.R',
 hipL:'DEF-thigh.L',kneeL:'DEF-shin.L',footL:'DEF-foot.L',toeL:'DEF-toe.L',
 hipR:'DEF-thigh.R',kneeR:'DEF-shin.R',footR:'DEF-foot.R',toeR:'DEF-toe.R'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function loadSource(){
 const [json,bin]=await Promise.all(['gltf','bin'].map(ext=>readFile(new URL(`AnimationLibrary_Godot_Standard.${ext}`,root))));
 const document=JSON.parse(json);document.buffers[0].uri=`data:application/octet-stream;base64,${bin.toString('base64')}`;
 // FileLoader's data-URI path emits a browser ProgressEvent; no network is involved.
 globalThis.ProgressEvent ??= class ProgressEvent {constructor(type,init){this.type=type;Object.assign(this,init);}};
 const gltf=await new GLTFLoader().parseAsync(JSON.stringify(document),'');
 gltf.scene.updateMatrixWorld(true);
 const nodes=Object.fromEntries(Object.entries(names).map(([key,name])=>{
  // glTF is already +Z forward. Its anatomical L is +X; the legacy target
  // calls its negative-X arm L. Map slots, never turn the source backwards.
  const mapped=name.replace(/\.([LR])$/,(_,side)=>side==='L'?'.R':'.L');
  const node=gltf.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(mapped));
  if(!node)throw Error(`Required source joint missing: ${name}`);return [key,node];
 }));
 return {gltf,nodes,mixer:new THREE.AnimationMixer(gltf.scene),hashes:{gltf:sha(json),bin:sha(bin)}};
}
export async function loadHeavySource(){
 const bytes=await readFile(new URL('library-2/UAL2_Standard.glb',root));
 const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const mapped={hip:'pelvis',chest:'spine_03',head:'Head',
  shoulderL:'upperarm_r',elbowL:'lowerarm_r',handL:'hand_r',shoulderR:'upperarm_l',elbowR:'lowerarm_l',handR:'hand_l',
  hipL:'thigh_r',kneeL:'calf_r',footL:'foot_r',toeL:'ball_r',hipR:'thigh_l',kneeR:'calf_l',footR:'foot_l',toeR:'ball_l'};
 const nodes=Object.fromEntries(Object.entries(mapped).map(([key,name])=>{
  const node=gltf.scene.getObjectByName(name);if(!node)throw Error(`Required UAL2 joint missing: ${name}`);return [key,node];
 }));
 return {gltf,nodes,mixer:new THREE.AnimationMixer(gltf.scene),hashes:{glb:sha(bytes)}};
}
export function sampleSource(source,name,time){
 const clip=source.gltf.animations.find(c=>c.name===name);
 if(!clip)throw Error(`Unknown source take: ${name}`);
 source.mixer.stopAllAction();
 const action=source.mixer.clipAction(clip);action.reset().setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
 source.mixer.setTime(Math.max(0,Math.min(clip.duration,time)));source.gltf.scene.updateMatrixWorld(true);
 return {points:Object.fromEntries(Object.entries(source.nodes).map(([key,node])=>[key,node.getWorldPosition(new THREE.Vector3())])),
  rotations:Object.fromEntries(['hip','chest','head','footL','footR'].map(key=>[key,source.nodes[key].getWorldQuaternion(new THREE.Quaternion())]))};
}
export function bakeLocomotion(source){
 return bakePoseBank(source,{idle:'Idle_Loop',walk:'Walk_Loop',jog:'Jog_Fwd_Loop',sprint:'Sprint_Loop'});
}
export function bakeStrikes(source){
 return bakePoseBank(source,{
  jab:{take:'Punch_Jab',mode:'strike',side:1,contactStart:13/60,contactEnd:20/60},
  cross:{take:'Punch_Cross',mode:'strike',side:-1,contactStart:16/60,contactEnd:28/60},
 });
}
export function bakeJumps(source){
 const bank=bakePoseBank(source,{
  takeoff:{take:'Jump_Start',mode:'jump',loop:false},
  fall:{take:'Jump_Loop',mode:'fall',loop:true},
  landing:{take:'Jump_Land',mode:'landing',loop:false},
 });
 // Retain anatomical directions/rotations, never source trajectory or floor lift.
 // Physical jumping and actual landing support belong to the runtime.
 for(const clip of Object.values(bank.clips)){
  for(const frame of clip.frames)frame[44]=0;
  if(clip.rawEndpoint)clip.rawEndpoint[44]=0;
 }
 return bank;
}
export function bakeHeavyStrikes(source){
 const bank=bakePoseBank(source,{hook:{take:'Melee_Hook',mode:'strike'},recovery:{take:'Melee_Hook_Rec',mode:'strike'}});
 const {hook,recovery}=bank.clips;
 bank.source={author:'Quaternius / Gonzalo Furnier',pack:'Universal Animation Library 2 — Standard',license:'CC0-1.0',
  url:'https://quaternius.itch.io/universal-animation-library-2',file:'UAL2_Standard.glb',sha256:source.hashes,
  basis:'Y-up, +Z-forward; source anatomical R maps to target negative-X L slot',sampleRate:60};
 bank.clips={power:{take:'Melee_Hook + Melee_Hook_Rec',mode:'strike',side:-1,contactStart:18/60,contactEnd:24/60,
  duration:hook.duration+recovery.duration,frames:[...hook.frames,...recovery.frames.slice(1)],
  segments:[{take:hook.take,start:0,duration:hook.duration},{take:recovery.take,start:hook.duration,duration:recovery.duration}]}};
 return bank;
}
function bakePoseBank(source,takes){
 const bind=sampleSource(source,'A_TPose',0),clips={};
 const torsoRotation=p=>{
  const y=p.chest.clone().sub(p.hip).normalize(),x=p.shoulderR.clone().sub(p.shoulderL).normalize();
  const z=new THREE.Vector3().crossVectors(x,y).normalize();x.crossVectors(y,z).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
 };
 const legLength=bind.points.hipL.distanceTo(bind.points.kneeL)+bind.points.kneeL.distanceTo(bind.points.footL);
 const support=p=>Math.min(p.footL.y,p.footR.y,p.toeL.y,p.toeR.y);
 const restSupport=support(bind.points);
 for(const [key,spec] of Object.entries(takes)){
  const name=typeof spec==='string'?spec:spec.take,loop=typeof spec==='string'||spec.loop===true;
  const duration=source.gltf.animations.find(c=>c.name===name).duration,count=Math.round(duration*60),frames=[];
  for(let i=0;i<=count;i++){
   const s=sampleSource(source,name,duration*i/count),p=s.points,frame=[];
   for(const chain of [['shoulderL','elbowL','handL'],['shoulderR','elbowR','handR'],['hipL','kneeL','footL'],['hipR','kneeR','footR']]){
    for(let j=0;j<2;j++)frame.push(...p[chain[j+1]].clone().sub(p[chain[j]]).normalize().toArray());
   }
   for(const node of ['hip','chest','head','footL','footR']){
    // A weighted skin distributes bend across several spine bones. Collapsing
    // one bent upper bone onto the whole rigid chest over-leans the target.
    // Target rigid torso rests on +Y, while the source bind core already leans
    // forward. Carry the anatomical frame itself, not its source-bind delta.
    const q=node==='chest'?torsoRotation(p):s.rotations[node].clone().multiply(bind.rotations[node].clone().invert());
    frame.push(...q.normalize().toArray());
   }
   frame.push(Math.max(0,support(p)-restSupport)/legLength);
   frames.push(frame.map(n=>Math.round(n*1e6)/1e6));
  }
  const rawEndpoint=frames.at(-1).slice();
  // The source jog misses its first pose by about 3.5 degrees at one shin.
  // Close only the last 1/15 second, retaining original samples for review.
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
   frames[count-4+j]=frame.map(n=>Math.round(n*1e6)/1e6);
  }
  clips[key]=loop?{...(typeof spec==='string'?{}:spec),take:name,duration,frames,seamFrames:4,rawEndpoint}:{...spec,duration,frames};
 }
 return {version:1,source:{author:'Quaternius',pack:'Universal Animation Library — Standard',license:'CC0-1.0',
  url:'https://quaternius.com/packs/universalanimationlibrary.html',
  mirror:'https://github.com/J-Ponzo/gltf-universal-animation-library/tree/e24c23cf2a1323488a3faa226ea7ea21f644b73e',
  file:'AnimationLibrary_Godot_Standard.gltf',sha256:source.hashes,
  basis:'Y-up, +Z-forward; source anatomical R maps to target negative-X L slot',sampleRate:60},clips};
}
