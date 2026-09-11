import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {AircraftCombat} from '../src/engine/aircraft-combat.js';
import {HUD} from '../src/engine/hud.js';

function fixture(){
 const scene=new T.Scene(),model=new T.Group(),hull=new T.Mesh(new T.BoxGeometry(5,3,10),new T.MeshStandardMaterial());hull.name='hull';model.add(hull);model.scale.setScalar(5);
 const wrapper=new T.Group();wrapper.add(model);wrapper.position.y=100;scene.add(wrapper);
 const player={alive:true,team:0,pos:new T.Vector3(0,100,0)},shots=[];
 const game={scene,running:true,modeId:'powerworld',ms:{chaseCam:true},player,entities:[player],isFoe:(a,b)=>a.team!==b.team&&b.alive,
  world:{cover:[],coverAll:[],interiors:[],heightAt:()=>0,refreshFogBoxes(){}},projectiles:{spawnProjectile:(src,o)=>shots.push({src,o})}};
 const actor={kind:'helicopter',pilotable:true,occupant:player,wrapper,model,velocity:new T.Vector3()},gun=new AircraftCombat(game,actor);actor.combat=gun;player._aircraftVehicle=actor;
 return {game,actor,gun,shots,close(){gun.dispose();hull.geometry.dispose();hull.material.dispose();}};
}
test('pilot marker follows the fired cannon velocity including inherited lateral motion',()=>{
 const x=fixture();try{
  assert.equal(typeof x.gun.pilotAim,'function');x.actor.velocity.set(80,20,100);
  const aim=x.gun.pilotAim();assert.ok(aim);assert.equal(x.gun.shots,0);assert.equal(x.gun.pilotCooldown,0);
  x.gun.pilotFire(1/60,true);const shot=x.shots[0].o;
  assert.deepEqual(shot.vel.toArray(),[80,20,390]);
  const end=shot.pos.clone().addScaledVector(shot.vel,2.2);assert.ok(aim.point.distanceTo(end)<1e-7,'No-target marker must lie on the actual finite-life trajectory');
 }finally{x.close();}
});
test('cannon marker stops at the same first wall as the physical round, not its own hull',()=>{
 const x=fixture();try{assert.equal(typeof x.gun.pilotAim,'function');x.game.world.cover.push({x:0,z:200,hx:100,hz:5,top:200,projectileShape:'box'});
  const aim=x.gun.pilotAim();assert.equal(aim.kind,'cover');assert.ok(Math.abs(aim.point.z-194.65)<1e-7);assert.equal(aim.point.y,100);
 }finally{x.close();}
});
test('cannon marker does not reveal an unseen enemy or target through cover',()=>{
 const x=fixture();try{assert.equal(typeof x.gun.pilotAim,'function');const foe={alive:true,team:1,pos:new T.Vector3(0,95,180),radius:2.2,_vis:1};x.game.entities.push(foe);
  assert.equal(x.gun.pilotAim().kind,'foe');foe._vis=0;assert.equal(x.gun.pilotAim().kind,'expiry');foe._vis=1;
  x.game.player.blindT=1;assert.equal(x.gun.pilotAim().kind,'expiry');x.game.player.blindT=0;
  x.game.world.cover.push({x:0,z:100,hx:25,hz:1,top:150,projectileShape:'box'});assert.equal(x.gun.pilotAim().kind,'cover');
 }finally{x.close();}
});
test('unoccupied or destroyed aircraft has no player aiming solution',()=>{
 const x=fixture();try{assert.equal(typeof x.gun.pilotAim,'function');x.actor.occupant=null;assert.equal(x.gun.pilotAim(),null);x.actor.occupant=x.game.player;x.gun.dead=true;assert.equal(x.gun.pilotAim(),null);}finally{x.close();}
});
test('native HUD uses the projected aircraft marker and restores centered personal aim after exit',()=>{
 const x=fixture(),oldDocument=globalThis.document,oldW=globalThis.innerWidth,oldH=globalThis.innerHeight;
 try{
  globalThis.innerWidth=1000;globalThis.innerHeight=600;globalThis.document={body:{classList:{toggle(){}}}};
  const cross={style:{},dataset:{}},hud=Object.create(HUD.prototype);hud.el={cross};hud.titleOpen=false;x.game.hud=hud;
  const camera=new T.PerspectiveCamera(70,1000/600,.1,4000);camera.position.set(0,140,-80);camera.lookAt(0,140,100);camera.updateMatrixWorld(true);
  x.game.world.screenPosOf=(a,b,c,out)=>{const p=new T.Vector3(a,b,c).project(camera);Object.assign(out,{x:(p.x+1)*500,y:(1-p.y)*300,behind:p.z>1});return out;};
  hud.updateCrosshair(x.game);assert.ok(hud._csy>10,'Aircraft shots below the camera must not retain a center crosshair');assert.equal(cross.dataset.aimMode,'aircraft');
  x.game.combatOverlayOpen=true;hud.updateCrosshair(x.game);assert.equal(cross.style.visibility,'hidden');x.game.combatOverlayOpen=false;
  camera.lookAt(0,140,-1000);camera.updateMatrixWorld(true);hud.updateCrosshair(x.game);assert.equal(cross.style.visibility,'hidden','Never draw an aircraft marker behind the camera');
  x.game.player._aircraftVehicle=null;hud.updateCrosshair(x.game);assert.equal(hud._csy,0);assert.ok(!cross.dataset.aimMode);assert.equal(cross.style.visibility,'');
 }finally{x.close();globalThis.document=oldDocument;globalThis.innerWidth=oldW;globalThis.innerHeight=oldH;}
});
