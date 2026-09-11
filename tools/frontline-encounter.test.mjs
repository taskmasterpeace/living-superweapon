import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {World} from '../src/engine/world.js';
import {Game} from '../src/engine/game.js';
import {prepareFrontline} from '../src/engine/frontline-preparation.js';

const module = await import('../src/engine/frontline-encounter.js').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  return {};
});
function fixture(world={}) {
  assert.equal(typeof module.FrontlineEncounter, 'function', 'Clone recovery encounter must exist');
  const scene = new THREE.Scene(), entities = [], player = new Fighter(ROSTER[0]);
  player.pos.set(-40, 0, -40);
  const g = {scene, entities, player, results:[],allocations:0,running:true, matchOver:false, hud:{titleOpen:false},
    endMatch(result){this.results.push(result);this.matchOver=true;},
    world:{cover:[{x:10,z:10,hx:16,hz:16,top:30}],...world},
    addFighter(def, opts) { this.allocations++;const f = new Fighter(def, opts); entities.push(f); scene.add(f.obj); return f; }};
  const encounter = new module.FrontlineEncounter(g);
  const clear = () => { for (const f of encounter.soldiers) f.hp = 0; encounter.update(0); };
  return {g, encounter, clear, close(){encounter.dispose();player.dispose();}};
}

