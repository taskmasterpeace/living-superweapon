import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {firearmEmitter} from '../src/engine/weapon-emission.js';

const forward=part=>new THREE.Vector3(0,0,1).applyQuaternion(part.getWorldQuaternion(new THREE.Quaternion()));
function fixture(kind,hz,side=1,scale=1,phase=0){
 const def=structuredClone(ROSTER.find(d=>d.id===(kind==='rifle'?'sarge':'sol')));
 def.frame={...def.frame,scale};
 if(kind!=='rifle')def.abilities={lmb:{type:'beam',name:'Split flight fixture',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffaa44',faceOrigin:kind==='optic',chest:kind==='chest',castStyle:kind==='palm'?'palm':'auto'}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;Object.assign(f,{animT:phase,_openSky:true,flying:true,gait:'airborne',hasAimWorld:true,energyInfinite:true,level:10});
 f.pos.set(0,50,0);f.vel.set(40*side,0,0);
 const aim=(degrees,height=0)=>{f.facing=degrees*Math.PI/180;f.aim.set(Math.sin(f.facing),0,Math.cos(f.facing));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=(held=true)=>{runSlot(f,'lmb',{pressed:false,held,released:!held,dt},g);f.animT+=dt;f.advanceActionPose(dt);f._animate(dt);g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);};
 aim(0);runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);
 return {f,g,dt,aim,step,close(){combat.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const side of [-1,1])for(const kind of ['optic','palm','chest','rifle'])
test(`${kind} side-flight separates actual pelvis travel from emission (${side}, ${hz} Hz)`,()=>{
 const {f,step,close}=fixture(kind,hz,side),velocity=f.vel.clone(),position=f.pos.clone();
 try{
  let travel=1,separation=Infinity,alignment=1,neck=0;
  for(let i=0;i<hz*3;i++){
   step();if(i<hz*2)continue;
   const pelvis=forward(f.parts.pelvis).setY(0).normalize(),chest=forward(f.parts.torso),head=forward(f.parts.head);
   travel=Math.min(travel,pelvis.x*side);separation=Math.min(separation,pelvis.angleTo(chest));neck=Math.max(neck,head.angleTo(chest));
   const beam=f.slots.lmb.active,hand=f.parts.armR.children[2];
   const ray=kind==='rifle'?f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize():beam.dir;
   const emitter=kind==='optic'?head:kind==='chest'?chest:new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   alignment=Math.min(alignment,emitter.dot(ray));
  }
  assert.ok(travel>.85,`pelvis travel alignment ${travel}: firing must not turn the entire lower body toward aim`);
  assert.ok(separation>.6,`upper/lower separation only ${separation*180/Math.PI} degrees`);
  assert.ok(alignment>.985,`emitter error ${Math.acos(alignment)*180/Math.PI} degrees`);
  assert.ok(neck<=1.05001,`neck cone ${neck*180/Math.PI} degrees`);
  assert.ok(f.vel.distanceTo(velocity)<1e-8&&f.pos.distanceTo(position)<1e-8,'presentation changed physics');
 }finally{close();}
});

for(const scale of [.65,1,1.5])for(const side of [-1,1])for(const kind of ['optic','palm','chest','rifle'])
for(const phase of kind==='rifle'&&scale===1&&side===-1?[0,1,2,3,4,5,6,7,8,9]:[0])
test(`${kind} flight turns keep visible forearm, fist and equipped gun clear (${side}, scale ${scale}, phase ${phase})`,()=>{
 const {f,aim,step,close}=fixture(kind,60,side,scale,phase),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  let crossings=0,first=null;
  const check=(mesh,vertices,indices,frame,label)=>{
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const i of indices){point.fromBufferAttribute(vertices,i).applyMatrix4(mesh.matrixWorld);if(inside(point,inverse)){crossings++;first??={frame,label,i,mesh:mesh.name,local:point.clone().applyMatrix4(inverse).toArray()};}}
  };
  for(let frame=0;frame<240;frame++){
   if(frame===60)aim(side*170,25);if(frame===120)aim(side*-100,-30);if(frame===180)aim(side*5,60);
   step(frame<210);
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),indices=[];
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++)indices.push(row*surface.segments+j);
    check(surface.mesh,surface.mesh.geometry.attributes.position,indices,frame,'visible forearm');
    const fist=arm.children[2],p=fist.geometry.attributes.position;check(fist,p,Array.from({length:p.count},(_,i)=>i),frame,'fist');
   }
   if(kind==='rifle'){
    const source=firearmEmitter(f,f.slots.lmb.def),arm=source.side<0?f.parts.armL:f.parts.armR;
    source.weapon.traverse(o=>{if(o.isMesh&&o.visible){const p=o.geometry.attributes.position;check(o,p,Array.from({length:p.count},(_,i)=>i),frame,'equipped gun');}});
    const {upperLength:u,foreLength:v}=arm.userData,bend=-arm.children[1].rotation.x;
    assert.ok(Math.abs(source.hand.position.length()-Math.sqrt(u*u+v*v+2*u*v*Math.cos(bend)))<1e-6,'clearance must preserve the two-bone grip');
    if(frame<210){
     const ray=f.aimWorld.clone().sub(source.socket.getWorldPosition(new THREE.Vector3())).normalize();
     const barrel=new THREE.Vector3(0,-1,0).applyQuaternion(source.hand.getWorldQuaternion(new THREE.Quaternion()));
     assert.ok(barrel.dot(ray)>.985,`clearance broke actual muzzle aim at ${frame}`);
    }
   }
  }
  assert.equal(crossings,0,JSON.stringify(first));
 }finally{close();}
});

