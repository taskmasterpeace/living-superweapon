import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
function fixture(motion,hz,reverse=false,initial=['lmb','rmb'],frame={}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.frame={...def.frame,...frame};
 const common={type:'beam',cost:1,kiPerSec:1,dps:1,color:'#ffc54a'};
 def.abilities={lmb:{...common,name:'Fast optic',faceOrigin:true,steer:8},rmb:{...common,name:'Slow chest',chest:true,steer:1}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:motion!=='strafe'});
 f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?50:0,0);
 f.vel.set(motion==='strafe'?14:0,motion==='rise'?25:motion==='descend'?-25:0,motion==='fly'?45:0);
 const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 const start=key=>runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
 aim(0);for(let i=0;i<hz;i++)step();for(const key of reverse?[...initial].reverse():initial)start(key);for(let i=0;i<hz;i++)step();
 return {f,g,dt,aim,step,start,close(){combat.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly','rise','descend'])for(const reverse of [false,true])
test(`live eye/chest cofire keeps both emitters anatomical (${motion}, ${hz} Hz, reverse=${reverse})`,()=>{
 const {f,aim,step,close}=fixture(motion,hz,reverse),position=f.pos.clone(),velocity=f.vel.clone();
 try{
  let eye=0,chest=0,neck=0,separation=0,atChest=null;
  for(let i=0;i<hz*3;i++){
   if(i===0)aim(170,25);if(i===hz)aim(-100,-30);if(i===hz*2)aim(5,60);step();
   const head=forward(f.parts.head),torso=forward(f.parts.torso),optic=f.slots.lmb.active,core=f.slots.rmb.active;
   assert.ok(optic.sustaining&&core.sustaining,'Neither power may be silently disabled to resolve the pose');
   eye=Math.max(eye,head.angleTo(optic.dir));const error=torso.angleTo(core.dir);if(error>chest){chest=error;atChest={i,root:f.obj.rotation.toArray(),bodyPitch:f.parts.body.rotation.x,torso:f.parts.torso.rotation.toArray(),ray:core.dir.toArray(),torsoForward:torso.toArray(),correction:f._chestPose.rotation.angleTo(new THREE.Quaternion())};}neck=Math.max(neck,head.angleTo(torso));separation=Math.max(separation,optic.dir.angleTo(core.dir));
  }
  const detail=JSON.stringify({eye:eye*180/Math.PI,chest:chest*180/Math.PI,neck:neck*180/Math.PI,separation:separation*180/Math.PI,atChest});
  assert.ok(eye<Math.acos(.985)&&chest<Math.acos(.985)&&neck<=1.05001,detail);
  assert.ok(separation>.4,'Independent eye steering must still lead the slower chest');
  assert.ok(f.vel.distanceTo(velocity)<1e-8&&f.pos.distanceTo(position)<1e-8,'Presentation changed physics');
 }finally{close();}
});

for(const motion of ['strafe','hover','fly','descend'])for(const scale of [.65,1,1.5])
test(`cofire reversals keep visible forearms and fists clear (${motion}, scale ${scale})`,()=>{
 const {f,aim,step,close}=fixture(motion,60,false,undefined,{scale}),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  for(let frame=0;frame<180;frame++){
   if(frame===0)aim(170,25);if(frame===60)aim(-100,-30);if(frame===120)aim(5,60);step();
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),positions=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(positions,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Forearm/trunk crossing at frame ${frame}, row ${row}, vertex ${j}`);
    }
    const fist=arm.children[2],vertices=fist.geometry.attributes.position;
    for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(fist.matrixWorld);assert.ok(!inside(point,inverse),`Fist/trunk crossing at frame ${frame}, vertex ${j}`);}
   }
  }
 }finally{close();}
});

test('eye launch beside an emitting chest constrains its first packets, not its captured target',()=>{
 const {f,g,dt,aim,step,start,close}=fixture('hover',60,false,['rmb']);
 try{
  aim(170,25);const commanded=f.aimWorld.clone();start('lmb');const eye=f.slots.lmb.active,chest=f.slots.rmb.active;
  assert.ok(eye._launchTarget.distanceTo(commanded)<1e-8,'Launch command must be captured before articulation');
  step();
  assert.ok(eye.dir.angleTo(chest.dir)<=1.00001);
  assert.ok(forward(f.parts.head).dot(eye.dir)>.985);
  const oldest=new THREE.Vector3().fromArray(eye.pvel,(eye.pn-1)*3).normalize();
  assert.ok(oldest.angleTo(chest.dir)<1.04,'First energy packet ignored the physical emitter cone');
  assert.ok(eye.dir.dot(commanded.sub(eye.muzzle).normalize())<.9,'Behind-body launch should wait for the body, not bypass it');
  assert.ok(g.projectiles.list.includes(eye));
 }finally{close();}
});

test('prediction is read-only and projectile-only steps continue steering',()=>{
 const {f,g,dt,aim,close}=fixture('hover',60);
 try{
  aim(170);const eye=f.slots.lmb.active,chest=f.slots.rmb.active,prior=chest.dir.clone(),eyePrior=eye.dir.clone(),out=new THREE.Vector3();
  for(let i=0;i<8;i++)eye.predictDirection(out,dt);
  assert.ok(chest.dir.distanceTo(prior)<1e-10&&eye.dir.distanceTo(eyePrior)<1e-10,'Pose prediction mutated a physical ray');
  for(let i=0;i<60;i++)g.projectiles.update(dt,g);
  assert.ok(chest.dir.angleTo(prior)>1,'Steering cache froze when no animation was sampled');
  assert.ok(eye.dir.angleTo(chest.dir)<=1.00001);
  assert.equal(g.projectiles._predictingBatch,false);
 }finally{close();}
});

for(const hz of [30,60,120])for(const reverse of [false,true])
test(`chest depletion cannot detach surviving optic emission (${hz} Hz, reverse=${reverse})`,()=>{
 const {f,dt,aim,step,close}=fixture('hover',hz,reverse);
 try{
  aim(170);for(let i=0;i<Math.round(hz*.2);i++)step();
  const eye=f.slots.lmb.active,chest=f.slots.rmb.active;
  f.energyInfinite=false;eye.kiPerSec=1;chest.kiPerSec=100;f.ki=dt*1.1;step();
  assert.ok(eye.sustaining&&!chest.sustaining,'Existing payment order must preserve the affordable eye power');
  assert.ok(forward(f.parts.head).dot(eye.dir)>.985,`Depletion eye error ${forward(f.parts.head).angleTo(eye.dir)*180/Math.PI} degrees`);
  f.energyInfinite=true;for(let i=0;i<hz;i++)step();
  assert.ok(forward(f.parts.head).dot(eye.dir)>.985,'Next frame must recover from the released support');
 }finally{close();}
});

test('cofire predictions and physical rays are independent of beam insertion order',()=>{
 const a=fixture('hover',60),b=fixture('hover',60,true);
 try{
  a.aim(170,25);b.aim(170,25);
  for(let i=0;i<180;i++){a.step();b.step();for(const key of ['lmb','rmb'])assert.ok(a.f.slots[key].active.dir.distanceTo(b.f.slots[key].active.dir)<1e-7,`${key} order-dependent at ${i}`);}
 }finally{a.close();b.close();}
});

test('releasing chest frees eye steering without redirecting already-emitted packets',()=>{
 const {f,g,dt,aim,step,close}=fixture('hover',60);
 try{
  aim(170);for(let i=0;i<12;i++)step();
  const eye=f.slots.lmb.active,chest=f.slots.rmb.active;chest.end();
  const removed=Math.min(chest.pn-2,Math.floor((chest._streamClock+dt)/chest._streamStep));
  const oldVelocity=new THREE.Vector3().fromArray(chest.pvel,(removed+1)*3),oldPosition=new THREE.Vector3().fromArray(chest.path,(removed+1)*3);
  step();assert.ok(new THREE.Vector3().fromArray(chest.pvel,3).distanceTo(oldVelocity)<1e-5,'Released packet was re-aimed');
  assert.ok(new THREE.Vector3().fromArray(chest.path,3).distanceTo(oldPosition.addScaledVector(oldVelocity,dt))<1e-4,'Released packet stopped travelling');
  for(let i=0;i<120;i++)step();
  assert.ok(eye.sustaining&&forward(f.parts.head).dot(eye.dir)>.985);
  assert.ok(eye.dir.dot(f.aimWorld.clone().sub(eye.muzzle).normalize())>.9999,'Eye never recovered independent steering');
  assert.ok(g.projectiles.list.includes(eye));
 }finally{close();}
});
