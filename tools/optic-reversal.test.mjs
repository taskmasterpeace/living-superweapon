import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// Actual traveling hose + production pose order, not an idealized target marker.
// Constant velocity isolates articulation; real-input locomotion is tested separately.
export function opticFixture(motion='fly',hz=60,frame={},configure=()=>{}){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));def.frame={...def.frame,...frame};
 configure(def);
 const f=new Fighter(def);
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;f._openSky=true;f.hasAimWorld=true;f.energyInfinite=true;f.level=10;
 f.flying=motion!=='strafe';f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?50:0,0);
 f.vel.set(motion==='strafe'?14:0,motion==='rise'?25:motion==='descend'?-25:0,motion==='fly'?45:0);
 const key=Object.keys(f.slots).find(k=>f.slots[k].def.type==='beam'&&f.slots[k].def.faceOrigin);
 const aim=(degrees,elevation=0)=>{
  const yaw=degrees*Math.PI/180;f.facing=yaw;f.aim.set(Math.sin(yaw),0,Math.cos(yaw));
  f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+elevation;
  f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 };
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 aim(0);for(let i=0;i<hz;i++)step();
 runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
 for(let i=0;i<hz;i++)step();
 return {f,g,key,dt,aim,step,close(){combat.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly','rise','descend'])
test(`optic reversal retains anatomical neck and physical beam alignment during ${motion} at ${hz} Hz`,()=>{
 const {f,key,aim,step,close}=opticFixture(motion,hz),velocity=f.vel.clone();
 const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
 try{
  let maxNeck=0,minAlignment=1,atNeck=0,atAlignment=0,minGround=1;
  for(let frame=0;frame<hz*3;frame++){
   if(frame===0)aim(170,25);
   if(frame===hz)aim(-100,-30);
   if(frame===hz*2)aim(5,60);
   step();
   const head=forward(f.parts.head),torso=forward(f.parts.torso),beam=f.slots[key].active;
   const neck=head.angleTo(torso),alignment=head.dot(beam.dir);
   if(neck>maxNeck){maxNeck=neck;atNeck=frame;}
   if(alignment<minAlignment){minAlignment=alignment;atAlignment=frame;}
   assert.ok(f.vel.distanceTo(velocity)<1e-8,'turning a visual emitter cannot stop or redirect movement');
   if(motion==='strafe')minGround=Math.min(minGround,f._groundMotion.weight);
  }
  const detail=JSON.stringify({neckDegrees:maxNeck*180/Math.PI,atNeck,beamErrorDegrees:Math.acos(minAlignment)*180/Math.PI,atAlignment,minGround});
  assert.ok(maxNeck<=1.05001&&minAlignment>.985&&minGround>.9,detail);
 }finally{close();}
});

for(const side of [-1,1])for(const scale of [.65,1,1.5])
test(`scaled optic reversals keep visible forearm/fist surfaces outside the trunk (${side}, ${scale})`,()=>{
 const {f,aim,step,close}=opticFixture('strafe',60,{scale}),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 f.vel.x*=side;
 try{
  let crossings=0,first=null,lowest=Infinity;
  for(let frame=0;frame<180;frame++){
   if(frame===0)aim(side*170,25);if(frame===60)aim(side*-100,-30);if(frame===120)aim(side*5,60);
   step();const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
    const pos=surface.mesh.geometry.attributes.position;
    // Test the actual deforming visible lower-arm rows, not hidden FK drivers.
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(pos,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     if(inside(point,inverse)){crossings++;first??={frame,side:arm===f.parts.armL?'left':'right',part:'forearm',row,j};}
    }
    const fist=arm.children[2],vertices=fist.geometry.attributes.position;
    for(let j=0;j<vertices.count;j++){
     point.fromBufferAttribute(vertices,j).applyMatrix4(fist.matrixWorld);
     if(inside(point,inverse)){crossings++;first??={frame,part:'fist',j};}
    }
   }
   for(const leg of [f.parts.legL,f.parts.legR]){
    const boot=leg.userData.boot,vertices=boot.geometry.attributes.position;
    for(let j=0;j<vertices.count;j++)lowest=Math.min(lowest,point.fromBufferAttribute(vertices,j).applyMatrix4(boot.matrixWorld).y);
   }
  }
  assert.equal(crossings,0,JSON.stringify(first));assert.ok(lowest>-.03,`boot floor penetration ${lowest}`);
 }finally{close();}
});

for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly'])
test(`rapid optic reacquisition does not outpace its neck support (${motion}, ${hz} Hz)`,()=>{
 const {f,key,aim,step,close}=opticFixture(motion,hz),velocity=f.vel.clone();
 const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
 try{
  let neck=0,error=0;
  for(let i=0;i<hz*3;i++){
   const alternate=Math.floor(i/hz/.15)%2;aim(alternate?-10:170,alternate?-30:25);step();
   const head=forward(f.parts.head);neck=Math.max(neck,head.angleTo(forward(f.parts.torso)));error=Math.max(error,head.angleTo(f.slots[key].active.dir));
  }
  assert.ok(neck<=1.05001,`neck ${neck*180/Math.PI} degrees`);
  assert.ok(error<Math.acos(.985),`eye/ray error ${error*180/Math.PI} degrees`);
  assert.ok(f.vel.distanceTo(velocity)<1e-8);
 }finally{close();}
});

for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly'])test(`preparing a chest attack cannot hide live optic steering during ${motion} at ${hz} Hz`,()=>{
 const {f,g,key,aim,step,dt,close}=opticFixture(motion,hz,{},def=>{
  def.abilities.lmb.steer=1;
  def.abilities.rmb={type:'beam',name:'Chest preparation fixture',chest:true,charge:true,maxCharge:20,steer:2,cost:1,dps:1,kiPerSec:1,color:'#ffc24a'};
 });
 try{
  let maxError=0,maxNeck=0;
  for(let i=0;i<hz*3;i++){
   runSlot(f,'rmb',{pressed:i===0,held:true,released:false,dt},g);
   if(i===0)aim(170,25);if(i===hz)aim(-100,-30);if(i===hz*2)aim(5,60);step();
   assert.ok(f.slots.rmb.charging&&!f.slots.rmb.active,'the competing chest channel must only be preparing, not emitting');
   const head=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.head.getWorldQuaternion(new THREE.Quaternion()));
   const torso=new THREE.Vector3(0,0,1).applyQuaternion(f.parts.torso.getWorldQuaternion(new THREE.Quaternion()));
   maxNeck=Math.max(maxNeck,head.angleTo(torso));
   maxError=Math.max(maxError,head.angleTo(f.slots[key].active.dir));
  }
  assert.ok(maxError<Math.acos(.985),`preparing chest displaced optic ray by ${maxError*180/Math.PI} degrees`);
  assert.ok(maxNeck<=1.05001,`preparing chest exceeded neck cone: ${maxNeck*180/Math.PI} degrees`);
 }finally{close();}
});
