import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot,cancelHeldAttacks} from '../src/engine/abilities.js';
import {remoteAttack} from '../src/engine/remote-control.js';

function fixture(extra={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.abilities={lmb:{type:'beam',name:'Startup chest',chest:true,cost:3,kiPerSec:12,dps:20,steer:1,color:'#ffc54a',...extra}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/60,voices=[];
 // Observe the actual beam->audio lifecycle boundary; no audio device in Node.
 g.audio={...g.audio,beamVoice:()=>{const v={stopped:false,set(){},stop(){this.stopped=true;}};voices.push(v);return v;}};
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,level:10,flying:true,gait:'airborne'});
 f.pos.set(0,50,0);f.vel.set(0,0,0);f.ki=100;
 const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const animate=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);f.obj.updateMatrixWorld(true);};
 const step=()=>{animate();g.projectiles.update(dt,g);};
 aim(0);for(let i=0;i<60;i++)step();aim(170,25);
 runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);const beam=f.slots.lmb.active;
 return {f,g,combat,dt,beam,voices,aim,animate,step,close(){combat.dispose();f.dispose();}};
}

test('turn-to-fire has no packets, sustain cost, light or voice until actual emission',()=>{
 const {f,beam,step,voices,dt,close}=fixture();
 try{
  const paid=f.ki;assert.equal(paid,97);step();assert.equal(beam.pendingLaunch,true);
  assert.equal(beam.pn,0);assert.equal(beam.grp.visible,false);assert.equal(beam.light.intensity,0);assert.equal(voices.length,0);assert.equal(f.ki,paid);
  let wait=dt;while(beam.pendingLaunch&&wait<.3){step();wait+=dt;}
  assert.ok(!beam.pendingLaunch&&beam.emissionAge>0,'Turn never reached its actual first emission');
  assert.equal(voices.length,1);assert.ok(beam.grp.visible&&beam.pn>=2&&beam.light.intensity>0);
  assert.ok(Math.abs(f.ki-(paid-12*dt))<1e-8,'Sustain cost includes unfired preparation');
 }finally{close();}
});

test('source glow follows the actual emitter only while energy is emitted and releases pooled light',()=>{
 const x=fixture({sourceGlow:1.5,sourceScale:.8}),{beam:b,g,step}=x;
 try{
  step();assert.ok(b.source,'beam needs a separate source envelope');assert.equal(b.source.visible,false);assert.equal(b.sourceLight,null);
  for(let i=0;i<40&&b.pendingLaunch;i++)step();
  assert.ok(b.source.visible&&b.sourceLight?.intensity>0,'sustained emission must illuminate its source');
  assert.ok(b.source.position.distanceTo(b.muzzle)<1e-6);assert.ok(b.sourceLight.position.distanceTo(b.muzzle)<1e-6);
  assert.ok(b.light.position.distanceTo(b.muzzle)>1,'tip and source must be distinct');
  const light=b.sourceLight,count=g.scene.children.filter(o=>o.isPointLight).length;
  b.end();step();assert.equal(b.source.visible,false);assert.equal(light.intensity,0);assert.ok(g.vfx.lightPool.includes(light));
  for(let i=0;i<20;i++)step();assert.equal(b.dead,true);assert.equal(g.scene.children.filter(o=>o.isPointLight).length,count);
 }finally{x.close();}
});
test('disabling source glow leaves no extra lamp or visible source while the physical beam still travels',()=>{
 const x=fixture({sourceGlow:0});try{for(let i=0;i<40;i++)x.step();assert.ok(x.beam.tipDist>0);assert.ok(!x.beam.source?.visible);assert.ok(!x.beam.sourceLight);}finally{x.close();}
});

test('source never overwrites or returns a lamp reassigned to a newer impact',()=>{
 const x=fixture(),{beam:b,g,step}=x;try{
  for(let i=0;i<40;i++)step();const source=b.sourceLight;assert.ok(source);
  while(g.vfx.lightPool.length)g.vfx.borrowLight('#ffffff',100,40);
  for(const light of g.vfx._lights)light.intensity=100;source.intensity=.01;
  const impact=g.vfx.borrowLight('#ff6600',77,50);assert.equal(impact,source);
  step();assert.equal(impact.intensity,77,'old source overwrote the newer impact');
  b._dispose(g);assert.equal(impact.intensity,77);assert.ok(!g.vfx.lightPool.includes(impact),'old source returned a lamp still owned by an impact');
 }finally{x.close();}
});

test('unfired remote power is not a detonatable shot',()=>{
 const {f,g,beam,step,close}=fixture({remoteDetonate:true});
 try{
  step();assert.ok(beam.pendingLaunch);assert.ok(remoteAttack(f,f.slots.lmb)===null,'Unfired preparation is exposed as remote energy');
  assert.equal(beam.detonate(g),false);assert.equal(beam.dead,false);assert.equal(beam.pn,0);
  for(let i=0;i<30;i++)step();assert.equal(remoteAttack(f,f.slots.lmb),beam);
 }finally{close();}
});

