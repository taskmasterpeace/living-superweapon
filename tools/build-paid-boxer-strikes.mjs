// Narrow purchased-source bridge to the existing 45-value authored-pose format.
// Joint directions come directly from Boxer FBX; root translation never enters frames.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import * as T from 'three';import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
const privateRoot=path.resolve(process.argv[2]||'C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14');
const folder=path.join(privateRoot,'unleashed-boxer/Assets/Unleashed_boxer_AnimSet/Animation/Humanoid');
const v=(...a)=>new T.Vector3(...a),q=()=>new T.Quaternion(),round=n=>Math.round(n*1e6)/1e6,sha=b=>createHash('sha256').update(b).digest('hex');
T.TextureLoader.prototype.load=()=>new T.Texture();const manager=new T.LoadingManager();manager.setURLModifier(url=>{throw Error('Unexpected source dependency '+url);});
const names={hip:'pelvis',chest:'spine_03',head:'head',shoulderL:'upperarm_r',elbowL:'lowerarm_r',handL:'hand_r',shoulderR:'upperarm_l',elbowR:'lowerarm_l',handR:'hand_l',hipL:'thigh_r',kneeL:'calf_r',footL:'foot_r',toeL:'ball_r',hipR:'thigh_l',kneeR:'calf_l',footR:'foot_l',toeR:'ball_l'};
async function load(file){const bytes=await fs.readFile(path.join(folder,file)),a=new FBXLoader(manager).parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');return {file,bytes,a,mixer:new T.AnimationMixer(a),nodes:Object.fromEntries(Object.entries(names).map(([k,n])=>{const b=a.getObjectByName(n);if(!b)throw Error('Missing Boxer joint '+n);return [k,b];}))};}
function sample(s,time){const action=s.mixer.clipAction(s.a.animations[0]);s.mixer.stopAllAction();action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();s.mixer.setTime(time);s.a.updateMatrixWorld(true);return {points:Object.fromEntries(Object.entries(s.nodes).map(([k,b])=>[k,b.getWorldPosition(v())])),rotations:Object.fromEntries(['hip','chest','head','footL','footR'].map(k=>[k,s.nodes[k].getWorldQuaternion(q())]))};}
const ref=await load('00_T-pose.FBX'),bind=sample(ref,0);
if(bind.points.shoulderL.x>=0||bind.points.toeL.z<=bind.points.footL.z)throw Error('Boxer axis/handedness contract changed');
const torso=p=>{const y=p.chest.clone().sub(p.hip).normalize(),x=p.shoulderR.clone().sub(p.shoulderL).normalize(),z=v().crossVectors(x,y).normalize();x.crossVectors(y,z).normalize();return q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));};
const support=p=>Math.min(p.footL.y,p.footR.y,p.toeL.y,p.toeR.y),clips={};
for(const [key,file,take,side]of [['jab','combo03_1_inplace','Paid_Boxer_Jab',1],['cross','combo01_1_inplace','Paid_Boxer_Cross',-1],['guard','guard01_inplace','Paid_guard01_inplace',0]]){
 const source=await load('Inplace/'+file+'.fbx'),original=source.a.animations[0],duration=original.duration,count=Math.round(duration*60),frames=[],evidence=[];
 const striking=side===-1?'L':'R',off=side===-1?'R':'L';
 const armLength=bind.points['shoulder'+striking].distanceTo(bind.points['elbow'+striking])+bind.points['elbow'+striking].distanceTo(bind.points['hand'+striking]);
 for(let i=0;i<=count;i++){const time=duration*i/count,s=sample(source,time),p=s.points,frame=[];
  for(const chain of [['shoulderL','elbowL','handL'],['shoulderR','elbowR','handR'],['hipL','kneeL','footL'],['hipR','kneeR','footR']])for(let j=0;j<2;j++)frame.push(...p[chain[j+1]].clone().sub(p[chain[j]]).normalize().toArray());
  for(const node of ['hip','chest','head','footL','footR'])frame.push(...(node==='chest'?torso(p):s.rotations[node].clone().multiply(bind.rotations[node].clone().invert())).normalize().toArray());
  frame.push(0);frames.push(frame.map(round));
  evidence.push({time:round(time),reachRatio:round(p['hand'+striking].distanceTo(p['shoulder'+striking])/armLength),forwardRatio:round((p['hand'+striking].z-p['shoulder'+striking].z)/armLength),offHandReachRatio:round(p['hand'+off].distanceTo(p['shoulder'+off])/armLength),hand:p['hand'+striking].toArray().map(round),sourceFloor:round(support(p)),hip:p.hip.toArray().map(round)});
 }
 const extension=evidence.map(r=>r.reachRatio>.92&&r.forwardRatio>.85),start=extension.indexOf(true),end=extension.lastIndexOf(true),runs=extension.filter((b,i)=>b&&!extension[i-1]).length;
 if(side&&!(runs===1&&start>0&&end<count-5))throw Error('Expected one complete isolated punch in '+file);
 const peak=evidence.reduce((a,b)=>a.reachRatio>b.reachRatio?a:b);
 clips[key]={take,mode:key==='guard'?'guard':'strike',side,environment:'ground',loop:key==='guard',duration,frames,
  ...(side?{contactStart:round(duration*(start+4)/count),contactEnd:round(duration*(end-2)/count),entryBlendFraction:.65,corePolicy:'native'}:{}),
  source:{pack:'Unleashed Boxer',file:path.relative(privateRoot,path.join(folder,'Inplace/'+file+'.fbx')).replaceAll('\\','/'),take:original.name,sha256:sha(source.bytes),license:'LicenseRef-Purchased-Asset'},
  derivation:'Untrimmed original source at60Hz. Exact anatomical joint directions; source T-pose delta for pelvis/head/feet; torso anatomical frame retained in data. Runtime native core retains body/pelvis/head ownership to avoid forcing the source bladed stance into the fast combat clock; imported arms/legs/feet supply style. No copied source root translation; rendered boot support remains runtime-owned.',
  evidence:{extensionRuns:runs,peakTime:peak.time,peakReachRatio:peak.reachRatio,offHandMaxReachRatio:Math.max(...evidence.map(e=>e.offHandReachRatio)),sourceFloorRange:[Math.min(...evidence.map(e=>e.sourceFloor)),Math.max(...evidence.map(e=>e.sourceFloor))],markerRule:'Extension interval: committed arm reach>92% of reference length and world-forward reach>85%. Contact plateau begins four source60Hz frames later and ends two frames earlier, keeping source acceleration/recoil outside active. Motion landmarks only; native final IK and physics own collision.',frames:evidence},
  status:'quarantined-native-contact-continuity',
  acceptance:'Source identified as an isolated straight. Default gameplay assignment disabled: native fast startup causes elbow-pole/torso discontinuity; preserving native core still fails arm continuity. Explicit lab preview only.'};
 console.log(take,{duration,count:frames.length,contactStart:clips[key].contactStart,contactEnd:clips[key].contactEnd,peak:peak.time});
}
const output={version:1,source:{pack:'Unleashed Boxer',license:'LicenseRef-Purchased-Asset',reference:'unleashed-boxer/Assets/Unleashed_boxer_AnimSet/Animation/Humanoid/00_T-pose.FBX',referenceSha256:sha(ref.bytes),sampleRate:60,basis:'Y-up,+Z-forward; anatomical sourceR maps native negative-X armL; sourceL jab is native side+1',rootMotionPolicy:'Simulation owns position/velocity. Frame44=0; rendered support uses production applyAuthoredPose.'},clips};
await fs.writeFile(new URL('../src/data/paid-boxer-strike-bank.json',import.meta.url),JSON.stringify(output)+'\n');
