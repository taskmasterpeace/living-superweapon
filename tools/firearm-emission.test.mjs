import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter,buildWeapon} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {Game} from '../src/engine/game.js';
import {World} from '../src/engine/world.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

function fixture(id='sarge',weapon='rifle',motion='ground',fps=60){
 const def=structuredClone(ROSTER.find(d=>d.id===id));
 def.abilities={lmb:{type:'rifle',name:'Socket test',weapon,cost:1,interval:.08,damage:3,speed:180,spread:0,recoil:0,color:'#ffcb61'}};
 const f=new Fighter(def),scene=new THREE.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;g.audio={...g.audio,gunshot(){}};g.entities=[f];g.attackRandom=()=>.5;
 const flashes=[];g.muzzleFlash=(caster,color,scale,off,at)=>flashes.push({at:at?.clone()||caster.muzzle(new THREE.Vector3()),scale});
 f._game=g;f.level=10;f.ki=100000;f.animT=0;f._openSky=true;f.hasAimWorld=true;f.facing=0;f.aim.set(0,0,1);
 f.pos.set(0,motion==='ground'?0:50,0);f.obj.position.copy(f.pos);scene.add(f.obj);
 f.flying=motion!=='ground';f.gait=motion==='ground'?'grounded':'airborne';f.vel.set(14,motion==='rise'?8:0,motion==='fly'?36:0);
 f.aimWorld.set(5,f.pos.y+12,35);f.aim3.copy(f.aimWorld).sub(new THREE.Vector3(0,f.pos.y+7,0)).normalize();
 const dt=1/fps;
 const animate=()=>{f.advanceActionPose(dt);f.animT+=dt;f._animate(dt);f.obj.updateMatrixWorld(true);};
 for(let i=0;i<fps;i++)animate();
 const fire=()=>{f.slots.lmb.cd=0;const start=g.projectiles.list.length;runSlot(f,'lmb',{pressed:true,held:true,released:false,dt},g);animate();return g.projectiles.list.slice(start);};
 return {f,g,combat,world,flashes,animate,fire,dt,close(){combat.dispose();f.dispose();}};
}

for(const fps of [30,60,120])for(const [id,weapon,side,local,motion]of [
 ['sarge','rifle',1,[0,-2.15,.16],'ground'],['merc','pistol',-1,[0,-1.05,.28],'ground'],
 ['titan','rifle',1,[0,-2.15,.16],'hover'],['ironclad','rifle',1,[0,0,0],'fly'],
])test(`${id} ${weapon}: final moving ${motion} socket, target and flash at ${fps} Hz`,()=>{
 const {f,g,flashes,fire,animate,close}=fixture(id,weapon,motion,fps);
 try{
  for(let frame=0;frame<fps;frame++){if(frame%4===0)fire();else animate();}
  flashes.length=0;const [shot]=fire(),intended=f.aimWorld.clone();
  const hand=(side<0?f.parts.armL:f.parts.armR).children[2];
  const expected=hand.localToWorld(new THREE.Vector3(...local));
  f.aimWorld.set(-100,100,-100);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(expected)<1e-5,`round/socket separation ${shot.pos.distanceTo(expected)}`);
  assert.ok(shot.vel.clone().normalize().dot(intended.sub(shot.pos).normalize())>.99999,'zero-spread rounds must converge at the command target');
  assert.equal(flashes.length,1);assert.ok(flashes[0].at.distanceTo(expected)<1e-5,'flash and shot must use the same final source');
  const ray=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(ray.dot(shot.vel.clone().normalize())>.999,'the actual firing hand/barrel must face the shot');
  assert.ok(f._groundMotion?.weight>.9||motion!=='ground','keep the source gait underneath the gun pose');
  assert.deepEqual(f.vel.toArray(),[14,0,motion==='fly'?36:0]);
  const launch=shot.pos.clone();f.obj.position.x+=4;animate();shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(launch)<1e-8,'already launched rounds cannot follow the weapon');
 }finally{close();}
});

