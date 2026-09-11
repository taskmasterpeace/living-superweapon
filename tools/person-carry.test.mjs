import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {SETTINGS,keymap} from '../src/core/settings.js';
import {personThrowCue} from '../src/engine/person-carry.js';

function fixture({hero='sol',height=0,hz=60}={}){
 const x=mainCombatFixture({hero,mode:'powerworld'});x.g.ms.chaseCam=true;x.p._openSky=true;x.p.invuln=0;
 x.g.vfx._itex=new THREE.Texture(); // Texture output only; native VFX/throw/damage remain active.
 x.g.audio={...x.g.audio,yell:()=>{}};
 const v=x.foe({z:4,y:height});v.invuln=0;v.faceDir(0,-1);x.p.pos.y=height;
 x.control(0);x.g.melee.grab(x.p);for(let i=0;i<Math.ceil(.2*hz);i++)x.g.melee.update(x.p,1/hz);
 assert.equal(x.p.grabbing,v,'Native grab failed');
 const tick=()=>{x.g.melee.update(x.p,1/hz);x.p._physics(1/hz,x.g);v._physics(1/hz,x.g);};
 return {...x,v,tick,hz,lift(){assert.equal(typeof x.g.melee.liftPerson,'function','Missing transport carry');return x.g.melee.liftPerson(x.p);}};
}
for(const hz of [30,60,120])test(`native grab transports both original fighters and takes off at ${hz} Hz`,()=>{
 const x=fixture({hz});try{
  const {p,v,g}=x,ids=[p,v],hp=v.hp,team=v.team;assert.equal(x.lift(),true);
  const before=v.pos.clone();p.flyHeld=true;p.toggleFlight();
  for(let i=0;i<hz;i++){p.move({x:0,y:.2,z:1},1/hz);x.tick();}
  assert.ok(p.pos.z>5,'Carrier remained rooted');assert.ok(p.pos.y>2,'Eligible carrier could not take off');
  assert.ok(v.pos.distanceTo(before)>5);assert.equal(p.grabbing,v);assert.equal(v.grabbedBy,p);
  assert.ok(v.pos.distanceTo(p.pos)<9);assert.equal(v.hp,hp,'Holding inflicted damage');assert.equal(v.team,team);
  assert.equal(g.entities.length,2);assert.equal(g.entities[0],ids[0]);assert.equal(g.entities[1],ids[1]);
 }finally{x.close();}
});
for(const hz of [30,60,120])test(`native whirl and 3D release feed exactly one credited wall impact at ${hz} Hz`,()=>{
 const x=fixture({hz,height:35});try{
  assert.equal(x.lift(),true);x.p.flying=true;x.p.gait='airborne';x.p.flyHeld=false;
  const before=x.v.pos.clone();x.g.melee.grab(x.p);
  for(let i=0;i<hz*.4;i++)x.tick();
  assert.ok(Math.abs(x.v.pos.x-before.x)>1,'Whirl did not move the actual victim');
  assert.ok(x.p._personCarry.whirlT<=1.2);
  x.p.aim3.set(0,-.2,1).normalize();const aim=x.p.aim3.clone(),at=x.v.pos.clone();
  x.g.melee.releaseGrab(x.p);assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);
  assert.ok(x.v.vel.angleTo(aim)<1e-7,'Fastthrow loft replaced the 3D aim');assert.ok(x.v.vel.length()>90&&x.v.vel.length()<=180);
  assert.ok(x.v.pos.distanceTo(at)<1e-7,'Release teleported the victim');
  x.w.cover.push({x:0,z:15,hx:30,hz:.03,top:100});
  let impacts=0;const original=x.g.onSlam;x.g.onSlam=function(...args){impacts++;return original.apply(this,args);};
  for(let i=0;i<hz;i++)x.v.update(1/hz,x.g);
  assert.equal(impacts,1);assert.equal(x.v.lastHitBy,x.p);assert.ok(x.v.pos.z<15);
 }finally{x.close();}
});

test('native grab release remains armed when cover arrests the whirl',()=>{
 const x=fixture({height:30});try{
  assert.equal(x.lift(),true);x.p.flying=true;x.p.gait='airborne';
  x.w.cover.push({x:3.1,z:0,hx:.05,hz:10,top:60});x.g.melee.grab(x.p);
  for(let i=0;i<30;i++)x.tick();
  assert.ok(x.v.pos.x+x.v.radius<3.06);x.g.melee.releaseGrab(x.p);
  assert.equal(x.p.grabbing===null,true,'Blocked whirl swallowed the release');assert.ok(x.v.launchT>0);
 }finally{x.close();}
});

