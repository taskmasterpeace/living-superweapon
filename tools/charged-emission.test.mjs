import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot,cancelHeldAttacks} from '../src/engine/abilities.js';
import {attackFields,setAttackOverride} from '../src/data/attack-tuning.js';
import {profileFromDef,applyProfile,validateProfile} from '../src/tool/studio-profile.js';
import {queueHitReaction} from '../src/engine/hit-reaction.js';
import {Game} from '../src/engine/game.js';

function fixture(style='palm',motion='ground',fps=60,hand=undefined){
 const def=structuredClone(ROSTER.find(d=>d.id==='sol'));
 def.abilities={lmb:{type:'charge',name:'Charged emission',castStyle:style,castHand:hand,chest:style==='chest-brace',faceOrigin:style==='optic-focus',cost:2,maxCharge:2,kiPerSec:1,minR:.6,maxR:2,dmgMin:20,dmgMax:60,color:'#ffca48'}};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,camera:new THREE.PerspectiveCamera(),cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.entities=[f];f._game=g;f._openSky=true;f.level=10;f.ki=100000;
 f.pos.set(0,motion==='ground'?0:40,0);f.obj.position.copy(f.pos);scene.add(f.obj);
 f.flying=motion!=='ground';f.gait=f.flying?'airborne':'grounded';f.vel.set(14,0,motion==='fly'?36:0);
 f.hasAimWorld=true;f.aimWorld.set(12,f.pos.y+14,60);f.aim3.copy(f.aimWorld).sub(f.pos).normalize();f.aim.set(0,0,1);f.facing=0;
 const dt=1/fps,animate=()=>{f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 const input=(held,pressed=false)=>runSlot(f,'lmb',{held,pressed,released:!held,dt},g);
 for(let i=0;i<fps;i++)animate();
 return {f,g,dt,animate,input,close(){cancelHeldAttacks(f);combat.dispose();f.dispose();}};
}
// Independent expected source from actual rendered joints, not the implementation sampler.
function source(f,style){
 const p=f.parts,v=new THREE.Vector3();
 if(style==='two-hand')return p.armL.children[2].getWorldPosition(v).add(p.armR.children[2].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
 if(style==='chest-brace')return p.torso.getWorldPosition(v).addScaledVector(f.aim3,1.2);
 if(style==='optic-focus')return p.eyeL.getWorldPosition(v).add(p.eyeR.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5).addScaledVector(f.aim3,.12);
 return p.armR.children[2].getWorldPosition(v);
}
function center(f,style,radius,target=f.aimWorld){const v=source(f,style);return v.addScaledVector(target.clone().sub(v).normalize(),radius);}

for(const motion of ['ground','hover','fly'])for(const rebuild of [false,true])for(const castHand of ['left','right'])test(`${castHand} charge ${motion}, rebuild ${rebuild}: preparation and released sphere follow the selected anatomy`,()=>{
 const {f,g,input,animate,close}=fixture('palm',motion,60,castHand);
 const expected=(radius,target=f.aimWorld)=>{
  const v=(castHand==='right'?f.parts.armL:f.parts.armR).children[2].getWorldPosition(new THREE.Vector3());
  return v.addScaledVector(target.clone().sub(v).normalize(),radius);
 };
 try{
  for(let i=0;i<60;i++){
   input(true,i===0);f.pos.x+=.2;f.obj.position.copy(f.pos);animate();
   const orb=f.slots.lmb.orb;
   assert.ok(orb.position.distanceTo(expected(orb.scale.x))<1e-5,'Gathering field uses the wrong hand');
  }
  input(false);const shot=g.projectiles.list.at(-1),target=f.aimWorld.clone();
  if(rebuild){const previous=f.parts;assert.equal(f.applyForm({name:'New anatomy',frame:{scale:1.2,bulk:1.3}}),true);assert.notEqual(f.parts,previous);}
  f.pos.x+=3;f.obj.position.copy(f.pos);animate();const origin=expected(shot.radius,target);
  f.aimWorld.set(-80,20,-90);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(origin)<1e-5,'Release snapshot loses the selected hand');
  assert.ok(shot.vel.clone().normalize().dot(target.sub(shot.pos).normalize())>.99999);
  const launched=shot.pos.clone();f.pos.x+=4;f.obj.position.copy(f.pos);animate();shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(launched)<1e-8,'Launched energy follows the moving hand');
 }finally{close();}
});

for(const fps of [30,60,120])test(`charging preserves commanded velocity at ${fps} Hz`,()=>{
 const {f,input,animate,close}=fixture('palm','ground',fps);
 try{for(let i=0;i<fps;i++){input(true,i===0);animate();}assert.deepEqual(f.vel.toArray(),[14,0,0]);}finally{close();}
});

