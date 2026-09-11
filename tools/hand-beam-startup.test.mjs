import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cancelHeldAttacks} from '../src/engine/abilities.js';
import {handStartupFixture} from './helpers/hand-startup-fixture.mjs';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const fixture=handStartupFixture;

for(const style of ['palm','two-hand'])for(const motion of ['stand','strafe','hover','fly','rise','descend'])for(const hz of [30,60,120])
test(`${style} first packets wait for raised, open palms without redirecting ${motion} at ${hz} Hz`,()=>{
 const {f,g,dt,voices,arms,step,input,close}=fixture({style,motion,hz,scale:.65});
 try{
  input(true,true,false);const beam=f.slots.lmb.active,paid=f.ki,velocity=f.vel.clone(),position=f.pos.clone(),target=f.aimWorld.clone();
  assert.ok(beam.pendingLaunch,'A native hand power emits before the releasing pose exists');
  assert.equal(beam.pn,0);assert.equal(voices.length,0);assert.equal(beam.grp.visible,false);
  let elapsed=0;
  while(beam.pendingLaunch&&elapsed<.35){
   step();elapsed+=dt;
   assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Bracing moved the physics root');
   if(beam.pendingLaunch){assert.equal(f.ki,paid);assert.equal(beam.pn,0);assert.equal(voices.length,0);}
  }
  assert.ok(beam.emissionAge>0,`No emission after ${elapsed}s`);
  assert.equal(voices.length,1);assert.ok(Math.abs(f.ki-(paid-12*dt))<1e-8);
  const expected=target.sub(beam.muzzle).normalize();
  assert.ok(beam.dir.dot(expected)>.999999);assert.ok(new THREE.Vector3().fromArray(beam.pvel,3).normalize().dot(expected)>.999999);
  for(const arm of arms){
   const hand=arm.children[2],at=hand.getWorldPosition(new THREE.Vector3()),shoulder=arm.getWorldPosition(new THREE.Vector3());
   assert.ok(at.sub(shoulder).normalize().dot(beam.dir)>.75,'Energy emitted while its arm was still hanging away from the shot');
   assert.ok(hand.morphTargetInfluences[0]>=.7,'Energy emitted through a still-closed casting palm');
   const normal=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(normal.dot(beam.dir)>.99,'Final palm normal disagrees with its first packet');
  }
 }finally{close();}
});

for(const style of ['palm','two-hand'])for(const [yaw,pitch]of [[170,25],[-110,-55],[10,75],[0,-80]])
test(`${style} can prepare a captured ${yaw}/${pitch} degree shot while traveling`,()=>{
 const {f,dt,aim,step,input,close}=fixture({style,motion:'fly',yaw,pitch});
 try{
  input(true,true,false);const beam=f.slots.lmb.active,command=f.aimWorld.clone();step();aim(-20,0);
  let wait=dt;while(beam.pendingLaunch&&wait<.4){step();wait+=dt;}
  const ray=beam.predictDirection(new THREE.Vector3(),0,beam.muzzle);
  const readiness=[f.parts.armL,f.parts.armR].map(arm=>{
   const hand=arm.children[2],q=hand.getWorldQuaternion(new THREE.Quaternion());
   return {reach:hand.getWorldPosition(new THREE.Vector3()).sub(arm.getWorldPosition(new THREE.Vector3())).normalize().dot(ray),palm:new THREE.Vector3(0,-1,0).applyQuaternion(q).dot(ray),open:hand.morphTargetInfluences?.[0],at:hand.getWorldPosition(new THREE.Vector3()).toArray(),shoulder:arm.getWorldPosition(new THREE.Vector3()).toArray(),elbow:-arm.children[1].rotation.x};
  });
  assert.ok(beam.emissionAge>0,`An attainable release was stranded for ${wait}s; ${JSON.stringify(readiness)}`);
  assert.ok(beam.dir.dot(command.sub(beam.muzzle).normalize())>.999999,'Preparation rewrote the captured command');
 }finally{close();}
});

