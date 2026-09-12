import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {WoodlandCorridor} from '../src/engine/woodland-corridor.js';
test('woodland shares three meshes and lifting removes native cover without disposing shared geometry',()=>{
 const world={ARENA:900,cover:[],coverAll:[],treeSpots:[],heightAt:()=>0,refreshFogBoxes(){}},g={world,scene:new Scene()};
 const wood=new WoodlandCorridor(g,Array.from({length:20},(_,i)=>({x:0,z:i*24})));
 assert.ok(wood.trees.length>10);assert.equal(wood.group.children.length,3);
 assert.ok(wood.trees.every(t=>Math.abs(t.x)>=34));
 const t=wood.trees[0],carry=t.createCarry();assert.equal(t.dead,true);assert.equal(world.cover.includes(t.cover),false);
 assert.notEqual(carry.children[0].geometry,wood.parts[0].geo);t.cover.onReset();assert.equal(t.dead,false);
 for(const mesh of carry.children){mesh.geometry.dispose();mesh.material.dispose();}
 wood.dispose();assert.equal(world.cover.length,0);assert.equal(world.coverAll.length,0);assert.equal(world.treeSpots.length,0);assert.equal(g.scene.children.length,0);
});
