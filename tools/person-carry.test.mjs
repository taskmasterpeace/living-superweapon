import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {SETTINGS,keymap} from '../src/core/settings.js';
import {previewPersonThrow} from '../src/engine/person-throw-trajectory.js';

function finishThrow(x){for(let i=0;i<Math.ceil(.2*x.hz)+1&&x.p._personThrowWindup;i++)x.g.melee.update(x.p,1/x.hz);}
function fixture({hero='sol',height=0,hz=60,victimTraits={},rear=false}={}){
 const x=mainCombatFixture({hero,mode:'powerworld'});x.g.ms.chaseCam=true;x.p._openSky=true;x.p.invuln=0;
 x.g.vfx._itex=new THREE.Texture(); // Texture output only; native VFX/throw/damage remain active.
 x.g.audio={...x.g.audio,yell:()=>{}};
 const v=x.foe({z:4,y:height});Object.assign(v,victimTraits);v.invuln=0;v.faceDir(0,rear?1:-1);x.p.pos.y=height;
 x.control(0);x.g.melee.grab(x.p);for(let i=0;i<Math.ceil(.2*hz);i++)x.g.melee.update(x.p,1/hz);
 assert.equal(x.p.grabbing,v,'Native grab failed');
 const tick=()=>{x.g.melee.update(x.p,1/hz);x.p._physics(1/hz,x.g);v._physics(1/hz,x.g);};
 return {...x,v,tick,hz,lift(){assert.equal(typeof x.g.melee.liftPerson,'function','Missing transport carry');return x.g.melee.liftPerson(x.p);}};
}
for(const hz of [30,60,120])test(`rear aerial capture preserves downward throw aim at ${hz} Hz`,()=>{
 const x=fixture({hz,height:35,rear:true});
 try{
  assert.equal(x.p.grabMode,'back');assert.equal(x.lift(),true);
  x.p.flying=true;x.p.gait='airborne';x.p.aim3.set(.2,-1,.1).normalize();
  x.g.melee.grab(x.p);const before=x.v.pos.clone();
  x.g.melee.releaseGrab(x.p);finishThrow(x);
  assert.equal(x.p.grabbing,null);assert.equal(x.v.grabbedBy,null);
  assert.ok(x.v.vel.y<0);assert.ok(x.v.vel.angleTo(x.p.aim3)<1e-7);
  assert.ok(x.v.pos.distanceTo(x.p.pos)<10,'windup retains held position');
 }finally{x.close();}
});
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
  x.g.melee.releaseGrab(x.p);finishThrow(x);assert.equal(x.p.grabbing===null,true);assert.equal(x.v.grabbedBy===null,true);
  assert.ok(x.v.vel.angleTo(aim)<1e-7,'Fastthrow loft replaced the 3D aim');assert.ok(x.v.vel.length()>90&&x.v.vel.length()<=180);
  assert.ok(x.v.pos.distanceTo(x.p.pos)<10,'windup retains held position');
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
  assert.ok(x.v.pos.x+x.v.radius<3.06);x.g.melee.releaseGrab(x.p);finishThrow(x);
  assert.equal(x.p.grabbing===null,true,'Blocked whirl swallowed the release');assert.ok(x.v.launchT>0);
 }finally{x.close();}
});

