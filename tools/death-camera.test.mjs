import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {followDeathBody} from '../src/engine/death-camera.js';
function fixture(){return {modeId:'powerworld',running:true,world:{camMode:'chase',camera:new PerspectiveCamera(60)},player:{alive:false,pos:new Vector3(),ragdoll:{P:{chest:{pos:new Vector3(8,4,-10)}}}}};}
test('KO follows moving ragdoll chest without moving camera or widening lens',()=>{
 const g=fixture(),c=g.world.camera;c.position.set(1,2,3);const origin=c.position.clone();
 for(const target of [new Vector3(8,4,-10),new Vector3(-20,15,4)]){
  g.player.ragdoll.P.chest.pos.copy(target);assert.equal(followDeathBody(g),true);
  assert.ok(c.getWorldDirection(new Vector3()).distanceTo(target.clone().sub(origin).normalize())<1e-10);
  assert.ok(c.position.equals(origin));assert.equal(c.fov,60);
 }
});
test('live player and other camera owners retain control',()=>{
 for(const change of [g=>g.player.alive=true,g=>g.running=false,g=>g.mapCam={},g=>g.hud={titleOpen:true},g=>g.combatOverlayOpen=true,g=>g.matchOver=true,g=>g.humans=[{},{}],g=>g.modeId='duel']){
  const g=fixture();change(g);const q=g.world.camera.quaternion.clone();assert.equal(followDeathBody(g),false);assert.ok(g.world.camera.quaternion.equals(q));
 }
});
