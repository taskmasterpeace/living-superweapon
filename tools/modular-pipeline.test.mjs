import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {applyModularRecipe,MODULAR_RECIPES,validateModularRecipe} from '../src/engine/modular-costume.js';
import {poseInfectedFlight} from '../src/engine/modular-motions.js';
async function asset(){const b=await fs.readFile('public/models/modular-hero/modular-hero.glb');return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
test('mapped source bank retains complete valid hand tracks and required actual takes',async()=>{
 const bank=JSON.parse(await fs.readFile('public/models/modular-hero/motion-bank.json'));
 assert.equal(bank.rejected.length,0);
 for(const name of ['Roll','LayToIdle','Zombie_Idle_Loop','Zombie_Walk_Fwd_Loop','Zombie_Scratch','Melee_Hook','Sword_Block'])assert.ok(bank.entries.some(e=>e.take===name),name);
 for(const entry of bank.entries){const clip=T.AnimationClip.parse(entry.clip);assert.ok(clip.validate(),entry.id);assert.equal(clip.duration,entry.duration);assert.ok(clip.tracks.some(t=>t.name.startsWith('DEF-handR.')),entry.id+' wrist');assert.ok(clip.tracks.some(t=>t.name.startsWith('DEF-thumb')),entry.id+' thumb');}
});
test('equipment options exclude intersecting replacement meshes and preserve the skeleton',async()=>{
 const g=await asset(),meshes=[];g.scene.traverse(o=>{if(o.isMesh)meshes.push(o);});const visible=slot=>meshes.some(m=>m.userData.slot===slot&&m.visible);
 applyModularRecipe(meshes,{...MODULAR_RECIPES.base,gloves:'boxing',gauntlets:true,wristbands:true,footwear:'shoes'});
 assert.ok(visible('boxingGloves'));for(const slot of ['hands','handTips','gauntlets','wristbands','boots'])assert.ok(!visible(slot),slot);assert.ok(visible('shoes'));assert.ok(visible('calves'));
 applyModularRecipe(meshes,{...MODULAR_RECIPES.base,wristbands:true,footwear:'boots'});assert.ok(visible('wristbands'));assert.ok(visible('boots'));assert.ok(!visible('shoes'));assert.ok(!visible('boxingGloves'));
 for(const m of meshes)assert.ok(m.geometry.attributes.uv,m.name+' texture UV');
});
test('infected flight arms hang down without translating the actor or bone joints',async()=>{
 const g=await asset(),actor=g.scene;actor.rotation.set(.9,.4,.2);actor.scale.setScalar(4);actor.position.set(8,22,3);const snapshots=[];actor.traverse(o=>{if(o.isBone)snapshots.push([o,o.position.clone()]);});const root=actor.position.clone();poseInfectedFlight(actor);
 assert.ok(actor.position.equals(root));for(const [bone,position]of snapshots)assert.ok(bone.position.equals(position),bone.name);
 for(const side of ['L','R'])for(const part of ['upper_arm','forearm','hand']){const bone=actor.getObjectByName(`DEF-${part}${side}`),axis=new T.Vector3(0,1,0).applyQuaternion(bone.getWorldQuaternion(new T.Quaternion()));assert.ok(axis.dot(new T.Vector3(0,-1,0))>.999,part+side);}
});
test('costume surfaces and COH-style choices roundtrip with validation',()=>{
 const r=validateModularRecipe({schema:1,body:'faceted-v1',skeleton:'ual-deform-v1',...MODULAR_RECIPES.vegas,infection:'rupture',pattern:'gilt',patternScale:2,gloves:'boxing',footwear:'shoes',beltStyle:'plain',wristbands:true});
 for(const [k,v]of Object.entries({infection:'rupture',pattern:'gilt',patternScale:2,gloves:'boxing',footwear:'shoes',beltStyle:'plain',wristbands:true}))assert.equal(r[k],v);
 for(const invalid of [{infection:'unknown'},{patternScale:0},{patternImage:'javascript:no'},{gloves:'unknown'}])assert.throws(()=>validateModularRecipe({schema:1,body:'faceted-v1',skeleton:'ual-deform-v1',...invalid}));
});
