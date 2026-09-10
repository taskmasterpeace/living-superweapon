import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {StudioPreview} from '../src/tool/studio-preview.js';
import {StudioAudio} from '../src/tool/studio-audio.js';
import {profileFromDef} from '../src/tool/studio-profile.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {firearmEmitter} from '../src/engine/weapon-emission.js';
import {OBB} from 'three/addons/math/OBB.js';
import {JUMP_CLIPS} from '../src/engine/jump-motion.js';

function fixture({hz=60,scale=1,procedural=false,id='sol'}={}){
 const def=structuredClone(ROSTER.find(d=>d.id===id));def.frame={...def.frame,scale};
 if(procedural)def.model={...def.model,locomotion:'procedural'};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),g=stage.game,dt=1/hz;scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{_openSky:true,flying:false,gait:'grounded',animT:0,energyInfinite:true});f.pos.set(0,0,-50);f.vel.set(0,0,0);f.faceDir(0,1);
 const step=({rise=false,move=true}={})=>{f.flyHeld=rise;f.move({x:0,y:0,z:move?1:0},dt);f.update(dt,g);f.obj.updateMatrixWorld(true);};
 return {f,g,dt,step,close(){stage.dispose();f.dispose();}};
}

for(const hz of [30,60,120])test(`native short jump stays upright and plays takeoff/fall/landing at ${hz}Hz`,()=>{
 const x=fixture({hz}),{f}=x,takes=new Set(),ys=[];try{
  for(let i=0;i<hz;i++)x.step();
  for(let i=0;i<hz*2;i++){
   x.step({rise:i<Math.max(1,Math.round(hz/15))});ys.push(f.pos.y);if(f._jumpMotion?.take)takes.add(f._jumpMotion.take);
   assert.equal(f.flying,false,'A short input must remain ballistic');
   assert.ok(Math.abs(f.parts.g.rotation.x)<.35,`Ballistic jump became prone: ${f.parts.g.rotation.x}`);
  }
  assert.ok(Math.max(...ys)>4.9&&Math.max(...ys)<5.5,'Native 25.5/60 ballistic arc must remain unchanged');
  assert.deepEqual([...takes].sort(),['Jump_Land','Jump_Loop','Jump_Start']);assert.equal(f.pos.y,0);assert.equal(f._jumpMotion?.take,null);
 }finally{x.close();}
});

test('holding jump hands off to the existing powered cruise family',()=>{
 const x=fixture(),{f}=x;try{
  for(let i=0;i<120;i++)x.step({rise:true});assert.equal(f.flying,true);
  f.flyHeld=false;f.pos.set(0,40,0);f.vel.set(0,0,50);f._updateGait(1/60);
  for(let i=0;i<90;i++){f.animT+=1/60;f._animate(1/60);}
  assert.ok(f.parts.g.rotation.x>.8,'Powered cruise must retain its authored pitch');assert.equal(f._jumpMotion?.take,null);
 }finally{x.close();}
});

