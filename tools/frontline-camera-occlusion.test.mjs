// CPU reproduction of retry6/04-native-beam.png, frame79 at game time8.3484.
// Native camera, stage registration/relief, fighter geometry and ray queries;
// only renderer and cloud-canvas construction are absent. No camera art tuning.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {World} from '../src/engine/world.js';
import {Fighter} from '../src/engine/entity.js';
import {PowerWorldStage} from '../src/engine/powerworld.js';
import {ROSTER} from '../src/data/characters.js';
import {FRONTLINE_CAMERA} from '../src/data/camera-presets.js';
import {traceCameraGround} from '../src/engine/camera-ground.js';
import {updateForegroundVisibility} from '../src/engine/foreground-visibility.js';

export const AIRBORNE_TALUS_FRAME=Object.freeze({
  time:8.348400000000009,
  player:[-190.39878028279546,65.43200294230799,128.46382268979806],
  velocity:[-3.4457899174961084,1.29195,18.75859521210307],
  eye:[-191.2210977868088,72.12419813535575,127.3101642467506],
  yaw:.39359999999999995,pitch:-.4608000000000001,
  scout:[-158,29.3906960356922,205],
  blockerTop:84.48557098923027,
});

function fixture(){
 const viewport={width:globalThis.innerWidth,height:globalThis.innerHeight};globalThis.innerWidth=1600;globalThis.innerHeight=900;
 const noop=()=>{},w=Object.create(World.prototype),scene=new THREE.Scene();
 const geo=new THREE.PlaneGeometry(480,480,4,4),ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial());
 ground.rotation.x=-Math.PI/2;scene.add(ground);
 const position=geo.attributes.position,gh=new Float32Array(position.count);
 const camera=new THREE.PerspectiveCamera(68,16/9,.6,4200);
 Object.assign(w,{scene,ground,groundGeo:geo,_gh:gh,_ghBase:gh.slice(),_gvx:Float32Array.from({length:position.count},(_,i)=>position.getX(i)),
  _gvz:Float32Array.from({length:position.count},(_,i)=>-position.getY(i)),_gseg:4,_ghArena:240,_normalsDirty:true,
  cover:[],coverAll:[],interiors:[],cars:[],planes:[],rocks:[],treeSpots:[],ARENA:240,refreshFogBoxes:noop,setSkyWorld:noop,setSpace:noop,
  camera,camChase:camera,camMode:'chase',camPos:new THREE.Vector3(),camTarget:new THREE.Vector3(),camBasis:new THREE.Vector3(),
  sun:new THREE.DirectionalLight(),sunOff:new THREE.Vector3(40,60,20),_lookActive:true,
  _lookYaw:AIRBORNE_TALUS_FRAME.yaw,_lookPitch:AIRBORNE_TALUS_FRAME.pitch,_shake:0,_shakeT:0});
 const f=new Fighter(ROSTER.find(d=>d.id==='vega')),stage=new PowerWorldStage({world:w,scene,entities:[f]});
 const beforeDocument=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop})})};
 try{stage.open();}finally{globalThis.document=beforeDocument;}
 // Keep native registration for the rotated footprint. Its historical top was
 // measured by the exact native reproduction before later bank edits lowered
 // this boulder. Clone just this CPU collider and pin that captured top: testing
 // the newly lowered bank would silently erase the original obstruction.
 const registered=w.cover.find(c=>c.x===-219&&c.z===118);
 assert.ok(registered,'Captured native talus no longer exists');
 const blocker={...registered,top:AIRBORNE_TALUS_FRAME.blockerTop,h:AIRBORNE_TALUS_FRAME.blockerTop};w.cover=[blocker];
 f._openSky=true;f._cameraPreset='frontline';f.pos.fromArray(AIRBORNE_TALUS_FRAME.player);f.groundY=w.heightAt(f.pos.x,f.pos.z);
 f.vel.fromArray(AIRBORNE_TALUS_FRAME.velocity);f.flying=true;f.gait='airborne';f.facing=AIRBORNE_TALUS_FRAME.yaw;
 f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.fromArray(AIRBORNE_TALUS_FRAME.scout);f.hasAimWorld=true;
 f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.castPose=1;f.state='cast';f.animT=AIRBORNE_TALUS_FRAME.time;
 f._animate(0);f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);
 const anchor=f.pos.clone().add(new THREE.Vector3(0,5.4,0)),{range,height:lift,shoulder}=FRONTLINE_CAMERA;
 const yaw=w._lookYaw,pitch=w._lookPitch,cp=Math.cos(pitch),sp=Math.sin(pitch),sy=Math.sin(yaw),cy=Math.cos(yaw);
 const desired=new THREE.Vector3(anchor.x-sy*cp*range-cy*shoulder-sy*sp*lift,anchor.y-sp*range+cp*lift,anchor.z-cy*cp*range+sy*shoulder-cy*sp*lift);
 const pad=camera.near*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+camera.aspect**2))*1.35;
 return {w,f,stage,camera,blocker,anchor,desired,pad,step(dt=1/60){w.chase(f,null,dt);camera.updateMatrixWorld(true);},
  dispose(){stage.close();f.dispose();ground.geometry.dispose();ground.material.dispose();globalThis.innerWidth=viewport.width;globalThis.innerHeight=viewport.height;}};
}

