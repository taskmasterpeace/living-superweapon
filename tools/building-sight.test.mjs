import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/engine/world.js';
import {Game} from '../src/engine/game.js';
import {Vector3} from 'three';
import {fighterPathFraction,sweepFighterEnvironment} from '../src/engine/fighter-environment-contact.js';
test('native walking and carried-body sweeps pass under elevated building pieces',()=>{
 const world={cover:[roof],interiors:[]},f={pos:new Vector3(-30,0,0),vel:new Vector3(60,0,0),radius:2.2,_wallContact(){throw Error('Hit overhead roof');}};
 assert.equal(fighterPathFraction(f,world,f.pos,new Vector3(30,0,0)),1);
 sweepFighterEnvironment(f,{world},1);assert.equal(f.pos.x,30);
});
const roof={x:0,z:0,hx:20,hz:20,bottom:20,top:22,finiteBuilding:true};
const actor=(x,y,z)=>({pos:{x,y,z}});
test('finite roof leaves room sight and horizontal projectile traces clear',()=>{
 const world={cover:[roof],interiors:[],traceBox3:World.prototype.traceBox3},g={world};
 assert.equal(Game.prototype.canSee.call(g,actor(-10,0,0),actor(10,0,0)),true);
 assert.equal(world.traceBox3(-10,5,0,10,5,0,roof),-1);
 assert.ok(world.traceBox3(0,5,0,0,30,0,roof)>0);
});
test('finite wall blocks room sight; old city boxes retain ground-to-roof blocking',()=>{
 const wall={...roof,hx:1,bottom:0,top:18},world={cover:[wall],interiors:[],traceBox3:World.prototype.traceBox3},g={world};
 assert.equal(Game.prototype.canSee.call(g,actor(-10,0,0),actor(10,0,0)),false);
 assert.ok(world.traceBox3(-30,5,0,30,5,0,{...roof,finiteBuilding:false})>=0);
});
