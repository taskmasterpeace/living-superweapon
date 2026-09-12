import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene} from 'three';
import {WoodlandCorridor} from '../src/engine/woodland-corridor.js';
test('woodland keeps trunks and crowns outside reserved deployment space',()=>{
 const g={scene:new Scene(),world:{ARENA:1000,cover:[],coverAll:[],treeSpots:[],heightAt:()=>0,refreshFogBoxes(){}}};
 const route=Array.from({length:20},(_,i)=>({x:0,z:i*20}));
 const reserved=[{x:34,z:140,r:30}];
 const woods=new WoodlandCorridor(g,route,reserved);
 assert.ok(woods.trees.length>0);
 for(const t of woods.trees)assert.ok(Math.hypot(t.x-34,t.z-140)>=30+11*t.scale,'Canopy intrudes into deployment space');
 woods.dispose();assert.equal(g.world.cover.length,0);assert.equal(g.world.treeSpots.length,0);
});
