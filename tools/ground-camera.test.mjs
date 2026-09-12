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
 // This fixture poses an already-settled fighter. The separate native floor-
 // discovery control in main-combat-view.test.mjs covers Fighter.update finding it.
 const f=new Fighter(ROSTER.find(d=>d.id==='sol'));f._openSky=true;f.pos.set(0,height,0);f.groundY=height;f.vel.set(0,0,0);f.flying=false;f.gait='grounded';f.animT=0;f.facing=0;
 for(let i=0;i<60;i++){f.animT+=1/60;f._animate(1/60);}f.obj.updateMatrixWorld(true);
 const step=pitch=>{w._lookPitch=pitch*Math.PI/180;w.chase(f,null,1/60);camera.updateMatrixWorld(true);};
 return {w,f,camera,step,close(){f.dispose();}};
}

test('close level lock keeps a back-side view instead of pitching down over the heads',()=>{
 const x=fixture(),foe=new Fighter(ROSTER.find(d=>d.id==='circuit'));
 try{
  foe._openSky=true;foe.pos.set(0,0,8);
  for(let i=0;i<120;i++)x.w.chase(x.f,foe,1/60);
  x.camera.updateMatrixWorld(true);
  assert.ok(Math.abs(x.w._lookPitch)<25*Math.PI/180,'a level melee target must not force a steep overhead view');
  assert.ok(Math.abs(x.camera.fov-73.74)<.01,'retain the existing lens');
  assert.ok(x.f.center(new THREE.Vector3()).project(x.camera).x<-.1,'default eye sits to the right, leaving the player left of aim');
  for(const f of [x.f,foe]){
   const center=f.center(new THREE.Vector3()).project(x.camera);
   assert.ok(Math.abs(center.x)<.9&&Math.abs(center.y)<.9&&center.z<1,'both bodies stay inside the view');
  }
 }finally{foe.dispose();x.close();}
});

for(const height of [0,18])for(const pitch of [45,60,79,89])test(`ground camera retains upper-body orientation cues at ${pitch} degrees on height ${height}`,()=>{
 const x=fixture({height}),{w,f,camera}=x;
 try{
  x.step(pitch);
  for(const part of [f.parts.head,f.parts.torso]){
   const point=part.getWorldPosition(new THREE.Vector3()).project(camera);
   assert.ok(Math.abs(point.x)<.95&&Math.abs(point.y)<.95&&point.z<1,`Upper body outside the view: ${point.toArray()}`);
  }
  const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30);
  const hits=ray.intersectObject(f.parts.body,true).filter(hit=>{
   for(let p=hit.object;p;p=p.parent)if(!p.visible)return false;
   return [].concat(hit.object.material).some(m=>!m.transparent);
  });
  assert.equal(hits.length,0,`The player covers the crosshair: ${hits.map(h=>h.object.name||h.object.geometry.type)}`);
  assert.ok(camera.position.y>=height+1.4-1e-5,'Near plane enters the floor');
  assert.ok(Math.abs(w._lookPitch-pitch*Math.PI/180)<1e-10,'Collision changed the aimed pitch');
  assert.deepEqual(f.pos.toArray(),[0,height,0]);assert.deepEqual(f.vel.toArray(),[0,0,0]);
 }finally{x.close();}
});

test('unobstructed rear-side framing remains fixed through free airborne pitch',()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  f.pos.y=220;f.flying=true;f.gait='airborne';
  for(const pitch of [-89,-65,0,65,89]){
   x.step(pitch);const offset=camera.position.clone().sub(f.pos).sub(new THREE.Vector3(0,5.4,0));
   const forward=camera.getWorldDirection(new THREE.Vector3()),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
   assert.ok(Math.abs(-offset.dot(forward)-25.5)<1e-6);assert.ok(Math.abs(offset.dot(up)-9)<1e-6);assert.ok(Math.abs(offset.dot(right)-6)<1e-6);
   assert.equal(camera.fov,73.74);assert.ok(Math.abs(w._lookPitch-pitch*Math.PI/180)<1e-10);
  }
 }finally{x.close();}
});

for(const hz of [30,60,120])test(`ground-clearance entry and exit have no discontinuous switch at ${hz} Hz`,()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  x.step(0);const previous=camera.position.clone();
  for(let i=1;i<=hz*4;i++){
   const pitch=89*Math.sin(Math.PI*i/(hz*4));w._lookPitch=pitch*Math.PI/180;w.chase(f,null,1/hz);camera.updateMatrixWorld(true);
   assert.ok(camera.position.distanceTo(previous)*hz<140,`Terrain response jumps at ${pitch}: ${previous.toArray()} → ${camera.position.toArray()}`);previous.copy(camera.position);
  }
  assert.ok(camera.position.distanceTo(new THREE.Vector3(-6,14.4,-25.5))<1e-6,'Release failed to restore the authored shoulder offset');
 }finally{x.close();}
});

test('a heightfield ridge cannot sit between the fighter and an apparently clear camera endpoint',()=>{
 const x=fixture(),{w,camera}=x;
 try{
  w._gseg=20;w._ghArena=20;w._gh=new Float32Array(21*21);
  for(let col=0;col<=20;col++)w._gh[4*21+col]=18;
  x.step(0);const anchor=new THREE.Vector3(0,5.4,0),p=new THREE.Vector3();
  for(let i=0;i<=200;i++){
   p.copy(anchor).lerp(camera.position,i/200);
   assert.ok(p.y-w.heightAt(p.x,p.z)>=1.4-1e-5,`Camera passed through the ridge at sample ${i}`);
  }
 }finally{x.close();}
});

