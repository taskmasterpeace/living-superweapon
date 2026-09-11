import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {firearmAmmo,requestReload,updateFirearmReload,cancelFirearmReload} from '../src/engine/firearm-ammo.js';
import {trunkProbe} from './helpers/trunk-probe.mjs';

for(const hz of [30,60,120])test(`real soldier reload manipulates its magazine, preserves rifle and recovers at ${hz}Hz`,()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  const gun=f.parts.armR.children[2].getObjectByName('weapon-rifle');
  const mag=gun.getObjectByName('weapon-magazine');assert.ok(mag,'rifle needs a physical removable magazine');
  const rest=mag.position.clone(),root=f.pos.clone(),hand=f.parts.armL.children[2];
  assert.ok(mag.getWorldPosition(new THREE.Vector3()).y<gun.getWorldPosition(new THREE.Vector3()).y,'Magazine belongs below the receiver, not above it');
  const a=firearmAmmo(f.slots.lmb);a.loaded=12;assert.ok(requestReload(f,'lmb',x.g));
  const duration=f._firearmReload.duration,inside=trunkProbe(f.parts.torso);let drawn=0,previous=null,maxStep=0,contacts=0;
  for(let i=0;i<=Math.ceil((duration+.2)*hz);i++){
   updateFirearmReload(f,1/hz,x.g);f._animate(1/hz);f.obj.updateMatrixWorld(true);
   const t=f._firearmReload?.elapsed/duration;
   drawn=Math.max(drawn,mag.position.distanceTo(rest));
   const at=hand.getWorldPosition(new THREE.Vector3());if(previous)maxStep=Math.max(maxStep,at.distanceTo(previous));previous=at;
   const inverse=f.parts.torso.matrixWorld.clone().invert(),arm=f.parts.armL;
   const surface=f.parts.rig.limbSurfaces.find(s=>s.upper===arm.children[0]);
   for(const [mesh,limb]of [[hand,null],[surface.mesh,surface]])for(let v=0;v<mesh.geometry.attributes.position.count;v++){
    if(limb&&limb.rows[Math.floor(v/limb.segments)]?.driver!==arm.children[1])continue;
    const vertex=mesh.getVertexPosition(v,new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
    assert.ok(!inside(vertex,inverse),`rendered reload ${mesh.name} vertex ${v} clips torso at ${t}: ${vertex.clone().applyMatrix4(inverse).toArray()}`);
   }
   if(t>.22&&t<.63){const grip=mag.getObjectByName('magazine-grip').getWorldPosition(new THREE.Vector3());assert.ok(at.distanceTo(grip)<.06,`magazine contact ${at.distanceTo(grip)} at ${t}`);contacts++;}
   assert.equal(gun.parent,f.parts.armR.children[2]);assert.ok(f.pos.equals(root),'articulation cannot move simulation root');
  }
  assert.ok(drawn>.6,'magazine must visibly leave receiver');assert.ok(contacts>10);assert.ok(maxStep<50/hz,`hand step ${maxStep}`);
  assert.ok(mag.position.distanceTo(rest)<1e-8);assert.equal(a.loaded,a.capacity);assert.equal(f._firearmReload,null);
  const support=gun.getObjectByName('weapon-support-grip').getWorldPosition(new THREE.Vector3());assert.ok(hand.getWorldPosition(new THREE.Vector3()).distanceTo(support)<.06);
 }finally{x.close();}
});

test('interrupted reload restores magazine, leaves ammunition unchanged and can restart',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p;
 try{
  const mag=f.parts.armR.children[2].getObjectByName('weapon-magazine');assert.ok(mag);const rest=mag.position.clone();
  const a=firearmAmmo(f.slots.lmb);a.loaded=10;requestReload(f,'lmb',x.g);
  updateFirearmReload(f,f._firearmReload.duration*.4,x.g);f._animate(1/60);assert.ok(mag.position.distanceTo(rest)>.6);
  cancelFirearmReload(f);f._animate(1/60);assert.ok(mag.position.equals(rest));assert.equal(a.loaded,10);assert.ok(requestReload(f,'lmb',x.g));
 }finally{x.close();}
});

test('Studio reload rehearsal runs the production action without firing at its target',()=>{
 const x=mainCombatFixture({hero:'sarge'}),f=x.p,c=x.combat;
 try{
  c.slot='lmb';c.pattern='reload';c.shooterMotion='ground-crouch-forward';c.reset(f,true,'attack');let seen=false;
  for(let i=0;i<240;i++){c.step(i/60,1/60);if(f._firearmReload?.elapsed>.5)seen=true;assert.equal(c.game.projectiles.list.length,0);}
  assert.ok(seen,'No reload action in the Studio rehearsal');assert.equal(c.phase,'reload-complete');assert.equal(f.slots.lmb.ammo.loaded,30);assert.ok(f.crouching);
 }finally{x.close();}
});