test('native hero replacement returns one sample to its case instead of transferring phantom cargo',()=>{
 const x=fixture(),e=x.encounter,g=x.g,original=g.player;
 try{
  original.pos.copy(e.casePosition);e.update(1.5);assert.equal(e.sampleOwner,original);
  g.humans=[{fighter:original}];g.vfx={flash(){},ring(){}};Game.prototype.setPlayerChar.call(g,'kano');
  g.player.pos.copy(e.extractionPosition);e.update(2);
  assert.equal(e.phase,'recover');assert.equal(e.progress,0);assert.equal(e.sampleOwner,null);assert.equal(e.caseMesh.visible,true);assert.equal(g.results.length,0);
  g.player.pos.copy(e.casePosition);e.update(1.5);assert.equal(e.sampleOwner,g.player);assert.equal(e.caseMesh.visible,false);
  g.player.pos.copy(e.extractionPosition);e.update(2);e.update(20);assert.equal(g.results.length,1);assert.equal(e.completions,1);
 }finally{const replacement=g.player;x.close();if(replacement!==original)replacement.dispose();}
});
test('paused and title views preserve an in-progress hold and damage cooldown exactly',()=>{
 const x=fixture(),e=x.encounter,g=x.g,p=g.player;
 try{
  for(const phase of ['recover','extract']){
   e.phase=phase;e.sampleOwner=phase==='extract'?p:null;p.pos.copy(phase==='recover'?e.casePosition:e.extractionPosition);
   e.progress=.7;e.damagePause=.6;
   g.running=false;e.update(100);g.running=true;g.hud.titleOpen=true;e.update(100);g.hud.titleOpen=false;
   assert.equal(e.progress,.7);assert.equal(e.damagePause,.6);assert.equal(e.phase,phase);assert.equal(g.results.length,0);
  }
 }finally{x.close();}
});
test('whole objective footprints and native clone roots respect terrain and arena bounds',()=>{
 const x=fixture({ARENA:75,cover:[],heightAt:(x,z)=>100+x*.05-z*.03}),e=x.encounter;
 try{
  assert.equal(e.phase,'recover');assert.equal(e.soldiers.length,4);
  for(const p of [e.casePosition,e.extractionPosition,...e.soldiers.map(f=>f.pos)]){
   assert.ok(Math.abs(p.x)+12<=75&&Math.abs(p.z)+12<=75);assert.ok(Math.abs(p.y-x.g.world.heightAt(p.x,p.z))<1e-8);
  }
  assert.ok(e.casePosition.distanceTo(e.extractionPosition)>=24,'case and extraction discs must not overlap');
  for(const f of e.soldiers)assert.equal(f.groundY,f.pos.y);
 }finally{x.close();}
});
test('a later blocked squad footprint leaves no partial actors or objective resources',()=>{
 const width=40,cover=[{x:-10000,z:0,hx:9940,hz:100000,top:100},{x:10000,z:0,hx:10032-width,hz:100000,top:100},{x:0,z:-10000,hx:100000,hz:9940,top:100},{x:0,z:10000,hx:100000,hz:10032-width,top:100}];
 const x=fixture({cover}),e=x.encounter;
 try{assert.equal(e.phase,'blocked');assert.ok(e.casePosition&&e.extractionPosition,'both objective footprints must fit before the later squad failure');assert.equal(x.g.allocations,0,'preflight all positions before even the first native allocation');assert.equal(x.g.entities.length,0);assert.equal(x.g.scene.children.length,0);assert.match(e.equipmentError,/placement.*menu.*retry/i);e.update(10);assert.equal(x.g.results.length,0);}finally{x.close();}
});
test('blocked placement stays behind the native preparation error gate and can cancel cleanly',async()=>{
 const x=fixture({cover:[],heightAt:()=>NaN}),g=x.g;const errors=[];
 g.ms={frontline:x.encounter};g.reportError=e=>errors.push(e.message);g.world.renderer={compile(){throw Error('must not compile blocked setup');},info:{programs:[]}};
 const stage={g,group:new THREE.Group(),frontlineLoading:Promise.resolve()},messages=[];
 try{
  const task=prepareFrontline(stage,{ui:()=>({update:m=>messages.push(m),destroy(){}})});
  assert.equal(await task.promise,false);assert.equal(task.status,'error');assert.equal(g._frontlinePreparing,task);assert.equal(stage.frontlineReady,false);
  assert.match(errors[0],/placement/);assert.ok(messages.some(m=>/Return to menu/.test(m)));assert.equal(g.entities.length,0);task.cancel();assert.equal(g._frontlinePreparing,null);
 }finally{x.close();}
});
test('an actor-construction failure rolls back even a fighter inserted before the throw',()=>{
 const x=fixture(),g=x.g;x.encounter.dispose();const add=g.addFighter;let calls=0,failed;
 g.addFighter=function(def,opts){const f=add.call(this,def,opts);if(++calls===2)throw Error('injected actor failure');return f;};
 try{failed=new module.FrontlineEncounter(g);assert.equal(calls,2);assert.equal(failed.phase,'blocked');assert.equal(g.entities.length,0);assert.equal(g.scene.children.length,0);assert.match(failed.equipmentError,/injected actor failure/);}finally{failed?.dispose();x.close();}
});
test('steep and non-finite ground refuse setup through an inert preparation error',()=>{
 for(const heightAt of [(x,z)=>2*x,()=>NaN]){
  const x=fixture({cover:[],heightAt});try{assert.equal(x.encounter.phase,'blocked');assert.equal(x.g.entities.length,0);assert.ok(x.encounter.equipmentError);}finally{x.close();}
 }
});

test('extraction marker is not a permanent halo under the player before recovery',()=>{
 const x=fixture();try{
  const e=x.encounter,at=e.extractionPosition;
  const extraction=e.markers.children.filter(m=>m.geometry&&m.position.x===at.x&&m.position.z===at.z);
  assert.ok(extraction.length);assert.ok(extraction.every(m=>!m.visible));
  x.g.player.pos.copy(e.casePosition);e.update(1.5);e.update(0);assert.ok(extraction.every(m=>m.visible));
 }finally{x.close();}
});
test('clones use independent finite ground-only native rifle definitions without roster mutation', () => {
  const before = JSON.stringify(ROSTER), x = fixture();
  try {
    assert.equal(x.encounter.soldiers.length,4);
    for (const f of x.encounter.soldiers) {
      assert.equal(f.def.id,'sarge'); assert.match(f.def.name,/CLONE/);
      assert.equal(f.flightTier,0); assert.equal(f.energyInfinite,false);
      assert.equal(f._frontlineClone,true); assert.ok(!f._openSky); assert.equal(f.noRespawn,true);
      assert.deepEqual(Object.values(f.def.abilities).map(a=>a.type),['rifle']);
      assert.ok(f.slots.lmb.ammo.loaded>0&&Number.isFinite(f.slots.lmb.ammo.reserve));
      assert.ok(f.slots.lmb.def.damage<=5 && f.slots.lmb.def.interval>=.2);
      assert.ok(f.ai.reflex>=.2 && f.ai.aimJitter>0); assert.equal(f.ai.flyTend,0);
      assert.equal(f.team,1); assert.equal(f.level,1); assert.equal(f.items.length,0);
    }
    x.encounter.soldiers[0].def.abilities.lmb.damage=1;
    assert.notEqual(x.encounter.soldiers[1].def.abilities.lmb.damage,1);
    assert.equal(JSON.stringify(ROSTER),before);
  } finally {x.close();}
});

