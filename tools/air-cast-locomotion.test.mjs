import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OBB} from 'three/addons/math/OBB.js';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {profileFromDef,applyProfile,resetFlightStyle} from '../src/tool/studio-profile.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

const kinds=['palm','two-hand','eye','chest','rifle'];
const legParts=f=>[f.parts.legL,f.parts.legR,f.parts.legL.userData.knee,f.parts.legR.userData.knee];
const legPose=f=>legParts(f).map(part=>part.rotation.x);
const gap=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])));

// Native slots, Fighter pose order, and projectile manager. The fixture supplies
// velocity without integrating position; it makes no player-input/physics claim.
function fixture(kind='palm',hz=60,{style='hero',poses,ground=false}={}){
 const base=structuredClone(ROSTER.find(d=>d.id===(kind==='rifle'?'sarge':'sol')));
 if(kind==='rifle')base.abilities.lmb.recoil=0; // fixed-velocity presentation fixture
 if(kind!=='rifle')base.abilities={lmb:{type:'beam',name:'Air leg regression',cost:1,kiPerSec:1,dps:1,steer:8,color:'#ffaa44',
  faceOrigin:kind==='eye',chest:kind==='chest',castStyle:kind==='two-hand'?'two-hand':kind==='chest'?'chest-brace':kind==='eye'?'optic-focus':'palm'}};
 const profile=resetFlightStyle(profileFromDef(base),style);
 for(const [state,values]of Object.entries(poses||{}))Object.assign(profile.poses[state],values);
 const f=new Fighter(applyProfile(base,profile)),scene=new THREE.Scene();
 const world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const stage=new StudioCombat(scene,world),g=stage.game,dt=1/hz;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{_openSky:true,flying:!ground,gait:ground?'grounded':'airborne',hasAimWorld:true,energyInfinite:true,level:10,animT:0});
 f.pos.set(0,ground?0:50,0);f.obj.position.copy(f.pos);f.faceDir(0,1);
 f.aimWorld.set(0,f.pos.y+7,100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
 let held=false;
 const step=()=>{
  f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);
  if(held)runSlot(f,'lmb',{pressed:false,held:true,released:false,dt},g);
  f.animT+=dt;f.advanceActionPose(dt);
  const pos=f.pos.toArray(),vel=f.vel.toArray();f._animate(dt);
  assert.deepEqual(f.pos.toArray(),pos,'The pose layer moved the simulation position');
  assert.deepEqual(f.vel.toArray(),vel,'The pose layer changed simulation velocity');
  f.obj.updateMatrixWorld(true);g.projectiles.update(dt,g);g.particles.update(dt);g.vfx.update(dt);
 };
 const advance=seconds=>{for(let i=0;i<Math.round(seconds*hz);i++)step();};
 return {f,g,dt,step,advance,start(){held=true;runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);},
  stop(){held=false;runSlot(f,'lmb',{pressed:false,held:false,released:true,dt},g);},
  close(){stage.dispose();f.dispose();}};
}

for(const hz of [30,60,120])for(const kind of kinds)test(`${kind} airborne hold preserves travel legs and releases cleanly at ${hz}Hz`,()=>{
 const x=fixture(kind,hz),{f}=x;
 try{
  x.advance(1);const neutral=legPose(f);x.start();x.advance(1);const hover=legPose(f);
  f.vel.set(0,0,45);x.advance(1);const cruise=legPose(f);
  assert.ok(hover[2]-cruise[2]>.25,`Ranged hold froze the hover/cruise left knee: ${hover[2]} / ${cruise[2]}`);
  assert.ok(gap(hover,neutral)>.04,'A stationary cast still needs a small, readable brace');
  // Rise and descent intentionally share the forward leg profile. Their real
  // carrier must still change while the articulated legs retain that profile.
  f.vel.set(0,32,16);x.advance(1);const rising=f.obj.rotation.x;
  f.vel.set(0,-32,16);x.advance(1);assert.ok(f.obj.rotation.x-rising>.2,'Vertical travel lost its carrier during fire');
  x.stop();f.vel.set(0,0,0);x.advance(2);
  assert.ok(gap(legPose(f),neutral)<.004,`Release retained a leg overlay: ${legPose(f)} / ${neutral}`);
 }finally{x.close();}
});

for(const kind of kinds)test(`${kind} keeps authored flight leg differences effective while firing`,()=>{
 const ordinary=fixture(kind),authored=fixture(kind,60,{poses:{forward:{hipL:-.42,hipR:.22,kneeL:.88,kneeR:.62}}});
 try{
  for(const x of [ordinary,authored]){x.f.vel.set(0,0,45);x.advance(1);x.start();x.advance(2);}
  const a=legPose(ordinary.f),b=legPose(authored.f);
  for(const [index,want]of [[0,-.46],[1,.3],[2,.64],[3,.46]])
   assert.ok(Math.abs(b[index]-a[index]-want)<.025,`Authored leg ${index} disappeared during ${kind}: delta ${b[index]-a[index]}`);
 }finally{ordinary.close();authored.close();}
});

