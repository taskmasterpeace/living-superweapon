import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import fs from 'node:fs/promises';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {loadModularCharacter} from '../src/engine/modular-character.js';import {CRUISE_STYLE_LABELS} from '../src/data/flight-tuning.js';import {profileFromDef,resetFlightStyle,validateProfile,applyProfile} from '../src/tool/studio-profile.js';import {animateHands} from '../src/engine/hero-hand.js';
globalThis.ProgressEvent??=class{};
for(const style of Object.keys(CRUISE_STYLE_LABELS))test(`${style} survives profile and drives current modular cruising body`,async()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
 const p=x.p,profile=validateProfile(resetFlightStyle(profileFromDef(p.def),style));p.def=applyProfile(p.def,profile);assert.equal(p.def.model.flightStyle,style);p.parts.rig.flightStyle=style;
 p.def={...p.def,model:{...p.def.model,body:'faceted-v1'}};const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');await loadModularCharacter(p,{load:()=>new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')});
 p.flying=true;p.gait='airborne';p._openSky=true;p.vel.set(0,0,90);p._flyPose=1;p.faceDir(0,1);const pos=p.pos.clone();for(let i=0;i<120;i++)p._animate(1/60);p.obj.updateMatrixWorld(true);assert.ok(p.pos.equals(pos));assert.ok(p._modularCharacter.actor);
 for(const [i,arm]of [p.parts.armL,p.parts.armR].entries()){
 const shoulder=arm.getWorldPosition(new T.Vector3()),hand=arm.children[2].getWorldPosition(new T.Vector3());assert.ok(Number.isFinite(hand.x));
 if(['cruise-fists','cruise-palms'].includes(style)||style==='cruise-one'&&i===1)assert.ok(hand.z>shoulder.z+.8,'leading hand must reach forward');
 assert.ok(-arm.children[1].rotation.x>=0,'elbow must bend anatomically forward');
 }
 if(style==='cruise-palms'){assert.ok(p.parts.armR.children[2].morphTargetInfluences[0]>.8);p.parts.armR.children[2].userData.gripOccupied=true;for(let i=0;i<30;i++)animateHands(p,1/60);assert.ok(p.parts.armR.children[2].morphTargetInfluences[0]<.1,'occupied hand must close');}
 }finally{x.close();}
});

test('open cruise palms yield to carried contact, grab, attack and occupied hand',()=>{const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{const f=x.p;Object.assign(f,{flying:true,gait:'airborne',_flyPose:1,_flightPoseState:'forward'});f.parts.rig.flightStyle='cruise-palms';const hand=f.parts.armR.children[2];
 for(const patch of [{grabbing:{}},{grabbedBy:{}},{_carry:{}},{mstate:'active'},{_personThrowPose:{}}]){
  Object.assign(f,patch);hand.morphTargetInfluences[0]=1;for(let i=0;i<30;i++)animateHands(f,1/60);assert.ok(hand.morphTargetInfluences[0]<.01,JSON.stringify(patch));for(const key of Object.keys(patch))f[key]=null;
 }
 hand.userData.gripOccupied=true;hand.morphTargetInfluences[0]=1;animateHands(f,0);assert.equal(hand.morphTargetInfluences[0],0);
 }finally{x.close();}});

test('cruise bent and palms preserve identical torso and pelvis orientation',()=>{const a=mainCombatFixture({hero:'sol',mode:'powerworld'}),b=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
 for(const [x,style]of [[a,'cruise-palms'],[b,'cruise-bent']]){const f=x.p;f.def=applyProfile(f.def,resetFlightStyle(profileFromDef(f.def),style));f.parts.rig.flightStyle=style;Object.assign(f,{flying:true,gait:'airborne',_openSky:true,_flyPose:1});f.vel.set(0,0,90);for(let i=0;i<240;i++)f._animate(1/60);f.obj.updateMatrixWorld(true);}
 for(const key of ['torso','pelvis'])assert.ok(a.p.parts[key].getWorldQuaternion(new T.Quaternion()).angleTo(b.p.parts[key].getWorldQuaternion(new T.Quaternion()))<1e-7,key);
 }finally{a.close();b.close();}});

test('loading modular body after settled cruise has same spine as loading before cruise',async()=>{
 const a=mainCombatFixture({hero:'sol',mode:'powerworld'}),b=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
 const bytes=await fs.readFile('public/models/modular-hero/modular-hero.glb');const load=()=>new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const x of [a,b]){x.p.def={...applyProfile(x.p.def,resetFlightStyle(profileFromDef(x.p.def),'cruise-bent')),model:{...resetFlightStyle(profileFromDef(x.p.def),'cruise-bent').model,body:'faceted-v1'}};x.p.parts.rig.flightStyle='cruise-bent';Object.assign(x.p,{flying:true,gait:'airborne',_openSky:true,_flyPose:1});x.p.vel.set(0,0,53);}
 await loadModularCharacter(a.p,{load});for(let i=0;i<120;i++){a.p._animate(1/60);b.p._animate(1/60);}await loadModularCharacter(b.p,{load});a.p._animate(0);b.p._animate(0);
 for(const name of ['DEF-spine001','DEF-spine002','DEF-spine003','DEF-hips']){const boneA=a.p._modularCharacter.actor.getObjectByName(name),boneB=b.p._modularCharacter.actor.getObjectByName(name);assert.ok(boneA&&boneB,name);assert.ok(boneA.getWorldQuaternion(new T.Quaternion()).angleTo(boneB.getWorldQuaternion(new T.Quaternion()))<1e-5,'late-load calibration differs '+name);}
 }finally{a.close();b.close();}});
