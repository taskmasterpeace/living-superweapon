import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

function fixture(motion,hz,steer=0,{style='palm',scale=1,side=1}={}){
 const def=structuredClone(ROSTER.find(d=>d.id=== (style==='two-hand'?'kano':'sol')));def.frame={...def.frame,scale};
 def.abilities={lmb:{type:'beam',castStyle:style,name:'Hand fixture',cost:1,kiPerSec:1,dps:1,steer}};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,world),g=combat.game,dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:motion==='fly',gait:motion==='fly'?'airborne':'grounded'});
 f.pos.set(0,f.flying?50:0,0);f.vel.set(motion==='strafe'?14*scale*side:0,0,motion==='fly'?45:0);
 const aim=(yaw,height=0)=>{f.facing=yaw*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 return {f,g,dt,aim,step,close(){combat.dispose();f.dispose();}};
}
const front=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
for(const hz of [30,60,120])for(const motion of ['stand','strafe','fly'])
test(`a non-steering palm hose keeps its support on emitted energy, not a new cursor (${motion}, ${hz} Hz)`,()=>{
 const {f,g,dt,aim,step,close}=fixture(motion,hz);
 try{
  aim(0);for(let i=0;i<hz;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);for(let i=0;i<hz;i++)step();
  const beam=f.slots.lmb.active,emitted=beam.dir.clone(),position=f.pos.clone(),velocity=f.vel.clone();aim(170);
  for(let i=0;i<hz;i++){
   step();
   // The chest normal points partly down in prone flight. Requiring its full
   // 3-D vector to follow the beam would reward standing the flyer upright.
   // Heading must stay with emitted energy; the pelvis must retain travel.
   const support=front(f.parts.torso),heading=support.clone().setY(0).normalize(),shotHeading=emitted.clone().setY(0).normalize();
   assert.ok(heading.dot(shotHeading)>.98,`Frame ${i}: support yaw followed the new cursor instead of the emitted shot`);
   if(motion==='fly'){
    const pelvisUp=new THREE.Vector3(0,1,0).applyQuaternion(f.parts.pelvis.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(pelvisUp.dot(velocity.clone().normalize())>.9,'Firing must preserve the actual pelvis flight axis, not only an outer group lean');
   }else assert.ok(support.dot(emitted)>.85,'Grounded support lost the shot');
   const palm=new THREE.Vector3(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(palm.dot(beam.dir)>.98,'The supporting turn lost the actual emitting palm');
   assert.ok(beam.dir.distanceTo(emitted)<1e-8,'Test depends on the actual non-steering power remaining unchanged');
  }
  assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Pose support must not redirect travel');
  if(motion==='strafe')assert.ok(f._groundMotion.weight>.95,'Supporting an arm cannot cancel its source gait');
 }finally{close();}
});

for(const hz of [30,60,120])for(const motion of ['strafe','fly'])for(const side of [-1,1])
test(`short broad paired caster keeps real elbows and palms clear through live turns and release (${motion}, ${side}, ${hz} Hz)`,()=>{
 const {f,g,dt,aim,step,close}=fixture(motion,hz,8,{style:'two-hand',scale:.65,side});
 const inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  aim(0);for(let i=0;i<hz;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);
  for(let i=0;i<hz*5;i++){
   if(i===hz)aim(side*170,25);if(i===hz*2)aim(side*-100,-30);if(i===hz*3)aim(side*5,60);
   if(i===hz*4)runSlot(f,'lmb',{pressed:false,held:false,released:true,dt},g);
   step();const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),vertices=surface.mesh.geometry.attributes.position;
    const join=surface.rows.findIndex(row=>row.driver===arm.children[0]);
    for(let row=0;row<=join;row++)for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Frame ${i}: visible forearm/elbow row ${row}, column ${j} inside trunk`);
    }
    const hand=arm.children[2];for(let v=0;v<hand.geometry.attributes.position.count;v++){
     hand.getVertexPosition(v,point).applyMatrix4(hand.matrixWorld);assert.ok(!inside(point,inverse),`Frame ${i}: fist vertex ${v} inside trunk`);
    }
    const beam=f.slots.lmb.active;
    if(beam?.sustaining){
     const palm=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
     assert.ok(palm.dot(beam.dir)>.98,`Frame ${i}: final wrist lost the actual emitted energy`);
    }
   }
  }
 }finally{close();}
});

for(const hz of [30,60,120])for(const motion of ['strafe','fly'])
test(`moving palm reversals respect the final pelvis-to-torso budget (${motion}, ${hz} Hz)`,()=>{
 const {f,g,dt,aim,step,close}=fixture(motion,hz,8),pelvis=new THREE.Quaternion(),torso=new THREE.Quaternion();
 try{
  aim(0);for(let i=0;i<hz;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);for(let i=0;i<hz;i++)step();
  const position=f.pos.clone(),velocity=f.vel.clone(),beam=f.slots.lmb.active;let maxTurn=0,worst=-1;
  for(let i=0;i<hz*6;i++){
   if(i%hz===0)aim(...[[170,25],[-100,-30],[5,60],[-170,-80],[90,80],[180,0]][i/hz]);
   step();f.parts.pelvis.getWorldQuaternion(pelvis);f.parts.torso.getWorldQuaternion(torso);
   const turn=pelvis.angleTo(torso)*180/Math.PI;if(turn>maxTurn){maxTurn=turn;worst=i;}
   const palm=new THREE.Vector3(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(new THREE.Quaternion()));
   assert.ok(palm.dot(beam.dir)>.98,`Frame ${i}: the actual palm lost its traveling beam`);
  }
  // Authored gameplay budget, not a claim of anatomical certification. Measure
  // the final rendered parts; capping a local shoulder offset is insufficient.
  assert.ok(maxTurn<=85,`Final torso/pelvis rotation ${maxTurn} degrees at frame ${worst}`);
  assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Pose limits must not redirect travel');
  if(motion==='strafe')assert.ok(f._groundMotion.weight>.95,'Pose limits must preserve the source gait');
 }finally{close();}
});