for(const hz of [30,60,120])for(const boundary of ['powered','landing'])test(`native first ${boundary} boundary bridges ballistic legs at ${hz}Hz`,t=>{
 const x=fixture({hz}),{f}=x;try{
  for(let i=0;i<hz;i++)x.step();let seen=false;
  const parts=[f.parts.legL,f.parts.legR,f.parts.legL.userData.knee,f.parts.legR.userData.knee];
  for(let i=0;i<hz*2;i++){
   const before=parts.map(p=>p.quaternion.clone()),bodyBefore=f.parts.body.quaternion.clone(),wasFlight=f.flying,wasTake=f._jumpMotion?.take;
   x.step({rise:boundary==='powered'||i<Math.max(1,Math.round(hz/15))});
   const bodyDelta=f.parts.body.quaternion.angleTo(bodyBefore);
   assert.ok(bodyDelta/x.dt<12+.001,`${boundary} body exceeded articulated rate budget: ${bodyDelta/x.dt} rad/s at frame ${i}`);
   if(boundary==='powered'?!wasFlight&&f.flying:wasTake==='Jump_Loop'&&f._jumpMotion?.take==='Jump_Land'){
    seen=true;const delta=Math.max(...parts.map((p,j)=>p.quaternion.angleTo(before[j])));
    t.diagnostic(`First ${boundary} boundary at ${hz}Hz: maximum leg joint delta ${(delta*180/Math.PI).toFixed(4)} degrees`);
    t.diagnostic(`First ${boundary} body delta ${(bodyDelta*180/Math.PI).toFixed(4)} degrees, ${(bodyDelta/x.dt).toFixed(4)} rad/s`);
    assert.ok(bodyDelta/x.dt<3,`${boundary} first body frame snapped at ${bodyDelta/x.dt} rad/s`);
    assert.ok(delta<.1,`${boundary} snapped ${delta*180/Math.PI} degrees on its first native frame`);
    assert.ok(f._groundTransition.remaining>0,'A source-family transition must begin the finite visual bridge');
    const remaining=f._groundTransition.remaining,held=parts.map(p=>p.quaternion.clone()),bodyHeld=f.parts.body.quaternion.clone();f._animate(0);
    for(let j=0;j<8;j++)f._animate(0);assert.equal(f._groundTransition.remaining,remaining);
    assert.ok(parts.every((p,j)=>p.quaternion.angleTo(held[j])<.03),'Zero-dt boundary redraw loses the bridged legs');
    assert.ok(f.parts.body.quaternion.angleTo(bodyHeld)<1e-5,'Zero-dt boundary redraw changes the source body carrier');
    f.hitstop=.001;f.update(x.dt,x.g);assert.equal(f._groundTransition.remaining,remaining);
    assert.ok(f.parts.body.quaternion.angleTo(bodyHeld)<1e-5,'Partial hitstop changes the bridged body carrier');
   }
  }
  assert.ok(seen,'Native transition was never exercised');assert.equal(f._groundTransition.remaining,0);
 }finally{x.close();}
});

test('source animation and procedural fallback produce identical native SARGE jump physics',()=>{
 const a=fixture({id:'sarge'}),b=fixture({id:'sarge',procedural:true});try{
  for(let i=0;i<180;i++){for(const x of [a,b])x.step({rise:i>=60&&i<64});
   assert.ok(a.f.pos.distanceTo(b.f.pos)<1e-9&&a.f.vel.distanceTo(b.f.vel)<1e-9,'Articulation changed the lower-speed fighter trajectory');
  }
 }finally{a.close();b.close();}
});

for(const hz of [30,60,120])for(const scale of [.65,1,1.5])test(`jump preserves segment lengths and landing boot support (${hz}Hz, scale ${scale})`,()=>{
 const x=fixture({hz,scale}),{f}=x;try{
  for(let i=0;i<hz;i++)x.step();
  const kneePositions=[f.parts.legL,f.parts.legR].map(l=>l.userData.knee.position.clone());
  for(let i=0;i<hz*1.7;i++){
   x.step({rise:i<hz/15});
   for(const [j,l]of [f.parts.legL,f.parts.legR].entries())assert.ok(l.userData.knee.position.distanceTo(kneePositions[j])<1e-7,'Source must not stretch a thigh');
   for(const arm of [f.parts.armL,f.parts.armR])assert.ok(Math.abs(arm.children[2].position.distanceTo(new THREE.Vector3(0,-arm.userData.upperLength,0))-arm.userData.foreLength)<1e-5);
   const low=Math.min(...[f.parts.legL,f.parts.legR].map(l=>new THREE.Box3().setFromObject(l.userData.boot).min.y));
   if(f.pos.y<.02&&f._jumpMotion?.mode==='landing')assert.ok(low>-.025&&low<.15*scale,`Landing support lost: ${low}, frame ${i}, y ${f.pos.y}, gait ${f.gait}, takeTime ${f._jumpMotion.time}, weight ${f._jumpMotion.weight}, bridge ${f._groundTransition.remaining}`);
   if(f.pos.y>2)assert.ok(low>.3,'Source cannot snap feet to the floor in midair');
  }
 }finally{x.close();}
});

