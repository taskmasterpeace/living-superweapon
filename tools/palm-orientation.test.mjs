import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {animateHands} from '../src/engine/hero-hand.js';

function fixture(style,motion){
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));
 def.abilities={lmb:{type:'beam',castStyle:style,name:'Palm orientation',cost:1,kiPerSec:1,dps:1,steer:8}};
 const f=new Fighter(def),scene=new T.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}},combat=new StudioCombat(scene,world),g=combat.game;
 scene.add(f.obj);g.entities=[f];f._game=g;
 Object.assign(f,{animT:0,_openSky:true,hasAimWorld:true,energyInfinite:true,level:10,flying:motion==='fly',gait:motion==='fly'?'airborne':'grounded'});
 f.pos.set(0,f.flying?50:0,0);f.vel.set(motion==='strafe'?14:0,0,f.flying?40:0);
 const aim=(yaw,height=0)=>{f.facing=yaw;f.aim.set(Math.sin(yaw),0,Math.cos(yaw));f.aimWorld.copy(f.pos).addScaledVector(f.aim,100);f.aimWorld.y+=8+height;f.aim3.copy(f.aimWorld).sub(f.pos).normalize();};
 const step=()=>{f.animT+=1/60;f.advanceActionPose(1/60);f._animate(1/60);g.projectiles.update(1/60,g);f.obj.updateMatrixWorld(true);};
 return {f,g,aim,step,close(){combat.dispose();f.dispose();}};
}

// Inspect the actual opened finger mesh, not a declared socket axis. This
// catches a backwards morph as well as an underdetermined wrist roll.
function landmarks(hand){
 const finger=new T.Vector3(),thumb=new T.Vector3(),v=new T.Vector3();let fingers=0,thumbs=0;
 const open=hand.geometry.morphAttributes.position[0];
 for(let i=0;i<open.count;i++){
  v.fromBufferAttribute(open,i);
  if(Math.abs(v.z)>.47&&Math.abs(v.x)<.18){finger.add(v);fingers++;}
  if(Math.abs(v.x)>.45){thumb.add(v);thumbs++;}
 }
 assert.ok(fingers&&thumbs,'fixture needs actual finger tips and thumb vertices');
 const palm=hand.localToWorld(new T.Vector3(0,-.30,0));
 return {finger:hand.localToWorld(finger.divideScalar(fingers)).sub(palm),thumb:hand.localToWorld(thumb.divideScalar(thumbs)).sub(palm)};
}
for(const style of ['palm','two-hand'])for(const motion of ['stand','strafe','fly'])
test(`${style} ${motion}: visible fingers point up and thumbs face inward while palms aim the shot`,()=>{
 const {f,g,aim,step,close}=fixture(style,motion);
 try{
  aim(0);for(let i=0;i<60;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);
  for(const [yaw,height]of [[0,0],[1.2,35],[-1.2,-25]]){
   aim(yaw,height);for(let i=0;i<120;i++)step();
   for(const [arm,side]of style==='two-hand'?[[f.parts.armL,-1],[f.parts.armR,1]]:[[f.parts.armR,1]]){
    const hand=arm.children[2],q=hand.getWorldQuaternion(new T.Quaternion()),normal=new T.Vector3(0,-1,0).applyQuaternion(q);
    const up=new T.Vector3(0,1,0).applyQuaternion(f.parts.torso.getWorldQuaternion(new T.Quaternion()));
    up.addScaledVector(normal,-up.dot(normal)).normalize();
    const {finger,thumb}=landmarks(hand),inside=new T.Vector3().crossVectors(up,normal).multiplyScalar(-side);
    assert.ok(finger.normalize().dot(up)>.85,`Visible fingers hang down or sideways: ${finger.dot(up)}`);
    assert.ok(thumb.dot(inside)>.2,'Visible thumb is on the outer/pinky side of the forward palm');
    assert.ok(normal.dot(f.slots.lmb.active.dir)>.98,'Correcting roll cannot redirect the beam normal');
    assert.ok(hand.morphTargetInfluences[0]>.95,'This must be an actual open casting hand');
   }
  }
 }finally{close();}
});