for(const style of ['palm','two-hand','chest-brace','optic-focus'])for(const motion of ['ground','hover','fly'])
test(`${style} ${motion}: gathering and launch use final anatomy`,()=>{
 const {f,g,input,animate,close}=fixture(style,motion);
 try{
  for(let i=0;i<60;i++){input(true,i===0);f.pos.x+=.2;f.obj.position.copy(f.pos);animate();
   const orb=f.slots.lmb.orb;
   assert.ok(orb.position.distanceTo(center(f,style,orb.scale.x))<1e-5,`gather/source gap ${orb.position.distanceTo(center(f,style,orb.scale.x))}`);
  }
  input(false);const shot=g.projectiles.list.at(-1),target=f.aimWorld.clone();
  f.pos.x+=4;f.obj.position.copy(f.pos);animate();const expected=center(f,style,shot.radius,target);
  f.aimWorld.set(-200,60,-80);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(expected)<1e-5,`release/source gap ${shot.pos.distanceTo(expected)}`);
  assert.ok(shot.vel.clone().normalize().dot(target.sub(shot.pos).normalize())>.99999);
  const initial=shot.pos.clone();f.pos.x+=6;f.obj.position.copy(f.pos);animate();shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(initial)<1e-8,'a launched sphere must never follow the caster');
 }finally{close();}
});

test('charged movement penalty is authored, persisted and ends with preparation',()=>{
 const {f,input,animate,close}=fixture();
 try{
  assert.equal(attackFields(f.def,'lmb').find(x=>x.key==='castMoveScale')?.value,1);
  const profile=profileFromDef(f.def);profile.attacks=setAttackOverride(profile.attacks,f.def,'lmb',{castMoveScale:.5});
  assert.equal(applyProfile(f.def,validateProfile(JSON.parse(JSON.stringify(profile)))).abilities.lmb.castMoveScale,.5);
  assert.throws(()=>setAttackOverride(profile.attacks,f.def,'lmb',{castMoveScale:1.1}),/castMoveScale/);
  input(true,true);f.slots.lmb.def.castMoveScale=.5;
  const speed=()=>{f.vel.set(0,0,0);for(let i=0;i<180;i++)f.move(new THREE.Vector3(1,0,0),1/60);return f.vel.x;};
  const slow=speed();cancelHeldAttacks(f);animate();const normal=speed();
  assert.ok(slow>0&&Math.abs(slow/normal-.5)<.01,`authored movement ratio ${slow/normal}`);
 }finally{close();}
});

test('charge field follows final hit reaction, and emits its gather effects only once there',()=>{
 const {f,g,input,animate,close}=fixture('two-hand');
 const gathers=[];g.chargeGather=(caster,color,pos)=>gathers.push(pos.clone());
 try{
  for(let i=0;i<30;i++){input(true,i===0);animate();}
  gathers.length=0;input(true);queueHitReaction(f,20,{kb:new THREE.Vector3(8,0,3)});animate();
  const expected=center(f,'two-hand',f.slots.lmb.orb.scale.x);
  assert.ok(f.slots.lmb.orb.position.distanceTo(expected)<1e-5,'hit reaction cannot leave the field behind');
  assert.equal(gathers.length,1);assert.ok(gathers[0].distanceTo(expected)<1e-5,'gather effects use the final field');
  animate();assert.equal(gathers.length,1,'rendering twice cannot duplicate simulation emission');
 }finally{close();}
});

test('release flash follows the final launch, including a form replacement',()=>{
 const {f,g,input,animate,close}=fixture('two-hand'),flashes=[];g.vfx.flash=(pos)=>flashes.push(pos.clone());
 try{
  for(let i=0;i<30;i++){input(true,i===0);animate();}
  input(false);const shot=g.projectiles.list.at(-1);assert.equal(flashes.length,0,'input-time flash would use stale anatomy');
  const retired=f.parts;
  assert.equal(f.applyForm({name:'Rebuilt rig',frame:{scale:1.2,bulk:1.3},model:{costume:'plated'}}),true);
  assert.notEqual(f.parts,retired,'the test must actually replace the old rig');
  f.pos.x+=4;f.obj.position.copy(f.pos);animate();
  const expected=center(f,'two-hand',shot.radius);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(expected)<1e-5);assert.equal(flashes.length,1);assert.ok(flashes[0].distanceTo(expected)<1e-5);
  shot.resolveLaunch(g);assert.equal(flashes.length,1);
 }finally{close();}
});