test('native keyboard grab press/release whirls then throws a lifted person',()=>{
 const x=fixture();try{
  x.lift();const key=keymap(SETTINGS.scheme).grab||'KeyG';x.g.input.keys.add(key);x.g.input.justPressed.add(key);x.control(0);
  assert.equal(x.p._personCarry.whirling,true);x.g.input.endFrame();
  x.g.input.keys.delete(key);x.g.input.justReleased.add(key);x.control(0);assert.equal(x.p.grabbing===null,true);assert.ok(x.v.launchT>0);
 }finally{x.close();}
});

test('soldier selected RMB grab whirls/releases while G retains grenade ownership',()=>{
 const x=fixture({hero:'sarge'});try{
  x.v.def={...x.v.def,strength:1,hp:100,metal:false};x.p._tabMelee=true;x.p._selSlot='melee';x.p._selSecondary='grab';
  x.lift();x.g.input.justPressed.add('KeyG');x.control(0);assert.equal(x.p._personCarry.whirling,false);
  x.g.input.endFrame();x.g.input.mouse.right=x.g.input.mouse.rightEdge=true;x.control(.16);assert.equal(x.p._personCarry.whirling,true);
  x.g.input.endFrame();x.g.input.mouse.right=false;x.g.input.mouse.rightUp=true;x.control(0);assert.equal(x.p.grabbing===null,true);assert.ok(x.v.launchT>0);
 }finally{x.close();}
});

test('front escape keeps its original midpoint after transport extends the cap',()=>{
 const x=fixture();try{
  x.v.teleEscape=true;x.v.ki=100;x.p._victimEscape=true;const original=x.p._clinchEscapeAt;
  x.lift();assert.ok(x.p.grabT<=8);while(x.p._clinchElapsed<original&&x.p.grabbing)x.tick();
  assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);
 }finally{x.close();}
});

test('lost holder target clears the original victim identity rather than orphaning it',()=>{
 const x=fixture();try{x.lift();x.p.grabbing=null;x.tick();assert.equal(x.v.grabbedBy===null,true);assert.equal(x.p._personCarry,null);}finally{x.close();}
});

test('a later independent launch retires the previous carry impact token',()=>{
 const x=fixture({height:30});try{
  x.lift();x.g.melee.grab(x.p);x.g.melee.releaseGrab(x.p);x.v._personThrow.impacted=true;
  x.v.takeDamage(1,{src:x.p,kb:{x:70,z:0},hitstop:0});assert.equal(x.v._personThrow===null,true);assert.ok(x.v.launchT>0);
 }finally{x.close();}
});

for(const boundary of ['blur','pause','owner'])test(`${boundary} releases carried identity`,()=>{
 const x=fixture();try{
  x.lift();if(boundary==='blur'){x.g.input.cancelVersion++;x.tick();}
  if(boundary==='pause'){x.g.running=false;x.g.prepareCombatView(0);}
  if(boundary==='owner')x.g.retireCombatViewInput(x.p);
  assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);assert.equal(x.p._personCarry,null);
 }finally{x.close();}
});