for(const kind of ['release','focus','remote-focus','guard','freeze','stun','hit','ko'])
test(`unfired beam cancels cleanly on ${kind}`,()=>{
 const {f,g,beam,step,voices,dt,close}=fixture({remoteDetonate:kind==='remote-focus'});
 try{
  step();assert.ok(beam.pendingLaunch);
  if(kind==='release')runSlot(f,'lmb',{pressed:false,held:false,released:true,dt},g);
  else if(kind.includes('focus'))cancelHeldAttacks(f);
  else if(kind==='guard')f.guarding=true;
  else if(kind==='freeze')f.frozenT=1;
  else if(kind==='stun')f.stunT=1;
  else if(kind==='hit')f.staggerT=1;
  else f._ko();
  step();assert.ok(beam.dead&&!g.projectiles.list.includes(beam),'Preparation survived its interruption');
  assert.equal(beam.emissionAge,0);assert.equal(voices.length,0);assert.equal(beam.grp.parent,null);
 }finally{close();}
});

test('a turn-to-fire cannot begin emission after another power spent its sustain budget',()=>{
 const {f,g,beam,step,animate,voices,dt,close}=fixture();
 try{
  step();assert.ok(beam.pendingLaunch);
  // Articulation can finish while another channel spends the remaining ki.
  for(let i=0;i<20;i++)animate();f.ki=.01;
  let drained=0;g.onDrained=()=>{drained++;};g.projectiles.update(dt,g);
  assert.equal(beam.emissionAge,0,'Spent energy launched an unfunded packet');
  assert.equal(beam.pn,0);assert.equal(voices.length,0);assert.equal(drained,1);
  assert.ok(beam.dead&&!g.projectiles.list.includes(beam));
 }finally{close();}
});

test('newer live energy gets its payment turn before a ready chest launch',()=>{
 const {f,g,beam,step,animate,voices,dt,close}=fixture();
 try{
  step();for(let i=0;i<20;i++)animate();
  const newer=g.projectiles.spawnBeam(f,{kiPerSec:12,dps:1,steer:0});
  f.ki=12*dt+.01;g.projectiles.update(dt,g);
  assert.ok(newer.emissionAge>0&&newer.sustaining,'Existing reverse payment order was changed');
  assert.ok(beam.dead&&beam.emissionAge===0&&beam.pn===0,'Preparing shot borrowed the newer shot’s energy');
  assert.equal(voices.length,1,'Only the committed hand beam should have a voice');
 }finally{close();}
});

test('aim changes during a turn cannot rewrite the captured first shot',()=>{
 const {f,beam,step,aim,dt,close}=fixture();
 try{
  const target=f.aimWorld.clone();step();aim(-30,-15);
  let time=dt;while(beam.pendingLaunch&&time<.3){step();time+=dt;}
  assert.ok(!beam.pendingLaunch&&beam.emissionAge>0,'Captured shot never emitted');
  const expected=target.sub(beam.muzzle).normalize(),packet=new THREE.Vector3().fromArray(beam.pvel,3).normalize();
  assert.ok(beam.dir.dot(expected)>.999999&&packet.dot(expected)>.999999,'Later cursor rewrote the first packet');
 }finally{close();}
});

test('Studio distinguishes actual turn-to-fire preparation from emitted energy',()=>{
 const {f,combat,animate,dt,close}=fixture();
 const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);combat.game.vfx._itex=texture;
 try{
  for(let i=0;i<20;i++)animate();
  combat.reset(f,true,'attack');combat.step(.6,dt);
  assert.ok(f.slots.lmb.active?.pendingLaunch,'Fixture must exercise a real unaligned chest shot');
  assert.match(combat.phase,/aligning/,'Editor falsely labels unfired preparation as firing');
  for(let time=.6+dt;time<1;time+=dt)combat.step(time,dt);
  assert.ok(f.slots.lmb.active?.emissionAge>0);assert.match(combat.phase,/firing/);
 }finally{texture.dispose();close();}
});

test('Studio stops advertising canceled alignment during a frozen control interval',()=>{
 const {f,combat,animate,dt,close}=fixture();
 try{
  for(let i=0;i<20;i++)animate();combat.reset(f,true,'attack');combat.step(.6,dt);
  assert.ok(f.slots.lmb.active?.pendingLaunch);f.frozenT=1;combat.step(.6+dt,dt);
  assert.ok(f.slots.lmb.active?.dead);
  assert.doesNotMatch(combat.phase,/aligning|firing/,'Canceled preparation is still advertised as active');
 }finally{close();}
});
