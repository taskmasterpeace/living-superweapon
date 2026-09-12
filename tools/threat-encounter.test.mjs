import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {mainCombatFixture} from './helpers/main-combat-fixture.mjs';
import {MeleeTrial} from '../src/engine/melee-trial.js';
import {retirePracticeActor} from '../src/engine/practice-actor-retirement.js';
test('live threat admits native AI and powers, repeats without retaining the old actor',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  x.g.ms.threatLab={state:'preparing'};const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,30));
  t.previewThreat('sol');const a=t.startEncounter();assert.ok(a.ai);assert.ok(Object.keys(a.slots).length);assert.ok(!a.isDummy);assert.equal(a._meleeTrial,undefined);assert.equal(t.previewActor,null);
  const b=t.repeat();assert.notEqual(b,a);assert.deepEqual(x.g.entities,[x.p,b]);assert.equal(a.state,'ko');
  x.g.ms.threatLab.state='deployed';assert.equal(t.startEncounter(),false);assert.equal(t.target,b);t.dispose();
 }finally{x.close();}
});
test('retirement removes owned effects and descendants while retaining unrelated world owners',()=>{
 const x=mainCombatFixture();try{
  const owner=x.foe(),clone=x.foe(),other=x.foe();clone._dupeOf=owner;
  const disposed=[],effect=who=>({owner:who,_dispose(){disposed.push(this);}});
  const shot={caster:owner,_dispose(){disposed.push(this);}},keptShot={caster:other,_dispose(){}};
  x.g.projectiles.list=[shot,keptShot];const child=effect(clone),keptMinion=effect(other);x.g.minions=[child,keptMinion];
  const wall=effect(owner),keptWall=effect(other);x.g.constructs=[wall,keptWall];
  const cancelled=[];x.g.weather={cancelCommand:f=>cancelled.push(f)};
  const field={src:owner,mesh:new THREE.Mesh(new THREE.SphereGeometry(1),new THREE.MeshBasicMaterial())},keptField={src:other};x.g.scene.add(field.mesh);x.g.timeFields={list:[field,keptField]};
  const keptZone={src:other};x.g.gravityZones={list:[{src:clone},keptZone]};
  const portal={owner},keptPortal={owner:other};x.g.portals=[portal,keptPortal];x.g._closePair=p=>x.g.portals.splice(x.g.portals.indexOf(p),1);
  retirePracticeActor(x.g,owner);
  assert.deepEqual(x.g.entities,[x.p,other]);assert.deepEqual(x.g.projectiles.list,[keptShot]);assert.deepEqual(x.g.minions,[keptMinion]);assert.deepEqual(x.g.constructs,[keptWall]);assert.deepEqual(x.g.timeFields.list,[keptField]);assert.equal(field.mesh.parent,null);assert.deepEqual(x.g.gravityZones.list,[keptZone]);assert.deepEqual(x.g.portals,[keptPortal]);assert.deepEqual([...new Set(cancelled)],[owner,clone]);assert.equal(disposed.length,3);
  x.g.projectiles.list=[];x.g.minions=[];x.g.constructs=[];
 }finally{x.close();}
});


test('practice KO avoids campaign rewards, gear drops and operation callbacks',()=>{
 const x=mainCombatFixture({mode:'powerworld'});try{
  const t=new MeleeTrial(x.g,new THREE.Vector3(0,0,30));x.g.ms.threatLab={state:'preparing',meleeTrial:t};t.previewThreat('merc');const f=t.startEncounter();f.lastHitBy=x.p;f.lastHitT=0;
  const before={xp:x.p.xp,kills:x.p.kills,score:x.p.score};let drops=0,callbacks=0;
  x.g.spawnGearDrop=()=>drops++;x.g.mode.onKO=()=>callbacks++;x.g.onKill=()=>callbacks++;
  x.g.audio={...x.g.audio,cry(){}};x.g.handleKO(f);assert.deepEqual({xp:x.p.xp,kills:x.p.kills,score:x.p.score},before);assert.equal(drops,0);assert.equal(callbacks,0);
  const clone=x.foe();clone._dupeOf=f;x.p.state='ko';x.p.lastHitBy=clone;assert.equal(t.canRecoverKO(),true);x.p.state='idle';t.dispose();
 }finally{x.close();}
});

