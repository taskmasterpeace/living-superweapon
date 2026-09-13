import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {Game} from '../src/engine/game.js';import {Fighter} from '../src/engine/entity.js';
import {BLADES} from '../src/data/armory.js';import {ROSTER} from '../src/data/characters.js';
for(const row of BLADES)test(`${row.id}: equip, drop and pickup preserve melee model`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='merc'))),scene=new T.Scene();
 const g={scene,world:{heightAt:()=>0},isHuman:()=>false,audio:{impact(){}}};
 for(const key of ['equipFrom','dropGear','spawnGearDrop','pickupGear','_gearKind'])g[key]=Game.prototype[key];
 const original=f.slots.lmb,before=JSON.stringify(row);
 try{
  assert.equal(row.ab.weapon,row.mesh);g.equipFrom(f,row,{primary:true});
  assert.equal(f._gearMesh.userData.weaponKind,row.mesh);
  const mounted=f._gearMesh;g.dropGear(f,true);
  assert.equal(mounted.parent,null);assert.equal(f.slots.lmb,original);
  assert.equal(g._drops.length,1);const drop=g._drops[0];
  assert.equal(drop.mesh.userData.weaponKind,row.mesh);assert.equal(drop.mesh.parent,scene);
  f.pos.copy(drop.mesh.position);assert.equal(g.pickupGear(f),true);
  assert.equal(g._drops.length,0);assert.equal(drop.mesh.parent,null);
  assert.equal(f._gearMesh.userData.weaponKind,row.mesh);
  assert.equal(f._gearMesh.parent,f.parts.armR.children[2]);
  assert.equal(f.slots._gear.def.type,'melee');assert.equal(f._gearHeld.t,Infinity);
  assert.equal(JSON.stringify(row),before,'runtime does not rewrite catalog');
  g.dropGear(f,false);assert.equal(f._gearHeld,null);
 }finally{f.dispose();}
});

for(const id of ['bat','claws','nodachi'])test(`${id}: repeated form changes keep held resources alive and remount both hands`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='merc'))),scene=new T.Scene();scene.add(f.obj);
 const g={scene,world:{heightAt:()=>0},isHuman:()=>false,audio:{impact(){}}};
 for(const key of ['equipFrom','dropGear','spawnGearDrop','_gearKind'])g[key]=Game.prototype[key];
 f._game=g;
 try{
  g.equipFrom(f,BLADES.find(row=>row.id===id),{primary:true});
  const weapon=f._gearMesh,resources=new Set(),disposed=[];
  weapon.traverse(o=>{if(o.geometry)resources.add(o.geometry);for(const m of [].concat(o.material||[]))resources.add(m);});
  for(const r of resources)r.addEventListener('dispose',()=>disposed.push(r));
  for(let i=0;i<3;i++){
   const oldHand=f.parts.armR.children[2],oldPair=f._gearPair;
   assert.equal(f.applyForm({name:`Equipment form ${i}`,frame:{scale:1+i*.1}}),true);
   assert.notEqual(f.parts.armR.children[2],oldHand);
   assert.equal(f._gearMesh,weapon);assert.equal(weapon.parent,f.parts.armR.children[2]);
   if(id==='claws'){
    assert.equal(oldPair.parent,null);assert.equal(f._gearPair.parent,f.parts.armL.children[2]);
   }
   assert.equal(disposed.length,0,'equipped resources must not be freed during a rig transfer');
  }
  g.dropGear(f,false);
  assert.equal(f._gearPair,null);
  assert.equal(new Set(disposed).size,resources.size,'removal releases every held resource');
  assert.equal(disposed.length,resources.size,'each held resource is released only once');
 }finally{f.dispose();}
});