test('charge launch resolves before a launch-frame portal and never moves back',()=>{
 const {f,g,input,animate,close}=fixture('palm');
 try{
  for(let i=0;i<30;i++){input(true,i===0);animate();}input(false);animate();
  const shot=g.projectiles.list.at(-1),origin=center(f,'palm',shot.radius);f._portalCd=1;
  const side=(x,z)=>({x,z,grp:new THREE.Group(),ring:new THREE.Group(),color:'#fff'});
  g.portals=[{a:side(origin.x,origin.z),b:side(origin.x+100,origin.z),owner:f,life:10,_humT:1}];
  Game.prototype.updatePortals.call(g,1/60);const hopped=shot.pos.clone();assert.ok(hopped.x>90);
  shot.resolveLaunch(g);assert.ok(hopped.distanceTo(shot.pos)<1e-8);
 }finally{close();}
});

for(const top of [7,30])for(const fps of [30,60,120])test(`large charge cannot grow or launch through thin cover top ${top} at ${fps} Hz`,()=>{
 const {f,g,input,animate,close,dt}=fixture('palm','ground',fps);
 try{
  f.slots.lmb.def.maxR=6;f.aimWorld.set(0,8,80);f.aim3.set(0,0,1);f.vel.set(0,0,0);
  const wall={x:0,z:7,hx:20,hz:.02};g.world.interiors=[{x:0,z:7,hx:20,hz:.02,top,walls:[wall]}];
  for(let i=0;i<fps*2;i++){input(true,i===0);animate();const orb=f.slots.lmb.orb;
   assert.ok(orb.position.z+orb.scale.x<=6.98+1e-5,`solid core crosses wall by ${orb.position.z+orb.scale.x-6.98}`);
  }
  input(false);animate();const shot=g.projectiles.list.at(-1);shot.resolveLaunch(g);
  assert.ok(shot.pos.z<6.98,'radius offset cannot teleport a charged attack beyond cover');
  g.projectiles.update(dt,g);assert.equal(shot.dead,true,'release at an obstructing wall must contact it this frame');
 }finally{close();}
});

test('a target inside the full charge radius cannot reverse launch into the caster',()=>{
 const {f,g,input,animate,close}=fixture('palm');
 try{
  f.slots.lmb.def.maxR=6;
  for(let i=0;i<120;i++){input(true,i===0);animate();}
  f.aimWorld.copy(source(f,'palm')).add(new THREE.Vector3(0,0,1));const commanded=f.aimWorld.clone();
  input(false);animate();const shot=g.projectiles.list.at(-1),forward=commanded.sub(source(f,'palm')).normalize();
  shot.resolveLaunch(g);assert.ok(shot.vel.clone().normalize().dot(forward)>.99999,'the sphere must travel outward even when the target is inside its radius');
 }finally{close();}
});

for(const transfer of ['portal','body separation'])test(`held charge follows final ${transfer} without duplicate gathering`,()=>{
 const {f,g,input,animate,close}=fixture('palm');let other;
 try{
  for(let i=0;i<30;i++){input(true,i===0);animate();}
  const before=f.pos.clone();
  if(transfer==='portal'){
   const side=x=>({x,z:0,grp:new THREE.Group(),ring:new THREE.Group(),color:'#fff'});
   g.portals=[{a:side(0),b:side(100),owner:f,life:10,_humT:1}];Game.prototype.updatePortals.call(g,1/60);
  }else{
   other=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sol')));other.pos.copy(f.pos).x+=1;g.entities.push(other);
   Game.prototype.resolveBodies.call(g);
  }
  assert.ok(before.distanceTo(f.pos)>1);f.obj.updateMatrixWorld(true);
  assert.ok(f.slots.lmb.orb.position.distanceTo(center(f,'palm',f.slots.lmb.orb.scale.x))<1e-5,'gathering must follow the final transferred anatomy this frame');
 }finally{other?.dispose();close();}
});

test('charge core uses the ability palette and its owned material is disposed on cancellation',()=>{
 const a=fixture(),b=fixture();
 try{
  a.f.slots.lmb.def.color='#ff6430';b.f.slots.lmb.def.color='#39baff';a.input(true,true);b.input(true,true);
  const warm=a.f.slots.lmb.orb.children[0].material,cool=b.f.slots.lmb.orb.children[0].material;
  assert.equal(warm.color.getHexString(),'ff6430');assert.equal(cool.color.getHexString(),'39baff');
  let disposed=0;warm.addEventListener('dispose',()=>disposed++);cancelHeldAttacks(a.f);assert.equal(disposed,1);
  assert.ok(b.f.slots.lmb.orb,'one caster stopping cannot remove another caster\'s field');
 }finally{a.close();b.close();}
});
