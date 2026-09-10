import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {Weather} from '../src/engine/systems.js';
import {setSize} from '../src/engine/systems.js';
import {profileFromDef,applyProfile} from '../src/tool/studio-profile.js';
import {prepareWindBody} from '../src/engine/weather-body.js';
import {WeatherVortex} from '../src/engine/weather-vortex.js';
import {windShelter} from '../src/engine/weather-body.js';

function setup(hero='sarge',state='storm'){
 const x=mainCombatFixture({hero});x.p._openSky=true;x.p.onFoot=true;x.p._chaseKb=true;
 x.g.weather=new Weather(x.g);x.g.weather.set(state,{instant:true});x.g.weather.windDir=0;
 // Observe native damage; omit only the canvas/WebGL impact presentation.
 x.g.onSlam=(f,damage,kind)=>{x.lastSlam={damage,kind};};
 const close=x.close;x.close=()=>{x.g.weather.reset();close();};return x;
}
test('a soldier falling without an attacker suffers speed-based landing damage',()=>{
 const x=setup();try{
  const f=x.p,hp=f.hp;f.launchT=0;f.lastHitBy=null;f.pos.y=80;f.vel.y=0;
  for(let i=0;i<180&&f.alive&&f.pos.y>0;i++)f._physics(1/60,x.g);
  assert.ok(f.hp<hp,'ordinary falls still require an attacker launch timer');
 }finally{x.close();}
});
test('soldier normal jump and combat leap landing remain safe',()=>{
 const x=setup();try{
  for(const speed of [26,49]){x.p._slamCd=0;const hp=x.p.hp;x.p._slam(x.g,speed,'ground');assert.equal(x.p.hp,hp);}
 }finally{x.close();}
});

test('low-speed combat landings keep their pre-weather damage threshold',()=>{
 const x=setup('sol','clear');try{
  x.p.launchT=2;x.p.pos.y=8;const hp=x.p.hp;
  for(let i=0;i<120&&x.p.pos.y>0;i++)x.p._physics(1/60,x.g);
  assert.equal(x.p.hp,hp,'authored fall admission changed existing combat slam tuning');
 }finally{x.close();}
});
test('airborne soldier control cannot clamp away gravity or the resulting fall injury',()=>{
 const x=setup('sarge','clear');try{
  x.p.pos.y=100;const hp=x.p.hp;let peakSpeed=0;
  for(let i=0;i<240&&x.p.alive&&x.p.pos.y>0;i++){
   x.p.move(new THREE.Vector3(0,0,1),1/60);peakSpeed=Math.max(peakSpeed,-x.p.vel.y);x.p._physics(1/60,x.g);
  }
  assert.ok(peakSpeed>56,`air control capped the fall at ${peakSpeed}`);assert.ok(x.p.hp<hp);
 }finally{x.close();}
});
test('rain crosswind cannot claim a self-powered flight collision on the other axis',()=>{
 const x=setup('sol','rain');try{
  x.p.pos.set(0,30,0);x.p.flying=true;x.p.gait='airborne';x.p.vel.set(0,0,100);
  x.w.cover.push({x:0,z:10,hx:20,hz:2,top:80});const hp=x.p.hp;x.p._physics(.1,x.g);
  assert.equal(x.p.hp,hp,'mere wind exposure authorized a self-powered wall slam');
 }finally{x.close();}
});
test('authored low fall threshold is honored by actual terrain contact',()=>{
 const x=setup('sarge','clear');try{
  x.p.def.environment={fallSafeSpeed:30,fallDamageScale:1};x.p.pos.y=8;const hp=x.p.hp;
  for(let i=0;i<120&&x.p.pos.y>0;i++)x.p._physics(1/60,x.g);
  assert.ok(x.p.hp<hp,'landing admission discarded the authored threshold');
 }finally{x.close();}
});

test('wind-carried soldier striking a downwind wall still suffers a slam',()=>{
 const x=setup('sarge','hurricane');try{
  x.w.cover.push({x:100,z:0,hx:2,hz:100,top:90});const hp=x.p.hp;
  for(let i=0;i<360&&x.p.hp===hp;i++)x.p._physics(1/60,x.g);
  assert.ok(x.p.hp<hp,'wind transport lost impact ownership');
  assert.equal(x.lastSlam.kind,'wall');
 }finally{x.close();}
});
test('saving an untouched Studio profile preserves Size Change wind response',()=>{
 const x=setup('sarge','hurricane');try{
  setSize(x.p,2);const before=prepareWindBody(x.p,x.g).pressure;
  x.p.def=applyProfile(x.p.def,profileFromDef(x.p.def));const after=prepareWindBody(x.p,x.g).pressure;
  assert.equal(after,before,'authored base mass bypassed dynamic size scaling');
 }finally{x.close();}
});

