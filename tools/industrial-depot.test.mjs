import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Vector3} from 'three';
import {IndustrialDepot} from '../src/engine/industrial-depot.js';
test('depot reserves convoy corridor and retires cover and decorations together',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
 try{
  const world={ARENA:900,cover:[],coverAll:[],heightAt:()=>0,refreshFogBoxes(){}},g={world,scene:new Scene()};
  const route=[{x:0,z:-100},{x:0,z:100}],depot=new IndustrialDepot(g,new Vector3(),route);
  assert.equal(depot.sites.length,2);assert.equal(world.cover.length,20);
  assert.ok(world.cover.every(c=>Math.abs(c.x)-c.hx>20));
  const side=world.cover.find(c=>c.mesh.name==='depot-side');side.hp=0;side.onShatter();
  assert.equal(world.cover.includes(side),false);assert.ok(side.mesh.userData.decorations.every(m=>!m.visible));
  side.onReset();assert.ok(side.mesh.userData.decorations.every(m=>m.visible));
  depot.dispose();assert.equal(world.cover.length,0);assert.equal(world.coverAll.length,0);assert.equal(g.scene.children.length,0);
 }finally{globalThis.document=previous;}
});
