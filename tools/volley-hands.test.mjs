import test from 'node:test';
import {trunkProbe} from './helpers/trunk-probe.mjs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {attackFields,setAttackOverride,applyAttackOverrides} from '../src/data/attack-tuning.js';
import {profileFromDef,validateProfile,applyProfile} from '../src/tool/studio-profile.js';
import {attackEntryCost} from '../src/engine/hand-emission.js';
import {attackSymbol} from '../src/engine/attack-icons.js';
import {Game} from '../src/engine/game.js';

const dt=1/60;
function fixture(pattern='alternate',motion='strafe'){
 const def=structuredClone(ROSTER.find(d=>d.id==='kano'));
 def.abilities={lmb:{type:'volley',name:'Hand origin test',handPattern:pattern,cost:3,interval:.12,speed:105,spread:.001,color:'#ffd54a'}};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,cover:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[f];g.attackRandom=()=>.5;
 f._openSky=true;f.hasAimWorld=true;f.aimWorld.set(0,10,100);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,7,0)).normalize();
 f.facing=0;f.aim.set(0,0,1);f.gait=motion==='strafe'?'grounded':'airborne';f.flying=motion!=='strafe';
 f.pos.set(0,motion==='strafe'?0:50,0);if(f.flying)f.aimWorld.y+=50;
 f.vel.set(14,motion==='rise'?8:motion==='descend'?-8:0,motion==='fly'?36:0);scene.add(f.obj);f.obj.position.copy(f.pos);
 const animate=()=>{f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 for(let i=0;i<90;i++)animate();
 const fire=()=>{f.slots.lmb.cd=0;runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);animate();};
 return {f,g,combat,animate,fire,close(){combat.dispose();f.dispose();}};
}

for(const motion of ['strafe','hover','fly','rise','descend'])test(`alternating volley uses each final animated hand during ${motion}`,()=>{
 const {f,g,fire,animate,close}=fixture('alternate',motion);
 try{
  for(let n=0;n<4;n++){
   fire();const shot=g.projectiles.list.at(-1),side=n%2?1:-1,hand=(side<0?f.parts.armL:f.parts.armR).children[2];
   // Resolve the first simulation interval after the production pose. No travel yet.
   shot.prepareMotion(0,g);
   const expected=hand.getWorldPosition(new THREE.Vector3());
   assert.ok(shot.pos.distanceTo(expected)<.001,`Shot ${n} is ${shot.pos.distanceTo(expected)} units from its ${side<0?'left':'right'} hand`);
   const launch=shot.pos.clone();f.obj.position.x+=2;f.obj.updateMatrixWorld(true);shot.prepareMotion(0,g);
   assert.ok(shot.pos.distanceTo(launch)<.001,'Launched energy must not remain attached to the emitter');
   f.obj.position.copy(f.pos);for(let i=0;i<7;i++)animate();
  }
 }finally{close();}
});

test('paired volley emits from two real hands and pays for two shots atomically',()=>{
 const {f,g,fire,close}=fixture('paired');
 try{
  const before=f.ki;fire();assert.equal(g.projectiles.list.length,2);assert.equal(f.ki,before-6);
  const positions=g.projectiles.list.map(s=>{s.prepareMotion(0,g);return s.pos.clone();});
  assert.ok(positions[0].distanceTo(positions[1])>1,'Two distinct origins, not one centered projectile');
  f.ki=5;fire();assert.equal(g.projectiles.list.length,2);assert.equal(f.ki,5,'An unaffordable pair cannot half-fire');
 }finally{close();}
});

test('volley hand pattern is editable and survives the real character profile',()=>{
 const def={abilities:{lmb:{type:'volley',name:'Ki rush',cost:3}}};
 const field=attackFields(def,'lmb').find(x=>x.key==='handPattern');
 assert.equal(field?.kind,'enum');assert.deepEqual(field.options.map(x=>x.value),['alternate','paired','right','left']);
 const original=ROSTER.find(d=>Object.values(d.abilities).some(a=>a.type==='volley'));
 const key=Object.keys(original.abilities).find(k=>original.abilities[k].type==='volley'),p=profileFromDef(original);
 p.attacks=setAttackOverride(p.attacks,original,key,{handPattern:'paired'});
 assert.equal(applyProfile(original,validateProfile(JSON.parse(JSON.stringify(p)))).abilities[key].handPattern,'paired');
 assert.equal(applyAttackOverrides(def,setAttackOverride({},def,'lmb',{handPattern:'left'})).abilities.lmb.handPattern,'left');
 assert.throws(()=>setAttackOverride({},def,'lmb',{handPattern:'unknown'}),/handPattern/);
 assert.equal(attackFields({abilities:{lmb:{type:'volley',oneHand:true}}},'lmb').find(x=>x.key==='handPattern').value,'right');
 assert.equal(attackEntryCost({type:'volley',handPattern:'paired',cost:3}),6);
 assert.notEqual(attackSymbol({type:'volley',handPattern:'paired'}),attackSymbol({type:'volley'}));
});