for(const hz of [30,60,120])for(const kind of ['optic','palm','chest','rifle'])
test(`${kind} flight split restores through braking, guard and landing (${hz} Hz)`,()=>{
 const {f,step,close}=fixture(kind,hz),position=f.pos.clone();
 try{
  for(let i=0;i<hz*2;i++)step();
  f.vel.set(0,0,0);for(let i=0;i<hz;i++)step(false);
  assert.ok(Math.abs(forward(f.parts.pelvis).x)<.04,'braking must settle lower-body heading');
  assert.ok(forward(f.parts.torso).angleTo(forward(f.parts.pelvis))<.2,'release must unwind shoulders');
  f.vel.set(40,0,0);f.guarding=true;f.poseGuard=1;
  for(let i=0;i<hz;i++){step(false);f.poseGuard=1;}
  assert.ok(forward(f.obj).z>.98,'guard must face the actual frontal guard arc');
  f.guarding=false;f.poseGuard=0;f.flying=false;f.gait='grounded';f.vel.set(14,0,0);f.pos.y=0;
  for(let i=0;i<hz*2;i++)step(false);
  assert.ok(f._groundMotion.weight>.95,'landing must restore the source gait');
  assert.ok(Math.abs(f.pos.x-position.x)<1e-8&&Math.abs(f.pos.z-position.z)<1e-8,'pose takeover changed physics');
 }finally{close();}
});

for(const hz of [30,60,120])for(const kind of ['optic','palm','chest','rifle'])
test(`${kind} sustains its actual emission across repeated lateral-to-descent handoffs (${hz} Hz)`,()=>{
 const {f,step,close}=fixture(kind,hz);
 try{
  for(let i=0;i<hz*2;i++)step();let maxError=0,at=0;
  for(let frame=0;frame<hz*3;frame++){
   const descend=Math.floor(frame/hz/.2)%2;f.vel.set(descend?.9:40,descend?-30:0,0);step();
   const hand=f.parts.armR.children[2],beam=f.slots.lmb.active;
   const ray=kind==='rifle'?f.aimWorld.clone().sub(hand.getWorldPosition(new THREE.Vector3())).normalize():beam.dir;
   const emitter=kind==='optic'?forward(f.parts.head):kind==='chest'?forward(f.parts.torso):new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
   const error=emitter.angleTo(ray);if(error>maxError){maxError=error;at=frame;}
   assert.ok(f.vel.x===(descend?.9:40)&&f.vel.y===(descend?-30:0));
  }
  assert.ok(maxError<Math.acos(.985),`emission error ${maxError*180/Math.PI} degrees at frame ${at}`);
 }finally{close();}
});
