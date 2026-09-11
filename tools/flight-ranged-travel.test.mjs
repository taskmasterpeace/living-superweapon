// Real production procedural flight + attack pipeline; not imported clip evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import {firearmEmitter} from '../src/engine/weapon-emission.js';

function fixture(kind,hz){
 const def=structuredClone(ROSTER.find(d=>d.id===(kind==='rifle'?'sarge':kind==='volley'?'vega':'sol')));
 if(kind!=='rifle'&&kind!=='volley')def.abilities={lmb:{type:'beam',name:'Ranged travel regression',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffaa44',faceOrigin:kind==='optic',chest:kind==='chest',castStyle:'palm'}};
 const scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game,f=new Fighter(def),dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;Object.assign(f,{_openSky:true,flying:true,gait:'airborne',hasAimWorld:true,energyInfinite:true,level:10});
 f.pos.set(0,80,0);f.vel.set(0,0,65);f.aim.set(0,0,1);f.aimWorld.set(0,88,150);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 function step(held=false,pressed=false){runSlot(f,'lmb',{pressed,held,released:!held,dt},g);f.animT+=dt;f.advanceActionPose(dt);const position=f.pos.clone(),velocity=f.vel.clone();f._animate(dt);assert.ok(f.pos.equals(position)&&f.vel.equals(velocity),'presentation changed simulation after real ability recoil');g.projectiles.update(dt,g);f.obj.updateMatrixWorld(true);}
 return {f,g,step,dt,close(){combat.dispose();f.dispose();}};
}

for(const kind of ['palm','rifle','volley'])for(const hz of [30,60,120])
test(`${kind} keeps the rendered pelvis head-first during forward fire, not merely the outer group (${hz} Hz)`,()=>{
 const {f,step,close}=fixture(kind,hz),up=new THREE.Vector3(),q=new THREE.Quaternion();
 const alignment=()=>up.set(0,1,0).applyQuaternion(f.parts.pelvis.getWorldQuaternion(q)).dot(f.vel.clone().normalize());
 try{
  for(let i=0;i<hz*2;i++)step();assert.ok(alignment()>.88,'must start head-first');
  for(let i=0;i<hz*3;i++){
   // Fixed-speed articulation inspection: the real controller replenishes
   // thrust, while this pose fixture does not integrate movement. Do not let
   // accumulated rifle recoil turn it into an unintended braking test.
   f.vel.set(0,0,65);
   // Exercise repeated native slot emissions, not a single stale cast marker.
   for(const slot of Object.values(f.slots))slot.cd=Math.max(0,slot.cd-1/hz);
   step(i<hz*2,i===0);
   assert.ok(alignment()>.85,`actual pelvis stood upright: alignment=${alignment()} frame=${i}`);
  }
 }finally{close();}
});

for(const hz of [30,60,120])for(const kind of ['palm','optic','chest','rifle'])
test(`${kind} retains forward travel pitch through attack entry/hold/release (${hz} Hz)`,()=>{
 const {f,step,close}=fixture(kind,hz);
 try{
  for(let i=0;i<hz*2;i++)step();const baseline=f.parts.g.rotation.x,position=f.pos.clone();
  assert.ok(baseline>1,'fixture must begin in actual forward cruise');
  let previous=baseline,maxDelta=0,minPitch=Infinity;
  for(let i=0;i<hz*3;i++){
   step(i<hz*2,i===0);const pitch=f.parts.g.rotation.x;minPitch=Math.min(minPitch,pitch);maxDelta=Math.max(maxDelta,Math.abs(pitch-previous));previous=pitch;
   assert.ok(pitch>baseline-.08,`ranged attack collapsed travel pitch ${pitch} from ${baseline} at frame ${i}`);
  }
  assert.ok(maxDelta<.03,`attack transition body snap ${maxDelta}`);
  assert.ok(f.pos.equals(position),'presentation must not change position');
 }finally{close();}
});

test('full-body guard still suppresses ranged cruise and releases smoothly',()=>{
 const {f,step,close}=fixture('palm',60);
 try{
  for(let i=0;i<120;i++)step();const baseline=f.parts.g.rotation.x;
  for(let i=0;i<60;i++){f.guarding=true;f.poseGuard=1;step(false);}
  assert.ok(f.parts.g.rotation.x<baseline*.6,'guard must retain its full-body posture');
  f.guarding=false;f.poseGuard=0;for(let i=0;i<120;i++)step();assert.ok(f.parts.g.rotation.x>baseline-.08);
 }finally{close();}
});

for(const kind of ['palm','optic','chest','rifle'])
test(`${kind} forward flight keeps rendered hands/forearms/weapon out of torso across vertical aim phases`,()=>{
 const {f,step,close}=fixture(kind,60),inside=trunkProbe(f.parts.torso),point=new THREE.Vector3();
 try{
  for(let i=0;i<120;i++)step();
  for(let frame=0;frame<180;frame++){
   // Start/quarter/half/three-quarter/end and release, with real travel pose.
   const phase=Math.floor(frame/36);f.aimWorld.set(0,88+[0,60,-45,25,0][phase],150);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   step(frame<144,frame===0);const inverse=f.parts.torso.matrixWorld.clone().invert();
   const check=(mesh,indices)=>{const p=mesh.geometry.attributes.position;for(const i of indices){point.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);assert.ok(!inside(point,inverse),`${kind} ${mesh.name} inside torso phase${phase}/frame${frame}/vertex${i}`);}};
   for(const arm of [f.parts.armL,f.parts.armR]){
    const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),indices=[];
    for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++)indices.push(row*surface.segments+j);
    check(surface.mesh,indices);const fist=arm.children[2];check(fist,Array.from({length:fist.geometry.attributes.position.count},(_,i)=>i));
   }
   if(kind==='rifle')firearmEmitter(f,f.slots.lmb.def).weapon.traverse(o=>{if(o.isMesh&&o.visible)check(o,Array.from({length:o.geometry.attributes.position.count},(_,i)=>i));});
  }
 }finally{close();}
});
