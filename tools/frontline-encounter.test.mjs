import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {ROSTER} from '../src/data/characters.js';
import {World} from '../src/engine/world.js';

const module = await import('../src/engine/frontline-encounter.js').catch(e => {
  if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
  return {};
});
function fixture() {
  assert.equal(typeof module.FrontlineEncounter, 'function', 'Clone recovery encounter must exist');
  const scene = new THREE.Scene(), entities = [], player = new Fighter(ROSTER[0]);
  player.pos.set(-40, 0, -40);
  const g = {scene, entities, player, running:true, matchOver:false, hud:{titleOpen:false},
    world:{cover:[{x:10,z:10,hx:16,hz:16,top:30}]},
    addFighter(def, opts) { const f = new Fighter(def, opts); entities.push(f); scene.add(f.obj); return f; }};
  const encounter = new module.FrontlineEncounter(g);
  const clear = () => { for (const f of encounter.soldiers) f.hp = 0; encounter.update(0); };
  return {g, encounter, clear, close(){encounter.dispose();player.dispose();}};
}

test('extraction marker is not a permanent halo under the player before recovery',()=>{
 const x=fixture();try{
  const e=x.encounter,at=e.extractionPosition;
  const extraction=e.markers.children.filter(m=>m.geometry&&m.position.x===at.x&&m.position.z===at.z);
  assert.ok(extraction.length);assert.ok(extraction.every(m=>!m.visible));
  e.phase='extract';e.update(0);assert.ok(extraction.every(m=>m.visible));
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
test('the squad must be defeated before a 1.5-second case hold and a separate 2-second extraction', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    p.pos.copy(e.casePosition); e.update(3); assert.equal(e.phase,'squad');
    x.clear(); assert.equal(e.phase,'recover');
    e.update(1); assert.equal(e.phase,'recover'); assert.equal(e.progress,1);
    e.update(.5); assert.equal(e.phase,'extract'); assert.equal(e.progress,0);
    e.update(3); assert.equal(e.phase,'extract');
    p.pos.copy(e.extractionPosition);e.update(1.9);assert.equal(e.phase,'extract');
    e.update(.1);assert.equal(e.phase,'complete');assert.equal(e.completions,1);
    e.update(8);assert.equal(e.completions,1);assert.equal(x.g.running,true);
  } finally {x.close();}
});
test('airborne, outside radius, dead, paused and title states cannot advance interactions', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    x.clear();p.pos.copy(e.casePosition);e.update(.5);
    p.flying=true;e.update(2);p.flying=false;
    p.pos.y=20;e.update(2);p.pos.y=0;
    p.gait='airborne';e.update(2);p.gait='grounded';
    p.pos.x+=13;e.update(2);p.pos.copy(e.casePosition);
    p.hp=0;e.update(2);p.hp=p.maxHp;
    x.g.running=false;e.update(2);x.g.running=true;
    x.g.hud.titleOpen=true;e.update(2);x.g.hud.titleOpen=false;
    assert.equal(e.progress,.5);assert.equal(e.phase,'recover');
  } finally {x.close();}
});
test('real incoming hit notifications pause both ground holds without inventing blood samples', () => {
  const x=fixture(),e=x.encounter,p=x.g.player;
  try {
    x.clear();p.pos.copy(e.casePosition);e.update(.5);
    e.onHit(p,1);e.update(.5);assert.equal(e.progress,.5);
    e.update(.5);assert.equal(e.progress,.5);
    e.update(1);assert.equal(e.phase,'extract');
    p.pos.copy(e.extractionPosition);e.update(.5);e.onHit(p,3);e.update(.5);
    assert.equal(e.progress,.5);e.update(.5);e.update(1.5);assert.equal(e.phase,'complete');
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
    p.pos.y=0;e.update(2);assert.equal(e.progress,.5,'Roof/air above the crater must not count as ground');
    // Uneven terrain: player stands toward the rim, not at the case center's height.
    p.pos.x+=10;p.pos.y=world.heightAt(p.pos.x,p.pos.z);
    assert.ok(p.pos.y-e.casePosition.y>1);e.update(1);assert.equal(e.phase,'extract');
    world.crater(e.extractionPosition.x,e.extractionPosition.z,20,4);
    p.pos.copy(e.extractionPosition);p.pos.y=world.heightAt(p.pos.x,p.pos.z);
    e.update(2);assert.equal(e.phase,'complete');assert.equal(e.completions,1);
    assert.ok(Math.abs(e.extractionPosition.y-world.heightAt(p.pos.x,p.pos.z))<1e-6);
  } finally {world.groundGeo.dispose();x.close();}
});