for(const hero of ['sol','sarge'])test(hero+' contextual E hold whirls and releases through native controls',()=>{
 const x=fixture({hero});try{
  if(hero==='sarge')x.v.def={...x.v.def,weightLb:131,strength:1,hp:100,metal:false};
  x.lift();x.g.input.keys.add('KeyE');x.g.input.justPressed.add('KeyE');x.control(.1);x.g.input.endFrame();
  x.control(.1);x.g.input.endFrame();x.control(.1);assert.equal(x.p._personCarry.whirling,true);x.g.input.endFrame();
  x.g.input.keys.delete('KeyE');x.g.input.justReleased.add('KeyE');x.control(0);finishThrow(x);assert.equal(x.p.grabbing,null);assert.ok(x.v.launchT>0);
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
  x.lift();x.g.melee.grab(x.p);x.g.melee.releaseGrab(x.p);finishThrow(x);x.v._personThrow.impacted=true;
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
  const cue=previewPersonThrow(x.p,x.g);assert.equal(cue.contact,true);assert.ok(Math.abs(cue.points.at(-1).z-(14.97-x.v.radius))<2e-5);
  x.g._buildThrowArc();x.g.updateThrowArc();assert.equal(x.g.throwArc.visible,true);
  assert.ok(x.g._arcDots.at(-1).position.clone().setY(cue.points.at(-1).y).distanceTo(cue.points.at(-1))<1e-6);
  x.control(0);const original=x.p.aim3.clone(),originalCue=previewPersonThrow(x.p,x.g);x.g.input.keys.add('AltLeft');x.g.input.mouse.dx=200;x.control(0);
  assert.ok(x.p.aim3.angleTo(original)<1e-6);const after=previewPersonThrow(x.p,x.g);assert.ok(after.points.at(-1).distanceTo(originalCue.points.at(-1))<1e-6);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`native downward release strikes real terrain once at ${hz} Hz`,()=>{
 const x=fixture({hz,height:8});try{
  x.lift();x.tick();x.p.aim3.set(0,-1,0);x.g.melee.grab(x.p);x.g.melee.releaseGrab(x.p);finishThrow(x);
  let hits=0;const original=x.g.onSlam;x.g.onSlam=function(...args){hits++;return original.apply(this,args);};
  for(let i=0;i<hz;i++)x.v.update(1/hz,x.g);
  assert.equal(hits,1);assert.equal(x.v.lastHitBy,x.p);assert.ok(x.v.pos.y>=0);assert.equal(x.v.grabbedBy===null,true);
 }finally{x.close();}
});
test('opening a menu preserves carry across the next simulation tick while disarming throw',()=>{
 const x=fixture();try{x.lift();x.g.melee.grab(x.p);x.g.retireCombatViewInput(x.p,{preserveCarry:true});x.tick();
  assert.equal(x.p.grabbing,x.v);assert.equal(x.v.grabbedBy,x.p);assert.equal(x.p._personCarry.whirling,false);assert.equal(x.p._personCarry.throwArmed,false);
 }finally{x.close();}
});

for(const canPhase of [false,true])test(`front teleport escape rechecks its energy; phase fallback=${canPhase}`,()=>{
 const x=fixture({victimTraits:{teleEscape:true,canPhase,ki:100}});try{
  assert.equal(x.p._victimEscape,true,'Front contact must admit the trait escape');
  x.lift();x.v.ki=5;const midpoint=x.p._clinchEscapeAt;
  for(let i=0;i<300&&x.p._clinchElapsed<=midpoint&&x.p.grabbing;i++)x.tick();
  assert.ok(!x.p.grabbing||x.p._clinchElapsed>=midpoint,'Escape clock must reach its midpoint');
  assert.equal(x.v.ki,5,'Failed teleport cannot spend unavailable energy');
  if(canPhase){assert.equal(x.p.grabbing,null);assert.ok(x.v.invuln>0);}
  else{
   assert.equal(x.p.grabbing===x.v,true,'Insufficient teleport energy must not grant an unauthored phase escape');
   assert.equal(x.v.invuln,0);
   for(let i=0;i<600&&x.p.grabbing;i++)x.tick();
   assert.equal(x.p.grabbing,null,'Ordinary bounded restraint must still expire');
   assert.equal(x.v.grabbedBy,null);
  }
 }finally{x.close();}
});

test('lifting a locked victim hands throw aiming back to the camera',()=>{
 const x=fixture({height:30});try{
  x.g.hardLock=x.v;x.g.lockTarget=x.v;x.lift();
  assert.equal(x.g.hardLock===null,true,'Carried victim retained camera lock');
  x.g.hardLock=x.v;x.g.validateLock(x.p);
  assert.equal(x.g.hardLock===null,true,'Carried victim could be re-acquired');
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
  x.v.def={...x.v.def,weightLb:20000,strength:10,hp:10000,metal:true};const remaining=x.p.grabT;
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

for(const hz of [30,60,120])for(const wall of [false,true])test('person trajectory matches native first impact '+hz+'Hz wall='+wall,async()=>{
 const {previewPersonThrow}=await import('../src/engine/person-throw-trajectory.js');const x=fixture({height:35,hz});try{assert.ok(x.lift());x.v.hp=10000;x.p.aim3.set(0,wall?0:-.65,1).normalize();if(wall)x.w.cover.push({x:0,z:22,hx:40,hz:.1,bottom:0,top:90,finiteBuilding:true});
 const before={pos:x.v.pos.toArray(),vel:x.v.vel.toArray(),ki:x.p.ki,hp:x.v.hp};let cue=previewPersonThrow(x.p,x.g,{dt:1/hz});assert.ok(cue.contact);assert.deepEqual({pos:x.v.pos.toArray(),vel:x.v.vel.toArray(),ki:x.p.ki,hp:x.v.hp},before);
 let impact;const original=x.g.onSlam;x.g.onSlam=function(f,...args){impact??=f.pos.clone();return original.call(this,f,...args);};const commit=x.g.melee._commitThrow.bind(x.g.melee);x.g.melee._commitThrow=f=>{cue=previewPersonThrow(f,x.g,{dt:1/hz});return commit(f);};x.g.melee._throw(x.p);finishThrow(x);
 for(let i=0;i<hz*1.35&&!impact;i++)x.v.update(1/hz,x.g);assert.ok(impact,'no native impact');assert.ok(cue.points.at(-1).distanceTo(impact)<1.5,'preview/native error '+cue.points.at(-1).distanceTo(impact));
 }finally{x.close();}
});

test('trajectory samples wind/gravity without changing field state and stops at recovery',()=>{
 const x=fixture({height:200});try{x.lift();x.p.aim3.set(0,1,0);x.g.gravityZones={gravityFor:()=>-1};x.g.weather={wind:1,windSpeed:30,windDir:0};
 const fields=JSON.stringify(x.g.weather),before=x.v.pos.clone(),cue=previewPersonThrow(x.p,x.g);assert.equal(cue.contact,false);assert.equal(cue.reason,'CONTROL RECOVERY');assert.ok(cue.points.at(-1).y>before.y);assert.ok(cue.points.at(-1).x>before.x);assert.equal(JSON.stringify(x.g.weather),fields);assert.ok(x.v.pos.equals(before));
 }finally{x.close();}
});
test('potential fatal release does not claim an ordinary body trajectory',()=>{
 const x=fixture({height:30});try{x.lift();x.v.hp=1;const cue=previewPersonThrow(x.p,x.g);assert.equal(cue.contact,false);assert.equal(cue.points.length,1);assert.equal(cue.reason,'RELEASE MAY KO');}finally{x.close();}
});

test('a missed grab commits a short forward step',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});
 try{
  x.p.aim3.set(0,0,1);x.p.aim.set(0,0,1);const z=x.p.pos.z;
  x.g.melee.grab(x.p);x.g.melee.update(x.p,.09);
  assert.ok(x.p.pos.z>z,'grab should move forward');assert.ok(x.p.pos.z-z<=1.5);
 }finally{x.close();}
});

test('grab approach cannot step through a thin wall',()=>{
 const x=mainCombatFixture({hero:'sol',mode:'powerworld'});
 try{
  x.p.aim3.set(0,0,1);x.p.aim.set(0,0,1);const z=x.p.pos.z;
  x.w.cover.push({x:x.p.pos.x,z:z+x.p.radius+.2,hx:20,hz:.03,top:100});
  x.g.melee.grab(x.p);x.g.melee.update(x.p,.18);
  assert.ok(x.p.pos.z-z<=.17+1e-6);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`repeated grab input cannot multiply a carried throw at ${hz}Hz`,()=>{
 const x=fixture({hz,height:35,rear:true});try{
  assert.equal(x.lift(),true);const hold=x.p.grabT;
  for(let i=0;i<12;i++)x.g.melee.grab(x.p);
  assert.equal(x.p.grabT,hold,'Spam must not extend restraint');
  x.p.aim3.set(0,-1,0);x.g.melee.releaseGrab(x.p);finishThrow(x);
  const velocity=x.v.vel.clone(),hp=x.v.hp;
  for(let i=0;i<12;i++){x.g.melee.grab(x.p);x.g.melee.releaseGrab(x.p);finishThrow(x);}
  assert.equal(x.v.grabbedBy,null);assert.ok(x.v.vel.equals(velocity));assert.equal(x.v.hp,hp);
 }finally{x.close();}
});

for(const transport of [false,true])test(`ordinary throw anticipation attached, hitstop and current aim transport=${transport}`,()=>{
 const x=fixture({height:30,rear:true});try{
  if(transport)x.lift();const hp=x.v.hp;x.g.melee._throw(x.p);const pending=x.p._personThrowWindup;
  assert.ok(pending);assert.equal(x.v.grabbedBy,x.p);assert.equal(x.v.hp,hp);
  x.g.melee.update(x.p,.08);assert.equal(x.v.grabbedBy,x.p);x.g.melee._throw(x.p);assert.equal(x.p._personThrowWindup,pending);assert.equal(pending.elapsed,.08);
  x.p.hitstop=.1;x.g.melee.update(x.p,.1);assert.equal(pending.elapsed,.08);x.p.hitstop=0;
  x.p.aim3.set(1,-1,0).normalize();x.g.melee.update(x.p,.12);assert.equal(x.v.grabbedBy,null);assert.equal(x.p._personThrowWindup,null);assert.ok(x.v.launchT>0);assert.ok(x.v.hp<hp);
  if(transport)assert.ok(x.v.vel.angleTo(x.p.aim3)<1e-7);
 }finally{x.close();}
});
for(const reason of ['stun','ko','invalid'])test(`throw windup cancels ${reason}`,()=>{const x=fixture();try{
 x.g.melee._throw(x.p);const hp=x.v.hp;
 if(reason==='stun')x.p.stunT=1;if(reason==='ko')x.p.state='ko';if(reason==='invalid')x.v.grabbedBy=null;
 x.g.melee.update(x.p,.25);assert.equal(x.p._personThrowWindup,null);assert.equal(x.p.grabbing,null);assert.equal(x.v.hp,hp);assert.ok(!(x.v.launchT>0));
 }finally{x.close();}});


test('release accepts null and victim-side release clears holder anticipation',()=>{const x=fixture();try{x.g.melee.release(null);x.g.melee._throw(x.p);assert.ok(x.p._personThrowWindup);x.g.melee.release(x.v);assert.equal(x.p._personThrowWindup,null);assert.equal(x.p.grabbing,null);assert.equal(x.v.grabbedBy,null);}finally{x.close();}});

test('production frozen windup does not integrate torso rotation and cancellation restores baseline',()=>{const x=fixture();try{
 const f=x.p;f.parts.torso.rotation.set(0,0,0);x.g.melee._throw(f);f._personThrowWindup.elapsed=.1;f.hitstop=1;
 f._animate(1/60);const first=f.parts.torso.quaternion.clone();for(let i=0;i<24;i++)f._animate(1/60);assert.ok(f.parts.torso.quaternion.angleTo(first)<1e-7,'windup accumulated during hitstop');
 x.g.melee.release(x.v);assert.ok(f.parts.torso.quaternion.angleTo(new THREE.Quaternion())<1e-7);f._animate(1/60);assert.ok(Math.abs(f.parts.torso.rotation.x)<1e-7);
 }finally{x.close();}});
test('release torso overlay does not accumulate on repeated frozen production frames',()=>{const x=fixture();try{
 const f=x.p;f.parts.torso.rotation.set(0,0,0);x.g.melee._throw(f);f._personThrowWindup.elapsed=.1;f._animate(1/60);x.g.melee.update(f,.1);assert.ok(f._personThrowPose);f.hitstop=1;
 f._animate(1/60);const first=f.parts.torso.quaternion.clone();for(let i=0;i<24;i++)f._animate(1/60);assert.ok(f.parts.torso.quaternion.angleTo(first)<1e-7,'recovery accumulated');
 f.stunT=1;x.g.melee.update(f,1/60);assert.equal(f._personThrowPose,null);assert.ok(Math.abs(f.parts.torso.rotation.x)<1e-7);
 }finally{x.close();}});

test('throw overlay preserves native idle torso yaw damping baseline',()=>{const x=fixture(),control=fixture();try{
 x.p.parts.torso.rotation.set(0,.3,0);control.p.parts.torso.rotation.set(0,.3,0);x.g.melee._throw(x.p);x.p._personThrowWindup.elapsed=.1;
 for(let i=0;i<12;i++){x.p._animate(1/60);control.p._animate(1/60);}
 x.g.melee.release(x.v);assert.ok(Math.abs(x.p.parts.torso.rotation.y-control.p.parts.torso.rotation.y)<1e-7);
 }finally{x.close();control.close();}});
