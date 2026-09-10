import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {World} from '../src/engine/world.js';
import {constrainArmCover} from '../src/engine/arm-cover.js';
import {reachArm} from '../src/engine/hero-rig.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

function fixture(style='palm',motion='ground',scale=1){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.frame={...def.frame,scale};
 def.abilities={lmb:style==='paired'?{type:'volley',handPattern:'paired',cost:1,interval:.12,spread:0,speed:120,color:'#ffd14a'}:
  {type:'beam',castStyle:style,cost:1,dps:20,kiPerSec:1,steer:12,radius:.1,color:'#ffd14a'}};
 const f=new Fighter(def),scene=new THREE.Scene(),wall={x:0,z:2.4,hx:20,hz:.02};
 const world={scene,cover:[],interiors:[{x:0,z:2.4,hx:20,hz:.02,top:40,walls:[wall]}],hitInteriorWall:World.prototype.hitInteriorWall,ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[f];f._game=g;f._openSky=true;f.energyInfinite=true;f.hasAimWorld=true;f.animT=0;
 f.facing=0;f.aim.set(0,0,1);f.flying=motion==='hover';f.gait=f.flying?'airborne':'grounded';f.pos.set(0,f.flying?10:0,-4);scene.add(f.obj);
 const step=(frame,dt)=>{
  g.time+=dt;f.pos.z=Math.min(0,-4+frame*dt*5);f.vel.set(0,0,f.pos.z<0?5:0);f.obj.position.copy(f.pos);
  if(motion==='strafe')f.vel.x=14*scale;
  f.aimWorld.set(0,f.pos.y+8,80);f.aim3.copy(f.aimWorld).sub(f.pos.clone().add(new THREE.Vector3(0,7,0))).normalize();
  f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);
  runSlot(f,'lmb',{pressed:frame===0,held:frame*dt<2.2,released:frame*dt>=2.2&&(frame-1)*dt<2.2,dt},g);
  f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);
 };
 return {f,g,wall,step,close(){combat.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const style of ['palm','two-hand','paired'])for(const motion of ['ground','hover'])
test(`${style} ${motion} actual hand/forearm meshes stop before nearby cover at ${hz} Hz`,()=>{
 const {f,g,wall,step,close}=fixture(style,motion),crossings=[],bodyCrossings=[],inside=trunkProbe(f.parts.torso);let contacts=0;
 try{
  for(let frame=0;frame<hz*3;frame++){
   step(frame,1/hz);assert.ok(f.pos.z+f.radius<wall.z-wall.hz,'fixture body must remain outside cover');
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR])for(const mesh of [arm.children[1],arm.children[2]]){
    for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     const point=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(point.z>wall.z-wall.hz+1e-4&&point.y<40){crossings.push({frame,part:mesh.name,z:point.z});break;}
     if(inside(point,inverse)){bodyCrossings.push({frame,part:mesh.name,point:point.toArray()});break;}
    }
   }
   const beam=f.slots.lmb.active;
   if(beam?.sustaining&&frame>hz){
    contacts++;const right=f.parts.armR.children[2],source=right.getWorldPosition(new THREE.Vector3());
    if(style==='two-hand')source.add(f.parts.armL.children[2].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
    assert.ok(source.distanceTo(beam.muzzle)<1e-5,'cover correction must move the arm, not detach its beam');
    const handRay=new THREE.Vector3(0,-1,0).applyQuaternion(right.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(handRay.dot(beam.dir)>.985,'retracted palm must still aim its beam');
    assert.ok(beam.tip.position.z<wall.z,'no beam begins beyond the wall');
   }
  }
  assert.deepEqual(crossings.slice(0,8),[]);if(style!=='paired')assert.ok(contacts>hz);
  else assert.ok(f.slots.lmb.handShots[-1]>2&&f.slots.lmb.handShots[1]>2,'both hands must actually fire near the wall');
  assert.deepEqual(bodyCrossings.slice(0,8),[],'wall retraction cannot bury the hand or forearm in the torso');
 }finally{close();}
});

for(const scale of [.65,1])for(const motion of ['ground','hover','strafe'])
test(`paired shoulder clearance and cover retraction keep the visible elbow clear together (${motion}, scale ${scale})`,()=>{
 const {f,wall,step,close}=fixture('two-hand',motion,scale),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  for(let frame=0;frame<180;frame++){
   step(frame,1/60);const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),vertices=surface.mesh.geometry.attributes.position;
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1]||surface.rows[row].t!==undefined)for(let j=0;j<surface.segments;j++){
     point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
     assert.ok(!inside(point,inverse),`Frame ${frame}: rendered elbow/forearm row ${row} inside torso`);
     assert.ok(point.z<=wall.z-wall.hz+1e-4||point.y>=40,`Frame ${frame}: rendered elbow/forearm through cover`);
    }
    const hand=arm.children[2];for(let v=0;v<hand.geometry.attributes.position.count;v++){
     hand.getVertexPosition(v,point).applyMatrix4(hand.matrixWorld);
     assert.ok(!inside(point,inverse),`Frame ${frame}: hand in torso`);
     assert.ok(point.z<=wall.z-wall.hz+1e-4||point.y>=40,`Frame ${frame}: hand through cover`);
    }
   }
  }
 }finally{close();}
});

test('neutral grounded forearms clear the breathing torso before and after casting',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol'))),inside=trunkProbe(f.parts.torso),crossings=[];
 f._openSky=true;f.flying=false;f.gait='grounded';f.animT=0;f.vel.set(0,0,0);
 try{
  for(let i=0;i<360;i++){
   f.animT+=1/120;f._animate(1/120);f.obj.updateMatrixWorld(true);const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const arm of [f.parts.armL,f.parts.armR]){
    const mesh=arm.children[1];for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     const p=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(inside(p,inverse)){crossings.push({frame:i,point:p.toArray()});break;}
    }
   }
  }
  assert.deepEqual(crossings.slice(0,6),[]);
 }finally{f.dispose();}
});

test('unarmed clearance accounts for hand volume while reaching down over the top of low cover',()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol'))),arm=f.parts.armR,pole=new THREE.Vector3(1,-.55,-.15);
 const wall={x:2.4,z:0,hx:.02,hz:20},world={cover:[],interiors:[{x:2.4,z:0,hx:.02,hz:20,top:7,walls:[wall]}]};f._game={world};
 try{
  reachArm(arm,new THREE.Vector3(3.6,5.8,0),1,1,pole);f.obj.updateMatrixWorld(true);
  assert.ok(arm.getWorldPosition(new THREE.Vector3()).y>7,'shoulder starts above cover');assert.ok(f.radius<2.38);
  assert.equal(constrainArmCover(f,arm,1,pole),true);f.obj.updateMatrixWorld(true);
  const crossings=[];
  for(const mesh of [arm.children[1],arm.children[2]])for(let v=0;v<mesh.geometry.attributes.position.count;v++){
   const point=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
   if(point.x>2.38&&point.x<2.42&&point.y<7&&Math.abs(point.z)<20)crossings.push(point.toArray());
  }
  assert.deepEqual(crossings.slice(0,6),[],'a safe hand center is not a safe limb volume');
 }finally{f.dispose();}
});