test('registry firearms have real barrel-end sockets; melee weapons do not',()=>{
 const mats={armor:new THREE.MeshStandardMaterial(),visorMat:new THREE.MeshStandardMaterial()};
 for(const [kind,at]of Object.entries({rifle:[0,-2.15,.16],pistol:[0,-1.05,.28],shotgun:[0,-2.3,.14],smg:[0,-2.15,.05],sniper:[0,-4,.05]})){
  const weapon=buildWeapon(kind,mats),muzzle=weapon.getObjectByName('weapon-muzzle');
  assert.ok(muzzle,`${kind} needs a muzzle socket`);assert.deepEqual(muzzle.position.toArray(),at);
  weapon.traverse(o=>o.geometry?.dispose());
 }
 const sword=buildWeapon('sword',mats);assert.equal(sword.getObjectByName('weapon-muzzle'),undefined);
 sword.traverse(o=>o.geometry?.dispose());for(const mat of Object.values(mats))mat.dispose();
});

test('shotgun pellets share one final barrel source and one flash, preserving speed variation',()=>{
 const {f,g,flashes,fire,close}=fixture('ramiro','shotgun');
 try{
  const shots=fire();assert.equal(shots.length,8);for(const s of shots)s.resolveLaunch(g);
  const expected=f.parts.armR.children[2].localToWorld(new THREE.Vector3(0,-2.3,.14));
  assert.ok(shots.every(s=>s.pos.distanceTo(expected)<1e-5));assert.equal(flashes.length,1);
  assert.ok(shots.every(s=>s.vel.length()>=180*.85-1e-8&&s.vel.length()<=180+1e-8));
 }finally{close();}
});

test('a launch-frame portal cannot be undone by the gun muzzle resolver',()=>{
 const {f,g,fire,close}=fixture();
 try{
  const [shot]=fire();f._portalCd=1;
  const source=f.parts.armR.children[2].localToWorld(new THREE.Vector3(0,-2.15,.16));
  const side=(x,z)=>({x,z,grp:new THREE.Group(),ring:new THREE.Group(),color:'#fff'});
  g.portals=[{a:side(source.x,source.z),b:side(source.x+100,source.z),owner:f,life:10,_humT:1}];
  Game.prototype.updatePortals.call(g,1/60);const hopped=shot.pos.clone();assert.ok(hopped.x>90);
  shot.resolveLaunch(g);assert.ok(shot.pos.distanceTo(hopped)<1e-8);
 }finally{close();}
});

test('chosen gear mounts on the driven grip, replaces native gear, fires and restores on drop',()=>{
 const {f,g,animate,close}=fixture();
 try{
  g.dropGear=Game.prototype.dropGear;g._gearKind=Game.prototype._gearKind;
  const hand=f.parts.armR.children[2],native=hand.children.find(o=>o.name==='weapon-rifle');
  const ab=Game.prototype.equipFrom.call(g,f,{ab:{type:'rifle',weapon:'pistol',name:'Held sidearm',cost:1,spread:0,recoil:0}});
  const held=f._gearMesh;assert.ok(held.parent===hand,'equipment must follow the animated grip, not the entity root');
  assert.equal(native.visible,false);assert.equal(hand.userData.gripOccupied,true);
  runSlot(f,'_gear',{pressed:true,held:true,released:false,dt:1/60},g);animate();
  const shot=g.projectiles.list.at(-1);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(held.getObjectByName('weapon-muzzle').getWorldPosition(new THREE.Vector3()))<1e-5);
  assert.equal(f.slots._gear.def,ab);g.dropGear(f,false);
  assert.equal(held.parent,null);assert.equal(native.visible,true);assert.equal(hand.userData.gripOccupied,true);
 }finally{if(f._gearHeld)Game.prototype.dropGear.call(g,f,false);close();}
});

