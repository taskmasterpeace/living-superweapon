import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,Matrix4} from 'three';
import {WoodlandCorridor} from '../src/engine/woodland-corridor.js';
const setup=()=>new WoodlandCorridor({scene:new Scene(),world:{ARENA:900,cover:[],coverAll:[],treeSpots:[],heightAt:()=>0,refreshFogBoxes(){}}},Array.from({length:20},(_,i)=>({x:0,z:i*24})));
test('woodland variation is reproducible, uses three draws and survives carry/reset',()=>{
 const a=setup(),b=setup();
 assert.deepEqual(a.trees.map(t=>[t.x,t.z,t.yaw,t.heightScale,t.tint]),b.trees.map(t=>[t.x,t.z,t.yaw,t.heightScale,t.tint]));
 assert.ok(new Set(a.trees.map(t=>t.yaw)).size>5);
 assert.ok(new Set(a.trees.map(t=>t.tint)).size>3);
 assert.equal(a.parts.length,3);
 const tree=a.trees[0],before=new Matrix4();a.parts[0].mesh.getMatrixAt(0,before);
 const carry=tree.createCarry();assert.equal(carry.rotation.y,tree.yaw);assert.ok(Math.abs(carry.scale.y-tree.scale*tree.heightScale)<1e-8);
 tree.cover.onReset();const after=new Matrix4();a.parts[0].mesh.getMatrixAt(0,after);assert.deepEqual(after.elements,before.elements);
 for(const mesh of carry.children){mesh.geometry.dispose();mesh.material.dispose();}a.dispose();b.dispose();
});