test('a hand rolls continuously through an overhead target and releases to a closed guard',()=>{
 const {f,g,aim,step,close}=fixture('two-hand','stand');
 try{
  aim(0);for(let i=0;i<60;i++)step();runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);
  for(let i=0;i<120;i++)step();
  const old=[f.parts.armL,f.parts.armR].map(a=>a.children[2].getWorldQuaternion(new T.Quaternion()));
  for(let i=0;i<240;i++){
   const pitch=(60+i*.25)*Math.PI/180;
   f.aimWorld.set(0,8+Math.sin(pitch)*100,Math.cos(pitch)*100);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();
   step();
   for(const [j,arm]of [f.parts.armL,f.parts.armR].entries()){
    const now=arm.children[2].getWorldQuaternion(new T.Quaternion());
    assert.ok(now.angleTo(old[j])<.4,`Wrist flipped at frame ${i}`);
    const palm=new T.Vector3(0,-1,0).applyQuaternion(now);
    assert.ok(palm.dot(f.slots.lmb.active.dir)>.98,'Roll damping must leave the actual ray aligned');old[j].copy(now);
   }
  }
  runSlot(f,'lmb',{pressed:false,held:false,released:true,dt:1/60},g);f.poseGuard=1;
  for(let i=0;i<90;i++){f.poseGuard=1;step();}
  assert.ok([f.parts.armL,f.parts.armR].every(a=>a.children[2].morphTargetInfluences[0]<.001),'Guard must close both hands');
 }finally{close();}
});

test('casting variants preserve the ordinary grip, bound real fingertips, and change through a continuous closed fist',()=>{
 const {f,close}=fixture('two-hand','stand');
 try{
  const hand=f.parts.armR.children[2],[ordinary,casting]=hand.geometry.palmVariants;
  assert.deepEqual(ordinary.attributes.position.array,casting.attributes.position.array,'closed fist and weapon mount must be identical');
  assert.ok(ordinary.boundingBox.min.z<-.65&&ordinary.boundingBox.max.z<.27,'ordinary hand retains its existing envelope');
  for(const g of [ordinary,casting])for(const a of [g.attributes.position,...g.morphAttributes.position])
   for(let i=0;i<a.count;i++)assert.ok(g.boundingBox.containsPoint(new T.Vector3().fromBufferAttribute(a,i)),'render bounds cannot exclude real finger vertices');
  hand.morphTargetInfluences[0]=1;f._combatAim={source:'hand',weight:1,gather:0,twoHand:true};
  const previous=Array.from({length:ordinary.attributes.position.count},(_,i)=>hand.getVertexPosition(i,new T.Vector3()));
  let switches=0,last=ordinary;
  for(let frame=0;frame<120;frame++){
   if(frame===60)f._combatAim.weight=0;
   const wasOpen=hand.morphTargetInfluences[0];animateHands(f,1/60);
   if(last!==hand.geometry){assert.ok(wasOpen<=.001,'never replace visibly open digits');switches++;last=hand.geometry;}
   for(let i=0;i<previous.length;i++){
    const point=hand.getVertexPosition(i,new T.Vector3());
    assert.ok(point.distanceTo(previous[i])<.33,'open/closed hand transition teleported a digit');previous[i].copy(point);
   }
  }
  assert.equal(switches,2);assert.equal(hand.geometry,ordinary);assert.ok(hand.morphTargetInfluences[0]<.001);
 }finally{close();}
});

test('picking up a weapon from a cast closes the grip and invalidates its old cover envelope',()=>{
 const {f,close}=fixture('two-hand','stand');
 try{
  const hand=f.parts.armR.children[2],variants=hand.geometry.palmVariants;
  hand.geometry=variants[1];hand.morphTargetInfluences[0]=1;hand.userData.gripOccupied=true;
  const weapon=new T.Group();weapon._gripCoverBounds=new T.Box3();hand.add(weapon);
  f._combatAim={source:'hand',weight:1,gather:0,twoHand:true};animateHands(f,1/60);
  assert.equal(hand.geometry,variants[0]);assert.equal(hand.morphTargetInfluences[0],0);
  assert.equal(weapon._gripCoverBounds,undefined);
 }finally{close();}
});

test('source-skin, flight-glide and barrier hands do not acquire the casting morphology',()=>{
 const {f,close}=fixture('two-hand','fly');
 try{
  const hand=f.parts.armL.children[2],ordinary=hand.geometry;
  const actualSkin=f.parts.skin;f.parts.skin={};f._combatAim={source:'hand',weight:1,gather:0,twoHand:true};
  for(let i=0;i<60;i++)animateHands(f,1/60);
  assert.equal(hand.geometry,ordinary);f.parts.skin=actualSkin;
  f._combatAim.weight=0;f.parts.rig.flightStyle='thruster';f._flyPose=1;
  for(let i=0;i<60;i++)animateHands(f,1/60);
  assert.equal(hand.geometry,ordinary);assert.ok(hand.morphTargetInfluences[0]>.9);
  f.def.guardType='barrier';f.poseGuard=1;
  for(let i=0;i<60;i++)animateHands(f,1/60);
  assert.equal(hand.geometry,ordinary);assert.ok(hand.morphTargetInfluences[0]>.95);
 }finally{close();}
});