test('a held gun survives form replacement without disposed geometry or stale grips',()=>{
 const {f,g,animate,close}=fixture('ironclad');
 try{
  g.dropGear=Game.prototype.dropGear;g._gearKind=Game.prototype._gearKind;
  Game.prototype.equipFrom.call(g,f,{ab:{type:'rifle',weapon:'pistol',name:'Held sidearm',cost:1,spread:0,recoil:0}});
  const gun=f._gearMesh;let disposals=0;gun.traverse(o=>o.geometry?.addEventListener('dispose',()=>disposals++));
  f.applyForm({frame:{scale:1.2}});assert.ok(gun.parent===f.parts.armR.children[2]);assert.equal(disposals,0);
  runSlot(f,'_gear',{pressed:true,held:true,released:false,dt:1/60},g);animate();const shot=g.projectiles.list.at(-1);shot.resolveLaunch(g);
  assert.ok(shot.pos.distanceTo(gun.getObjectByName('weapon-muzzle').getWorldPosition(new THREE.Vector3()))<1e-5);
  g.dropGear(f,false);assert.equal(f.parts.armR.children[2].userData.gripOccupied,false);assert.ok(disposals>0);
 }finally{if(f._gearHeld)Game.prototype.dropGear.call(g,f,false);close();}
});

test('Studio exposes and rehearses firearm holds through the real ability and contact path',()=>{
 const {f,combat,close}=fixture();
 try{
  combat.reset(f,true,'attack');combat.shooterMotion='ground-left';
  assert.ok(combat.slots.some(([key])=>key==='lmb'),'the editor must offer the rifle for rehearsal');
  let rounds=0;const spawn=combat.game.projectiles.spawnProjectile.bind(combat.game.projectiles);
  combat.game.projectiles.spawnProjectile=(...args)=>{rounds++;return spawn(...args);};
  for(let frame=1;frame<180;frame++)combat.step(frame/60,1/60);
  assert.ok(rounds>10,'a trigger hold should repeatedly fire');assert.ok(combat.damage>0,'real rounds must contact the dummy');
  assert.equal(combat.nominalDamage,3);assert.equal(combat.phase,'recovered');
 }finally{close();}
});

