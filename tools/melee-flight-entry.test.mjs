import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {performEvade} from '../src/engine/abilities.js';
function run(hz,dy=0,dodge=false,wall=false,drift=0){const x=mainCombatFixture({mode:'powerworld',hero:'sol'}),a=x.p,b=x.foe({y:40+dy,z:24});try{
 x.g.audio={...x.g.audio,yell(){}};x.g.vfx.impact=()=>{};x.g.vfx.impactStar=()=>{};a.pos.set(0,40,0);a._altTag=()=>{};
 for(const f of [a,b]){f._openSky=true;f._chaseKb=true;f.invuln=0;f.flying=true;f.hp=f.maxHp=1000;f.vel.set(0,0,0);f._sync();}
 if(wall)x.w.cover.push({x:0,z:12,hx:12,hz:2,bottom:0,top:100,h:100,finiteBuilding:true,projectileShape:'box'});
 b.vel.y=drift;
 a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.copy(a.aimWorld).sub(a.center(new THREE.Vector3())).normalize();a.aim.set(0,0,1);a.faceDir(0,1);b.faceDir(0,-1);
 for(let i=0;i<60;i++){a._updateGait(1/60);b._updateGait(1/60);a._animate(1/60);b._animate(1/60);}a._sync();b._sync();x.g.melee.chargeStart(a);x.g.melee.chargeRelease(a);const committed=a._meleeMotion.point.clone();if(drift)assert.ok(committed.distanceTo(b.center(new THREE.Vector3()))<=Math.abs(drift)*.6+.001,'Air lead must not promote drift to ground running speed');
 if(dodge)performEvade(b,{x:1,z:0},x.g);
 for(let i=0;i<hz;i++){const dt=1/hz;x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();a.move(new THREE.Vector3(),dt);b.move(new THREE.Vector3(),dt);a.update(dt,x.g);b.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();if(a._meleeMotion)assert.ok(a._meleeMotion.point.equals(committed));}
 return {damage:1000-b.hp,z:a.pos.z};
}finally{x.close();}}
for(const hz of [30,60,120])for(const dy of [-10,0,10])test('air entry connects height '+dy+' at '+hz+'Hz',()=>assert.ok(run(hz,dy).damage>0));
for(const hz of [30,60,120]){test('air dodge escapes at '+hz+'Hz',()=>assert.equal(run(hz,0,true).damage,0));test('air entry respects wall at '+hz+'Hz',()=>{const r=run(hz,0,false,true);assert.equal(r.damage,0);assert.ok(r.z<10);});}



for(const hz of [30,60,120])test('air entry follows observed descending drift at '+hz+'Hz',()=>assert.ok(run(hz,-10,false,false,-12).damage>0));
