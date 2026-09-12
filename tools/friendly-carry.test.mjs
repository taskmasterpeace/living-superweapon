import test from 'node:test';import assert from 'node:assert/strict';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
for(const hz of [30,60,120])test(`friendly midair catch, nonviolent carry and safe release at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
  delete x.g.isFoe;x.p.team=1;x.p._openSky=true;x.p.pos.y=40;x.p.flying=true;
  const v=x.foe({z:4,y:40,team:1});v._openSky=true;v.vel.y=-60;v.launchT=1;v.thorns=30;v.teleEscape=true;v.invuln=0;
  v.def={...v.def,environment:{fallDamageScale:1,fallSafeSpeed:30}};
  const hp=v.hp,holderHp=x.p.hp;let disarmed=false;x.g.disarm=()=>{disarmed=true;};
  x.g.melee.grab(x.p);for(let i=0;i<Math.ceil(.2*hz);i++)x.g.melee.update(x.p,1/hz);
  assert.equal(x.p.grabbing,v);assert.equal(x.p._personCarry?.friendly,true);assert.equal(v.launchT,0);assert.equal(disarmed,false);
  x.g.melee.chargeStart(x.p);x.g.melee.chargeUpdate(x.p,.8);x.g.melee.chargeRelease(x.p);
  for(let i=0;i<hz*2;i++)x.g.melee.update(x.p,1/hz);
  assert.equal(x.p.grabbing,v);assert.equal(v.hp,hp);assert.equal(x.p.hp,holderHp);
  x.g.melee._throw(x.p);assert.equal(v.grabbedBy,null);assert.equal(v._thrownBy,null);assert.equal(v.hp,hp);
  v.flying=false;v.flyHeld=false;v.vel.y=-70;
  for(let i=0;i<hz*2;i++)v._physics(1/hz,x.g);
  assert.equal(v.hp,hp);assert.equal(v._friendlyLanding,false);assert.ok(v.pos.y<1);
 }finally{x.close();}
});
test('enemy hit retires friendly landing protection',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const v=x.foe();v.invuln=0;v._friendlyLanding=true;v.takeDamage(1,{src:x.p,hitstop:0});assert.equal(v._friendlyLanding,false);}finally{x.close();}
});

test('second player can leave friendly carry with the controller grab button',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});try{
  delete x.g.isFoe;x.p.team=1;const v=x.foe({z:4,team:1});v.invuln=0;
  x.g.melee.grab(x.p);for(let i=0;i<15;i++)x.g.melee.update(x.p,1/60);
  assert.equal(v.grabbedBy,x.p);x.pad.cur={grab:true};x.pad.prev={};
  x.g.controlPad(v,1/60);assert.equal(v.grabbedBy,null);assert.equal(x.p.grabbing,null);assert.equal(v._friendlyLanding,true);
 }finally{x.close();}
});