test('a fast aim command steers the actual gun barrel with its zero-spread round',()=>{
 const {f,g,fire,animate,close}=fixture();
 try{
  for(let i=0;i<120;i++){if(i%4===0)fire();else animate();}
  f.aimWorld.set(35,12,5);f.aim3.copy(f.aimWorld).sub(f.muzzle(new THREE.Vector3())).normalize();
  const [s]=fire();s.resolveLaunch(g);
  const barrel=new THREE.Vector3(0,-1,0).applyQuaternion(f.parts.armR.children[2].getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(barrel.dot(s.vel.clone().normalize())>.9999,`barrel/round dot=${barrel.dot(s.vel.clone().normalize())}`);
 }finally{close();}
});

test('a held slow pistol maintains its ready stance between shots without replaying recoil',()=>{
 const {f,g,animate,close,dt}=fixture('merc','pistol');f.slots.lmb.def.interval=.42;
 try{
  let shots=0,minimum=1;const spawn=g.projectiles.spawnProjectile.bind(g.projectiles);
  g.projectiles.spawnProjectile=(...args)=>{shots++;return spawn(...args);};
  for(let i=0;i<180;i++){
   f.slots.lmb.cd=Math.max(0,f.slots.lmb.cd-dt);
   runSlot(f,'lmb',{pressed:i===0,held:true,released:false,dt},g);animate();
   if(i>40)minimum=Math.min(minimum,f._combatAim.weight);
  }
  assert.ok(shots>=6&&shots<=8,'authored pistol cadence must remain unchanged');
  assert.ok(minimum>.95,`held stance collapsed to ${minimum}`);
  runSlot(f,'lmb',{pressed:false,held:false,released:true,dt},g);for(let i=0;i<100;i++)animate();
  assert.ok(f._combatAim.weight<.001,'release must still restore free locomotion');
 }finally{close();}
});

for(const target of [[4,18,12],[-3,4,12],[0,8,12]])test(`close firearm aim ${target.join('/')} keeps finite speed and converges from the final muzzle`,()=>{
 const {f,g,fire,animate,close}=fixture();
 try{
  f.aimWorld.fromArray(target);f.aim3.copy(f.aimWorld).sub(f.muzzle(new THREE.Vector3())).normalize();
  for(let i=0;i<90;i++){if(i%4===0)fire();else animate();}
  const [s]=fire();s.resolveLaunch(g);assert.ok(s.pos.toArray().every(Number.isFinite));assert.ok(Math.abs(s.vel.length()-180)<1e-6);
  assert.ok(s.vel.clone().normalize().dot(f.aimWorld.clone().sub(s.pos).normalize())>.99999);
 }finally{close();}
});

test('a coincident commanded target cannot create an invalid firearm transform',()=>{
 const {f,g,fire,close}=fixture();
 try{
  f.aimWorld.copy(f.parts.armR.children[2].localToWorld(new THREE.Vector3(0,-2.15,.16)));
  const [s]=fire();s.resolveLaunch(g);
  assert.ok([...s.pos.toArray(),...s.vel.toArray(),...f.parts.armR.children[2].quaternion.toArray()].every(Number.isFinite));
  assert.ok(Math.abs(s.vel.length()-180)<1e-6);
 }finally{close();}
});

test('an expiring scavenged weapon pays and emits its last round before being removed',()=>{
 const {f,g,animate,close}=fixture();
 try{
  g.dropGear=Game.prototype.dropGear;g._gearKind=Game.prototype._gearKind;
  Game.prototype.equipFrom.call(g,f,{ab:{type:'rifle',weapon:'pistol',name:'Held sidearm',cost:1,spread:0,recoil:0}});
  f.pos.set(80,50,60);f.obj.position.copy(f.pos);animate();f._gearHeld.t=.001;
  const at=f._gearMesh.getObjectByName('weapon-muzzle').getWorldPosition(new THREE.Vector3());
  runSlot(f,'_gear',{pressed:true,held:true,released:false,dt:1/60},g);const s=g.projectiles.list.at(-1);
  Game.prototype.drainGear.call(g,f,1/60);assert.equal(f._gearMesh,null);animate();s.resolveLaunch(g);
  assert.ok(s.pos.distanceTo(at)<1e-5,`removed emitter jumped ${s.pos.distanceTo(at)} units`);
 }finally{if(f._gearHeld)Game.prototype.dropGear.call(g,f,false);close();}
});

test('a native firearm resolves against the replacement form on its launch frame',()=>{
 const {f,g,animate,close}=fixture();
 try{
  f.pos.set(80,50,60);f.obj.position.copy(f.pos);animate();
  runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);f.applyForm({frame:{bulk:1.3}});animate();
  const s=g.projectiles.list.at(-1);s.resolveLaunch(g);
  const at=f.parts.armR.children[2].getObjectByName('weapon-muzzle').getWorldPosition(new THREE.Vector3());
  assert.ok(s.pos.distanceTo(at)<1e-5,`retired native emitter jumped ${s.pos.distanceTo(at)} units`);
 }finally{close();}
});

test('pending held gunfire follows its transferred grip through a launch-frame form replacement',()=>{
 const {f,g,animate,close}=fixture();
 try{
  g.dropGear=Game.prototype.dropGear;g._gearKind=Game.prototype._gearKind;
  Game.prototype.equipFrom.call(g,f,{ab:{type:'rifle',weapon:'pistol',name:'Held sidearm',cost:1,spread:0,recoil:0}});
  f.pos.set(80,50,60);f.obj.position.copy(f.pos);animate();
  runSlot(f,'_gear',{pressed:true,held:true,released:false,dt:1/60},g);f.applyForm({frame:{scale:1.2}});animate();
  const s=g.projectiles.list.at(-1);s.resolveLaunch(g);
  const at=f._gearMesh.getObjectByName('weapon-muzzle').getWorldPosition(new THREE.Vector3());
  assert.ok(s.pos.distanceTo(at)<1e-5,`transferred weapon emitted ${s.pos.distanceTo(at)} units away`);
 }finally{if(f._gearHeld)Game.prototype.dropGear.call(g,f,false);close();}
});