for(const hz of [30,60,120])for(const scale of [.65,1,1.5])test(`steep flying paired release reaches its saved command at ${hz}Hz / scale ${scale}`,()=>{
 const x=handStartupFixture({motion:'fly',yaw:10,pitch:75,hz,scale});
 try{
  const root=x.f.pos.clone(),velocity=x.f.vel.clone(),command=x.f.aimWorld.clone();
  x.input(true,true,false);const b=x.f.slots.lmb.active;x.step();x.aim(-20,0);
  let elapsed=x.dt;while(b.pendingLaunch&&elapsed<.4){x.step();elapsed+=x.dt;}
  assert.ok(b.emissionAge>0,`stalled ${elapsed}s`);
  assert.ok(b.dir.dot(command.sub(b.muzzle).normalize())>.999999);
  assert.ok(x.f.pos.equals(root)&&x.f.vel.equals(velocity));
 }finally{x.close();}
});

for(const scale of [.65,1,1.5])test(`steep paired entry and recovery preserve rendered arm clearance at scale ${scale}`,()=>{
 const x=handStartupFixture({motion:'fly',yaw:10,pitch:75,scale}),f=x.f,inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  x.input(true,true,false);
  for(let frame=0;frame<120;frame++){
   if(frame===1)x.aim(-20,0);if(frame===60)x.input(false,false,true);x.step();
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of x.arms){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
    const meshes=[[arm.children[2],null],[surface.mesh,surface]];
    for(const [mesh,limb]of meshes){
     const positions=mesh.geometry.attributes.position;
     for(let v=0;v<positions.count;v++){
      if(limb&&limb.rows[Math.floor(v/limb.segments)]?.driver!==arm.children[1])continue;
      mesh.getVertexPosition(v,point).applyMatrix4(mesh.matrixWorld);
      assert.equal(inside(point,inverse),false,`frame ${frame}, ${mesh.name}, vertex ${v} enters torso`);
     }
    }
   }
  }
 }finally{x.close();}
});

for(const kind of ['release','focus','guard','freeze','stun','hit','ko','drained'])
test(`unfired palm preparation cancels on ${kind} without a voice or packet`,()=>{
 const {f,g,step,input,voices,close}=fixture();
 try{
  input(true,true,false);const beam=f.slots.lmb.active;step();assert.ok(beam.pendingLaunch);
  if(kind==='release')input(false,false,true);
  else if(kind==='focus')cancelHeldAttacks(f);
  else if(kind==='guard')f.guarding=true;
  else if(kind==='freeze')f.frozenT=1;
  else if(kind==='stun')f.stunT=1;
  else if(kind==='hit')f.staggerT=1;
  else if(kind==='ko')f._ko();
  else f.ki=.01;
  for(let i=0;i<30;i++)step();
  assert.ok(beam.dead&&!g.projectiles.list.includes(beam));assert.equal(beam.pn,0);assert.equal(beam.emissionAge,0);assert.equal(voices.length,0);
 }finally{close();}
});

test('charged paired release leaves the gathering pose before starting its hose',()=>{
 const {f,dt,step,input,close}=fixture({charge:true});
 try{
  input(true,true,false);for(let i=0;i<36;i++){input(false,true,false);step();}
  input(false,false,true);const beam=f.slots.lmb.active;assert.ok(beam.pendingLaunch);step();assert.equal(beam.emissionAge,0);
  let time=dt;while(beam.pendingLaunch&&time<.35){step();time+=dt;}
  assert.ok(beam.emissionAge>0,'Charged hand release never starts');assert.ok(f._combatAim.gather<.2,'Beam starts while hands are still gathering');
 }finally{close();}
});

test('charged launch camera response happens at emission, not while hands are still gathering',()=>{
 const {f,step,input,feedback,close}=fixture({charge:true});
 try{
  input(true,true,false);for(let i=0;i<36;i++){input(false,true,false);step();}
  feedback.length=0;input(false,false,true);assert.deepEqual(feedback,[],'Unfired preparation already punched the camera');
  const beam=f.slots.lmb.active;for(let i=0;beam.pendingLaunch&&i<25;i++){step();if(beam.pendingLaunch)assert.deepEqual(feedback,[]);}
  // Ambient sustaining pressure has its own smaller stochastic shakes.
  const releaseFeedback=()=>feedback.filter(([kind,power])=>kind==='punch'||power===.8);
  assert.ok(beam.emissionAge>0);assert.deepEqual(releaseFeedback(),[['punch',.9],['shake',.8]]);
  for(let i=0;i<20;i++)step();assert.equal(releaseFeedback().length,2,'Release feedback replayed during sustain');
 }finally{close();}
});