test('re-rendering a paused partial takeoff cannot accumulate the ranged leg brace',()=>{
 const x=fixture(),{f}=x;
 try{
  x.start();x.step();f._animate(0);
  const pose=legParts(f).map(part=>part.quaternion.clone());
  for(let i=0;i<20;i++)f._animate(0);
  assert.ok(legParts(f).every((part,i)=>part.quaternion.angleTo(pose[i])<1e-6),'Zero simulation time accumulated a leg offset');
 }finally{x.close();}
});

test('authored high flexion stays within leg limits under charge and release pressure',()=>{
 const x=fixture('two-hand',60,{poses:{hover:{hipL:-1.55,hipR:1.18,kneeL:2.38,kneeR:2.38}}}),{f}=x;
 try{
  Object.assign(f.slots.lmb.def,{charge:true,maxCharge:.5});x.advance(1);x.start();
  for(let i=0;i<120;i++){
   x.step();for(const leg of [f.parts.legL,f.parts.legR]){
    assert.ok(leg.rotation.x>=-1.6&&leg.rotation.x<=1.2,'Ranged brace exceeded authored hip limits');
    assert.ok(leg.userData.knee.rotation.x>=0&&leg.userData.knee.rotation.x<=2.4,'Charge exceeded knee flexion limits');
   }
  }
 }finally{x.close();}
});

for(const kind of kinds)test(`${kind} entry, travel changes and release keep continuous separated leg volumes`,()=>{
 const x=fixture(kind),{f,dt}=x,point=new THREE.Vector3(),inside=trunkProbe(f.parts.torso);
 const boots=[f.parts.legL.userData.boot,f.parts.legR.userData.boot];
 for(const boot of boots)boot.geometry.computeBoundingBox();
 try{
  x.advance(1);let previous=legParts(f).map(p=>p.quaternion.clone());
  for(let i=0;i<360;i++){
   if(i===0)x.start();if(i===60)f.vel.set(0,0,45);if(i===120)f.vel.set(0,30,14);
   if(i===180)f.vel.set(0,-30,14);if(i===240){x.stop();f.vel.set(0,0,0);}x.step();
   const joints=legParts(f);
   for(let j=0;j<joints.length;j++)assert.ok(previous[j].angleTo(joints[j].quaternion)<12*dt+.005,`Leg ${j} snapped at frame ${i}`);
   previous=joints.map(p=>p.quaternion.clone());
   for(const knee of joints.slice(2))assert.ok(knee.rotation.x>=0&&knee.rotation.x<=2.4,'Knee inverted or exceeded its authored limit');
   const bounds=boots.map(boot=>new OBB().fromBox3(boot.geometry.boundingBox).applyMatrix4(boot.matrixWorld));
   assert.equal(bounds[0].intersectsOBB(bounds[1]),false,`Rendered boot volumes crossed at frame ${i}`);
   if(i%15===0){
    const inverse=f.parts.torso.matrixWorld.clone().invert();
    for(const arm of [f.parts.armL,f.parts.armR]){
     const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]),vertices=surface.mesh.geometry.attributes.position;
     for(let row=0;row<surface.rows.length;row++)if(surface.rows[row].driver===arm.children[1])for(let j=0;j<surface.segments;j++){
      point.fromBufferAttribute(vertices,row*surface.segments+j).applyMatrix4(surface.mesh.matrixWorld);
      assert.ok(!inside(point,inverse),`Rendered forearm entered torso at frame ${i}`);
     }
    }
   }
  }
 }finally{x.close();}
});

for(const mode of ['guard','melee','ground'])test(`ranged leg preservation yields to intentional ${mode} ownership`,()=>{
 const x=fixture('palm',60,{ground:mode==='ground'}),y=fixture('palm',60,{ground:mode==='ground'});
 try{
  for(const q of [x,y]){q.f.vel.set(0,0,mode==='ground'?14:40);q.advance(1);}
  x.start();x.advance(1);y.advance(1);
  if(mode!=='ground'){
   for(const q of [x,y]){q.f.guarding=mode==='guard';q.f.poseGuard=mode==='guard'?1:0;q.f.meleeCharge=mode==='melee'?1:0;}
   for(let i=0;i<60;i++){x.step();y.step();}
   assert.ok(gap(legPose(x.f),legPose(y.f))<.001,`An exclusive full-body owner inherited ranged flight legs: ${legPose(x.f)} / ${legPose(y.f)}`);
  }else assert.ok(x.f._groundMotion.weight>.95,'Ranged cast displaced the grounded source gait');
 }finally{x.close();y.close();}
});
