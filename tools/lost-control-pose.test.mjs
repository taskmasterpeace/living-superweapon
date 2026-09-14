import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {airControlState,animateLostControlPose,restoreLostControlPose} from '../src/engine/lost-control-pose.js';

test('air control states distinguish launch, ordinary fall, powered flight, attachment and KO',()=>{
 const x=mainCombatFixture({mode:'powerworld',height:0});try{const f=x.p;assert.equal(airControlState(f),'grounded');f.pos.y=80;assert.equal(airControlState(f),'falling');f.flying=true;assert.equal(airControlState(f),'flight');f.launchT=1;assert.equal(airControlState(f),'uncontrolled');f.grabbedBy={};assert.equal(airControlState(f),'attached');f.state='ko';assert.equal(airControlState(f),'ko');}finally{x.close();}
});
test('sleep falls limp and frozen bodies reject the flailing overlay',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f._openSky=true;f.pos.y=80;f.hitstop=0;f.sleepT=3;
 animateLostControlPose(f,1);const sleep=f.parts.armR.quaternion.clone();restoreLostControlPose(f);
 f.sleepT=0;f.stunT=3;f._lostControlPose=null;animateLostControlPose(f,1);
 assert.ok(sleep.angleTo(f.parts.armR.quaternion)>.5,'sleep reused the stun flail');restoreLostControlPose(f);
 f.frozenT=3;const base=f.parts.armR.quaternion.clone();animateLostControlPose(f,.1);
 assert.equal(airControlState(f),'frozen');assert.equal(f._lostControlPose.weight,0);assert.ok(base.equals(f.parts.armR.quaternion));
 }finally{x.close();}
});
test('lost-control presentation moves the shared rig without altering physics or resources, and restores exactly',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f._openSky=true;f.pos.y=80;f.launchT=1;f.hitstop=0;
 const pos=f.pos.clone(),vel=f.vel.clone(),hp=f.hp,ki=f.ki,base=f.parts.armR.quaternion.clone(),root=f.obj.quaternion.clone();
 animateLostControlPose(f,.1);assert.ok(f._lostControlPose.weight>.5);assert.ok(f.parts.armR.quaternion.angleTo(base)>.1);assert.ok(f.obj.quaternion.equals(root));
 assert.ok(f.pos.equals(pos)&&f.vel.equals(vel));assert.equal(f.hp,hp);assert.equal(f.ki,ki);
 const saved=f._lostControlPose.nodes.map(e=>({node:e.node,p:e.position.clone(),q:e.quaternion.clone()}));restoreLostControlPose(f);
 for(const e of saved){assert.ok(e.node.position.equals(e.p));assert.ok(e.node.quaternion.equals(e.q));}
 }finally{x.close();}
});
test('recovery blends out, while landing and attacks return articulation immediately',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p;f._openSky=true;f.pos.y=80;f.launchT=1;animateLostControlPose(f,.1);const weight=f._lostControlPose.weight;restoreLostControlPose(f);f.launchT=0;animateLostControlPose(f,1/60);assert.ok(f._lostControlPose.weight<weight&&f._lostControlPose.weight>0);
 for(let i=0;i<60;i++){restoreLostControlPose(f);animateLostControlPose(f,1/60);}assert.equal(f._lostControlPose.weight,0);
 f.launchT=1;animateLostControlPose(f,.1);restoreLostControlPose(f);f.mstate='startup';animateLostControlPose(f,.1);assert.equal(f._lostControlPose.weight,0);f.mstate=null;f.pos.y=0;animateLostControlPose(f,.1);assert.equal(f._lostControlPose.weight,0);
 }finally{x.close();}
});
test('native nonfatal launch animates lost control; lethal damage hands over to the existing ragdoll',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{const f=x.p,enemy=x.foe();f._openSky=true;f._chaseKb=true;f.pos.y=100;f.invuln=0;f._altTag=()=>{};
 f.takeDamage(12,{src:enemy,kb:{x:40,z:0},launch:30,hitstop:0});assert.ok(f.launchT>0);f.update(1/60,x.g);assert.equal(airControlState(f),'uncontrolled');assert.ok(f._lostControlPose.weight>0);assert.ok(!f.ragdoll);
 const head=f.parts.head.getWorldPosition(new THREE.Vector3()),base=f._lostControlPose.nodes.find(e=>e.node===f.parts.armR),restPosition=base.position.clone(),restQuaternion=base.quaternion.clone();
 f.takeDamage(100000,{src:enemy,trueDamage:true,hitstop:0});assert.equal(f.state,'ko');assert.ok(f.ragdoll);assert.equal(f._lostControlPose,null);f.ragdoll.apply(f);assert.ok(f.parts.head.getWorldPosition(new THREE.Vector3()).distanceTo(head)<1e-5,'KO starts at the displayed falling pose');
 f.ragdoll.restore();assert.ok(f.parts.armR.position.equals(restPosition));assert.ok(f.parts.armR.quaternion.angleTo(restQuaternion)<1e-6);
 }finally{x.close();}
});


