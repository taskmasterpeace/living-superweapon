import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';import {MeleeTrial} from '../src/engine/melee-trial.js';import {performEvade} from '../src/engine/abilities.js';
function run(hz,dodge=false,hero='rage',distance=20,startStill=false,delay=0,sign=1){const x=mainCombatFixture({mode:'powerworld',hero}),a=x.p,trial=new MeleeTrial(x.g,new THREE.Vector3(0,0,distance)),b=trial.start('retreat');try{
 x.g.audio={...x.g.audio,yell(){}};x.g.vfx.impact=()=>{};x.g.vfx.impactStar=()=>{};
 for(const f of [a,b]){f._openSky=true;f._chaseKb=true;f.invuln=0;f.gait='grounded';f.flying=false;f.hp=f.maxHp=1000;f._sync();}
 b.pos.z*=sign;b.vel.z=startStill?0:30*sign;a.hasAimWorld=true;b.center(a.aimWorld);a.aim3.set(0,0,sign);a.faceDir(0,sign);b.faceDir(0,-sign);
 for(let i=0;i<60;i++){a._animate(1/60);b._animate(1/60);}a._sync();b._sync();x.g.melee.chargeStart(a);x.g.melee.chargeRelease(a);const committed=a._meleeMotion.point.clone();
 if(dodge)performEvade(b,{x:1,z:0},x.g);
 for(let i=0;i<hz;i++){const dt=1/hz;x.g.melee.beginContactFrame();x.g.beginBodyContactFrame();a.move(new THREE.Vector3(),dt);b.move(new THREE.Vector3(0,0,dodge||i/hz<delay?0:sign),dt);a.update(dt,x.g);b.update(dt,x.g);x.g.resolveBodies();x.g.melee.endContactFrame();if(a._meleeMotion)assert.ok(a._meleeMotion.point.equals(committed));}
 return 1000-b.hp;
 }finally{x.close();}}
for(const hz of [20,30,60,120]){test('RAGE catches walking retreat with native contact at '+hz+'Hz',()=>assert.ok(run(hz)>0));test('post-commit sideways evade escapes at '+hz+'Hz',()=>assert.equal(run(hz,true),0));}




for(const hz of [20,30,60,120])for(const distance of [20,27]){test('WEBLINE catches retreat from '+distance+'u at '+hz+'Hz',()=>assert.ok(run(hz,false,'webline',distance)>0));test('WEBLINE committed pounce permits dodge from '+distance+'u at '+hz+'Hz',()=>assert.equal(run(hz,true,'webline',distance),0));}
for(const hz of [30,60,120])for(const [hero,distance]of [['sol',35],['webline',55],['rage',65],['jelani',50]]){
 test(`${hero} long approach catches retreat at ${distance}u / ${hz}Hz`,()=>assert.ok(run(hz,false,hero,distance)>0));
 test(`${hero} long approach allows sideways dodge at ${hz}Hz`,()=>assert.equal(run(hz,true,hero,distance),0));
}

test('retreat trainer starts walking before a long-range character commits',()=>{
 const x=mainCombatFixture({mode:'powerworld',hero:'jelani'});
 try{
  const trial=new MeleeTrial(x.g,new THREE.Vector3(0,0,50)),b=trial.start('retreat');
  b._openSky=true;b._chaseKb=true;b.gait='grounded';b.invuln=0;
  trial.control(b,1/30);
  assert.ok(b.vel.z>0,'trainer should retreat at 50u, not wait for the old 40u boundary');
 }finally{x.close();}
});

for(const hz of [30,60,120])for(const hero of ['jelani','sol','rage','webline']){
 test(hero+' catches retreat begun after commitment at '+hz+'Hz',()=>assert.ok(run(hz,false,hero,hero==='sol'?35:50,true)>0));
 test(hero+' still allows post-commit lateral dodge from rest at '+hz+'Hz',()=>assert.equal(run(hz,true,hero,30,true),0));
}

for(const hz of [30,60,120])test('JELANI retreat begins 50ms into startup at '+hz+'Hz',()=>assert.ok(run(hz,false,'jelani',50,true,.05)>0));

for(const hz of [15,20,24,30,60,120])for(const sign of [-1,1])test('late retreat frame and facing '+hz+'/'+sign,()=>assert.ok(run(hz,false,'jelani',50,true,.03,sign)>0));
for(const hz of [15,20,24])for(const sign of [-1,1])test('slow frame still permits lateral dodge '+hz+'/'+sign,()=>assert.equal(run(hz,true,'jelani',50,true,0,sign),0));
