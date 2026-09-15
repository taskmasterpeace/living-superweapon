import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {paidMotionChoice,applyPaidMotion,validatePaidBank} from '../src/engine/paid-motion-runtime.js';
import {profileFromDef,saveProfile,loadProfile,applyProfile} from '../src/tool/studio-profile.js';
import {ROSTER} from '../src/data/characters.js';
import fs from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {loadModularCharacter} from '../src/engine/modular-character.js';
import {attachPaidMotionBank} from '../src/engine/paid-motion-runtime.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Fighter} from '../src/engine/entity.js';
import {heldPairDistance} from '../src/engine/person-carry.js';
import {modularHoldTarget} from '../src/engine/modular-held-pose.js';

test('purchased-motion opt-out survives save, reload and game profile application',()=>{
 const def=ROSTER.find(d=>d.id==='sol'),profile=profileFromDef(def),store=new Map();
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 profile.model.paidMotions='off';saveProfile(profile,storage);
 assert.equal(applyProfile(def,loadProfile(def.id,storage)).model.paidMotions,'off');
 profile.model.paidMotions='anything';assert.throws(()=>saveProfile(profile,storage));
});

test('paid receiver motion follows the holder clock and never overrides incapacitation',()=>{
 const holder={alive:true,grabState:'clinch',flying:true,_clinchElapsed:1.25,vel:new T.Vector3(0,0,60)};
 const receiver={alive:true,grabbedBy:holder};holder.grabbing=receiver;
 assert.deepEqual(paidMotionChoice(receiver),{role:'aerial-travel-receiver',time:1.25,loop:true});
 holder.vel.set(0,0,0);assert.equal(paidMotionChoice(receiver).role,'aerial-hold-receiver');
 receiver.stunT=1;assert.equal(paidMotionChoice(receiver),null);
 receiver.stunT=0;holder.grabbing=null;assert.equal(paidMotionChoice(receiver),null);
});

test('paid overlay keeps simulation and contact body authoritative; only permitted joints move',()=>{
 const actor=new T.Group(),hip=new T.Bone(),arm=new T.Bone(),hand=new T.Bone();
 hip.name='DEF-hips';arm.name='DEF-upper_armL';hand.name='DEF-handL';actor.add(hip);hip.add(arm);arm.add(hand);
 hip.position.y=1;arm.position.x=.3;hand.position.y=.5;
 const clip=new T.AnimationClip('Paid_Test',1,[new T.QuaternionKeyframeTrack('DEF-upper_armL.quaternion',[0,1],[0,0,0,1,0,0,Math.SQRT1_2,Math.SQRT1_2]),new T.VectorKeyframeTrack('DEF-hips.position',[0,1],[0,1,0,5,5,5])]);
 const mixer=new T.AnimationMixer(actor),c={actor,clips:new Map([[clip.name,clip]]),pose(name,phase){mixer.stopAllAction();const a=mixer.clipAction(this.clips.get(name));a.reset().setLoop(T.LoopOnce,1).play();mixer.setTime(phase);}};
 const f={pos:new T.Vector3(1,2,3),vel:new T.Vector3(4,5,6),def:{},_paidMotionBank:{entries:[{role:'aerial-hold-receiver',take:clip.name,duration:1}]}};
 const q=hip.quaternion.clone(),p=hip.position.clone();
 assert.equal(applyPaidMotion(f,c,{role:'aerial-hold-receiver',time:.5,loop:true}),true);
 assert.ok(hip.position.equals(p));assert.ok(hip.quaternion.equals(q));assert.ok(arm.quaternion.z>0);
 assert.deepEqual(f.pos.toArray(),[1,2,3]);assert.deepEqual(f.vel.toArray(),[4,5,6]);
 assert.equal(f._paidMotionActive.take,'Paid_Test');
 const frozen=arm.quaternion.clone();f.hitstop=.1;
 arm.quaternion.identity(); // The native pose is sampled afresh before every overlay.
 applyPaidMotion(f,c,{role:'aerial-hold-receiver',time:.9,loop:true});
 assert.ok(arm.quaternion.toArray().every((n,i)=>Math.abs(n-frozen.toArray()[i])<1e-7),'hitstop must freeze the receiver clip');
});

test('invalid or duplicate purchased tracks are rejected and absent roles fall back',()=>{
 assert.throws(()=>validatePaidBank({entries:[{take:'bad',clip:{tracks:[]}}]}));
 assert.equal(applyPaidMotion({def:{}},{},null),false);
});

test('real modular paid receiver phases retain rear neck contact, fixed limbs and collision roots',async()=>{
 globalThis.ProgressEvent??=class{};
 const bank=JSON.parse(await fs.readFile('public/models/modular-hero/paid-motion-bank.json','utf8'));
 const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');
 const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const x=mainCombatFixture({mode:'powerworld',hero:'vega'}),h=x.p,v=new Fighter(structuredClone(ROSTER.find(d=>d.id==='kano')));
 try{
  x.g.entities.push(v);x.g.scene.add(v.obj);v._game=x.g;
  h.grabbing=v;v.grabbedBy=h;h.grabState='clinch';h.grabMode='back';h.poseGrab=1;
  for(const f of [h,v]){f._altTag=()=>{};f.def={...f.def,model:{...f.def.model,body:'faceted-v1'}};f.flying=true;f.gait='airborne';await loadModularCharacter(f,{load});attachPaidMotionBank(f,f._modularCharacter,bank);}
  const bonePositions=[];v._modularCharacter.actor.traverse(b=>{if(b.isBone)bonePositions.push([b,b.position.clone()]);});
  for(const speed of [0,40])for(const phase of [0,.25,.5,.75,1]){
   const role=speed?'aerial-travel-receiver':'aerial-hold-receiver',e=bank.entries.find(e=>e.role===role);
   h.vel.set(0,0,speed);h._clinchElapsed=e.duration*phase;h.pos.set(0,80,0);v.pos.set(0,80,heldPairDistance(h,v));v.faceDir(0,1);
   const roots=[h.pos.clone(),v.pos.clone()];h._animate(0);v._animate(0);h._modularCharacter.syncHeldContact();
   assert.equal(v._paidMotionActive.role,role);
   const hand=h._modularCharacter.actor.getObjectByName('DEF-handR').getWorldPosition(new T.Vector3());
   assert.ok(hand.distanceTo(modularHoldTarget(v,'R',false,new T.Vector3(),true))<.05,'held neck contact drift');
   for(const [b,p]of bonePositions)assert.ok(b.position.distanceTo(p)<1e-7,b.name+' stretched');
   assert.ok(h.pos.equals(roots[0])&&v.pos.equals(roots[1]));
  }
  v.stunT=1;v._animate(0);assert.equal(v._paidMotionActive,null,'stun owns receiver motion');
 }finally{x.close();}
});
