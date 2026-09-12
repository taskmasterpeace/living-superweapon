import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {MeleeTrial} from '../src/engine/melee-trial.js';import {performEvade} from '../src/engine/abilities.js';
function run(hz,dodge=false){const x=mainCombatFixture({mode:'powerworld',hero:'rage'}),a=x.p,trial=new MeleeTrial(x.g,new THREE.Vector3(0,0,20)),b=trial.start('retreat');try{
 x.g.audio={...x.g.audio,yell(){}};x.g.vfx.impact=()=>{};x.g.vfx.impactStar=()=>{};
 for(const f of [a,b]){f._openSky=true;f._chaseKb=true;f.invuln=0;f.gait='grounded';f.flying=false;f.hp=f.maxHp=1000;f._sync();}
 b.vel.z=30;a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.set(0,0,1);a.faceDir(0,1);b.faceDir(0,-1);
 for(let i=0;i<60;i++){a._animate(1/60);b._animate(1/60);}a._sync();b._sync();x.g.melee.chargeStart(a);x.g.melee.chargeRelease(a);const committed=a._meleeMotion.point.clone();
 if(dodge)performEvade(b,{x:1,z:0},x.g);
 for(let i=0;i<hz;i++){const dt=1/hz;x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();a.move(new THREE.Vector3(),dt);b.move(new THREE.Vector3(0,0,dodge?0:1),dt);a.update(dt,x.g);b.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();if(!dodge&&a.mstate==='active')console.log(JSON.stringify({i,pos:a.pos.toArray(),b:b.pos.toArray(),reach:a.pos.distanceTo(b.pos),fist:a.parts.armR.children[2].getWorldPosition(new THREE.Vector3()).toArray(),hp:b.hp}));if(a._meleeMotion)assert.ok(a._meleeMotion.point.equals(committed));}
 return 1000-b.hp;
 }finally{x.close();}}
for(const hz of [20]){test('RAGE catches walking retreat with native contact at '+hz+'Hz',()=>assert.ok(run(hz)>0));test('post-commit sideways evade escapes at '+hz+'Hz',()=>assert.equal(run(hz,true),0));}