test('an explicit hand pattern survives changing the one-hand source flag',()=>{
 const def=ROSTER.find(d=>d.id==='knightfall');
 const changed=setAttackOverride({},def,'lmb',{oneHand:false});
 assert.equal(attackFields(def,'lmb',changed).find(x=>x.key==='handPattern').value,'alternate');
 const pinned=setAttackOverride(changed,def,'lmb',{handPattern:'right'});
 assert.equal(applyAttackOverrides(def,pinned).abilities.lmb.handPattern,'right');
 assert.equal(attackFields(def,'lmb',pinned).find(x=>x.key==='handPattern').value,'right');
});

for(const pattern of ['alternate','paired','left','right'])test(`${pattern} keeps aiming palms, source gait, separate recoil and clean release`,()=>{
 const {f,g,fire,animate,close}=fixture(pattern);
 try{
  const velocity=f.vel.clone();f.ki=10000;let asymmetricRecoil=false;
  for(let i=0;i<180;i++){
   if(i%8===0)fire();else animate();
   const ages=f.slots.lmb.handShots;
   if(pattern==='alternate'&&ages[-1]!==undefined&&ages[1]!==undefined&&ages[-1]!==ages[1])asymmetricRecoil=true;
   if(i<80)continue;
   for(const [arm,side]of [[f.parts.armL,-1],[f.parts.armR,1]]){
    if(pattern==='left'&&side>0||pattern==='right'&&side<0)continue;
    const hand=arm.children[2],p=hand.getWorldPosition(new THREE.Vector3());
    const ray=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
    assert.ok(ray.dot(f.aimWorld.clone().sub(p).normalize())>.99);
    assert.ok(hand.morphTargetInfluences[0]>.9,'The firing palm opens, unless it holds equipment');
   }
   assert.ok(f._groundMotion.weight>.9,JSON.stringify({i,weight:f._groundMotion.weight,ki:f.ki,recent:f._rangedPose,animT:f.animT,gait:f.gait}));assert.deepEqual(f.vel.toArray(),velocity.toArray());
  }
  if(pattern==='alternate')assert.ok(asymmetricRecoil);
  for(let i=0;i<150;i++)animate();assert.ok(f._combatAim.weight<.001,'Releasing the volley restores the locomotion base');
 }finally{close();}
});

test('volley preserves steep aiming elevation, not only horizontal bearing',()=>{
 const {f,g,fire,close}=fixture();
 try{f.aim3.set(0,Math.sin(1.2),Math.cos(1.2));fire();assert.ok(g.projectiles.list[0].vel.clone().normalize().dot(f.aim3)>.999999);}
 finally{close();}
});

test('a launch-frame portal transfer is never undone by resolving the final hand',()=>{
 const {f,g,fire,close}=fixture();
 try{
  fire();const shot=g.projectiles.list[0];f._portalCd=1;
  const side=(x,z)=>({x,z,grp:new THREE.Group(),ring:new THREE.Group(),color:'#fff'});
  const hand=f.parts.armL.children[2].getWorldPosition(new THREE.Vector3());
  g.portals=[{a:side(hand.x,hand.z),b:side(hand.x+100,hand.z),owner:f,life:10,_humT:1}];
  Game.prototype.updatePortals.call(g,dt);const hopped=shot.pos.clone();
  assert.ok(hopped.x>90,'Actual portal must transfer the newly emitted shot');
  shot.prepareMotion(0,g);assert.ok(shot.pos.distanceTo(hopped)<1e-8,'Hand resolution cannot undo a portal transfer');
 }finally{close();}
});

test('paired shots converge at the commanded target from their separate final palms',()=>{
 const {f,g,fire,animate,close}=fixture('paired');
 try{
  f.ki=10000;f.aimWorld.set(0,7,12);
  for(let i=0;i<120;i++){
   const right=f.parts.armR.children[2].getWorldPosition(new THREE.Vector3());
   f.aim3.copy(f.aimWorld).sub(right).normalize();if(i%8===0)fire();else animate();
  }
  fire();const intended=f.aimWorld.clone();
  // The target belongs to this input command, not subsequent mouse movement.
  f.aimWorld.set(100,100,100);
  for(const shot of g.projectiles.list.slice(-2)){
   shot.prepareMotion(0,g);const toward=intended.clone().sub(shot.pos).normalize();
   assert.ok(shot.vel.clone().normalize().dot(toward)>.999999,'Both palms must converge at the crosshair, including the left palm');
  }
 }finally{close();}
});

for(const motion of ['strafe','hover','fly'])for(const pattern of ['alternate','paired'])test(`${pattern} rendered hands and forearms clear the torso through ${motion} entry and recovery`,()=>{
 const {f,fire,animate,close}=fixture(pattern,motion);f.ki=10000;
 const inside=trunkProbe(f.parts.torso),crossings=[];
 try{
  for(let i=0;i<180;i++){
   if(i<90&&i%8===0)fire();else animate();
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const [armName,arm]of [['left',f.parts.armL],['right',f.parts.armR]])for(const mesh of [arm.children[1],arm.children[2]]){
    for(let v=0;v<mesh.geometry.attributes.position.count;v++){
     const point=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(inside(point,inverse)){crossings.push({frame:i,arm:armName,mesh:mesh.name});break;}
    }
   }
  }
  assert.deepEqual(crossings.slice(0,12),[]);
 }finally{close();}
});
