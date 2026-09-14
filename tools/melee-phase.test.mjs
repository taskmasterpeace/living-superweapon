import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {meleePhase,reviewStates} from '../src/engine/melee-phase.js';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {MeleeTrial} from '../src/engine/melee-trial.js';
test('phase priority exposes interruption and distinguishes combo permission from cooldown',()=>{
 assert.equal(meleePhase({state:'ko',mstate:'active'}).phase,'ko');
 assert.equal(meleePhase({grabbedBy:{},mstate:'active'}).phase,'held');
 assert.equal(meleePhase({stunT:.5,mstate:'startup'}).phase,'stunned');
 for(const [timer,phase]of [['sleepT','asleep'],['downedT','downed'],['shockT','shocked'],['staggerT','staggered']])assert.deepEqual(meleePhase({[timer]:.7,mstate:'active'}),{phase,remaining:.7});
 assert.deepEqual(meleePhase({mstate:'recover',mT:.2}),{phase:'recover',remaining:.2});
 assert.equal(meleePhase({strikeCd:.3,comboWin:.2}).phase,'combo');
 assert.equal(meleePhase({strikeCd:.3,comboWin:0}).phase,'cooldown');
 assert.equal(meleePhase({grabState:'clinch',grabMode:'friendly',grabT:8}).remaining,0);
});
test('contact between pose samples supplies current phase and energy without changing history',()=>{
 const frame={time:1,actors:[{phase:'guard',hp:100,ki:90},{phase:'startup',hp:100,ki:60}]};
 const events=[{time:1.01,kind:'contact',incoming:true,hp:100,playerKi:82},{time:1.01,kind:'phase',actor:1,phase:'staggered',remaining:.15}];
 const states=reviewStates(frame,events,1.01);assert.equal(states[0].ki,82);assert.equal(states[1].phase,'staggered');assert.equal(frame.actors[0].ki,90);assert.equal(reviewStates(frame,events,1)[1].phase,'startup');
});
test('trial captures both actors phase changes and native remaining timers',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,20)),f=t.start('defend');
  x.g.melee._beginStrike(f,'jab','jab',0,false);t.capture();
  const initial=f.mT;x.g.time+=.05;x.g.melee.update(f,.05);t.capture();
  assert.ok(t.recording.events.some(e=>e.actor===1&&e.phase==='startup'));
  assert.ok(t.recording.events.some(e=>e.actor===0&&e.phase==='ready'));
  assert.ok(t.recording.frames.at(-1).actors[1].remaining<=initial);
  f.stunT=.5;x.g.time+=.05;t.capture();assert.equal(t.recording.frames.at(-1).actors[1].phase,'stunned');
  t.repeat();x.g.time+=.05;t.capture();assert.ok(t.recording.events.some(e=>e.actor===1&&e.phase==='ready'));t.dispose();
 }finally{x.close();}
});

test('team contact updates teammate health rather than the opponent',()=>{
 const frame={time:1,actors:[{hp:100,ki:90},{hp:100,ki:60},{hp:100,ki:80}]};
 const result=reviewStates(frame,[{time:1.01,kind:'contact',actor:2,hp:72,playerKi:90}],1.01);
 assert.equal(result[1].hp,100);assert.equal(result[2].hp,72);assert.equal(frame.actors[2].hp,100);
});
