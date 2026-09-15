// Purchased FBX -> the existing modular Three.AnimationClip seam. Raw assets stay private.
// These animation-only FBX exports have no bind skeleton. Their loaded local transforms
// are action frame zero, so copying local rotations or claiming bind equivalence is wrong.
// Use a shared neutral source reference to calibrate anatomical axes, then carry the
// full animated world rotation into target bone axes, preserving twist through time.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as T from 'three';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const privateRoot=path.resolve(process.argv.slice(2).find(a=>!a.startsWith('--'))||'C:/Users/taskm/Documents/PowerWorldAssets/animations/2026-09-14');
const output=path.join(repo,'public/models/modular-hero/paid-motion-bank.json');
const v=(...n)=>new T.Vector3(...n),q=()=>new T.Quaternion(),sha=b=>createHash('sha256').update(b).digest('hex');
const round=n=>Number(n.toFixed(7)),arr=x=>x.toArray().map(round);
globalThis.ProgressEvent??=class{};
// FBX references are private and offline. No texture fetch is needed to sample a skeleton.
T.TextureLoader.prototype.load=()=>new T.Texture();
const manager=new T.LoadingManager();manager.setURLModifier(url=>{throw Error('Unexpected external source dependency: '+url);});
async function load(file){const bytes=await fs.readFile(file);const a=new FBXLoader(manager).parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');a.updateMatrixWorld(true);return {a,bytes,file,mixer:new T.AnimationMixer(a)};}
function pose(s,time){s.mixer.stopAllAction();const action=s.mixer.clipAction(s.a.animations[0]);action.reset().setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();s.mixer.setTime(time);s.a.updateMatrixWorld(true);}
const bytes=await fs.readFile(path.join(repo,'public/models/modular-hero/modular-hero.glb'));
const target=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
target.updateMatrixWorld(true);
const targetBones=[];target.traverse(b=>{if(b.isBone)targetBones.push(b);});
const rest=new Map(targetBones.map(b=>[b.name,{p:b.position.clone(),q:b.quaternion.clone(),world:b.getWorldQuaternion(q()),worldP:b.getWorldPosition(v())}]));
const audit=JSON.parse(await fs.readFile(path.join(privateRoot,'fbx-audit.json'),'utf8'));
function find(pack,stem,folder){const rows=audit.results.filter(r=>r.pack===pack&&path.basename(r.path).toLowerCase()===stem.toLowerCase()+'.fbx'&&(!folder||r.path.replaceAll('\\','/').includes(folder)));if(rows.length!==1)throw Error(`Expected one ${pack}/${stem}, found ${rows.length}`);return rows[0].path;}
const ueRef=await load(find('aerial-interaction','AS_SV_Idle'));pose(ueRef,0);
const boxRef=await load(find('unleashed-boxer','00_T-pose'));pose(boxRef,0);
const specs=[];
function add(pack,stem,{role='actor',key=stem,loop=false,pair=null,environment='ground',folder=null}={}){specs.push({pack,stem,role,key,loop,pair,environment,folder});}
function pair(pack,stem,key,loop=false,environment='ground'){add(pack,stem,{key,role:'holder',loop,pair:key,environment});add(pack,stem+'_React',{key,role:'receiver',loop,pair:key,environment});}
pair('aerial-interaction','AS_SV_Fly_Catch','aerial-catch',false,'air');
pair('aerial-interaction','AS_SV_Fly_idle','aerial-held-hover',true,'air');
pair('aerial-interaction','AS_SV_Fly_Front','aerial-held-travel',true,'air');
if(!process.argv.includes('--aerial-only')){
 pair('pickup-carry','AS_P_Human_to_Shoulder','shoulder-lift');
 pair('pickup-carry','AS_P_Human_Shoulder_idle','shoulder-hold',true);
 add('pickup-carry','AS_P_Heavy_Item',{key:'heavy-lift'});
 add('pickup-carry','AS_P_Heavy_Item_idle',{key:'heavy-hold',loop:true});
 add('pickup-carry','AS_P_Heavy_Item_to_Head',{key:'heavy-overhead-lift'});
 add('pickup-carry','AS_P_Heavy_Item_Head_idle',{key:'heavy-overhead-hold',loop:true});
 pair('grab-throw','AS_GT_BackThrow_Takedown','back-throw');
 for(const direction of ['Front','Back'])add('knockdown-getup',`AS_KG_${direction}_Getup`,{key:`getup-${direction.toLowerCase()}`,folder:'In_Place'});
 add('unleashed-boxer','attack01_inplace',{key:'boxer-attack01-candidate',folder:'Inplace'});
 add('unleashed-boxer','guard01_inplace',{key:'boxer-guard01',folder:'Inplace'});
 add('unleashed-boxer','combo03_1_inplace',{key:'boxer-jab',folder:'Inplace'});
 add('unleashed-boxer','combo01_1_inplace',{key:'boxer-cross',folder:'Inplace'});
}
const baseMap={'DEF-hips':'pelvis','DEF-spine001':'spine_01','DEF-spine002':'spine_03','DEF-spine003':'spine_05','DEF-neck':'neck_02','DEF-head':'head'};
for(const side of ['L','R'])for(const [t,s]of Object.entries({shoulder:'clavicle',upper_arm:'upperarm',forearm:'lowerarm',hand:'hand',thigh:'thigh',shin:'calf',foot:'foot',toe:'ball'}))baseMap['DEF-'+t+side]=s+'_'+side.toLowerCase();
for(const side of ['L','R'])for(const finger of ['thumb','index','middle','ring','pinky'])for(let j=1;j<=3;j++)baseMap[`DEF-${finger==='thumb'?'thumb':'f_'+finger}0${j}${side}`]=`${finger}_0${j}_${side.toLowerCase()}`;
function mapping(ref){const m={...baseMap};if(!ref.a.getObjectByName('spine_05')){m['DEF-spine002']='spine_02';m['DEF-spine003']='spine_03';m['DEF-neck']='neck_01';}return m;}
function childOf(b){return b.children.find(c=>c.isBone&&!/twist|metacarpal|ik_|leaf/.test(c.name))||b.children.find(c=>c.isBone&&!/twist|ik_|leaf/.test(c.name));}
function axisFrame(direction,forward){const y=direction.clone().normalize();let z=forward.clone().addScaledVector(y,-forward.dot(y));if(z.lengthSq()<1e-5)z=v(1,0,0).addScaledVector(y,-y.x);z.normalize();const x=v().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();return q().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));}
function direction(b){const child=childOf(b);if(child)return child.getWorldPosition(v()).sub(b.getWorldPosition(v())).normalize();return (b.name.startsWith('DEF-')?v(0,1,0):v(b.position.x<0?-1:1,0,0)).applyQuaternion(b.getWorldQuaternion(q()));}
function bodyFrame(a,map){const hip=a.getObjectByName(map['DEF-hips']),head=a.getObjectByName(map['DEF-head']);const left=a.getObjectByName(map['DEF-upper_armL']),right=a.getObjectByName(map['DEF-upper_armR']);const y=head.getWorldPosition(v()).sub(hip.getWorldPosition(v())).normalize();const x=left.getWorldPosition(v()).sub(right.getWorldPosition(v())).normalize();return axisFrame(y,v().crossVectors(x,y).normalize());}
const entries=[];
for(const spec of specs){
 const ref=spec.pack==='unleashed-boxer'?boxRef:ueRef,map=mapping(ref),source=await load(find(spec.pack,spec.stem,spec.folder)),original=source.a.animations[0];
 if(!original?.validate())throw Error('Invalid source '+spec.stem);
 const refFacing=v(0,0,1).applyQuaternion(bodyFrame(ref.a,map));
 const tb=Object.keys(map).map(n=>target.getObjectByName(n)).filter(Boolean);
 const calibration=new Map();
 for(const b of tb){const s=ref.a.getObjectByName(map[b.name]);if(!s)throw Error('Missing source '+map[b.name]);const sf=axisFrame(direction(s),refFacing),tf=axisFrame(direction(b),v(0,0,1));
  calibration.set(b.name,{sourceAxis:s.getWorldQuaternion(q()).invert().multiply(sf),targetAxis:tf.invert().multiply(rest.get(b.name).world)});
 }
 const refHip=ref.a.getObjectByName('pelvis').getWorldPosition(v());
 const refLeft=ref.a.getObjectByName('thigh_l'),refCalf=ref.a.getObjectByName('calf_l'),refFoot=ref.a.getObjectByName('foot_l');
 const sourceLeg=refLeft.getWorldPosition(v()).distanceTo(refCalf.getWorldPosition(v()))+refCalf.getWorldPosition(v()).distanceTo(refFoot.getWorldPosition(v()));
 const targetLeg=rest.get('DEF-thighL').worldP.distanceTo(rest.get('DEF-shinL').worldP)+rest.get('DEF-shinL').worldP.distanceTo(rest.get('DEF-footL').worldP);
 const scale=targetLeg/sourceLeg;
 const count=Math.max(2,Math.round(original.duration*30)),times=Array.from({length:count+1},(_,i)=>original.duration*i/count),values=new Map(tb.map(b=>[b.name,[]]));
 const hips=[],rootValues=[],sourceFrames=[],diagnostics=[];
 const rootBone=target.getObjectByName('root'),rootRest=rest.get('root');
 for(let i=0;i<times.length;i++){
  pose(source,times[i]);for(const b of targetBones){const r=rest.get(b.name);b.position.copy(r.p);b.quaternion.copy(r.q);}target.updateMatrixWorld(true);
  for(const b of tb){const c=calibration.get(b.name),s=source.a.getObjectByName(map[b.name]);const world=s.getWorldQuaternion(q()).multiply(c.sourceAxis).multiply(c.targetAxis).normalize();
   b.quaternion.copy(b.parent.getWorldQuaternion(q()).invert().multiply(world)).normalize();b.updateMatrixWorld(true);
   const out=values.get(b.name),last=out.length?new T.Quaternion().fromArray(out,out.length-4):null;if(last&&last.dot(b.quaternion)<0)b.quaternion.set(-b.quaternion.x,-b.quaternion.y,-b.quaternion.z,-b.quaternion.w);out.push(...arr(b.quaternion));
  }
  const sroot=source.a.getObjectByName('root')||source.a.getObjectByName('Bip001'),sh=source.a.getObjectByName('pelvis'),hipWorld=sh.getWorldPosition(v());
  // Horizontal source travel stays in metadata; root channel stays at target rest.
  // Vertical pelvis articulation is retained relative to the shared neutral reference,
  // rather than subtracting each clip's first frame (which destroys crouches/get-ups).
  const hp=rest.get('DEF-hips').worldP.clone();hp.y+=(hipWorld.y-refHip.y)*scale;
  const local=rootBone.worldToLocal(hp);target.getObjectByName('DEF-hips').position.copy(local);target.updateMatrixWorld(true);
  hips.push(...arr(local));rootValues.push(...arr(rootRest.p));
  const frame={time:round(times[i]),root:{position:arr(sroot.getWorldPosition(v())),quaternion:arr(sroot.getWorldQuaternion(q()))},pelvis:{position:arr(hipWorld),quaternion:arr(sh.getWorldQuaternion(q()))}};
  for(const name of ['head','hand_l','hand_r','foot_l','foot_r','interaction']){const b=source.a.getObjectByName(name);if(b)frame[name]={position:arr(b.getWorldPosition(v())),quaternion:arr(b.getWorldQuaternion(q()))};}sourceFrames.push(frame);
  if([0,Math.round(count*.25),Math.round(count*.5),Math.round(count*.75),count].includes(i)){
   const armDirections={};for(const side of ['L','R']){const names=['upper_arm','forearm','hand'].map(p=>'DEF-'+p+side);const sourcePoints=names.map(n=>source.a.getObjectByName(map[n]).getWorldPosition(v())),targetPoints=names.map(n=>target.getObjectByName(n).getWorldPosition(v()));armDirections[side]={source:sourcePoints.map(arr),target:targetPoints.map(arr),upperArmError:round(sourcePoints[1].clone().sub(sourcePoints[0]).angleTo(targetPoints[1].clone().sub(targetPoints[0]))),forearmError:round(sourcePoints[2].clone().sub(sourcePoints[1]).angleTo(targetPoints[2].clone().sub(targetPoints[1])))};}
   const fingers={};for(const side of ['L','R'])for(const finger of ['thumb','index','middle']){const names=[1,2,3].map(j=>`DEF-${finger==='thumb'?'thumb':'f_'+finger}0${j}${side}`),sp=names.map(n=>source.a.getObjectByName(map[n]).getWorldPosition(v())),tp=names.map(n=>target.getObjectByName(n).getWorldPosition(v()));const bend=p=>round(p[1].clone().sub(p[0]).angleTo(p[2].clone().sub(p[1])));fingers[finger+side]={sourceBend:bend(sp),targetBend:bend(tp),source:sp.map(arr),target:tp.map(arr)};}
   const bounds=new T.Box3().setFromObject(target,true);
   diagnostics.push({phase:round(i/count),sourcePelvis:arr(hipWorld),sourceHead:frame.head.position,targetPelvis:arr(target.getObjectByName('DEF-hips').getWorldPosition(v())),targetHead:arr(target.getObjectByName('DEF-head').getWorldPosition(v())),targetHandL:arr(target.getObjectByName('DEF-handL').getWorldPosition(v())),targetHandR:arr(target.getObjectByName('DEF-handR').getWorldPosition(v())),armDirections,fingers,targetBounds:{min:arr(bounds.min),max:arr(bounds.max)}});
  }
 }
 const tracks=tb.map(b=>new T.QuaternionKeyframeTrack(b.name+'.quaternion',times,values.get(b.name)));
 tracks.push(new T.VectorKeyframeTrack('DEF-hips.position',times,hips),new T.VectorKeyframeTrack('root.position',times,rootValues),new T.QuaternionKeyframeTrack('root.quaternion',[0,original.duration],[...arr(rootRest.q),...arr(rootRest.q)]));
 const take=({'combo03_1_inplace':'Paid_Boxer_Jab','combo01_1_inplace':'Paid_Boxer_Cross'})[spec.stem]||'Paid_'+spec.stem,clip=new T.AnimationClip(take,original.duration,tracks);clip.uuid=sha(Buffer.concat([source.bytes,bytes,Buffer.from('paid-anatomical-axis-v1')])).slice(0,32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');if(!clip.validate())throw Error('Invalid output '+take);
 const seam=Math.max(...tb.map(b=>{const a=values.get(b.name);return new T.Quaternion().fromArray(a).angleTo(new T.Quaternion().fromArray(a,a.length-4));}));
 entries.push({id:`paid/${spec.pack}/${spec.stem}`,take,duration:original.duration,loop:spec.loop,frameCount:times.length,sampleRate:30,status:'retargeted-unreviewed',role:spec.role,key:spec.key,environment:spec.environment,
  source:{pack:spec.pack,file:path.relative(privateRoot,source.file).replaceAll('\\','/'),take:original.name,sha256:sha(source.bytes),license:'LicenseRef-Purchased-Asset'},
  retarget:{method:'anatomical-axis-world-rotation',reference:path.relative(privateRoot,ref.file).replaceAll('\\','/'),referenceSha256:sha(ref.bytes),target:'modular-hero.glb',targetSha256:sha(bytes),sourceToTargetScale:round(scale),mapping:map,bindPoseAvailable:false,omittedSourceBones:audit.results.find(r=>r.path===source.file).boneNames.filter(n=>!Object.values(map).includes(n)),limitations:['Source animation-only export has no bind pose. Shared neutral anatomical-axis calibration preserves motion direction and continuous twist; anatomical/rest twist and fingers require rendered review.','Target proportions differ; paired/prop contact needs final gameplay grip constraint.','No impact/contact/release timing is inferred from the filename.']},
  rootMotionPolicy:{owner:'simulation',runtimeRoot:'constant target bind position and quaternion',runtimePelvis:'shared neutral-relative vertical articulation; XZ fixed at target rest',sourceFacing:'Y-up, +Z-forward after FBXLoader; anatomical L maps target L (+X)',sourceTrajectory:'preserved in sourceMotion; never apply to fighter position'},
  sourceMotion:{units:'FBX source scene units',sourceToTargetScale:round(scale),frames:sourceFrames},
  pair:spec.pair?{id:spec.pair,role:spec.role,partner:null,relativeTransforms:[]}:null,
  review:{phases:diagnostics,loopSeamMaxJointAngle:round(seam),visualStatus:'pending',gameplayStatus:'pending'},clip:T.AnimationClip.toJSON(clip)});
 source.mixer.stopAllAction();source.mixer.uncacheRoot(source.a);
 // Restore before calibrating the next take; never calibrate from the previous action.
 for(const b of targetBones){const r=rest.get(b.name);b.position.copy(r.p);b.quaternion.copy(r.q);}target.updateMatrixWorld(true);
 console.log(`${take}: ${times.length} frames / ${original.duration.toFixed(3)}s / ${tracks.length} tracks`);
}
for(const e of entries.filter(e=>e.pair)){
 const other=entries.find(o=>o!==e&&o.pair?.id===e.pair.id);if(!other)throw Error('Missing pair for '+e.id);e.pair.partner=other.id;
 const holder=e.role==='holder'?e:other,receiver=e.role==='receiver'?e:other;
 e.pair.synchronizedDuration=Math.abs(holder.duration-receiver.duration)<1e-4;
 e.pair.sharedDuration=Math.min(holder.duration,receiver.duration);
 e.pair.timingStatus=e.pair.synchronizedDuration?'matching-source-duration':'duration-mismatch; preserve source seconds, preview overlap only; synchronization unreviewed';
 e.pair.relativeTransforms=holder.sourceMotion.frames.filter(h=>h.time<=e.pair.sharedDuration+1e-6).map(h=>{const frames=receiver.sourceMotion.frames;let i=frames.findIndex(f=>f.time>=h.time);if(i<0)i=frames.length-1;const a=frames[Math.max(0,i-1)],b=frames[i],u=b.time===a.time?0:(h.time-a.time)/(b.time-a.time);const r={pelvis:{position:v(...a.pelvis.position).lerp(v(...b.pelvis.position),u).toArray(),quaternion:q().fromArray(a.pelvis.quaternion).slerp(q().fromArray(b.pelvis.quaternion),u).toArray()}},hq=q().fromArray(h.pelvis.quaternion),rq=q().fromArray(r.pelvis.quaternion);return {time:h.time,position:arr(v(...r.pelvis.position).sub(v(...h.pelvis.position)).applyQuaternion(hq.clone().invert())),quaternion:arr(hq.invert().multiply(rq)),worldDelta:arr(v(...r.pelvis.position).sub(v(...h.pelvis.position)).multiplyScalar(e.retarget.sourceToTargetScale))};});
 e.pair.space='Receiver pelvis relative to holder pelvis in original source units; worldDelta in unscaled target model units';
 e.pair.contactStatus='source relationship preserved; target contact needs final IK and visual review';
}
for(const e of entries){
 if(e.key==='aerial-held-hover'&&e.role==='receiver')e.role='aerial-hold-receiver';if(e.key==='aerial-held-travel'&&e.role==='receiver')e.role='aerial-travel-receiver';
 e.retarget.method='approximate-anatomical-axis-world-rotation';e.retarget.limitations.push('Absolute axial twist is unknown without a true bind pose; neutral-reference twist and fingers require rendered review.');
 e.review.blockers=[];const floor=Math.min(...e.review.phases.map(p=>p.targetBounds.min[1]));
 if(e.environment==='ground'&&floor<-.08)e.review.blockers.push(`Ground support correction required: sampled target rendered bound reaches ${floor.toFixed(3)} model units below floor.`);
 if(e.pair&&!e.pair.synchronizedDuration)e.review.blockers.push('Source pair durations differ; no synchronized catch/release timing has been authored.');
 if(e.key==='boxer-attack01-candidate')e.review.blockers.push('Source performs successive left/right extensions; do not classify the whole take as a single jab.');
 if(['boxer-jab','boxer-cross'].includes(e.key)){e.review.gameplayStatus='blocked-native-contact-continuity';e.review.blockers.push('Isolated source straight identified, but native fast combat timing fails elbow continuity/contact compatibility. Default gameplay assignment disabled; explicit lab candidate only.');}
}
const bank={version:1,format:'Three.AnimationClip.toJSON',license:'LicenseRef-Purchased-Asset',acceptance:'Retargeted data and multiphase numerical evidence only. Visual and gameplay approval pending.',entries,rejected:[],gaps:['No proved failed heavy-lift clip','Boxer attack01 is an attack candidate; jab identity and contact phase need rendered review','BackThrow is a paired takedown candidate, not approved free-direction aerial throw']};
await fs.writeFile(output,JSON.stringify(bank)+'\n');
await fs.writeFile(path.join(repo,'public/models/modular-hero/paid-motion-license.json'),JSON.stringify({license:'LicenseRef-Purchased-Asset',scope:'Derived runtime motion for this project; source assets were purchased by the project owner.',notCC0:true,rawSourcePolicy:'Original FBX, archives and Unity source assets remain in the private asset directory. This bank is not a reusable public animation pack.',entitlement:'Preserve owner purchase receipts and applicable marketplace/publisher terms. No grant of standalone redistribution is asserted.',entries:entries.map(e=>({id:e.id,source:e.source}))},null,2)+'\n');
console.log(`Wrote ${entries.length} purchased derivative clips to ${output}`);
