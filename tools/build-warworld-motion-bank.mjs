// War World mission motion bank — curated soldier / zombie / superweapon subset
// extracted from the FULL UAL1/UAL2 libraries (full-library-2026-09-14), mapped onto
// the actual modular-hero rig with full source joint tracks. Companion to
// build-modular-motion-bank.mjs (Standard-subset bank) and build-paid-motion-bank.mjs.
// Statuses stay honest: bind/mapping proof only; visual and gameplay acceptance pending.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(import.meta.dirname,'..');
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const source1='assets-src/modular-character/source/full-library-2026-09-14/ual1/UAL1.glb';
const source2='assets-src/modular-character/source/full-library-2026-09-14/ual2/UAL2.glb';
async function load(file){const bytes=await fs.readFile(path.join(root,file));let input;if(file.endsWith('.gltf')){const doc=JSON.parse(bytes);for(const b of doc.buffers){const raw=await fs.readFile(path.join(root,path.dirname(file),b.uri));b.uri='data:application/octet-stream;base64,'+raw.toString('base64');}input=JSON.stringify(doc);}else input=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);const scene=await new GLTFLoader().parseAsync(input,'');scene.scene.updateMatrixWorld(true);return {...scene,file,sha256:createHash('sha256').update(bytes).digest('hex')};}
const fixed={root:'root',pelvis:'DEF-hips',spine_01:'DEF-spine.001',spine_02:'DEF-spine.002',spine_03:'DEF-spine.003',neck_01:'DEF-neck',Head:'DEF-head'};
const limbs={clavicle:'shoulder',upperarm:'upper_arm',lowerarm:'forearm',hand:'hand',thigh:'thigh',calf:'shin',foot:'foot',ball:'toe'};
function mapped(name){if(fixed[name])return fixed[name];if(name.includes('leaf'))return null;const m=name.match(/^(.*)_([lr])$/);if(!m)return null;const [,part,side]=m;let out=limbs[part];if(!out){const f=part.match(/^(index|middle|pinky|ring|thumb)_(\d+)$/);if(!f)return null;out=(f[1]==='thumb'?'thumb':'f_'+f[1])+'.'+f[2];}return 'DEF-'+out+'.'+side.toUpperCase();}
const sanitize=T.PropertyBinding.sanitizeNodeName;
function skeleton(g){let found;g.scene.traverse(o=>{if(o.isSkinnedMesh&&!found)found=o.skeleton;});if(!found)throw Error('No source skeleton: '+g.file);return found;}
const maxDelta=(a,b)=>Math.max(...a.map((v,i)=>Math.abs(v-b[i])));
function prove(source,target,rename){const ss=skeleton(source),ts=skeleton(target),report={source:source.file,target:target.file,mapped:0,omitted:[],errors:[],maxLocal:0,maxWorld:0,maxInverseBind:0};for(let i=0;i<ss.bones.length;i++){const b=ss.bones[i],name=rename(b.name);if(!name){report.omitted.push(b.name);continue;}const ti=ts.bones.findIndex(n=>n.name===sanitize(name));if(ti<0){report.errors.push('Missing target '+name);continue;}const t=ts.bones[ti];report.mapped++;report.maxLocal=Math.max(report.maxLocal,maxDelta(b.matrix.elements,t.matrix.elements));report.maxWorld=Math.max(report.maxWorld,maxDelta(b.matrixWorld.elements,t.matrixWorld.elements));report.maxInverseBind=Math.max(report.maxInverseBind,maxDelta(ss.boneInverses[i].elements,ts.boneInverses[ti].elements));if(b.parent?.isBone&&rename(b.parent.name)!==t.parent?.name&&sanitize(rename(b.parent.name)||'')!==t.parent?.name)report.errors.push('Parent mismatch '+name);}report.tolerance=1e-4;for(const field of ['maxLocal','maxWorld','maxInverseBind'])if(report[field]>report.tolerance)report.errors.push(field+' exceeds tolerance');report.compatible=!report.errors.length;return report;}
// Curated mission subset. semantic = stable action id for the runtime resolver;
// family groups delivery. Names must exist in the full libraries (rejected otherwise).
const UAL1=[
 ['Idle_LookAround_Loop','soldier.idle.scan'],
 ['Jog_Fwd_Loop','soldier.run.fwd'],['Jog_Bwd_Loop','soldier.run.bwd'],['Jog_Left_Loop','soldier.run.left'],['Jog_Right_Loop','soldier.run.right'],['Jog_Fwd_L_Loop','soldier.run.fwd_left'],['Jog_Fwd_R_Loop','soldier.run.fwd_right'],
 ['Sprint_Enter','soldier.sprint.enter'],['Sprint_Exit','soldier.sprint.exit'],
 ['Crouch_Enter','soldier.crouch.enter'],['Crouch_Exit','soldier.crouch.exit'],['Crouch_Idle_Loop','soldier.crouch.idle'],['Crouch_Fwd_Loop','soldier.crouch.fwd'],['Crouch_Bwd_Loop','soldier.crouch.bwd'],['Crouch_Left_Loop','soldier.crouch.left'],['Crouch_Right_Loop','soldier.crouch.right'],
 ['Crawl_Enter','soldier.prone.enter'],['Crawl_Exit','soldier.prone.exit'],['Crawl_Idle_Loop','soldier.prone.idle'],['Crawl_Fwd_Loop','soldier.prone.fwd'],
 ['Pistol_Aim_Down','soldier.pistol.aim.down'],['Pistol_Aim_Neutral','soldier.pistol.aim.neutral'],['Pistol_Aim_Up','soldier.pistol.aim.up'],['Pistol_Idle_Loop','soldier.pistol.idle'],['Pistol_Shoot','soldier.pistol.fire'],['Pistol_Reload','soldier.pistol.reload'],
 ['Hit_Chest','shared.hit.front.chest'],['Hit_Head','shared.hit.front.head'],['Hit_Shoulder_L','shared.hit.left'],['Hit_Shoulder_R','shared.hit.right'],['Hit_Stomach','shared.hit.front.stomach'],
 ['Death01','death.a'],['Death02','death.b'],
 ['Dodge_Left','shared.dodge.left'],['Dodge_Right','shared.dodge.right'],
 ['Turn90_L','soldier.turn90.left'],['Turn90_R','soldier.turn90.right'],
 ['Kick','shared.melee.kick'],['PunchKick_Enter','shared.melee.stance.enter'],['PunchKick_Exit','shared.melee.stance.exit'],
].map(([take,semantic])=>({take,semantic,family:semantic.split('.')[0]}));
const UAL2=[
 ['Zombie_Idle_Loop','zombie.idle'],['Zombie_Bite','zombie.attack.bite'],['Zombie_Scratch','zombie.attack.scratch'],['Zombie_Spawn','zombie.reanimate'],
 ...['Fwd','Fwd_L','Fwd_R','L','R','Bwd','Bwd_L','Bwd_R'].map(d=>[`Zombie_Walk_${d}_Loop`,'zombie.shamble.'+d.toLowerCase()]),
 ...['Fwd','Fwd_L','Fwd_R','L','R','Bwd','Bwd_L','Bwd_R'].map(d=>[`Zombie_Run_${d}_Loop`,'zombie.sprint.'+d.toLowerCase()]),
 ['LiftAir','sw.lift.enter'],['LiftAir_Idle_Loop','sw.lift.idle'],['LiftAir_Hit_L','sw.aerial.hit.left'],['LiftAir_Hit_R','sw.aerial.hit.right'],['LiftAir_Fall','death.airborne.fall'],['LiftAir_Fall_Air_Loop','death.airborne.fall.loop'],['LiftAir_Fall_Impact','death.airborne.impact'],
 ['OverhandThrow','sw.throw.overhand'],['KipUp','shared.getup.kipup'],['IdleToLay','shared.collapse'],['LayToIdle','shared.getup.supine'],
 ['Melee_Uppercut','sw.strike.uppercut'],['Melee_Combo','sw.strike.combo'],['Melee_Knee','sw.strike.knee'],['Melee_Knee_Rec','sw.strike.knee.rec'],
 ['Turn180_L','shared.turn180.left'],['Turn180_R','shared.turn180.right'],
 ['MonsterTransformation','sw.transform'],
 ['Hit_Knockback','shared.knockdown.rear'],
].map(([take,semantic])=>({take,semantic,family:semantic.split('.')[0]}));
const [ual1,ual2,target]=await Promise.all([load(source1),load(source2),load('public/models/modular-hero/modular-hero.glb')]);
// Full libraries may ship either DEF-style (Godot) or Unreal-style bone names; detect per source.
const naming=src=>skeleton(src).bones.some(b=>b.name.startsWith('DEF'))?(n=>n):n=>{const raw=mapped(n);return raw?sanitize(raw):null;};
const rename1=naming(ual1),rename2=naming(ual2);
const proofs=[prove(ual1,target,rename1),prove(ual2,target,rename2)];
const entries=[],rejected=[];
for(const [src,list,rename,proof] of [[ual1,UAL1,rename1,proofs[0]],[ual2,UAL2,rename2,proofs[1]]])for(const {take,semantic,family} of list){
 const original=src.animations.find(c=>c.name===take);
 if(!original||!proof.compatible){rejected.push({take,semantic,source:src.file,reason:!original?'missing-source-take':'bind-proof-failed'});continue;}
 const clip=original.clone(),omittedTracks=[];
 clip.tracks=clip.tracks.flatMap(track=>{const binding=T.PropertyBinding.parseTrackName(track.name),bone=rename(binding.nodeName);if(!bone){omittedTracks.push(track.name);return [];}const copy=track.clone();copy.name=bone+'.'+binding.propertyName;return [copy];});
 entries.push({id:(src===ual1?'ual1full/':'ual2full/')+take,take,semantic,family,source:{file:src.file,sha256:src.sha256,license:'CC0-1.0'},duration:original.duration,loop:take.endsWith('_Loop'),status:'source-mapped-unreviewed',rootMotionPolicy:'Tracks preserve original source values; runtime must anchor actor to simulation and never apply source root trajectory to fighter position.',omittedTracks,clip:T.AnimationClip.toJSON(clip)});
}
const gaps=[
 'No rifle/two-hand long-gun aim/fire/reload family exists in UAL1 or UAL2; soldier rifle presentation still needs a purchased or authored source. Do not re-purpose Pistol_Shoot as rifle fire without visual acceptance.',
 'No named rear/back hit reaction; Hit_Knockback is a full knockback, not a flinch.',
 'Only two authored human deaths (Death01, Death02) are on this machine. The 85-file Knockdown & Get-Up purchased pack remains on the Windows PC (docs/PURCHASED_ANIMATION_INTAKE_2026-09-14.md); transfer it to widen the death set.',
 'No zombie-specific death, leg-impaired zombie locomotion or arm-impaired attack variant; Crawl family and human deaths are unproven candidates only.',
 'No prone Bwd/lateral crawl loops were curated (source has them if needed).',
 'MonsterTransformation and the sw.* strike clips are candidates for Living Superweapon actions; no skeleton-compatible grab/hold/throw paired set exists outside the paid bank.',
];
const output={version:1,format:'Three.AnimationClip.toJSON',mission:'War World soldier/zombie/superweapon acceptance subset (Mac asset lab)',proofs:proofs.map(({source,target,mapped,omitted,errors,maxLocal,maxWorld,maxInverseBind,tolerance,compatible})=>({source,target,mapped,omittedCount:omitted.length,omitted:omitted.slice(0,20),errors,maxLocal,maxWorld,maxInverseBind,tolerance,compatible})),entries,rejected,gaps,acceptance:'Bind and source-track mapping proof only; visual and gameplay acceptance pending.'};
await fs.writeFile(path.join(root,'public/models/modular-hero/warworld-motion-bank.json'),JSON.stringify(output)+'\n');
console.log(JSON.stringify({proofs:output.proofs.map(p=>({source:p.source,mapped:p.mapped,omittedCount:p.omittedCount,errors:p.errors,compatible:p.compatible})),entries:entries.length,rejected},null,2));
if(rejected.length)process.exitCode=1;