for(const fps of [30,60,120])test(`ordinary firearm rounds cannot tunnel through thin cover at ${fps} Hz`,()=>{
 const {f,g,combat,world,close}=fixture();
 try{
  combat.reset(f,true,'attack');combat.shooterMotion='ground-left';
  const wall={x:0,z:20,hx:30,hz:.01};world.interiors=[{x:0,z:20,hx:30,hz:.01,top:100,walls:[wall]}];world.hitInteriorWall=World.prototype.hitInteriorWall;
  for(let frame=1;frame<fps*3;frame++)combat.step(frame/fps,1/fps);
  assert.equal(combat.damage,0,'a solid wall must actually protect the dummy');
 }finally{close();}
});

for(const fps of [30,60,120])test(`bullet hit padding cannot reach a fighter fully behind cover at ${fps} Hz`,()=>{
 const {f,g,combat,world,close}=fixture();
 try{
  combat.reset(f,true,'attack');const target=combat.target;target.pos.set(0,0,12.3);target.obj.position.copy(target.pos);target.invuln=0;
  const wall={x:0,z:10,hx:20,hz:.01};world.interiors=[{x:0,z:10,hx:20,hz:.01,top:30,walls:[wall]}];
  assert.ok(target.pos.z-target.radius>10.01,'the physical body is entirely beyond the wall');
  const fire=()=>g.projectiles.spawnProjectile(f,{pos:new THREE.Vector3(0,8,0),vel:new THREE.Vector3(0,0,600),radius:.55,damage:10,blast:0.01,ballistic:true,bullet:true,weapon:'rifle',color:'#ffcb61',life:1});
  fire();for(let i=0;i<fps/5;i++)g.projectiles.update(1/fps,g);assert.equal(combat.damage,0);
  world.interiors=[];fire();for(let i=0;i<fps/5;i++)g.projectiles.update(1/fps,g);assert.ok(combat.damage>0,'the same exposed target must still be hittable');
 }finally{close();}
});

for(const fps of [30,60,120])for(const [id,weapon,motion]of [['sarge','rifle','ground'],['titan','rifle','hover'],['merc','pistol','ground']])
test(`${id} ${weapon} ${motion}: equipped geometry clears a thin wall through approach/release at ${fps} Hz`,()=>{
 const {f,g,world,fire,animate,close,dt}=fixture(id,weapon,motion,fps),crossings=[],bodyCrossings=[],inside=trunkProbe(f.parts.torso);
 const wall={x:0,z:2.4,hx:20,hz:.02};world.interiors=[{x:0,z:2.4,hx:20,hz:.02,top:100,walls:[wall]}];
 try{
  for(let frame=0;frame<fps*3;frame++){
   const t=frame*dt;f.pos.z=t<2.3?Math.min(0,-6+t*6):-Math.min(6,(t-2.3)*6);f.obj.position.copy(f.pos);
   f.vel.set(0,0,t<1?6:t>=2.3?-6:0);f.aimWorld.set(0,f.pos.y+8,80);
   f.aim3.copy(f.aimWorld).sub(f.pos.clone().add(new THREE.Vector3(0,7,0))).normalize();
   const shots=t<2.1&&frame%3===0?fire():(animate(),[]);
   const arm=weapon==='pistol'?f.parts.armL:f.parts.armR;
   const inverse=f.parts.torso.matrixWorld.clone().invert();
   for(const root of [arm.children[1],arm.children[2]])root.traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
     const p=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(inside(p,inverse)){bodyCrossings.push({frame,part:mesh.name,at:p.toArray()});break;}
    }
   });
   arm.children[2].traverse(mesh=>{if(!mesh.isMesh||!mesh.visible)return;
    for(let i=0;i<mesh.geometry.attributes.position.count;i++){
     const p=mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
     if(p.z>2.38+1e-5){crossings.push({frame,z:p.z,part:mesh.name});break;}
    }
   });
   for(const shot of shots){shot.resolveLaunch(g);assert.ok(shot.pos.z<2.38,'never start a round on the far side of cover');}
  }
  assert.deepEqual(crossings.slice(0,8),[]);
  assert.deepEqual(bodyCrossings.slice(0,5),[],'cover retraction cannot bury the gun or arm inside the torso');
 }finally{close();}
});