test('paused and live-hitstop jump sampling holds and form rebuild does not bake its old overlay',()=>{
 const x=fixture(),{f}=x;try{
  for(let i=0;i<15;i++)x.step({rise:i<4});f._animate(0);
  const parts=[f.parts.body,f.parts.legL,f.parts.legR,f.parts.legL.userData.knee,f.parts.legR.userData.knee],before=parts.map(p=>p.quaternion.clone()),time=f._jumpMotion.time;
  for(let i=0;i<15;i++)f._animate(0);assert.equal(f._jumpMotion.time,time);
  assert.ok(parts.every((p,i)=>p.quaternion.angleTo(before[i])<1e-5),'Paused jump accumulates articulation');
  f.hitstop=.4;for(let i=0;i<10;i++)f.update(1/60,x.g);assert.equal(f._jumpMotion.time,time);
  assert.ok(parts.every((p,i)=>p.quaternion.angleTo(before[i])<1e-5),'Hitstop advances jump');
  f.hitstop=.001;f.update(1/60,x.g);assert.equal(f._jumpMotion.time,time,'The final partial hitstop frame did not integrate physics and cannot consume clip time');
  f.hitstop=0;f.applyForm({frame:{scale:1.2}});assert.equal(f._jumpMotion,null);
  f.pos.y=0;f.vel.set(0,0,0);f.gait='grounded';for(let i=0;i<120;i++)x.step({move:false});
  assert.ok(f.parts.body.quaternion.angleTo(new THREE.Quaternion())<.005,'Source lean was baked into form rest');
 }finally{x.close();}
});

for(const state of ['guard','melee','launch','grab','ko'])test(`jump source yields immediately to ${state}`,()=>{
 const x=fixture(),{f}=x;try{
  for(let i=0;i<15;i++)x.step({rise:i<4});assert.ok(f._jumpMotion.take);
  if(state==='guard'){f.guarding=true;f.poseGuard=1;}else if(state==='melee'){f.poseStrike=1;f.mstate='jab';}
  else if(state==='launch')f.launchT=1;else if(state==='grab')f.grabbedBy={grabState:'clinch'};else f.state='ko';
  f._animate(1/60);assert.equal(f._jumpMotion.take,null);assert.equal(f._jumpMotion.applied,false);
 }finally{x.close();}
});

test('procedural locomotion selection disables imported jump but never makes it powered flight',()=>{
 const x=fixture({procedural:true}),{f}=x;try{
  for(let i=0;i<70;i++){x.step({rise:i<4});assert.ok(Math.abs(f.parts.g.rotation.x)<.35);assert.equal(f._jumpMotion?.take,null);}
 }finally{x.close();}
});

test('actual KO/respawn retires jump playback without discarding its restorable rig snapshot',()=>{
 const x=fixture(),{f,g}=x;try{
  for(let i=0;i<15;i++)x.step({rise:i<4});assert.ok(f._jumpMotion.take);f._ko();
  assert.equal(f._jumpMotion.take,null,'A dead life cannot keep an active source take');
  f._updateKO(4,g);f._animate(0);assert.equal(f._jumpMotion.take,null,'Respawn must not play the old landing');
  assert.ok(f.parts.body.quaternion.angleTo(new THREE.Quaternion())<.01,'Ragdoll restore retained a source bend');
 }finally{x.close();}
});

test('unarmed source motion keeps real forearm and boot volumes separate through takeoff and landing',()=>{
 const x=fixture(),{f}=x,probe=trunkProbe(f.parts.torso),inverse=new THREE.Matrix4(),vertex=new THREE.Vector3();try{
  for(let i=0;i<120;i++){
   x.step({rise:i<4});inverse.copy(f.parts.torso.matrixWorld).invert();
   for(const arm of [f.parts.armL,f.parts.armR]){const mesh=arm.children[1],vertices=mesh.geometry.attributes.position;
    for(let j=0;j<vertices.count;j+=3){vertex.fromBufferAttribute(vertices,j).applyMatrix4(mesh.matrixWorld);assert.ok(!probe(vertex,inverse),`Neutral source forearm crossed torso at ${i}`);}
   }
   const boxes=[f.parts.legL,f.parts.legR].map(l=>{const b=l.userData.boot;b.geometry.computeBoundingBox();return new OBB().fromBox3(b.geometry.boundingBox).applyMatrix4(b.matrixWorld);});
   assert.ok(!boxes[0].intersectsOBB(boxes[1]),`Source boots crossed at ${i}`);
  }
 }finally{x.close();}
});

test('a long natural fall wraps the imported loop and a missing take leaves a procedural fallback',()=>{
 const x=fixture(),{f}=x;try{
  f.pos.y=100;f.vel.set(0,-10,0);f.gait='airborne';f._groundTransition=null;const poses=[];
  for(let i=0;i<301;i++){f.animT+=1/60;f._animate(1/60);if(i===149||i===299)poses.push(f.parts.legL.quaternion.clone());}
  assert.equal(f._jumpMotion.take,'Jump_Loop');assert.ok(poses[0].angleTo(poses[1])<1e-5,'Loop wrap cannot reset to bind');
  const clip=JUMP_CLIPS.fall;try{delete JUMP_CLIPS.fall;f._animate(1/60);assert.equal(f._jumpMotion.take,null);assert.ok(f.parts.legL.quaternion.toArray().every(Number.isFinite));}finally{JUMP_CLIPS.fall=clip;}
 }finally{x.close();}
});

