// Native camera-composition regressions: no hidden-body/fade bypasses.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {traceCameraGround} from '../src/engine/camera-ground.js';
import {spineCombatFixture} from './helpers/spine-combat-fixture.mjs';

// Real camera/rig/collision methods; only renderer construction is omitted.
// No game-controller, pose, terrain query or camera method is replaced.
function fixture({height=0,aspect=1.6}={}){
 globalThis.innerHeight=800;globalThis.innerWidth=800*aspect;
 const w=Object.create(World.prototype),camera=new THREE.PerspectiveCamera(73.74,aspect,.6,4200);
 Object.assign(w,{camera,camChase:camera,camMode:'chase',camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),
  sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),cover:[],interiors:[],_lookActive:true,_lookYaw:0,_lookPitch:0,
  _shake:0,_shakeT:0,_gseg:4,_ghArena:80,ARENA:80,_gh:new Float32Array(25).fill(height)});
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));f._openSky=true;f.pos.set(0,height,0);f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.animT=0;f.facing=0;
 for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
 const step=pitch=>{w._lookPitch=pitch*Math.PI/180;w.chase(f,null,1/60);camera.updateMatrixWorld(true);};
 return {w,f,camera,step,close(){f.dispose();}};
}


for(const yaw of [-30,0,30])for(const pitch of [45,60,79,89])test(`grounded optic fire beside a wall keeps the reticle clear at ${pitch} degrees, yaw ${yaw}`,()=>{
 const x=fixture(),p=spineCombatFixture({source:'eye',motion:'jog'}),{w,camera}=x,{f}=p;
 try{
  // Native PowerWorld wall, translated from the captured frame280 into the
  // fixture's origin. Only .796u of near-plane side clearance remains.
  w.cover=[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}];
  f.vel.set(-32,0,0);p.aim(yaw,Math.tan(pitch*Math.PI/180)*100);for(let i=0;i<60;i++)p.step();p.start('lmb');
  w._lookYaw=yaw*Math.PI/180;
  w._lookPitch=pitch*Math.PI/180;
  for(let i=0;i<120;i++){
   p.step();w.chase(f,null,1/60);camera.updateMatrixWorld(true);if(i<30)continue;
   const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30);
   const hits=ray.intersectObject(f.parts.body,true).filter(hit=>{
    for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
    return [].concat(hit.object.material).some(m=>!m.transparent);
   });
   assert.equal(hits.length,0,`Wall compression covers the reticle at ${i}`);
   const head=f.parts.head.getWorldPosition(new THREE.Vector3()).project(camera);
   assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1&&head.z<1,'The wall response lost the head');
   assert.ok(w._camNearestT(0,5.4,0,...camera.position.toArray(),1.4035490833866233)>=1-1e-6,'Camera crossed the wall');
  }
 }finally{p.close();x.close();}
});

test('passing a wall end does not teleport the ground camera across its clearance offset',()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  w.cover=[{x:-10.87012740102363,z:-1.62572936057744,hx:8.670127401023638,hz:8.670127401023638,top:14.672523294040003}];
  for(const [pitch,z]of [[79,10.796],[45,-3.344]]){
   // Independent acquisition points, not a 14u teleport between two witnesses.
   w.snapChase();f.pos.z=z;x.step(pitch);const before=camera.position.clone();f.pos.z+=.001;x.step(pitch);
   assert.ok(camera.position.distanceTo(before)<.02,`Wall-end teleport at ${pitch}: ${before.toArray()} -> ${camera.position.toArray()}`);
  }
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`wall-side approach and retreat preserve camera continuity at ${hz} Hz`,()=>{
 const x=fixture(),p=spineCombatFixture({source:'eye',motion:'walk',hz}),{w,camera}=x,{f}=p;
 try{
  w.cover=[{x:-10.87,z:-1.63,hx:8.67,hz:8.67,top:14.67}];w._lookPitch=60*Math.PI/180;
  f.pos.x=20;p.aim(0,173.2);for(let i=0;i<hz;i++)p.step();p.start('lmb');
  const previous=new THREE.Vector3();
  for(let i=0;i<=hz*4;i++){
   const phase=2*Math.PI*i/(hz*4);f.pos.x=10*(1+Math.cos(phase));f.vel.x=-5*Math.PI*Math.sin(phase);p.aim(0,173.2);
   p.step();w.chase(f,null,1/hz);camera.updateMatrixWorld(true);
   if(i)assert.ok(previous.distanceTo(camera.position)*hz<90,'Wall contact introduced a camera jump');previous.copy(camera.position);
   assert.ok(w._camNearestT(f.pos.x,5.4,0,...camera.position.toArray(),1.4035490833866233)>=1-1e-5);
   const head=f.parts.head.getWorldPosition(new THREE.Vector3()).project(camera);
   assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1&&head.z<1,'Camera lost the moving head beside the wall');
  }
 }finally{p.close();x.close();}
});

test('tiny movements do not switch to the opposite clear rear arc',()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  w._lookYaw=-.4814386090661966;w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];
  f.pos.x=-.001;x.step(45);const previous=camera.position.clone();
  for(let i=0;i<120;i++){
   f.pos.x=i%2?.001:-.001;x.step(45);
   assert.ok(previous.distanceTo(camera.position)<.05,`Opposite-arc jump: ${previous.toArray()} -> ${camera.position.toArray()}`);
   assert.ok(w._camNearestT(f.pos.x,5.4,0,...camera.position.toArray(),1.4035490833866233)>=1-1e-6);
   previous.copy(camera.position);
  }
 }finally{x.close();}
});

