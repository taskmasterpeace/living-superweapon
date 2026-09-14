// Full source joint tracks only. No reduced directional pose-bank conversion.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(import.meta.dirname,'..');
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const source1='assets-src/modular-character/source/AnimationLibrary_Godot_Standard.gltf';
const source2='assets-src/modular-character/source/UAL2_Standard.glb';
async function load(file){const bytes=await fs.readFile(path.join(root,file));let input;if(file.endsWith('.gltf')){const doc=JSON.parse(bytes);for(const b of doc.buffers){const raw=await fs.readFile(path.join(root,path.dirname(file),b.uri));b.uri='data:application/octet-stream;base64,'+raw.toString('base64');}input=JSON.stringify(doc);}else input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);const scene=await new GLTFLoader().parseAsync(input,'');scene.scene.updateMatrixWorld(true);return {...scene,file,sha256:createHash('sha256').update(bytes).digest('hex')};}
const fixed={root:'root',pelvis:'DEF-hips',spine_01:'DEF-spine.001',spine_02:'DEF-spine.002',spine_03:'DEF-spine.003',neck_01:'DEF-neck',Head:'DEF-head'};
const limbs={clavicle:'shoulder',upperarm:'upper_arm',lowerarm:'forearm',hand:'hand',thigh:'thigh',calf:'shin',foot:'foot',ball:'toe'};
function mapped(name){if(fixed[name])return fixed[name];if(name.includes('leaf'))return null;const m=name.match(/^(.*)_([lr])$/);if(!m)return null;const [,part,side]=m;let out=limbs[part];if(!out){const f=part.match(/^(index|middle|pinky|ring|thumb)_(\d+)$/);if(!f)return null;out=(f[1]==='thumb'?'thumb':'f_'+f[1])+'.'+f[2];}return 'DEF-'+out+'.'+side.toUpperCase();}
const sanitize=T.PropertyBinding.sanitizeNodeName;
function skeleton(g){let found;g.scene.traverse(o=>{if(o.isSkinnedMesh&&!found)found=o.skeleton;});if(!found)throw Error('No source skeleton: '+g.file);return found;}
const maxDelta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
function prove(source,target,rename){const ss=skeleton(source),ts=skeleton(target),report={source:source.file,target:target.file,mapped:0,omitted:[],errors:[],maxLocal:0,maxWorld:0,maxInverseBind:0};for(let i=0;i<ss.bones.length;i++){const b=ss.bones[i],name=rename(b.name);if(!name){report.omitted.push(b.name);continue;}const ti=ts.bones.findIndex(n=>n.name===sanitize(name));if(ti<0){report.errors.push('Missing target '+name);continue;}const t=ts.bones[ti];report.mapped++;report.maxLocal=Math.max(report.maxLocal,maxDelta(b.matrix.elements,t.matrix.elements));report.maxWorld=Math.max(report.maxWorld,maxDelta(b.matrixWorld.elements,t.matrixWorld.elements));report.maxInverseBind=Math.max(report.maxInverseBind,maxDelta(ss.boneInverses[i].elements,ts.boneInverses[ti].elements));if(b.parent?.isBone&&rename(b.parent.name)!==t.parent?.name&&sanitize(rename(b.parent.name)||'')!==t.parent?.name)report.errors.push('Parent mismatch '+name);}report.tolerance=1e-4;for(const field of ['maxLocal','maxWorld','maxInverseBind'])if(report[field]>report.tolerance)report.errors.push(field+' exceeds tolerance');report.compatible=!report.errors.length;return report;}
const [ual1,ual2,target]=await Promise.all([load(source1),load(source2),load('public/models/modular-hero/modular-hero.glb')]);
// Loader sanitizes DEF names (dots become underscores). Match both raw and loaded names.
const ual1Names=new Map(skeleton(ual1).bones.map(b=>[b.name,b.name]));
const toDef=n=>{const raw=mapped(n);return raw?sanitize(raw):null;};
const proofs=[prove(ual2,ual1,toDef),prove(ual1,target,n=>ual1Names.get(n))];
const requested2=['Zombie_Idle_Loop','Zombie_Walk_Fwd_Loop','Zombie_Scratch','Idle_Shield_Loop','Shield_OneShot','Shield_Dash','Idle_Shield_Break','Sword_Block','Sword_Dash','Sword_Regular_A','Sword_Regular_A_Rec','Sword_Regular_B','Sword_Regular_B_Rec','Sword_Regular_C','Sword_Regular_Combo','Sword_Heavy_Combo','TreeChopping_Loop','LayToIdle','Hit_Knockback','Melee_Hook','Melee_Hook_Rec','ClimbUp_1m','NinjaJump_Idle_Loop','NinjaJump_Start','NinjaJump_Land','Slide_Start','Slide_Loop','Slide_Exit'];
const entries=[],rejected=[];
for(const [src,names,rename,ok]of [[ual1,['Roll','Fixing_Kneeling','Jog_Fwd_Loop','Jump_Start','Jump_Land'],n=>ual1Names.get(n),proofs[1].compatible],[ual2,requested2,toDef,proofs.every(p=>p.compatible)]])for(const take of names){const original=src.animations.find(c=>c.name===take);if(!original||!ok){rejected.push({take,source:src.file,reason:!original?'missing-source-take':'bind-proof-failed'});continue;}const clip=original.clone(),omittedTracks=[];clip.tracks=clip.tracks.flatMap(track=>{const binding=T.PropertyBinding.parseTrackName(track.name),bone=rename(binding.nodeName);if(!bone){omittedTracks.push(track.name);return [];}const copy=track.clone();copy.name=bone+'.'+binding.propertyName;return [copy];});entries.push({id:(src===ual1?'ual1/':'ual2/')+take,take,source:{file:src.file,sha256:src.sha256,license:'CC0-1.0'},duration:original.duration,loop:take.endsWith('_Loop'),status:'source-mapped-unreviewed',rootMotionPolicy:'Tracks preserve original source values; runtime must anchor actor to simulation and never apply source root trajectory to fighter position.',omittedTracks,clip:T.AnimationClip.toJSON(clip)});}
// Authored derivative only: source sprint legs/root retain their exact cadence.
// Replace its restrained arms with bounded anterior flails about Idle_Loop(0).
// Integer harmonics make irregular, asymmetric gestures with identical loop endpoints.
const sprint=ual1.animations.find(c=>c.name==='Sprint_Loop');
if(sprint){
 const clip=sprint.clone();clip.name='Infected_Sprint_Loop';
 const mixer=new T.AnimationMixer(target.scene),idle=target.animations.find(c=>c.name==='Idle_Loop');
 mixer.clipAction(idle).play();mixer.setTime(0);
 const armNames=['DEF-upper_armR','DEF-upper_armL','DEF-forearmR','DEF-forearmL'];
 const base=Object.fromEntries(armNames.map(n=>[n,target.scene.getObjectByName(n).quaternion.clone()]));
 clip.tracks=clip.tracks.filter(track=>!armNames.some(n=>track.name===n+'.quaternion'));
 for(const name of armNames){
  const times=[],values=[],left=name.endsWith('L'),sign=left?-1:1,upper=name.includes('upper_arm');
  for(let i=0;i<=60;i++){
   const phase=i===60?0:i/60*Math.PI*2,p=phase+(left?1.1:0);
   const x=upper?.7+.22*Math.sin(p)+.10*Math.sin(3*p+.4):.4+.15*Math.sin(2*p+.7)+.08*Math.sin(3*p);
   const y=upper?.12*Math.sin(2*p):0;
   const z=upper?sign*(.3+.2*Math.sin(p+.8)+.08*Math.sin(3*p)):sign*.08*Math.sin(p);
   times.push(i/60*clip.duration);base[name].clone().multiply(new T.Quaternion().setFromEuler(new T.Euler(x,y,z))).normalize().toArray(values,values.length);
  }
  clip.tracks.push(new T.QuaternionKeyframeTrack(name+'.quaternion',times,values));
 }
 for(const track of clip.tracks){if(!track.name.endsWith('.quaternion'))continue;const a=track.name.startsWith('DEF-head.')?.16:track.name.startsWith('DEF-spine003.')?.10:0;if(a){const delta=new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),a);for(let i=0;i<track.values.length;i+=4)new T.Quaternion().fromArray(track.values,i).multiply(delta).toArray(track.values,i);}}
 mixer.stopAllAction();mixer.uncacheRoot(target.scene);
 entries.push({id:'derived/Infected_Sprint_Loop',take:clip.name,source:{file:source1,sha256:ual1.sha256,license:'CC0-1.0',take:'Sprint_Loop'},derivation:'Original sprint legs/root unchanged; four arm quaternion tracks replaced with asymmetric periodic anterior flails based on Idle_Loop(0); head/chest lean added. Visual review pending.',duration:clip.duration,loop:true,status:'authored-derivative-preview',rootMotionPolicy:'Simulation owns displacement',omittedTracks:[],clip:T.AnimationClip.toJSON(clip)});
}

const output={version:1,format:'Three.AnimationClip.toJSON',proofs,entries,rejected,gaps:['No dedicated bat combat','TreeChopping_Loop is not approved combat axe motion','No sideways firing dive','No dual-pistol or shotgun source clips','No infected flight','No prone get-up'],acceptance:'Bind and source-track mapping proof only; visual and gameplay acceptance pending.'};
await fs.writeFile(path.join(root,'public/models/modular-hero/motion-bank.json'),JSON.stringify(output)+'\n');
console.log(JSON.stringify({proofs,entries:entries.length,rejected:rejected.length},null,2));
if(rejected.length)process.exitCode=1;
