import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Fighter} from '../src/engine/entity.js';
import {Game} from '../src/engine/game.js';
import {ROSTER} from '../src/data/characters.js';
import {FIREARMS,firearmById} from '../src/data/armory.js';
import {StudioCombat} from '../src/tool/studio-combat.js';
import {runSlot} from '../src/engine/abilities.js';
import {firearmAmmo,requestReload,updateFirearmReload} from '../src/engine/firearm-ammo.js';
import * as armory from '../src/engine/armoryUI.js';

test('issuance rejects stale, dead, non-soldier and non-firearm requests',()=>{
 assert.equal(typeof armory.loadoutIssueError,'function');
 const f={alive:true,def:{archetype:'soldier'},slots:{}},g={player:f,entities:[f]};
 assert.equal(armory.loadoutIssueError(g,f,'m24'),null);
 assert.ok(armory.loadoutIssueError(g,{...f},'m24'));
 assert.ok(armory.loadoutIssueError(g,f,'katana'));
 f.alive=false;assert.ok(armory.loadoutIssueError(g,f,'m24'));
 f.alive=true;f.def.archetype='hero';assert.ok(armory.loadoutIssueError(g,f,'m24'));
});

for(const id of ['m16','pump','m24'])test(`${id}: native issuance, ammunition, reload and replacement retain paid launches`,()=>{
 const f=new Fighter(structuredClone(ROSTER.find(d=>d.id==='sarge')));
 const scene=new THREE.Scene(),world={scene,cover:[],interiors:[],ARENA:240,heightAt:()=>0,shake(){},punch(){}};
 const combat=new StudioCombat(scene,world),g=combat.game;
 Object.assign(g,{equipFrom:Game.prototype.equipFrom,dropGear:Game.prototype.dropGear,_gearKind:Game.prototype._gearKind});
 g.entities=[f];g.player=f;f._game=g;scene.add(f.obj);g.audio={...g.audio,gunshot(){}};
 const original=f.slots.lmb,row=firearmById(id),before=JSON.stringify(row);
 try{
  g.equipFrom(f,row,{primary:true});
  assert.equal(f.slots.lmb.def.name,row.ab.name,'the actual primary must become the issued firearm');
  const ammo=firearmAmmo(f.slots.lmb);assert.ok(ammo,'catalog firearms use physical ammunition');
  const loaded=ammo.loaded;
  runSlot(f,'lmb',{pressed:true,held:true,released:false,dt:1/60},g);
  assert.equal(ammo.loaded,loaded-1);assert.ok(g.projectiles.list.length>0);
  assert.equal(requestReload(f,'lmb',g),true);updateFirearmReload(f,10,g);assert.equal(ammo.loaded,loaded);
  const mesh=f._gearMesh,shots=[...g.projectiles.list];
  g.equipFrom(f,firearmById('ak'),{primary:true});
  assert.equal(mesh.parent,null);assert.ok(shots.every(s=>s._launchResolved),'paid shots resolve before the old muzzle is detached');
  g.dropGear(f,false);assert.equal(f.slots.lmb,original);assert.equal(f.slots._gear,undefined);
  assert.equal(JSON.stringify(row),before,'issuance cannot mutate catalog definitions');
 }finally{combat.dispose();f.dispose();}
});

test('every catalog firearm has a finite physical magazine and reload',()=>{
 for(const row of FIREARMS){const ammo=firearmAmmo({def:row.ab});assert.ok(ammo, row.id);assert.ok(ammo.capacity>0);assert.ok(row.ab.reloadTime>0);assert.equal(row.ab.cost,0);}
});