test('terrain-clear rear arcs are found beyond the cover boundary candidates',()=>{
 const x=fixture(),{w,f,camera}=x,pad=1.4035490833866233;
 try{
  w._lookYaw=-.4814386090661966;w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];
  Object.assign(w,{_gseg:112,_ghArena:240,ARENA:240,_gh:new Float32Array(113*113)});
  w._gh[54*113+54]=1.4;w._gh[54*113+58]=1.4;x.step(45);
  const anchor=new THREE.Vector3(0,5.4,0);
  assert.ok(Math.hypot(camera.position.x,camera.position.z)>9,'Usable arc was missed and the boom contracted into the fighter');
  assert.ok(traceCameraGround(w,anchor,camera.position,pad)>=1-1e-6);
  assert.ok(w._camNearestT(...anchor.toArray(),...camera.position.toArray(),pad)>=1-1e-6);
  const hits=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30).intersectObject(f.parts.body,true);
  assert.equal(hits.filter(h=>[].concat(h.object.material).some(m=>!m.transparent)).length,0);
 }finally{x.close();}
});

test('first terrain contact behind cover does not change framing discontinuously',()=>{
 const x=fixture(),{w,camera}=x;
 try{
  w.cover=[{x:0,z:-12,hx:4,hz:2,top:12}];
  x.step(25.094);const previous=camera.position.clone();x.step(25.095);
  assert.ok(previous.distanceTo(camera.position)<.02,`Terrain ownership jump: ${previous.toArray()} -> ${camera.position.toArray()}`);
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`combined cover/terrain entry, release and lateral exit remain continuous at ${hz} Hz`,()=>{
 const x=fixture(),{w,f,camera}=x,pad=1.4035490833866233,previous=new THREE.Vector3();
 try{
  w.cover=[{x:0,z:-12,hx:4,hz:2,top:12}];x.step(0);previous.copy(camera.position);
  for(let i=1;i<=hz*8;i++){
   w._lookPitch=89*Math.sin(Math.PI*i/(hz*8))*Math.PI/180;
   w.chase(f,null,1/hz);camera.updateMatrixWorld(true);
   assert.ok(previous.distanceTo(camera.position)*hz<180,`Pitch sweep jumped at ${i/hz}s: ${previous.toArray()} -> ${camera.position.toArray()}`);
   assert.ok(w._camNearestT(0,5.4,0,...camera.position.toArray(),pad)>=1-1e-6);
   assert.ok(traceCameraGround(w,new THREE.Vector3(0,5.4,0),camera.position,pad)>=1-1e-6);
   previous.copy(camera.position);
  }
  for(let i=0;i<hz;i++)w.chase(f,null,1/hz);
  assert.ok(Math.abs(camera.position.x)<1e-6,'Release left a shoulder correction');
  w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];w._lookYaw=-.4814386090661966;w._lookPitch=Math.PI/4;f.pos.x=-10;w.snapChase();w.chase(f,null,1/hz);previous.copy(camera.position);
  for(let i=1;i<=hz*8;i++){
   f.pos.x=-10+20*i/(hz*8);w.chase(f,null,1/hz);camera.updateMatrixWorld(true);
   assert.ok(previous.distanceTo(camera.position)*hz<180,`Lateral exit jumped at x=${f.pos.x}: ${previous.toArray()} -> ${camera.position.toArray()}`);
   assert.ok(w._camNearestT(f.pos.x,5.4,0,...camera.position.toArray(),pad)>=1-1e-6);
   previous.copy(camera.position);
  }
 }finally{x.close();}
});

test('collision arc correction resets on camera snap and new subject',()=>{
 const x=fixture(),y=fixture(),{w,f,camera}=x;
 try{
  w._lookYaw=-.4814386090661966;w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];f.pos.x=-.001;x.step(45);
  w.cover=[];w.snapChase();x.step(0);
  const ideal=new THREE.Vector3(f.pos.x-Math.sin(w._lookYaw)*25.5,14.4,-Math.cos(w._lookYaw)*25.5);
  assert.ok(camera.position.distanceTo(ideal)<1e-6,'Snap inherited a collision correction');
  w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];x.step(45);w.cover=[];w._lookPitch=0;
  w.chase(y.f,null,1/60);ideal.x-=f.pos.x;assert.ok(camera.position.distanceTo(ideal)<1e-6,'Another subject inherited a collision correction');
 }finally{x.close();y.close();}
});

test('a costume-only rig rebuild preserves the camera collision branch',()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  w._lookYaw=-.4814386090661966;w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];f.pos.x=-.001;x.step(45);
  f.pos.x=.001;for(let i=0;i<10;i++)x.step(45);
  const previous=camera.position.clone();f.applyForm({model:{costume:'plated'}});x.step(45);
  assert.ok(previous.distanceTo(camera.position)<.05,`Costume changed the camera branch: ${previous.toArray()} -> ${camera.position.toArray()}`);
 }finally{x.close();}
});

test('removing an obstacle releases the collision correction instead of freezing it',()=>{
 const x=fixture(),y=fixture(),{w,f,camera}=x;
 try{
  w._lookYaw=y.w._lookYaw=-.4814386090661966;
  w.cover=[{x:0,z:-5,hx:1,hz:1,top:14}];x.step(45);y.step(45);
  assert.ok(camera.position.distanceTo(y.camera.position)>1,'Fixture did not need an arc');
  w.cover=[];x.step(0);y.step(0);
  const previous=camera.position.clone();
  for(let i=0;i<180;i++){
   x.step(0);assert.ok(previous.distanceTo(camera.position)<2,'Obstacle removal snapped the camera');previous.copy(camera.position);
  }
  assert.ok(camera.position.distanceTo(y.camera.position)<1e-6,'Collision history never returned to the unobstructed view');
 }finally{x.close();y.close();}
});
