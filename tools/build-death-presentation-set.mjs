// Death Presentation Set — curated death/knockdown/collapse clips with end-pose and
// ragdoll-handoff metadata, sampled on the ACTUAL modular-hero rig. This emits data
// for the runtime death resolver; it does not change runtime ragdoll physics.
// Facing is calibrated from the rig's own rest pose (toe direction), never assumed.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const root=path.resolve(import.meta.dirname,'..');
globalThis.ProgressEvent??=class{constructor(type,init){this.type=type;Object.assign(this,init);}};
const bytes=await fs.readFile(path.join(root,'public/models/modular-hero/modular-hero.glb'));
const target=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
target.scene.updateMatrixWorld(true);
const bank=JSON.parse(await fs.readFile(path.join(root,'public/models/modular-hero/warworld-motion-bank.json'),'utf8'));
const bone=n=>target.scene.getObjectByName(n)||(()=>{throw Error('Missing bone '+n);})();
const world=n=>{const o=bone(n);return {p:o.getWorldPosition(new T.Vector3()),q:o.getWorldQuaternion(new T.Quaternion())};};
// Rest-pose calibration: forward = horizontal toe direction; belly axis expressed in hips-local frame.
const up=new T.Vector3(0,1,0);
const restForward=(()=>{const f=new T.Vector3().addVectors(world('DEF-toeL').p,world('DEF-toeR').p).sub(world('DEF-footL').p).sub(world('DEF-footR').p);f.y=0;return f.normalize();})();
const hipsRest=world('DEF-hips');
const bellyLocal=restForward.clone().applyQuaternion(hipsRest.q.clone().invert());
const KEY=['DEF-hips','DEF-head','DEF-handL','DEF-handR','DEF-footL','DEF-footR'];
// The curated set. pairedGetup names the semantic that returns the body to its feet.
const SET=[
 {semantic:'death.a',context:'grounded',pairedGetup:null},
 {semantic:'death.b',context:'grounded',pairedGetup:null},
 {semantic:'shared.knockdown.rear',context:'grounded',pairedGetup:'shared.getup.supine'},
 {semantic:'shared.collapse',context:'grounded',pairedGetup:'shared.getup.supine'},
 {semantic:'death.airborne.fall',context:'airborne',pairedGetup:null,chain:'death.airborne.fall.loop -> death.airborne.impact'},
 {semantic:'death.airborne.fall.loop',context:'airborne',pairedGetup:null},
 {semantic:'death.airborne.impact',context:'grounded-from-air',pairedGetup:'shared.getup.supine'},
 {semantic:'shared.getup.supine',context:'grounded',role:'recovery'},
 {semantic:'shared.getup.kipup',context:'grounded',role:'recovery'},
];
const results=[];
for(const item of SET){
 const entry=bank.entries.find(e=>e.semantic===item.semantic);
 if(!entry){results.push({...item,error:'not-in-bank'});continue;}
 const clip=T.AnimationClip.parse(entry.clip);
 const m=new T.AnimationMixer(target.scene);
 const action=m.clipAction(clip);action.play();
 const sampleAt=f=>{m.setTime(Math.max(0,Math.min(clip.duration*f,clip.duration-1e-4)));target.scene.updateMatrixWorld(true);
  const hips=world('DEF-hips'),head=world('DEF-head');
  const belly=bellyLocal.clone().applyQuaternion(hips.q);const dot=belly.dot(up);
  return {t:+ (clip.duration*f).toFixed(3),hipsHeight:+hips.p.y.toFixed(3),headHeight:+head.p.y.toFixed(3),bellyUpDot:+dot.toFixed(3),
   face:hips.p.y>0.6?'upright':dot>0.35?'up':dot<-0.35?'down':'side',
   keyBones:Object.fromEntries(KEY.map(n=>{const w=world(n);return [n,{position:w.p.toArray().map(v=>+v.toFixed(4)),quaternion:w.q.toArray().map(v=>+v.toFixed(4))}];}))};
 };
 const start=sampleAt(0),end=sampleAt(1),phases=[0,.25,.5,.75,1].map(f=>{const s=sampleAt(f);return {t:s.t,hipsHeight:s.hipsHeight,face:s.face};});
 const hipsStart=new T.Vector3(...start.keyBones['DEF-hips'].position),hipsEnd=new T.Vector3(...end.keyBones['DEF-hips'].position);
 const disp=hipsEnd.clone().sub(hipsStart);disp.y=0;
 const right=new T.Vector3().crossVectors(restForward,up).negate();
 const fwd=disp.dot(restForward),lat=disp.dot(right);
 const angle=Math.atan2(lat,fwd)*180/Math.PI;
 const mag=disp.length();
 const dir=mag<0.15?'in-place':Math.abs(angle)<=45?'forward':Math.abs(angle)>=135?'backward':angle>0?'right':'left';
 m.stopAllAction();m.uncacheRoot(target.scene);
 results.push({bankId:entry.id,semantic:item.semantic,take:entry.take,duration:entry.duration,context:item.context,role:item.role||'death-or-down',
  pairedGetup:item.pairedGetup??null,chain:item.chain,
  fall:{displacement:+mag.toFixed(3),angleDeg:+angle.toFixed(1),direction:dir},
  endPose:end,phases,
  status:'source-mapped-unreviewed'});
}
target.scene.updateMatrixWorld(true);
const output={version:1,mission:'War World death presentation set (Mac asset lab)',
 source:'public/models/modular-hero/warworld-motion-bank.json',
 calibration:{restForward:restForward.toArray().map(v=>+v.toFixed(4)),note:'forward derived from rest-pose toe direction; face classification from hips-frame belly axis vs world up'},
 handoffRecommendations:{
  note:'Recommendations for the runtime death resolver; this lab does not change runtime ragdoll physics.',
  playClipFully:'Play the selected death clip to completion, then hand the final pose to settled physics.',
  blendMs:120,maxAngularVelocityRadS:6,settledLinearDamping:0.92,settledAngularDamping:0.95,
  groundedEndings:'Clips ending face-up/down at hips height < 0.35 can settle with minimal ragdoll energy (angular velocity clamp 2 rad/s).',
  airborneChain:'death.airborne.fall -> fall.loop (hold while airborne) -> impact on ground contact; hand off to ragdoll only after impact completes.',
  interruption:'If the body is displaced mid-clip (explosion, vehicle), abandon the clip and use full ragdoll from the current sampled pose.'},
 limitations:['Only two authored human deaths are on this machine; the 85-file Knockdown & Get-Up purchased pack (Windows PC, docs/PURCHASED_ANIMATION_INTAKE_2026-09-14.md) is required for the full 12-20 clip directional set.',
  'Direction/face fields are computed from source motion on the actual rig, not yet visually accepted.'],
 clips:results};
await fs.writeFile(path.join(root,'public/models/modular-hero/death-presentation-set.json'),JSON.stringify(output,null,1)+'\n');
console.log(JSON.stringify(results.map(r=>({semantic:r.semantic,take:r.take,dur:r.duration,fall:r.fall,endFace:r.endPose?.face,endHips:r.endPose?.hipsHeight,error:r.error})),null,2));