test('native carry direction cue clips the full body at cover and survives Alt without redirecting',()=>{
 const x=fixture({height:30});try{
  x.lift();x.tick();x.p.aim3.set(0,0,1);x.w.cover.push({x:0,z:15,hx:30,hz:.03,top:100});
  const cue=personThrowCue(x.p,x.g);assert.equal(cue.blocked,true);assert.ok(Math.abs(cue.end.z-(14.97-x.v.radius))<1e-6);
  x.g._buildThrowArc();x.g.updateThrowArc();assert.equal(x.g.throwArc.visible,true);
  assert.ok(x.g._arcDots.at(-1).position.clone().setY(cue.end.y).distanceTo(cue.end)<1e-6);
  x.control(0);const original=x.p.aim3.clone(),originalCue=personThrowCue(x.p,x.g);x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=200;x.control(0);
  assert.ok(x.p.aim3.angleTo(original)<1e-6);const after=personThrowCue(x.p,x.g);assert.ok(after.end.distanceTo(originalCue.end)<1e-6);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`native downward release strikes real terrain once at ${hz} Hz`,()=>{
 const x=fixture({hz,height:8});try{
  x.lift();x.tick();x.p.aim3.set(0,-1,0);x.g.melee.grab(x.p);x.g.melee.releaseGrab(x.p);
  let hits=0;const original=x.g.onSlam;x.g.onSlam=function(...args){hits++;return original.apply(this,args);};
  for(let i=0;i<hz;i++)x.v.update(1/hz,x.g);
  assert.equal(hits,1);assert.equal(x.v.lastHitBy,x.p);assert.ok(x.v.pos.y>=0);assert.equal(x.v.grabbedBy===null,true);
 }finally{x.close();}
});
test('native J lifts and sets down without changing the normal grab action',()=>{
 const x=fixture();try{
  x.g.input.justPressed.add('KeyJ');x.control(0);assert.ok(x.p._personCarry,'J did not lift');
  x.g.input.endFrame();x.g.input.justPressed.add('KeyJ');x.control(0);
  assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);assert.equal(x.p._personCarry,null);
  assert.ok(Math.abs(x.v.pos.y)<1e-6);assert.equal(x.v.launchT,0);assert.ok(x.v.vel.length()<1e-6);
 }finally{x.close();}
});
test('ground-only soldier can carry an admitted person but never acquires flight',()=>{
 const x=fixture({hero:'sarge'});try{
  // Admission depends on mass; use an ordinary human victim instead of granting lift.
  x.v.def={...x.v.def,strength:1,hp:100,metal:false};
  assert.equal(x.lift(),true);x.p.toggleFlight();x.p.flyHeld=true;
  for(let i=0;i<20;i++)x.tick();assert.equal(x.p.flying,false);assert.equal(x.p.flightTier,0);
 }finally{x.close();}
});
test('insufficient lift denies transport without destroying the combat clinch',()=>{
 const x=fixture({hero:'sarge'});try{
  x.v.def={...x.v.def,strength:10,hp:10000,metal:true};const remaining=x.p.grabT;
  assert.equal(x.lift(),false);assert.equal(x.p.grabbing,x.v);assert.equal(x.p.grabT,remaining);assert.equal(x.p._personCarry??null,null);
 }finally{x.close();}
});
for(const hz of [30,60,120])test(`victim clearance stops the combined pair at a thin wall at ${hz} Hz`,()=>{
 const x=fixture({hz,height:30});try{
  assert.equal(x.lift(),true);x.w.cover.push({x:0,z:15,hx:20,hz:.05,top:70});
  x.p.flying=true;x.p.gait='airborne';
  for(let i=0;i<hz;i++){x.p.vel.set(0,0,130);x.tick();assert.ok(x.v.pos.z+x.v.radius<=14.951,`victim crossed at ${x.v.pos.z}`);}
  assert.ok(x.p.pos.z<12);assert.equal(x.p.grabbing,x.v);
 }finally{x.close();}
});
test('cover between close fighters prevents native grab admission',()=>{
 const x=mainCombatFixture({hero:'sol'});try{
  x.p.invuln=0;const v=x.foe({z:4});v.invuln=0;x.w.cover.push({x:0,z:2,hx:4,hz:.1,top:15});
  x.g.melee.grab(x.p);for(let i=0;i<30;i++)x.g.melee.update(x.p,1/120);
  assert.equal(x.p.grabbing===null,true);assert.equal(v.grabbedBy,null);
 }finally{x.close();}
});
test('transport admission cannot refresh its original bounded hostile restraint',()=>{
 const x=fixture();try{
  assert.equal(x.lift(),true);const t=x.p.grabT;
  for(let i=0;i<120;i++){x.g.melee.liftPerson(x.p);x.tick();}
  assert.ok(x.p.grabT<t-1.9,'Repeated activation refreshed restraint');
  for(let i=0;i<500&&x.p.grabbing;i++)x.tick();assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);
 }finally{x.close();}
});
for(const why of ['depletion','holder-hit','victim-KO','holder-dispose','victim-dispose','victim-release'])test(`${why} releases identity links and carry speed penalty`,()=>{
 const x=fixture();try{
  assert.equal(x.lift(),true);
  if(why==='depletion'){x.p.ki=0;x.tick();}
  if(why==='holder-hit')x.p.takeDamage(2,{src:x.v,strike:true});
  if(why==='victim-KO')x.v._ko();
  if(why==='holder-dispose')x.p.dispose();
  if(why==='victim-dispose')x.v.dispose();
  if(why==='victim-release')x.g.melee.release(x.v);
  assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);assert.equal(x.p._personCarry,null);
 }finally{x.close();}
});