test('ground clearance retraces nearby walls after its lateral displacement',()=>{
 const x=fixture(),{w,camera}=x;
 try{
  w.cover=[{x:-4,z:-2,hx:.3,hz:4,top:12}];x.step(79);
  const pad=camera.near*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+camera.aspect**2))*1.35;
  assert.ok(w._camNearestT(0,5.4,0,...camera.position.toArray(),pad)>=1-1e-6,'Corrected camera crosses the wall');
  assert.ok(camera.position.y>=pad-1e-6);
 }finally{x.close();}
});

test('native bilinear saddle is intercepted before its peak despite clear endpoints',()=>{
 const x=fixture(),{w}=x;
 try{
  w._gseg=1;w._ghArena=1;w.ARENA=900;w._gh=new Float32Array([0,10,10,0]);
  // Along the diagonal, h(t)=20t(1-t); y=4 first meets it at .2763932.
  const t=traceCameraGround(w,new THREE.Vector3(-1,4,-1),new THREE.Vector3(1,4,1),0);
  assert.ok(Math.abs(t-.276393202250021)<1e-8,`Missed the interior quadratic crossing: ${t}`);
 }finally{x.close();}
});

test('native triangulated saddle is intercepted at the rendered diagonal, not a bilinear approximation',()=>{
 const x=fixture(),{w}=x;
 try{
  w._gseg=1;w._ghArena=1;w._ghTriangles=true;w._gh=new Float32Array([0,10,10,0]);
  // Rendered diagonal ridge: h=20t until t=.5, not20t(1-t).
  assert.ok(Math.abs(traceCameraGround(w,new THREE.Vector3(-1,4,-1),new THREE.Vector3(1,4,1),0)-.2)<1e-8);
  assert.ok(Math.abs(traceCameraGround(w,new THREE.Vector3(1,4,1),new THREE.Vector3(-1,4,-1),0)-.2)<1e-8);
 }finally{x.close();}
});

test('near-plane footprint notices slope contact before the center ray touches it',()=>{
 const x=fixture(),{w}=x;
 try{
  w._gseg=1;w._ghArena=10;w._gh=new Float32Array([0,10,0,10]);
  const start=new THREE.Vector3(0,12,0),end=new THREE.Vector3(0,0,0);
  // At x=+1 the slope is 5.5u; 1u clearance meets it at y=6.5.
  assert.ok(Math.abs(traceCameraGround(w,start,end,1)-.4583333333333333)<1e-8);
 }finally{x.close();}
});

test('triangle ridge inside the camera footprint is not missed between its corner rays',()=>{
 const x=fixture(),{w}=x;
 try{
  w._gseg=1;w._ghArena=10;w._ghTriangles=true;w._gh=new Float32Array([0,10,10,0]);
  // Entire footprint is inside one grid cell. Its diagonal ridge is height10,
  // while all four corners can be lower at an asymmetric rectangular crossing.
  const start=new THREE.Vector3(1,15,0),end=new THREE.Vector3(1,0,0);
  const hit=traceCameraGround(w,start,end,2);
  assert.ok(Math.abs(hit-.2)<1e-8,`Expected y12 at the internal ridge, got ${hit}`);
 }finally{x.close();}
});

test('near plane clears a native ridge vertex between the center and corner traces',()=>{
 const x=fixture(),{w,f,camera}=x;
 try{
  w._gseg=40;w._ghArena=w.ARENA=80;w._gh=new Float32Array(41*41);
  w._gh[20*41+20]=35.4975402863;w._gh[18*41+19]=33.2039298357;
  f.pos.set(-.2756209583,0,0);f.pos.y=w.heightAt(f.pos.x,f.pos.z);
  w._lookYaw=.2629442397;x.step(65.3125070268);
  for(let ix=0;ix<=20;ix++)for(let iy=0;iy<=20;iy++){
   const p=new THREE.Vector3(-1+ix/10,-1+iy/10,-1).unproject(camera);
   assert.ok(p.y>=w.heightAt(p.x,p.z)-1e-5,`Near plane penetrates the ridge: ${p.toArray()}`);
  }
 }finally{x.close();}
});

test('upward optic strafe keeps the camera stable and the reticle free throughout a running cycle',()=>{
 const x=fixture(),p=spineCombatFixture({source:'eye',motion:'jog'}),{w,camera}=x,{f}=p;
 try{
  f.vel.set(-32,0,0);p.aim(0,506);for(let i=0;i<60;i++)p.step();p.start('lmb');
  w._lookPitch=79*Math.PI/180;
  const previous=new THREE.Vector3();
  for(let i=0;i<180;i++){
   p.step();w.chase(f,null,1/60);camera.updateMatrixWorld(true);
   if(i)assert.ok(previous.distanceTo(camera.position)<1e-7,'The animated shoulder pumps the camera sideways');
   previous.copy(camera.position);
   if(i<60)continue;
   const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30);
   const hits=ray.intersectObject(f.parts.body,true).filter(hit=>{
    for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;
    return [].concat(hit.object.material).some(m=>!m.transparent);
   });
   assert.equal(hits.length,0,`The running body covers the reticle at frame ${i}`);
  }
 }finally{p.close();x.close();}
});
