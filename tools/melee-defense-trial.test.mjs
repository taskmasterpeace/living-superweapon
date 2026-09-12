import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial} from '../src/engine/melee-trial.js';

function setup(kind='guard'){
 const x=mainCombatFixture({mode:'powerworld',hero:'sol'}),t=new MeleeTrial(x.g,new THREE.Vector3(0,0,5)),b=t.start(kind);
 x.g.ms.threatLab={state:'preparing',meleeTrial:t};delete x.g.isFoe;x.g.onHit=(...args)=>t.hit(...args);x.g.audio={...x.g.audio,yell(){}};x.g.vfx.impact=x.g.vfx.impactStar=()=>{};
 for(const f of [x.p,b]){f._openSky=true;f._chaseKb=true;f.invuln=0;f.hasAimWorld=true;f.flying=false;f.gait='grounded';f._sync();}
 x.p.aim.set(0,0,1);x.p.aim3.set(0,0,1);b.aim.set(0,0,-1);b.aim3.set(0,0,-1);x.p.center(b.aimWorld);b.center(x.p.aimWorld);
 return {...x,t,b,finish(){t.dispose();x.close();}};
}
test('funded frontal block reports exact guard energy without inventing HP loss',()=>{
 const x=setup();try{const b=x.b;b.guarding=true;b.ki=b.maxKi;const hp=b.hp,ki=b.ki;b.takeDamage(20,{src:x.p,strike:true});
 const e=x.t.records.at(-1);assert.equal(e.result,'BLOCK');assert.equal(e.healthLost,0);assert.equal(b.hp,hp);assert.equal(e.guardEnergySpent,ki-b.ki);assert.ok(e.guardEnergySpent>0);
 assert.equal(x.t.recording.events.at(-1).result,'BLOCK');
 }finally{x.finish();}
});
test('empty guard reports break and unpaid damage rather than successful block',()=>{
 const x=setup();try{x.b.guarding=true;x.b.ki=1;x.b.armor=0;x.b.takeDamage(20,{src:x.p,strike:true});const e=x.t.records.at(-1);assert.equal(e.result,'GUARD BROKEN');assert.equal(e.guardEnergySpent,1);assert.ok(e.healthLost>0);assert.ok(x.b.staggerT>0);}finally{x.finish();}
});
test('defend trial delivers native punches which frontal guard can stop',()=>{
 const x=setup('defend');try{const p=x.p,b=x.b;const hp=p.hp;
 for(let i=0;i<240;i++){const dt=1/60;x.g.time=i*dt;x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();x.g.melee.guard(p,true);x.t.control(b,dt);p.move(new THREE.Vector3(),dt);p.update(dt,x.g);b.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();}
 assert.ok(x.t.records.some(e=>e.incoming&&e.result==='BLOCK'),'native attacker must actually contact the player');assert.equal(p.hp,hp);
 }finally{x.finish();}
});
test('native grab connects against guard and records hold without granting permanent control',()=>{
 const x=setup();try{x.b.guarding=true;x.g.melee.grab(x.p);for(let i=0;i<40&&!x.p.grabbing;i++){x.g.time+=1/60;x.g.melee.update(x.p,1/60);}
 assert.equal(x.p.grabbing,x.b);assert.equal(x.b.guarding,false);assert.ok(x.p.grabT>0&&x.p.grabT<=4);assert.ok(x.t.recording.events.some(e=>e.kind==='grab'));
 }finally{x.finish();}
});
test('only the active defend trainer can attack, and only its practicing player',()=>{
 const x=setup('defend');try{const ally=x.foe({z:10,team:0});assert.equal(x.g.isFoe(x.b,x.p),true);assert.equal(x.g.isFoe(x.b,ally),false);x.g.ms.threatLab.state='field';assert.equal(x.g.isFoe(x.b,x.p),false);x.g.ms.threatLab.state='preparing';x.t.kind='guard';assert.equal(x.g.isFoe(x.b,x.p),false);}finally{x.finish();}
});

