import test from 'node:test';
import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';

test('soldier G throws the equipped grenade without selecting it or starting a grab',()=>{
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'});try{
  x.g.ms.chaseCam=true;x.p._openSky=true;x.control(0);x.p._selSlot='lmb';
  x.g.input.justPressed.add('KeyG');x.g.input.keys.add('KeyG');x.control(1/60);
  assert.equal(x.p._throwAction?.slot,x.p.slots.rmb,'G did not dispatch the equipped grenade');
  for(let i=0;i<45;i++){x.p.advanceActionPose(1/60);x.p._animate(1/60);x.g.projectiles.resolveLaunches(x.g);}
  assert.equal(x.g.projectiles.list.length,1);
  assert.equal(x.p._selSlot,'lmb');assert.ok(!x.p.grabState&&!x.p.grabbing);
  x.g.input.endFrame();x.control(1/60);assert.equal(x.g.projectiles.list.length,1,'Held G repeats quick throws');
 }finally{x.close();}
});

test('soldier Q activates carried jump jets once without firing the blade ability',()=>{
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'});try{
  x.g.ms.chaseCam=true;x.p._openSky=true;x.control(0);const charges=x.p.items[0].charges;
  x.g.input.justPressed.add('KeyQ');x.g.input.keys.add('KeyQ');x.control(1/60);
  assert.ok(x.p._jetT>0,'Q did not activate carried equipment');
  assert.equal(x.p.items[0].charges,charges-1);assert.equal(x.p.slots.q.cd,0,'Gadget key also fired blade');
  x.g.input.endFrame();x.control(1/60);assert.equal(x.p.items[0].charges,charges-1);
 }finally{x.close();}
});

test('quick throw follows authored grenade slot and respects raised guard',()=>{
 const x=mainCombatFixture({hero:'sarge',mode:'powerworld'});try{
  x.g.ms.chaseCam=true;x.p._openSky=true;x.control(0);
  [x.p.slots.q,x.p.slots.rmb]=[x.p.slots.rmb,x.p.slots.q];
  x.g.input.mouse.b3=true;x.g.input.justPressed.add('KeyG');x.control(1/60);
  assert.equal(x.g.projectiles.list.length,0,'Quick grenade bypassed guard/action rules');
  x.g.input.endFrame();x.g.input.mouse.b3=false;x.g.input.justPressed.add('KeyG');x.control(1/60);
  assert.equal(x.p._throwAction?.slot,x.p.slots.q,'Quick throw assumed RMB rather than the authored throwable');
  for(let i=0;i<45;i++){x.p.advanceActionPose(1/60);x.p._animate(1/60);x.g.projectiles.resolveLaunches(x.g);}
  assert.equal(x.g.projectiles.list.length,1);
 }finally{x.close();}
});