test('rifle clones display only their issued rifle, not SARGE plasma swords or riot shields',()=>{
  const x=fixture();
  try{
    for(const f of x.encounter.soldiers){
      const weapons=[];f.obj.traverse(o=>{if(o.userData.weaponKind)weapons.push(o.userData.weaponKind);});
      assert.deepEqual(weapons,['rifle']);
      assert.ok(!f.parts.armL.userData.shield);
      assert.equal(f.parts.armL.children[2].userData.gripOccupied,false);
      assert.equal(f.parts.armR.children[2].userData.gripOccupied,true);
    }
    const sarge=new Fighter(ROSTER.find(d=>d.id==='sarge'));
    try{
      const weapons=[];sarge.obj.traverse(o=>{if(o.userData.weaponKind)weapons.push(o.userData.weaponKind);});
      assert.deepEqual(weapons.sort(),['rifle','sword']);
      assert.ok(sarge.parts.armL.userData.shield);
    }finally{sarge.dispose();}
  }finally{x.close();}
});

test('field rifle clones use the shared source body while retaining native limb and weapon drivers',()=>{
  const x=fixture();
  try{
    for(const f of x.encounter.soldiers){
      assert.equal(f.parts.skin?.id,'superhero-male');
      assert.equal(f.def.model.surface,'field');
      assert.equal(f.def.model.costume,'tactical');
      assert.ok(f.obj.getObjectByName('hero-skin-body')?.isSkinnedMesh);
      assert.equal(f.parts.skin.meshes.filter(m=>m.name==='hero-skin-body').length,1);
      const rifle=f.obj.getObjectByName('weapon-rifle');
      assert.equal(rifle.parent,f.parts.armR.children[2]);
      f.vel.set(12,0,10);f._animate(1/60);f.obj.updateMatrixWorld(true);
      assert.ok(f.parts.skin.skeleton.bones.every(b=>b.matrix.elements.every(Number.isFinite)));
    }
    const sarge=new Fighter(ROSTER.find(d=>d.id==='sarge'));
    try{
      assert.equal(sarge.parts.skin?.id,'superhero-male','playable SARGE now shares the authored body family');
      assert.notEqual(sarge.parts.skin.meshes[0],x.encounter.soldiers[0].parts.skin.meshes[0],'squad and player own independent rendered bodies');
      assert.equal(sarge.def.abilities.q.name,'Plasma Blade','clone loadout must not mutate the player kit');
    }finally{sarge.dispose();}
  }finally{x.close();}
});
test('a living squad can be bypassed through a 1.5-second case hold and separate 2-second extraction', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    p.pos.copy(e.casePosition); assert.equal(e.phase,'recover');
    assert.equal(e.soldiers.filter(f=>f.alive&&f.hp>0).length,4);
    e.update(1); assert.equal(e.phase,'recover'); assert.equal(e.progress,1);
    e.update(.5); assert.equal(e.phase,'extract'); assert.equal(e.progress,0);
    e.update(3); assert.equal(e.phase,'extract');
    p.pos.copy(e.extractionPosition);e.update(1.9);assert.equal(e.phase,'extract');
    e.update(.1);assert.equal(e.phase,'complete');assert.equal(e.completions,1);
    e.update(8);assert.equal(e.completions,1);assert.equal(x.g.running,true);
  } finally {x.close();}
});
test('airborne, outside radius, paused and title states cannot advance interactions', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    x.clear();p.pos.copy(e.casePosition);e.update(.5);
    p.flying=true;e.update(2);p.flying=false;
    p.pos.y=20;e.update(2);p.pos.y=0;
    p.gait='airborne';e.update(2);p.gait='grounded';
    p.pos.x+=13;e.update(2);p.pos.copy(e.casePosition);
    x.g.running=false;e.update(2);x.g.running=true;
    x.g.hud.titleOpen=true;e.update(2);x.g.hud.titleOpen=false;
    assert.equal(e.progress,0);assert.equal(e.phase,'recover');
  } finally {x.close();}
});

