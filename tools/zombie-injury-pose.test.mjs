import test from 'node:test';
import assert from 'node:assert/strict';
import {Fighter} from '../src/engine/entity.js';
import {zombieDefinition} from '../src/data/zombie-encounter.js';
import {bendArm} from '../src/engine/hero-rig.js';
import {poseZombieInjuries} from '../src/engine/zombie-locational-damage.js';

for(const side of ['L','R'])test(`disabled ${side} arm drops its previous attack elbow pose`,()=>{
 const f=new Fighter(zombieDefinition());
 try{
  f._openSky=true;f._animate(0);
  const arm=f.parts['arm'+side],healthy=f.parts['arm'+(side==='L'?'R':'L')];
  bendArm(healthy,1);const healthyHand=healthy.children[2].position.clone();
  f._zombieLimbs={['arm'+side]:{disabled:true}};
  bendArm(arm,1.5);poseZombieInjuries(f);
  const first=arm.children[2].position.clone();
  bendArm(arm,.7);poseZombieInjuries(f);
  assert.ok(first.distanceTo(arm.children[2].position)<1e-8,'disabled hand depends on the last attack');
  assert.ok(arm.children[2].position.y<-(arm.userData.upperLength+arm.userData.foreLength)*.95,'disabled arm should hang near full extension');
  assert.ok(healthyHand.distanceTo(healthy.children[2].position)<1e-8,'healthy arm must retain its action');
 }finally{f.dispose();}
});