test('stopping after a gust clears its ownership before subsequent powered travel',()=>{
 const x=setup('sarge','hurricane');try{
  x.p.pos.y=30;x.p.flying=true;x.p.gait='airborne';
  for(let i=0;i<90;i++)x.p._physics(1/60,x.g);
  x.g.weather.set('clear',{instant:true});x.p.vel.set(0,0,0);x.p._physics(1/60,x.g);
  x.w.cover.push({x:x.p.pos.x+10,z:0,hx:2,hz:100,top:90});
  x.p.vel.set(100,0,0);const hp=x.p.hp;x.p._physics(.1,x.g);
  assert.equal(x.p.hp,hp,'old wind momentum survived a full stop');
 }finally{x.close();}
});
test('hero fall vulnerability is explicit and independent from strength or flight ability',()=>{
 const x=setup('vega');try{
  const hp=x.p.hp;x.p._slam(x.g,85,'ground');assert.equal(x.p.hp,hp);
  x.p.def.environment={fallDamageScale:.5,fallSafeSpeed:56};x.p._slam(x.g,85,'ground');
  assert.ok(x.p.hp<hp,'opt-in fall vulnerability did nothing');
 }finally{x.close();}
});
test('wind pushes a grounded soldier but not an equally exposed powerful hero as far',()=>{
 const a=setup(),b=setup('sol');try{
  for(let i=0;i<180;i++){a.p._physics(1/60,a.g);b.p._physics(1/60,b.g);}
  assert.ok(a.p.pos.x>3,`soldier ignored storm: ${a.p.pos.x}`);
  assert.ok(b.p.pos.x<a.p.pos.x*.3,'superhuman resistance not expressed');
 }finally{a.close();b.close();}
});
test('severe headwind defeats a soldier walking upstream instead of being erased by the movement clamp',()=>{
 const x=setup('sarge','hurricane');try{
  for(let i=0;i<180;i++){x.p.move(new THREE.Vector3(-1,0,0),1/60);x.p._physics(1/60,x.g);}
  assert.ok(x.p.pos.x>2,`soldier could walk straight through hurricane: ${x.p.pos.x}`);
 }finally{x.close();}
});
test('prone footing and upwind shelter reduce ground displacement',()=>{
 const standing=setup(),prone=setup(),sheltered=setup();prone.p.prone=true;
 sheltered.w.cover.push({x:-25,z:0,hx:3,hz:50,top:30});
 try{
  for(let i=0;i<180;i++)for(const x of [standing,prone,sheltered])x.p._physics(1/60,x.g);
  assert.ok(standing.p.pos.x>3);assert.ok(prone.p.pos.x<standing.p.pos.x*.3);assert.ok(sheltered.p.pos.x<standing.p.pos.x*.3);
 }finally{standing.close();prone.close();sheltered.close();}
});

test('wind has comparable displacement at 30 and 120 Hz',()=>{
 const a=setup(),b=setup();try{
  for(let i=0;i<90;i++)a.p._physics(1/30,a.g);
  for(let i=0;i<360;i++)b.p._physics(1/120,b.g);
  assert.ok(Math.abs(a.p.pos.x-b.p.pos.x)<a.p.pos.x*.08);
 }finally{a.close();b.close();}
});
test('destroyed cover stops sheltering and downwind cover never shelters',()=>{
 const x=setup();try{
  x.w.cover.push({x:25,z:0,hx:3,hz:50,top:30});assert.equal(windShelter(x.w,x.p.pos,1,0),1);
  x.w.cover[0].x=-25;assert.ok(windShelter(x.w,x.p.pos,1,0)<1);
  x.w.cover[0].destroyed=true;assert.equal(windShelter(x.w,x.p.pos,1,0),1);
 }finally{x.close();}
});
test('fall and enemy slam use one damage event, never two additive penalties',()=>{
 const x=setup();try{
  x.p.launchT=2;let calls=0,amount=0;x.p.takeDamage=d=>{calls++;amount=d;};
  x.p._slam(x.g,80,'roof');assert.equal(calls,1);assert.ok(Math.abs(amount-114.24)<1e-8);
  x.p._slam(x.g,80,'ground');assert.equal(calls,1,'same impact was charged twice');
 }finally{x.close();}
});
test('tornado lifts a native soldier, release preserves the fall and landing hurts',()=>{
 const x=setup('sarge','tornado');try{
  x.g.weather._vortex=new WeatherVortex(x.g,{x:0,z:0,radius:65,height:150});x.g.weather._vortex.update(8);
  x.p.pos.set(35,0,0);const hp=x.p.hp;let peak=0;
  for(let i=0;i<240&&x.p.alive;i++){x.p._physics(1/60,x.g);peak=Math.max(peak,x.p.pos.y);}
  assert.ok(peak>35,`no meaningful lift: ${peak}`);
  x.g.weather.clear();x.g.weather.wind=0;
  for(let i=0;i<300&&x.p.alive&&x.p.pos.y>0;i++)x.p._physics(1/60,x.g);
  assert.ok(x.p.hp<hp,'lift and ejection never produced landing injury');
 }finally{x.close();}
});