test('extraction ends the operation once with a result and a sealed sample receipt',()=>{
 const x=fixture(),e=x.encounter,p=x.g.player;
 try{
  x.clear();p.pos.copy(e.casePosition);e.update(1.5);
  assert.ok(e.sampleOwner===p,'The recovered case must belong to the player');assert.equal(e.sampleExtracted,false);
  p.pos.copy(e.extractionPosition);e.update(2);e.update(20);
  assert.equal(x.g.results.length,1);assert.equal(x.g.results[0].win,true);
  assert.equal(x.g.results[0].operation,'clone-recovery');
  assert.equal(e.sampleExtracted,true);assert.equal(e.sampleOwner,null);
 }finally{x.close();}
});

test('player defeat ends an unfinished recovery and never manufactures an extracted sample',()=>{
 const x=fixture(),e=x.encounter,p=x.g.player;
 try{
  x.clear();p.pos.copy(e.casePosition);e.update(1.5);p.hp=0;e.update(.1);e.update(20);
  assert.equal(e.phase,'failed');assert.equal(x.g.results.length,1);
  assert.equal(x.g.results[0].win,false);assert.equal(e.sampleExtracted,false);assert.equal(e.sampleOwner,null);
 }finally{x.close();}
});

test('incapacitation resets either interaction and requires a fresh uninterrupted hold',()=>{
 const x=fixture(),e=x.encounter,p=x.g.player;
 try{
  x.clear();
  for(const phase of ['recover','extract']){
   p.pos.copy(phase==='recover'?e.casePosition:e.extractionPosition);
   e.update(.5);const progress=e.progress;
   for(const key of ['frozenT','stunT','sleepT','downedT','grabbedBy','hitstop']){
    p[key]=key==='grabbedBy'?{}:10;e.update(3);
    assert.equal(e.phase,phase,key);assert.equal(e.progress,0,key);p[key]=key==='grabbedBy'?null:0;
   }
   e.update(phase==='recover'?1.5:2);
  }
  assert.equal(e.phase,'complete');assert.equal(x.g.results.length,1);
 }finally{x.close();}
});
test('real incoming damage resets both holds without inventing blood samples', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    x.clear();p.pos.copy(e.casePosition);e.update(.5);
    e.onHit(p,1);e.update(.5);assert.equal(e.progress,0);
    e.update(.5);assert.equal(e.progress,0);
    e.update(1);assert.equal(e.phase,'recover');e.update(.5);assert.equal(e.phase,'extract');
    p.pos.copy(e.extractionPosition);e.update(.5);e.onHit(p,3);e.update(.5);
    assert.equal(e.progress,0);e.update(.5);e.update(1.5);assert.equal(e.phase,'extract');e.update(.5);assert.equal(e.phase,'complete');
  } finally {x.close();}
});
test('objectives and squad avoid registered cover; dispose releases resources and repeat owns exactly one set', () => {
  const x=fixture(),e=x.encounter;
  try {
    for (const pos of [e.casePosition,e.extractionPosition,...e.soldiers.map(f=>f.pos)]) {
      assert.equal(pos.y,0);
      for(const c of x.g.world.cover)assert.ok(Math.abs(pos.x-c.x)>c.hx+13||Math.abs(pos.z-c.z)>c.hz+13);
    }
    const markers=e.markers, resources=[];
    markers.traverse(o=>{if(o.geometry)o.geometry.addEventListener('dispose',()=>resources.push(o));});
    e.dispose();e.dispose();assert.equal(markers.parent,null);assert.ok(resources.length>0);
    assert.equal(x.g.entities.length,0);assert.equal(e.disposed,true);
    const again=new module.FrontlineEncounter(x.g);
    assert.equal(x.g.entities.length,4);assert.equal(x.g.scene.children.filter(o=>o.name==='frontline-objectives').length,1);
    again.dispose();
  }finally{x.close();}
});

