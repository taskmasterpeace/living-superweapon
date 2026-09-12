import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/engine/world.js';
import {buildingObstructsView} from '../src/engine/building-cutaway.js';
test('lab lens clearance fades adjacent and enclosing slabs without changing collision',()=>{
 const world={traceBox3:World.prototype.traceBox3},box={x:0,z:0,hx:20,hz:20,bottom:14.8,top:16,finiteBuilding:true},player={x:0,y:0,z:-10};
 const original=JSON.stringify(box);
 assert.equal(buildingObstructsView(world,{x:0,y:14.4,z:10},player,box),true);
 assert.equal(buildingObstructsView(world,{x:0,y:15,z:10},player,box),true);
 assert.equal(buildingObstructsView(world,{x:0,y:10,z:10},player,box),false);
 assert.equal(buildingObstructsView(world,{x:50,y:14.4,z:10},{x:50,y:0,z:-10},box),false);
 assert.equal(JSON.stringify(box),original);
});