for(const denied of [false,true])test(`a ${denied?'denied':'successful'} non-ranged cast preserves the correct recovery owner`,()=>{
 const {f,step,input,close}=fixture({motion:'fly'});
 try{
  input(true,true,false);for(let i=0;i<30;i++)step();assert.equal(f._castPoseRanged,true);
  input(false,false,true);step();assert.ok(f._combatAim.weight>.5,'Fixture must be within ranged recovery');
  const slot=f.slots.lmb;slot.def={type:'cone',color:'#ffd14a',kiPerSec:12,cost:1};slot.cd=0;f.ki=denied?0:100;
  input(true,true,false);assert.equal(f._castPoseRanged,denied,'Actual successful action, not attempted input, owns the cast pose');
 }finally{close();}
});

test('ready charged hands cannot emit feedback after a newer channel spends the remaining energy',()=>{
 const {f,g,animate,step,input,feedback,voices,dt,close}=fixture({charge:true});
 try{
  input(true,true,false);for(let i=0;i<36;i++){input(false,true,false);step();}
  input(false,false,true);const beam=f.slots.lmb.active;for(let i=0;i<30;i++)animate();
  beam.resolveLaunch(g,0);assert.ok(beam.pendingLaunch&&beam._launchReady);feedback.length=0;
  // Low-level environment streams do not own a character animation channel.
  const newer=g.projectiles.spawnBeam(f,{kiPerSec:12,dps:1,steer:0});f.ki=12*dt+.01;g.projectiles.update(dt,g);
  assert.ok(newer.emissionAge>0&&beam.dead);assert.equal(beam.emissionAge,0);assert.equal(beam.pn,0);assert.equal(voices.length,1);
  assert.ok(!feedback.some(([kind,power])=>kind==='punch'||power===.8),'Canceled preparation produced charged-release feedback');
 }finally{close();}
});

test('a paid buff that does not animate a cast cannot steal ranged recovery',()=>{
 const {f,g,step,input,close}=fixture({motion:'fly'});
 try{
  input(true,true,false);for(let i=0;i<30;i++)step();input(false,false,true);
  const state=f.state,time=f.stateT,slot=f.slots.lmb;slot.def={type:'buff',name:'Power boost',cost:3,cd:1,dur:2,mult:1.1,color:'#ffc54a'};slot.cd=0;
  g.heroYell=()=>{};const ki=f.ki;input(true,true,false);
  assert.ok(f.ki<ki,'The buff must actually be paid');assert.equal(f.state,state);assert.equal(f.stateT,time);
  assert.equal(f._castPoseRanged,true,'A resource-only action stole the previous cast pose');
 }finally{close();}
});

for(const style of ['palm','two-hand'])for(const motion of ['stand','hover'])for(const scale of [.65,1])
test(`${style} starts beside thin cover without a detached muzzle (${motion}, scale ${scale})`,()=>{
 const {f,g,dt,step,input,arms,close}=fixture({style,motion,scale});
 try{
  const wall={x:0,z:2.4,hx:20,hz:.02};g.world.interiors.push({...wall,top:100,walls:[wall]});
  input(true,true,false);const beam=f.slots.lmb.active;let time=0;
  while(beam.pendingLaunch&&time<.4){step();time+=dt;}
  assert.ok(beam.emissionAge>0,`Cover retraction stranded a legal shot for ${time}s`);
  assert.ok(beam.muzzle.z<wall.z-wall.hz,'Shot spawned on the far side of cover');
  const origin=new THREE.Vector3();for(const arm of arms)origin.add(arm.children[2].getWorldPosition(new THREE.Vector3()));origin.divideScalar(arms.length);
  assert.ok(origin.distanceTo(beam.muzzle)<.001,'A replacement emitter bypassed the actual retracted hands');
 }finally{close();}
});