test('native capture isolates cover-only compression, not terrain penetration or a retuned camera',t=>{
 const x=fixture();try{
  const {w,f,blocker,anchor,desired,pad}=x;
  assert.equal(FRONTLINE_CAMERA.range,20);assert.equal(FRONTLINE_CAMERA.height,6);assert.equal(FRONTLINE_CAMERA.shoulder,3.5);
  assert.ok(f.pos.y-f.groundY>27,'The recorded attack is airborne above the actual terrain');
  assert.ok(Math.abs(blocker.x+blocker.hx+2.2-f.pos.x)<1e-9,'Collider does not match the native pinned fighter X');
  assert.equal(traceCameraGround(w,anchor,desired,pad),1,'Terrain should not own this collision');
  const cover=w._camNearestT(...anchor.toArray(),...desired.toArray(),pad);
  assert.ok(cover>0&&cover<.10,`Expected the native cover-only contraction, got ${cover}`);
  const reproduced=anchor.clone().lerp(desired,cover);
  assert.ok(reproduced.distanceTo(new THREE.Vector3(...AIRBORNE_TALUS_FRAME.eye))<1e-8,'Native box trace did not reproduce the recorded lens');
  t.diagnostic(JSON.stringify({cover,pad,blocker:{x:blocker.x,z:blocker.z,hx:blocker.hx,hz:blocker.hz,top:blocker.top},eye:reproduced.toArray()}));
 }finally{x.dispose();}
});

function animateFixture(x,dt){
 const {f,w,anchor}=x;f.groundY=w.heightAt(f.pos.x,f.pos.z);
 f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.animT+=dt;f.castPose=1;f.state='cast';f._castPoseRanged=true;
 f._animate(dt);f.obj.position.copy(f.pos);f.obj.updateMatrixWorld(true);anchor.copy(f.pos).y+=5.4;
 x.step(dt);
}

function assertVisible(x,label){
 const {w,f,camera,anchor,pad}=x;
 assert.ok(w._camNearestT(...anchor.toArray(),...camera.position.toArray(),pad)>=1-1e-6,`${label}: camera crosses native talus`);
 assert.ok(traceCameraGround(w,anchor,camera.position,pad)>=1-1e-6,`${label}: camera crosses terrain`);
 const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30);
 const hits=ray.intersectObject(f.parts.body,true).filter(hit=>{
  for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;
  return [].concat(hit.object.material).some(material=>!material.transparent);
 });
 assert.equal(hits.length,0,`${label}: opaque reticle obstruction (${hits.map(h=>h.object.name).join(', ')}), eye=${camera.position.toArray()}, hero=${f.pos.toArray()}`);
 const head=f.parts.head.getWorldPosition(new THREE.Vector3()).project(camera);
 assert.ok(Math.abs(head.x)<1&&Math.abs(head.y)<1&&head.z>=-1&&head.z<1,`${label}: head left the view ${head.toArray()}`);
}

test('airborne cover approach obstruction is prevented on fresh acquisition as well as with history',t=>{
 const x=fixture(),{w,f,anchor,camera,desired,pad}=x;
 try{
  f.pos.x=-186.6590351911205;f.vel.set(-13.679697943065135,0,0);animateFixture(x,1/60);
  const ideal=desired.clone().add(f.pos.clone().sub(new THREE.Vector3(...AIRBORNE_TALUS_FRAME.player)));
  const fraction=w._camNearestT(...anchor.toArray(),...ideal.toArray(),pad),state=w._groundCamState;
  t.diagnostic(JSON.stringify({unadjustedDistance:anchor.distanceTo(ideal)*fraction,ground:traceCameraGround(w,anchor,ideal,pad),
    actualEye:camera.position.toArray(),history:{offset:state.offset,pullback:state.pullback,correction:state.correction.toArray()}}));
  assertVisible(x,'Fresh airborne approach acquisition');
 }finally{x.dispose();}
});

