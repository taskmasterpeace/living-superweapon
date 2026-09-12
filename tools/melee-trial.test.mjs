import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial} from '../src/engine/melee-trial.js';
test('trial replacement owns one native target; disposal preserves player',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));
 const a=t.start();assert.equal(x.g.entities.length,2);const b=t.start('retreat');assert.notEqual(a,b);assert.equal(x.g.entities.length,2);assert.ok(!x.g.entities.includes(a));
 const pos=b.pos.clone();t.control(b,1/60);assert.ok(b.vel.z>0);assert.ok(b.pos.equals(pos),'controller leaves translation to physics');
 t.hit(b,5,{src:x.p},false);assert.equal(t.records.length,1);t.dispose();assert.deepEqual(x.g.entities,[x.p]);
 }finally{x.close();}
});
test('guard trial uses native guard and rejects unknown scenarios',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const f=t.start('guard');t.control(f,1/60);assert.equal(f.guarding,true);assert.throws(()=>t.start('invalid'));assert.equal(t.target,f);t.dispose();}finally{x.close();}
});
test('repeat retains scenario and replaces damaged target without leaking unfinished attempts',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,15));const old=t.start('retreat');old.hp=1;t.attempt={contacts:0};const next=t.repeat();assert.equal(t.kind,'retreat');assert.equal(next.hp,next.maxHp);assert.equal(t.attempt,null);assert.equal(x.g.entities.length,2);t.dispose();}finally{x.close();}
});
test('lesson describes the actual RAGE tap instead of promising a jab combo',async()=>{const {meleeLesson}=await import('../src/engine/melee-trial.js');const x=mainCombatFixture({mode:'powerworld',hero:'rage'});try{assert.match(meleeLesson(x.p.def),/tap: heavy slam/);}finally{x.close();}});
