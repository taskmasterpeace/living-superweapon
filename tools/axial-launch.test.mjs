import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

// A turning pose is preparation, not emitted energy. Test actual first packets,
// a short acquisition deadline and no collision/voice/light during preparation.
for(const hz of [30,60,120])for(const motion of ['strafe','hover','fly','rise','descend'])for(const together of [false,true])
test(`sharp chest launch stays on its physical emitter (${motion}, together=${together}, ${hz} Hz)`,()=>{
 const def=structuredClone(ROSTER.find(d=>d.id==='sol')),common={type:'beam',cost:1,kiPerSec:1,dps:1,color:'#ffc54a'};
 def.abilities={lmb:{...common,name:'Optic',faceOrigin:true,steer:8},rmb:{...common,name:'Chest',chest:true,steer:1}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:motion!=='strafe'});
 f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?50:0,0);
 f.vel.set(motion==='strafe'?14:0,motion==='rise'?25:motion==='descend'?-25:0,motion==='fly'?45:0);
 const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=()=>{f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 const start=key=>runSlot(f,key,{pressed:true,held:true,released:false,dt},g);
 const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
 const inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  aim(0);for(let i=0;i<hz;i++)step();if(!together)start('lmb');for(let i=0;i<hz;i++)step();
  aim(170,25);if(together)start('lmb');start('rmb');
  const position=f.pos.clone(),velocity=f.vel.clone(),launched={lmb:null,rmb:null};
  let eye=0,chest=0,neck=0,preparing=0;
  for(let i=0;i<hz;i++){
   step();const head=forward(f.parts.head),torso=forward(f.parts.torso);
   for(const key of ['lmb','rmb']){
    const beam=f.slots[key].active;
    if(beam.emissionAge>0){
     launched[key]??=(i+1)*dt;
     const error=(key==='lmb'?head:torso).angleTo(beam.dir);if(key==='lmb')eye=Math.max(eye,error);else chest=Math.max(chest,error);
    }else{
     preparing++;
     assert.equal(beam.pn,0,'Preparation cannot carry packets or hit volumes');
     assert.equal(beam.grp.visible,false,'Do not draw an unfired beam');
     assert.equal(beam.light.intensity,0,'Unfired beam must not light the arena');
     assert.equal(beam._voice,null,'Sustained audio starts on emission');
    }
   }
   neck=Math.max(neck,head.angleTo(torso));
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),positions=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(positions,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Startup forearm/trunk crossing at frame ${i}, row ${row}, vertex ${j}`);
    }
    const fist=arm.children[2],vertices=fist.geometry.attributes.position;
    for(let j=0;j<vertices.count;j++){point.fromBufferAttribute(vertices,j).applyMatrix4(fist.matrixWorld);assert.ok(!inside(point,inverse),`Startup fist/trunk crossing at frame ${i}, vertex ${j}`);}
   }
  }
  if(['hover','rise','descend'].includes(motion))assert.ok(preparing>0,'A rearward chest shot requires a physical turn before launch');
  for(const key of ['lmb','rmb'])assert.ok(launched[key]!==null&&launched[key]<=.3,`${key} failed timely acquisition: ${launched[key]}`);
  assert.ok(f.pos.distanceTo(position)<1e-8&&f.vel.distanceTo(velocity)<1e-8,'Turn-to-fire must not redirect travel physics');
  assert.ok(eye<Math.acos(.985)&&chest<Math.acos(.985)&&neck<=1.05001,JSON.stringify({eye:eye*180/Math.PI,chest:chest*180/Math.PI,neck:neck*180/Math.PI}));
 }finally{combat.dispose();f.dispose();}
});
