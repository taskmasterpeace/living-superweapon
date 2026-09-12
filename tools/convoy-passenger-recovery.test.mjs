import test from 'node:test';
import assert from 'node:assert/strict';
import {ConvoyOperation} from '../src/engine/convoy-operation.js';

for(const [assignment,destroyed,expected]of [['ambush',false,'disabled'],['escort',true,'disabled'],['escort',false,'boarding']])test(`${assignment} scientist recruitment transfers protection and chooses ${expected}`,()=>{
 const player={team:0},operation={g:{player},assignment,vehicle:{destroyed},scientist:{team:1}};
 ConvoyOperation.prototype.recruitScientist.call(operation);
 assert.equal(operation.scientistLeader,player);assert.equal(operation.scientist.team,player.team);assert.equal(operation.state,expected);
});

test('blocked wreck exit retries without repeating crash damage or blaming the player',()=>{
 const v={destroyed:true},hits=[];
 const f={_scoutVehicle:v,hp:80,takeDamage(n,opts){this.hp-=n;hits.push(opts);}};
 let clear=false,attempts=0;
 const operation={vehicle:v,scientist:f,state:'travel',scientistLeader:{},release(){attempts++;if(clear)f._scoutVehicle=null;return clear;}};
 for(let i=0;i<60;i++)ConvoyOperation.prototype.resolveDestroyedPassenger.call(operation);
 assert.equal(f.hp,55);assert.equal(hits.length,1);assert.equal(hits[0].src,undefined);
 assert.equal(attempts,60);assert.equal(operation.state,'disabled');assert.equal(operation.scientistLeader,null);
 clear=true;ConvoyOperation.prototype.resolveDestroyedPassenger.call(operation);
 assert.equal(f._scoutVehicle,null);assert.equal(f.hp,55);
 ConvoyOperation.prototype.resolveDestroyedPassenger.call(operation);assert.equal(attempts,61);
});

test('an intact convoy never applies crash damage or releases its passenger',()=>{
 const operation={vehicle:{destroyed:false},scientist:{_scoutVehicle:{},takeDamage(){assert.fail('damage');}},release(){assert.fail('release');}};
 ConvoyOperation.prototype.resolveDestroyedPassenger.call(operation);
});

for(const assignment of ['escort','ambush'])test(`${assignment} arrival waits for safe exit before settling`,()=>{
 let clear=false;const outcomes=[],player={};
 const operation={g:{player},assignment,vehicle:{speed:18,vx:5,vz:5,yawVel:1},release:()=>clear,finish:(...args)=>outcomes.push(args)};
 for(let i=0;i<60;i++)ConvoyOperation.prototype.resolveArrival.call(operation);
 assert.equal(outcomes.length,0);assert.equal(operation.cargoOwner,undefined);
 assert.equal(operation.state,'disembarking');assert.equal(operation.vehicle.speed,0);assert.equal(operation.vehicle.vx,0);
 clear=true;ConvoyOperation.prototype.resolveArrival.call(operation);
 assert.equal(outcomes.length,1);assert.equal(outcomes[0][0],assignment==='escort');
 assert.equal(operation.cargoOwner,assignment==='escort'?player:undefined);
});

test('scientist yields when leader reverses into him, without moving for idle leader',()=>{
 const scientist={pos:{x:0,z:3},move(dir){this.last=dir;},faceDir(){}};
 const leader={pos:{x:0,z:0},moveDir:{x:0,z:1}};
 const op={scientist,scientistLeader:leader};
 ConvoyOperation.prototype.followScientist.call(op,.016);assert.deepEqual(scientist.last,{x:1,z:-0});
 leader.moveDir={x:0,z:0};ConvoyOperation.prototype.followScientist.call(op,.016);assert.deepEqual(scientist.last,{x:0,z:0});
 leader.pos.z=20;ConvoyOperation.prototype.followScientist.call(op,.016);assert.deepEqual(scientist.last,{x:0,z:1});
});

test('scientist closes final boarding gap when escort is beside convoy',()=>{
 const scientist={pos:{x:-31,z:0},move(dir){this.last=dir;},faceDir(){}};
 const op={scientist,scientistLeader:{pos:{x:-23,z:0},moveDir:{x:0,z:0}},state:'boarding',vehicle:{driveRadius:14,cover:{x:0,z:0},destroyed:false}};
 ConvoyOperation.prototype.followScientist.call(op,.016);assert.deepEqual(scientist.last,{x:1,z:0});
 op.vehicle.destroyed=true;ConvoyOperation.prototype.followScientist.call(op,.016);assert.deepEqual(scientist.last,{x:0,z:0});
});
