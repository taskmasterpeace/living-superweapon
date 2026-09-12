import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
function leap(hz,hold,turn=false){const x=mainCombatFixture({mode:'powerworld',hero:'rage'});try{
 const f=x.p;x.w.ARENA=1800;f._openSky=true;f.ki=90;let peak=0;const dir=new THREE.Vector3(0,0,1),dt=1/hz;
 f.flyHeld=true;for(let i=0;i<Math.round(hold*hz);i++){f.move(dir,dt);f._physics(dt,x.g);}
 assert.equal(f.pos.y,0,'charge must stay grounded');f.flyHeld=false;f._physics(dt,x.g);const ki=f.ki;
 let frames=0;while(frames++<hz*5){f.move(turn?new THREE.Vector3(1,0,0):dir,dt);f._physics(dt,x.g);peak=Math.max(peak,f.pos.y);if(f.pos.y<=0)break;}
 assert.equal(f.flying,false);assert.equal(f.hp,f.maxHp);assert.ok(frames<hz*5);
 return {peak,distance:Math.hypot(f.pos.x,f.pos.z),ki,yaw:Math.atan2(f.vel.x,f.vel.z)};
 }finally{x.close();}}
for(const hz of [30,60,120])test(`RAGE charged native leap exceeds tap without flight at ${hz}Hz`,()=>{const tap=leap(hz,.1),full=leap(hz,.7);assert.ok(full.peak>tap.peak*2);assert.ok(full.distance>tap.distance*2);assert.equal(full.ki,66);assert.ok(tap.ki>66);assert.ok(Math.abs(leap(hz,.7,true).yaw)<=.301);console.log(hz,full);});
test('hit interruption retires traversal ownership',()=>{const x=mainCombatFixture({mode:'powerworld',hero:'rage'});try{const f=x.p;f._openSky=true;f.flyHeld=true;f._physics(.1,x.g);f.flyHeld=false;f._physics(.01,x.g);assert.ok(f._traversalLeap.active);f.launchT=1;f.move(new THREE.Vector3(),.01);assert.equal(f._traversalLeap,null);}finally{x.close();}});
