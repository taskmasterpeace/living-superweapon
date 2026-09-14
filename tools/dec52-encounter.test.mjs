import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import * as T from 'three';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';import {createDec52Encounter} from '../src/engine/dec52-encounter.js';import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
globalThis.ProgressEvent??=class{};const loader={async loadAsync(url){const b=await fs.readFile('public'+url);return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}};
test('native hound bite damages once on contact, misses after withdrawal and owns quadruped bounds',async()=>{
 const x=mainCombatFixture();let c;try{
 c=await createDec52Encounter(x.g,{origin:new T.Vector3(),target:x.p,loader});const f=c.fighter;f.invuln=0;x.p.invuln=0;
 assert.ok(f.bodyBounds.max.y<12);assert.equal(f.obj.visible,false);assert.equal(x.g.entities.includes(f),true);
 const jaw=c.actor.actor.getObjectByName('nanite-jaw');c.actor.root.updateMatrixWorld(true);const mouth=jaw.getWorldPosition(new T.Vector3());x.p.pos.copy(mouth);x.p.pos.y=0;const hp=x.p.hp;
 for(let i=0;i<15;i++)c.control(1/60);assert.ok(x.p.hp<hp,'accepted mouth contact causes native health loss');const hitHp=x.p.hp;
 for(let i=0;i<20;i++)c.control(1/60);assert.equal(x.p.hp,hitHp,'one contact per bite');
 f.takeDamage(4,{src:x.p,unblockable:true});assert.ok(f.hp<f.maxHp,'native incoming health damage works');
 }finally{c?.dispose();x.close();}
});

test('native hound bite misses a withdrawn target and cannot bite through cover',async()=>{
 for(const blocked of [false,true]){
 const x=mainCombatFixture();let c;try{
 c=await createDec52Encounter(x.g,{origin:new T.Vector3(),target:x.p,loader});const f=c.fighter;f.invuln=0;x.p.invuln=0;
 const mouth=c.actor.actor.getObjectByName('nanite-jaw').getWorldPosition(new T.Vector3());x.p.pos.copy(mouth).add(new T.Vector3(0,0,1));x.p.pos.y=0;const hp=x.p.hp;
 c.control(1/60);
 if(blocked)x.w.cover.push({x:mouth.x,z:mouth.z+.5,hx:10,hz:.1,h:30,hp:100});else x.p.pos.z+=30;
 for(let i=0;i<25;i++)c.control(1/60);assert.equal(x.p.hp,hp,blocked?'wall occludes mouth contact':'target withdrew before contact');
 }finally{c?.dispose();x.close();}
 }
});
import {MeleeTrial} from '../src/engine/melee-trial.js';
import {requireRecordingModels} from '../src/engine/recording-models.js';
test('Threat Room creature start/clear and delayed cancellation retire native actor and replay uses hound',async()=>{
 const x=mainCombatFixture();let trial;try{
 x.g.ms.threatLab={state:'preparing'};trial=new MeleeTrial(x.g,new T.Vector3());
 const f=await trial.startCreature({loader});assert.equal(f._meleeTrial,trial);trial.recording.capture(0);assert.ok(trial.recording.actors[1].template.model.getObjectByName('nanite-jaw'));assert.equal(requireRecordingModels([f])[0].loadedCreature,true);
 const above=f.pos.clone().setY(f.bodyBounds.max.y+2);assert.equal(x.g.overlapShot(x.p,above,.1),null,'no standing humanoid hurt volume');
 trial.clear();assert.equal(x.g.entities.includes(f),false);assert.equal(f._creatureActor.root.parent,null);
 let resume;const gate=new Promise(r=>resume=r),pending=trial.startCreature({loader:{async loadAsync(url){await gate;return loader.loadAsync(url);}}});trial.clear();resume();assert.equal(await pending,null);assert.equal(trial.target,null);assert.equal(x.g.entities.length,1);
 }finally{trial?.dispose();x.close();}
});