test('native crater terrain supports both grounded holds while excluding flight and roofs', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  // Native heightfield sampling and crater deformation; no renderer is needed.
  const world=Object.assign(Object.create(World.prototype),x.g.world,{ARENA:240,_ghArena:240,_gseg:112,
    groundGeo:new THREE.PlaneGeometry(480,480,112,112),flattenGrass(){}});
  const positions=world.groundGeo.attributes.position;
  world._gh=new Float32Array(positions.count);world._gvx=new Float32Array(positions.count);world._gvz=new Float32Array(positions.count);
  for(let i=0;i<positions.count;i++){world._gvx[i]=positions.getX(i);world._gvz[i]=-positions.getY(i);}
  x.g.world=world;
  try {
    x.clear();world.crater(e.casePosition.x,e.casePosition.z,20,5);
    p.pos.copy(e.casePosition);p.pos.y=world.heightAt(p.pos.x,p.pos.z);e.update(.5);
    assert.ok(p.pos.y < -4,'Fixture must create a real deep crater');
    assert.equal(e.progress,.5,'A living grounded fighter in a crater must be able to recover');
    assert.ok(Math.abs(e.casePosition.y-world.heightAt(e.casePosition.x,e.casePosition.z))<1e-6);
    const box=e.markers.children.find(m=>m.isGroup);
    assert.ok(Math.abs(box.position.y-e.casePosition.y)<1e-6,'Case must rest on the current terrain');
    for(const ring of e.markers.children.filter(m=>m.geometry?.type==='RingGeometry')) {
      ring.updateWorldMatrix(true,false);
      const vertices=ring.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++) {
        const v=new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(ring.matrixWorld);
        assert.ok(Math.abs(v.y-world.heightAt(v.x,v.z)-.18)<1e-5,'Every ring vertex must follow the crater surface');
      }
    }
    for(const post of e.markers.children.filter(m=>m.geometry?.type==='CylinderGeometry'))
      assert.ok(Math.abs(post.position.y-3.5-world.heightAt(post.position.x,post.position.z))<1e-6);
    p.flying=true;e.update(2);p.flying=false;
    p.onBlock=true;p.pos.y+=.5;e.update(2);p.onBlock=false;
    p.pos.y=0;e.update(2);assert.equal(e.progress,0,'Roof/air above the crater must reset the hold');
    // Uneven terrain: player stands toward the rim, not at the case center's height.
    p.pos.x+=10;p.pos.y=world.heightAt(p.pos.x,p.pos.z);
    assert.ok(p.pos.y-e.casePosition.y>1);e.update(1.5);assert.equal(e.phase,'extract');
    world.crater(e.extractionPosition.x,e.extractionPosition.z,20,4);
    p.pos.copy(e.extractionPosition);p.pos.y=world.heightAt(p.pos.x,p.pos.z);
    e.update(2);assert.equal(e.phase,'complete');assert.equal(e.completions,1);
    assert.ok(Math.abs(e.extractionPosition.y-world.heightAt(p.pos.x,p.pos.z))<1e-6);
  } finally {world.groundGeo.dispose();x.close();}
});