for(const hz of [30,60,120])test(`airborne talus approach and retreat keep head/reticle visible with continuous history at ${hz}Hz`,t=>{
 const x=fixture(),{f,w,camera}=x,nearX=AIRBORNE_TALUS_FRAME.player[0],dt=1/hz,previous=new THREE.Vector3();
 let maxSpeed=0,maxArc=0;
 try{
  for(let i=0;i<=hz*4;i++){
   const phase=Math.PI*2*i/(hz*4);
   f.pos.x=nearX+12*(1+Math.cos(phase));f.vel.set(-6*Math.PI*Math.sin(phase),0,0);
   animateFixture(x,dt);maxArc=Math.max(maxArc,Math.abs(w._groundCamState.offset));
   try{assertVisible(x,`${hz}Hz frame${i}`);}catch(error){
    // Hold this exact native pose and input geometry; only re-acquire collision
    // history to distinguish a transient limiter fault from the clear-space
    // envelope itself. This diagnostic does not forgive the original failure.
    const state=w._groundCamState,history={eye:camera.position.toArray(),offset:state.offset,pullback:state.pullback,correction:state.correction.toArray()};
    w._groundCamState=null;x.step(dt);let freshFailure=null;
    try{assertVisible(x,'Fresh same-pose control');}catch(fresh){freshFailure=fresh.message;}
    t.diagnostic(JSON.stringify({frame:i,history,freshEye:camera.position.toArray(),freshFailure}));throw error;
   }
   if(i){const speed=previous.distanceTo(camera.position)*hz;maxSpeed=Math.max(maxSpeed,speed);assert.ok(speed<180,`${hz}Hz frame${i}: camera jumped at ${speed}u/s`);}
   previous.copy(camera.position);
  }
  for(let i=0;i<hz*2;i++){animateFixture(x,dt);assertVisible(x,`${hz}Hz released${i}`);}
  assert.ok(Math.abs(w._groundCamState.offset)<1e-5,'Retreat retains a cover detour after release');
  assert.ok(maxArc>.01,'Approach never exercised an actual cover detour');
  t.diagnostic(`Maximum camera speed ${maxSpeed}u/s; cover arc ${maxArc}rad`);
 }finally{x.dispose();}
});

for(const hz of [30,60,120])test(`airborne cover correction stays stable during native pose and clears on removal at ${hz}Hz`,()=>{
 const x=fixture(),{f,w,camera}=x,dt=1/hz,previous=new THREE.Vector3();
 try{
  // Acquire the exact recorded wall-side state, then exercise correction
  // ownership across animation frames and sub-millimetre player movement.
  for(let i=0;i<hz;i++){animateFixture(x,dt);assertVisible(x,`${hz}Hz acquire${i}`);}
  previous.copy(camera.position);
  for(let i=0;i<hz*2;i++){
   f.pos.x=AIRBORNE_TALUS_FRAME.player[0]+(i%2?.0001:-.0001);f.vel.set(0,0,0);
   animateFixture(x,dt);assertVisible(x,`${hz}Hz stable${i}`);
   assert.ok(previous.distanceTo(camera.position)<.03,`${hz}Hz: tiny movement switches camera branch`);previous.copy(camera.position);
  }
  w.cover=[];
  for(let i=0;i<hz*3;i++){
   animateFixture(x,dt);assertVisible(x,`${hz}Hz removal${i}`);
   assert.ok(previous.distanceTo(camera.position)*hz<180,`${hz}Hz: obstacle removal snaps camera`);previous.copy(camera.position);
  }
  // Compare with the same native chase without collision history, not a new
  // authored angle. Removing cover must eventually restore the exact preset.
  const settled=camera.position.clone();w.snapChase();x.step(dt);
  assert.ok(settled.distanceTo(camera.position)<1e-5,'Obstacle removal failed to release camera correction');
 }finally{x.dispose();}
});

test('free-aim airborne beam beside native talus keeps the reticle outside opaque hero geometry',t=>{
 const x=fixture();try{
  const {w,f,camera,anchor,pad}=x;x.step();updateForegroundVisibility(w,f,null,1/60);
  assert.ok(w._camNearestT(...anchor.toArray(),...camera.position.toArray(),pad)>=1-1e-6,'Presentation must not bypass the solid cover');
  assert.ok(traceCameraGround(w,anchor,camera.position,pad)>=1-1e-6,'Presentation must not bypass native terrain');
  const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),camera.near,30);
  const hits=ray.intersectObject(f.parts.body,true).filter(hit=>{
   for(let object=hit.object;object;object=object.parent)if(!object.visible)return false;
   return [].concat(hit.object.material).some(material=>!material.transparent);
  });
  t.diagnostic(JSON.stringify({eye:camera.position.toArray(),anchorDistance:camera.position.distanceTo(anchor),
    foregroundAmount:f.parts.foreground.uniforms.uCloseAmount.value,hits:hits.map(h=>({distance:h.distance,name:h.object.name,geometry:h.object.geometry.type}))}));
  assert.equal(hits.length,0,'Cover-contracted camera puts opaque hero geometry over the free-aim reticle');
 }finally{x.dispose();}
});