for(const source of ['hand','chest','eye','rifle'])test(`${source} emitter remains aimed through native jump and landing`,()=>{
 const x=fixture({id:source==='rifle'?'sarge':'sol'}),{f,g}=x;try{
  if(source!=='rifle')Object.assign(f.slots.lmb.def,{type:'beam',charge:false,cost:0,kiPerSec:0,faceOrigin:source==='eye',chest:source==='chest',castStyle:source==='eye'?'optic-focus':source==='chest'?'chest-brace':'palm'});
  f.level=10;f.hasAimWorld=true;const probe=trunkProbe(f.parts.torso),inverse=new THREE.Matrix4(),vertex=new THREE.Vector3();
  for(let i=0;i<120;i++){
   f.aimWorld.set(30,15,160);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();runSlot(f,'lmb',{pressed:i===0,held:i<90,released:i===90,dt:x.dt},g);
   x.step({rise:i>=30&&i<34});g.projectiles.update(x.dt,g);
   const beam=f.slots.lmb.active;
   if(i>20&&i<90){
    const part=source==='eye'?f.parts.head:source==='chest'?f.parts.torso:f.parts.armR.children[2];
    const ray=beam?.sustaining?beam.dir:f.aimWorld.clone().sub(part.getWorldPosition(new THREE.Vector3())).normalize();
    const emitter=source==='rifle'?firearmEmitter(f,f.slots.lmb.def):null;
    const direction=new THREE.Vector3(0,source==='hand'?-1:0,source==='hand'?0:1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
    if(emitter){direction.set(0,-1,0).applyQuaternion(emitter.hand.getWorldQuaternion(new THREE.Quaternion()));ray.copy(f.aimWorld).sub(emitter.socket.getWorldPosition(new THREE.Vector3())).normalize();}
    assert.ok(direction.dot(ray)>.975,`${source} rendered emitter lost its actual output at frame ${i}`);
   }
   if(i>20){inverse.copy(f.parts.torso.matrixWorld).invert();for(const arm of [f.parts.armL,f.parts.armR]){
    const mesh=arm.children[1],vertices=mesh.geometry.attributes.position;
    for(let j=0;j<vertices.count;j+=3){vertex.fromBufferAttribute(vertices,j).applyMatrix4(mesh.matrixWorld);assert.ok(!probe(vertex,inverse),`${source} forearm penetrated torso at frame ${i}`);}
   }}
  }
 }finally{x.close();}
});

test('Studio Ground jump replays native short input deterministically and seeking stays silent',()=>{
 const x=fixture(),camera=x.g.world.camera,controls={target:new THREE.Vector3(0,12,0),update(){}},sound=new StudioAudio();
 const def=structuredClone(ROSTER.find(d=>d.id==='sol')),p=Object.assign(Object.create(StudioPreview.prototype),{fighter:x.f,def,profile:profileFromDef(def),scene:x.g.scene,state:'groundJump',view:'front',controls,camera,travelDelta:new THREE.Vector3(),time:0,
  combat:new StudioCombat(x.g.scene,x.g.world,sound.audio),sound,chase:{...x.g.world,snapChase(){},sun:{target:{position:new THREE.Vector3()},position:new THREE.Vector3()},sunOff:new THREE.Vector3()},renderer:{render(){}},floor:{position:new THREE.Vector3()},grid:{position:new THREE.Vector3()},onFrame(){}});
 try{
  p.seek(.75);const first=p.fighter.pos.clone();assert.ok(first.y>2&&!p.fighter.flying,'Studio needs native ballistic flight, not hover');
  assert.ok(p.fighter._jumpMotion?.take,'Studio must use the production imported jump channel');
  p.seek(2);assert.equal(p.fighter.pos.y,0);p.seek(.75);assert.ok(p.fighter.pos.distanceTo(first)<1e-8,'Seek has historical state');
  assert.equal(sound.active,false);p.setState('hover');assert.equal(p.fighter._jumpMotion?.take,null);
 }finally{p.combat.dispose();p.fighter.dispose();sound.dispose();x.close();}
});
